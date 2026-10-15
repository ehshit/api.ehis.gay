import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export const CONFIG_KEYS = [
  "bust_size",
  "breasts_xOffset",
  "breasts_yOffset",
  "breasts_zOffset",
  "breasts_cleavage",
  "voice_pitch",
  "bounce_multiplier",
  "floppy_multiplier"
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export interface StoredEntry {
  tokenHash: string;
  hash: string;
  config: Partial<Record<ConfigKey, number>>;
  updatedAt: string;
}

export type Store = Record<string, StoredEntry>;

interface Target {
  kind: "json" | "sqlite" | "postgres";
  label: string;
  url?: string;
  path?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const require_ = createRequire(import.meta.url);

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function targets(): Target[] {
  const raw = [process.env.STORAGE, process.env.DATABASE_URL]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(",")
    .split(",")
    .map((s) => s.trim().replace(/^["']+|["']+$/g, "").trim())
    .filter(Boolean);

  const out: Target[] = [];
  const seen = new Set<string>();

  const push = (target: Target) => {
    const key = target.kind === "postgres" ? `pg:${target.url}` : `${target.kind}:${target.path ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(target);
  };

  for (const entry of raw) {
    if (/^postgres(ql)?:\/\//i.test(entry)) {
      let label = "postgres";
      try {
        label = `postgres:${new URL(entry).host}`;
      } catch {}
      push({ kind: "postgres", label, url: entry });
      continue;
    }

    const lower = entry.toLowerCase();
    if (lower === "sqlite" || lower.endsWith(".db") || lower.endsWith(".sqlite") || lower.endsWith(".sqlite3")) {
      const path = lower === "sqlite" ? join(dataDir(), "boobs.db") : entry;
      push({ kind: "sqlite", label: `sqlite:${path}`, path });
      continue;
    }

    push({ kind: "json", label: `json:${jsonPath()}` });
  }

  if (out.length === 0) push({ kind: "json", label: `json:${jsonPath()}` });
  return out;
}

function dataDir(): string {
  return process.env.DATA_DIR || join(process.cwd(), "data");
}

function jsonPath(): string {
  return join(dataDir(), "boobs.json");
}

function openSqlite(path: string) {
  const { DatabaseSync } = require_("node:sqlite") as { DatabaseSync: new (path: string) => any };
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "CREATE TABLE IF NOT EXISTS boobs (uuid TEXT PRIMARY KEY, token_hash TEXT NOT NULL, hash TEXT NOT NULL, config TEXT NOT NULL, updated_at TEXT NOT NULL)"
  );
  return db;
}

const pools = new Map<string, any>();
const pgReady = new Set<string>();

function pgPool(url: string) {
  let pool = pools.get(url);
  if (!pool) {
    const { Pool } = require_("pg") as { Pool: new (cfg: any) => any };
    pool = new Pool({
      connectionString: url,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
    });
    pools.set(url, pool);
  }
  return pool;
}

async function pgInit(url: string) {
  if (pgReady.has(url)) return;
  await pgPool(url).query(
    "CREATE TABLE IF NOT EXISTS boobs (uuid TEXT PRIMARY KEY, token_hash TEXT NOT NULL, hash TEXT NOT NULL, config JSONB NOT NULL, updated_at TEXT NOT NULL)"
  );
  pgReady.add(url);
}

function toEntry(row: any): StoredEntry {
  return {
    tokenHash: row.token_hash,
    hash: row.hash,
    config: typeof row.config === "string" ? JSON.parse(row.config) : row.config,
    updatedAt: row.updated_at
  };
}

async function readEntryFrom(target: Target, uuid: string): Promise<StoredEntry | null> {
  try {
    if (target.kind === "json") {
      if (!existsSync(jsonPath())) return null;
      const store = JSON.parse(readFileSync(jsonPath(), "utf8")) as Store;
      return store[uuid] ?? null;
    }

    if (target.kind === "sqlite") {
      const db = openSqlite(target.path!);
      const row = db.prepare("SELECT token_hash, hash, config, updated_at FROM boobs WHERE uuid = ?").get(uuid);
      db.close();
      return row ? toEntry(row) : null;
    }

    await pgInit(target.url!);
    const res = await pgPool(target.url!).query(
      "SELECT token_hash, hash, config, updated_at FROM boobs WHERE uuid = $1",
      [uuid]
    );
    return res.rows[0] ? toEntry(res.rows[0]) : null;
  } catch {
    return null;
  }
}

async function readAllFrom(target: Target): Promise<Store> {
  try {
    if (target.kind === "json") {
      if (!existsSync(jsonPath())) return {};
      return JSON.parse(readFileSync(jsonPath(), "utf8")) as Store;
    }

    if (target.kind === "sqlite") {
      const db = openSqlite(target.path!);
      const rows = db.prepare("SELECT uuid, token_hash, hash, config, updated_at FROM boobs").all() as any[];
      db.close();
      const store: Store = {};
      for (const row of rows) store[row.uuid] = toEntry(row);
      return store;
    }

    await pgInit(target.url!);
    const res = await pgPool(target.url!).query("SELECT uuid, token_hash, hash, config, updated_at FROM boobs");
    const store: Store = {};
    for (const row of res.rows) store[row.uuid] = toEntry(row);
    return store;
  } catch {
    return {};
  }
}

async function writeEntryTo(target: Target, uuid: string, entry: StoredEntry): Promise<void> {
  try {
    if (target.kind === "json") {
      const store = await readAllFrom(target);
      store[uuid] = entry;
      mkdirSync(dataDir(), { recursive: true });
      writeFileSync(jsonPath(), JSON.stringify(store, null, 2), "utf8");
      return;
    }

    if (target.kind === "sqlite") {
      const db = openSqlite(target.path!);
      db.prepare(
        "INSERT INTO boobs (uuid, token_hash, hash, config, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(uuid) DO UPDATE SET token_hash=excluded.token_hash, hash=excluded.hash, config=excluded.config, updated_at=excluded.updated_at"
      ).run(uuid, entry.tokenHash, entry.hash, JSON.stringify(entry.config), entry.updatedAt);
      db.close();
      return;
    }

    await pgInit(target.url!);
    await pgPool(target.url!).query(
      "INSERT INTO boobs (uuid, token_hash, hash, config, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (uuid) DO UPDATE SET token_hash = EXCLUDED.token_hash, hash = EXCLUDED.hash, config = EXCLUDED.config, updated_at = EXCLUDED.updated_at",
      [uuid, entry.tokenHash, entry.hash, JSON.stringify(entry.config), entry.updatedAt]
    );
  } catch {}
}

async function removeEntryFrom(target: Target, uuid: string): Promise<void> {
  try {
    if (target.kind === "json") {
      const store = await readAllFrom(target);
      if (!(uuid in store)) return;
      delete store[uuid];
      mkdirSync(dataDir(), { recursive: true });
      writeFileSync(jsonPath(), JSON.stringify(store, null, 2), "utf8");
      return;
    }

    if (target.kind === "sqlite") {
      const db = openSqlite(target.path!);
      db.prepare("DELETE FROM boobs WHERE uuid = ?").run(uuid);
      db.close();
      return;
    }

    await pgInit(target.url!);
    await pgPool(target.url!).query("DELETE FROM boobs WHERE uuid = $1", [uuid]);
  } catch {}
}

export async function readEntry(uuid: string): Promise<StoredEntry | null> {
  for (const target of targets()) {
    const entry = await readEntryFrom(target, uuid);
    if (entry) return entry;
  }
  return null;
}

export async function readAll(): Promise<Store> {
  const merged: Store = {};
  for (const target of targets()) {
    const part = await readAllFrom(target);
    for (const [uuid, entry] of Object.entries(part)) {
      if (!(uuid in merged)) merged[uuid] = entry;
    }
  }
  return merged;
}

export async function getConfig(uuid: string): Promise<Partial<Record<ConfigKey, number>> | null> {
  const entry = await readEntry(uuid);
  return entry ? entry.config : null;
}

export async function getManyConfigs(uuids: string[]): Promise<Record<string, Partial<Record<ConfigKey, number>>>> {
  const out: Record<string, Partial<Record<ConfigKey, number>>> = {};
  for (const uuid of uuids) {
    if (!isValidUuid(uuid)) continue;
    const entry = await readEntry(uuid);
    if (entry) out[uuid] = entry.config;
  }
  return out;
}

export async function storeStats() {
  const all = await readAll();
  return {
    storage: targets().map((t) => t.label),
    entries: Object.keys(all).length
  };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function configHash(config: Partial<Record<ConfigKey, number>>): string {
  const canonical = CONFIG_KEYS.slice()
    .sort()
    .map((k) => `${k}=${config[k] ?? ""}`)
    .join("|");
  return sha256(canonical);
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function tokensMatch(storedHash: string, provided: string): boolean {
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(sha256(provided), "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function sanitizeConfig(input: unknown): Partial<Record<ConfigKey, number>> {
  const out: Partial<Record<ConfigKey, number>> = {};
  if (!input || typeof input !== "object") return out;
  const body = input as Record<string, unknown>;
  for (const key of CONFIG_KEYS) {
    const value = body[key];
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

export async function registerUuid(uuid: string): Promise<{ token: string; entry: StoredEntry }> {
  const existing = await readEntry(uuid);
  const token = generateToken();
  const entry: StoredEntry = {
    tokenHash: sha256(token),
    hash: configHash(existing?.config ?? {}),
    config: existing?.config ?? {},
    updatedAt: new Date().toISOString()
  };
  for (const target of targets()) await writeEntryTo(target, uuid, entry);
  return { token, entry };
}

export async function putConfig(uuid: string, config: Partial<Record<ConfigKey, number>>) {
  const hash = configHash(config);
  const existing = await readEntry(uuid);
  if (existing && existing.hash === hash) return { unchanged: true as const };

  const entry: StoredEntry = {
    tokenHash: existing?.tokenHash ?? "",
    hash,
    config,
    updatedAt: new Date().toISOString()
  };
  for (const target of targets()) await writeEntryTo(target, uuid, entry);
  return { unchanged: false as const };
}

export async function deleteEntry(uuid: string, token: string): Promise<{ ok: boolean; authed: boolean }> {
  const entry = await readEntry(uuid);
  if (!entry) return { ok: true, authed: true };
  if (!tokensMatch(entry.tokenHash, token)) return { ok: false, authed: false };
  for (const target of targets()) await removeEntryFrom(target, uuid);
  return { ok: true, authed: true };
}

export function getBearerToken(header: string | undefined): string | null {
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

function windowAllowed(key: string, bucket: Map<string, number[]>, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (bucket.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    bucket.set(key, hits);
    return false;
  }
  hits.push(now);
  bucket.set(key, hits);
  if (bucket.size > 5000) {
    for (const [k, v] of bucket) {
      if (v.every((t) => now - t >= windowMs)) bucket.delete(k);
    }
  }
  return true;
}

const registerHits = new Map<string, number[]>();
const readHits = new Map<string, number[]>();

export function registerAllowed(ip: string): boolean {
  return windowAllowed(ip, registerHits, 5, 10 * 60 * 1000);
}

export function readAllowed(ip: string): boolean {
  return windowAllowed(ip, readHits, 120, 60 * 1000);
}

export function clientIp(event: any): string {
  const fwd = event.node.req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return event.node.req.socket?.remoteAddress || "unknown";
}

export function invalidUuidResponse(event: any) {
  return createError({ statusCode: 400, statusMessage: "Bad Request", message: "invalid uuid" });
}

export function unauthorizedResponse() {
  return createError({ statusCode: 401, statusMessage: "Unauthorized", message: "missing or invalid token" });
}

export function rateLimitedResponse() {
  return createError({ statusCode: 429, statusMessage: "Too Many Requests", message: "slow down" });
}