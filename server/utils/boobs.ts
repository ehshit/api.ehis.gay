import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statfsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { resolveSqlBackend } from "./pgBackend";
import { getDonationPayload, loadAppConfig } from "./appconfig";
import { isOfflineUuid } from "./mojang";

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
  extraTokenHashes?: string[];
  hash: string;
  config: Partial<Record<ConfigKey, number>>;
  updatedAt: string;
}

export type Store = Record<string, StoredEntry>;

export type DbProblemKind = "exhausted" | "disk" | "unavailable";

export class DbProblem extends Error {
  constructor(public readonly kind: DbProblemKind, cause: unknown) {
    super(
      cause instanceof Error
        ? cause.message
        : typeof (cause as any)?.message === "string"
          ? (cause as any).message
          : String(cause)
    );
  }
}

function classifyDbError(error: unknown): DbProblem {
  const detail = [
    error instanceof Error ? error.message : (error as any)?.message,
    (error as any)?.code,
    (error as any)?.name,
    (error as any)?.status,
    (error as any)?.statusCode
  ]
    .filter((value) => value !== undefined && value !== null)
    .map(String)
    .join(" ");
  if (/ENOSPC|EDQUOT|SQLITE_FULL|SQLITE_IOERR|disk full|no space|out of disk/i.test(detail)) {
    return new DbProblem("disk", error);
  }
  if (/exhausted|quota|size limit|HTTP status 402|HTTP status 423|HTTP status 429|payment required|plan limit|storage limit|resource limit/i.test(detail)) {
    return new DbProblem("exhausted", error);
  }
  return new DbProblem("unavailable", error);
}

const DB_ERROR_CODES: Record<DbProblemKind, string> = {
  disk: "DB_disk_full",
  exhausted: "DB_exhausted",
  unavailable: "DB_unavailable"
};

export function dbProblemPayload(kind: DbProblemKind) {
  return {
    error: DB_ERROR_CODES[kind],
    ...(kind === "unavailable" ? {} : getDonationPayload())
  };
}

export function dbErrorResponse(event: any, kind: DbProblemKind) {
  setResponseStatus(event, 503);
  setHeader(event, "content-type", "application/json");
  return dbProblemPayload(kind);
}

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

function parseTargets(entries: string[]): Target[] {
  const raw = entries
    .filter((v) => typeof v === "string" && v.trim().length > 0)
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

    const file = lower === "json" ? jsonPath() : lower.endsWith(".json") ? entry : join(entry, "boobs.json");
    push({ kind: "json", label: `json:${file}`, path: file });
  }

  if (out.length === 0) push({ kind: "json", label: `json:${jsonPath()}`, path: jsonPath() });
  return out;
}

export function mainTargets(): Target[] {
  return parseTargets([process.env.STORAGE ?? "", process.env.DATABASE_URL ?? ""]);
}

export function targets(): Target[] {
  return mainTargets();
}

export function offlineTargets(): Target[] {
  const config = loadAppConfig();
  if (!config.boobs.separateOffline) return [];
  const value = (config.boobs.offlineDatabase || process.env.DATABASE_OFFLINE || "").trim();
  if (!value) return [];
  return parseTargets([value]);
}

export function targetsFor(uuid: string): Target[] {
  if (isOfflineUuid(uuid)) {
    const offline = offlineTargets();
    if (offline.length > 0) return offline;
  }
  return mainTargets();
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

function decodeTokenHash(value: unknown): { tokenHash: string; extraTokenHashes?: string[] } {
  if (typeof value === "string" && value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((v) => typeof v === "string")) {
        return { tokenHash: parsed[0], extraTokenHashes: parsed.slice(1) };
      }
    } catch {}
  }
  return { tokenHash: typeof value === "string" ? value : "" };
}

function encodeTokenHash(entry: StoredEntry): string {
  const extras = entry.extraTokenHashes ?? [];
  if (extras.length === 0) return entry.tokenHash;
  return JSON.stringify([entry.tokenHash, ...extras]);
}

function toEntry(row: any): StoredEntry {
  return {
    ...decodeTokenHash(row.token_hash),
    hash: row.hash,
    config: typeof row.config === "string" ? JSON.parse(row.config) : row.config,
    updatedAt: row.updated_at
  };
}

async function readEntryFrom(target: Target, uuid: string): Promise<StoredEntry | null> {
  try {
    if (target.kind === "json") {
      if (!existsSync(target.path!)) return null;
      const store = JSON.parse(readFileSync(target.path!, "utf8")) as Store;
      return store[uuid] ?? null;
    }

    if (target.kind === "sqlite") {
      const db = openSqlite(target.path!);
      const row = db.prepare("SELECT token_hash, hash, config, updated_at FROM boobs WHERE uuid = ?").get(uuid);
      db.close();
      return row ? toEntry(row) : null;
    }

    const backend = await resolveSqlBackend(target.url!);
    const row = await backend.get(uuid);
    return row ? toEntry(row) : null;
  } catch (error) {
    throw classifyDbError(error);
  }
}

async function readAllFrom(target: Target): Promise<Store> {
  try {
    if (target.kind === "json") {
      if (!existsSync(target.path!)) return {};
      return JSON.parse(readFileSync(target.path!, "utf8")) as Store;
    }

    if (target.kind === "sqlite") {
      const db = openSqlite(target.path!);
      const rows = db.prepare("SELECT uuid, token_hash, hash, config, updated_at FROM boobs").all() as any[];
      db.close();
      const store: Store = {};
      for (const row of rows) store[row.uuid] = toEntry(row);
      return store;
    }

    const backend = await resolveSqlBackend(target.url!);
    const rows = await backend.all();
    const store: Store = {};
    for (const row of rows) store[row.uuid] = toEntry(row);
    return store;
  } catch (error) {
    throw classifyDbError(error);
  }
}

async function writeEntryTo(target: Target, uuid: string, entry: StoredEntry): Promise<void> {
  try {
    if (target.kind === "json") {
      const store = await readAllFrom(target);
      store[uuid] = entry;
      mkdirSync(dirname(target.path!), { recursive: true });
      writeFileSync(target.path!, JSON.stringify(store, null, 2), "utf8");
      return;
    }

    if (target.kind === "sqlite") {
      const db = openSqlite(target.path!);
      db.prepare(
        "INSERT INTO boobs (uuid, token_hash, hash, config, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(uuid) DO UPDATE SET token_hash=excluded.token_hash, hash=excluded.hash, config=excluded.config, updated_at=excluded.updated_at"
      ).run(uuid, encodeTokenHash(entry), entry.hash, JSON.stringify(entry.config), entry.updatedAt);
      db.close();
      return;
    }

    const backend = await resolveSqlBackend(target.url!);
    await backend.put({
      uuid,
      token_hash: encodeTokenHash(entry),
      hash: entry.hash,
      config: entry.config,
      updated_at: entry.updatedAt
    });
  } catch (error) {
    throw classifyDbError(error);
  }
}

async function removeEntryFrom(target: Target, uuid: string): Promise<void> {
  try {
    if (target.kind === "json") {
      const store = await readAllFrom(target);
      if (!(uuid in store)) return;
      delete store[uuid];
      mkdirSync(dirname(target.path!), { recursive: true });
      writeFileSync(target.path!, JSON.stringify(store, null, 2), "utf8");
      return;
    }

    if (target.kind === "sqlite") {
      const db = openSqlite(target.path!);
      db.prepare("DELETE FROM boobs WHERE uuid = ?").run(uuid);
      db.close();
      return;
    }

    const backend = await resolveSqlBackend(target.url!);
    await backend.remove(uuid);
  } catch (error) {
    throw classifyDbError(error);
  }
}

const DISK_CHECK_TTL_MS = 60 * 1000;
const DISK_MIN_AVAILABLE_BYTES = 64 * 1024 * 1024;
let diskCheckedAt = 0;
let diskLow = false;

function checkDiskSpace(targets: Target[]): void {
  const now = Date.now();
  if (now - diskCheckedAt < DISK_CHECK_TTL_MS) {
    if (diskLow) throw new DbProblem("disk", new Error("disk space low"));
    return;
  }
  diskCheckedAt = now;
  diskLow = false;
  for (const target of targets) {
    if (target.kind === "postgres") continue;
    const path = target.kind === "sqlite" ? target.path! : target.path ? dirname(target.path!) : dataDir();
    try {
      const stats = statfsSync(path);
      if (stats.bavail * stats.bsize < DISK_MIN_AVAILABLE_BYTES) diskLow = true;
    } catch {}
  }
  if (diskLow) throw new DbProblem("disk", new Error("disk space low"));
}

function failedAll(problems: DbProblem[], count: number): DbProblem | null {
  return count > 0 && problems.length === count ? problems[0]! : null;
}

async function writeAll(targets: Target[], uuid: string, entry: StoredEntry): Promise<void> {
  const problems: DbProblem[] = [];
  for (const target of targets) {
    try {
      await writeEntryTo(target, uuid, entry);
    } catch (error) {
      if (error instanceof DbProblem) problems.push(error);
    }
  }
  const problem = failedAll(problems, targets.length);
  if (problem) throw problem;
}

async function removeAll(targets: Target[], uuid: string): Promise<void> {
  const problems: DbProblem[] = [];
  for (const target of targets) {
    try {
      await removeEntryFrom(target, uuid);
    } catch (error) {
      if (error instanceof DbProblem) problems.push(error);
    }
  }
  const problem = failedAll(problems, targets.length);
  if (problem) throw problem;
}

export async function readEntry(uuid: string): Promise<StoredEntry | null> {
  const targets = targetsFor(uuid);
  checkDiskSpace(targets);
  const problems: DbProblem[] = [];
  for (const target of targets) {
    try {
      const entry = await readEntryFrom(target, uuid);
      if (entry) return entry;
    } catch (error) {
      problems.push(error instanceof DbProblem ? error : classifyDbError(error));
    }
  }
  if (problems.length > 0) throw problems[0]!;
  return null;
}

export async function readAll(): Promise<Store> {
  const targets = [...mainTargets(), ...offlineTargets()];
  const merged: Store = {};
  const problems: DbProblem[] = [];
  for (const target of targets) {
    try {
      const part = await readAllFrom(target);
      for (const [uuid, entry] of Object.entries(part)) {
        if (!(uuid in merged)) merged[uuid] = entry;
      }
    } catch (error) {
      if (error instanceof DbProblem) problems.push(error);
    }
  }
  const problem = failedAll(problems, targets.length);
  if (problem) throw problem;
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
    storage: [...mainTargets(), ...offlineTargets()].map((t) => t.label),
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

const MAX_EXTRA_TOKENS = 8;

export function entryTokensMatch(entry: StoredEntry, provided: string): boolean {
  let matched = false;
  for (const hash of [entry.tokenHash, ...(entry.extraTokenHashes ?? [])]) {
    matched = tokensMatch(hash, provided) || matched;
  }
  return matched;
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

export async function registerUuid(uuid: string, recover = false): Promise<{ token: string; entry: StoredEntry }> {
  const existing = await readEntry(uuid);
  if (existing && !recover) {
    throw createError({ statusCode: 409, statusMessage: "Conflict", message: "this UUID already exists" });
  }
  const token = generateToken();
  const extraTokenHashes = existing
    ? [existing.tokenHash, ...(existing.extraTokenHashes ?? [])].slice(0, MAX_EXTRA_TOKENS)
    : [];
  const entry: StoredEntry = {
    tokenHash: sha256(token),
    extraTokenHashes,
    hash: existing?.hash ?? configHash({}),
    config: existing?.config ?? {},
    updatedAt: new Date().toISOString()
  };
  await writeAll(targetsFor(uuid), uuid, entry);
  return { token, entry };
}

export async function putConfig(uuid: string, config: Partial<Record<ConfigKey, number>>) {
  const hash = configHash(config);
  const existing = await readEntry(uuid);
  if (existing && existing.hash === hash) return { unchanged: true as const };

  const entry: StoredEntry = {
    tokenHash: existing?.tokenHash ?? "",
    extraTokenHashes: existing?.extraTokenHashes ?? [],
    hash,
    config,
    updatedAt: new Date().toISOString()
  };
  await writeAll(targetsFor(uuid), uuid, entry);
  return { unchanged: false as const };
}

export async function deleteEntry(uuid: string, token: string): Promise<{ ok: boolean; authed: boolean }> {
  const entry = await readEntry(uuid);
  if (!entry) return { ok: true, authed: true };
  if (!entryTokensMatch(entry, token)) return { ok: false, authed: false };
  await removeAll(targetsFor(uuid), uuid);
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
  const fwd = getRequestHeader(event, "x-forwarded-for");
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  const cf = getRequestHeader(event, "cf-connecting-ip");
  if (typeof cf === "string" && cf.length > 0) return cf.trim();
  const ip = getRequestIP(event, { xForwardedFor: true });
  if (ip) return ip;
  return "unknown";
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