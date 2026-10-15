import { createRequire } from "node:module";
import { neon } from "@neondatabase/serverless";

const require_ = createRequire(import.meta.url);

export interface SqlRow {
  uuid: string;
  token_hash: string;
  hash: string;
  config: unknown;
  updated_at: string;
}

export interface SqlBackend {
  label: string;
  get(uuid: string): Promise<SqlRow | null>;
  all(): Promise<SqlRow[]>;
  put(row: SqlRow): Promise<void>;
  remove(uuid: string): Promise<void>;
}

type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

function httpCandidates(): string[] {
  const extra = (process.env.PG_HTTP_DRIVER ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return extra;
}

function driverFactory(module: any): ((url: string) => SqlTag) | null {
  if (!module) return null;

  const candidates = [module.neon, module.sql, module.pg, module.default?.neon, module.default?.sql];
  for (const candidate of candidates) {
    if (typeof candidate === "function") return candidate as (url: string) => SqlTag;
  }

  if (typeof module === "function") return module as (url: string) => SqlTag;
  return null;
}

class PgBackend implements SqlBackend {
  label: string;
  private pool: any;
  private ready = false;

  constructor(url: string) {
    const { Pool } = require_("pg") as { Pool: new (config: any) => any };
    this.pool = new Pool({
      connectionString: url,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
    });
    this.label = "postgres:pg";
  }

  private async init() {
    if (this.ready) return;
    await this.pool.query(CREATE_TABLE);
    this.ready = true;
  }

  async get(uuid: string): Promise<SqlRow | null> {
    await this.init();
    const result = await this.pool.query(
      "SELECT uuid, token_hash, hash, config, updated_at FROM boobs WHERE uuid = $1",
      [uuid]
    );
    return (result.rows[0] as SqlRow) ?? null;
  }

  async all(): Promise<SqlRow[]> {
    await this.init();
    const result = await this.pool.query("SELECT uuid, token_hash, hash, config, updated_at FROM boobs");
    return result.rows as SqlRow[];
  }

  async put(row: SqlRow): Promise<void> {
    await this.init();
    await this.pool.query(
      "INSERT INTO boobs (uuid, token_hash, hash, config, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (uuid) DO UPDATE SET token_hash = EXCLUDED.token_hash, hash = EXCLUDED.hash, config = EXCLUDED.config, updated_at = EXCLUDED.updated_at",
      [row.uuid, row.token_hash, row.hash, JSON.stringify(row.config), row.updated_at]
    );
  }

  async remove(uuid: string): Promise<void> {
    await this.init();
    await this.pool.query("DELETE FROM boobs WHERE uuid = $1", [uuid]);
  }
}

class HttpBackend implements SqlBackend {
  label: string;
  private tag: SqlTag;
  private ready: Promise<void> | null = null;

  constructor(url: string, label: string, tag: SqlTag) {
    this.label = label;
    this.tag = tag;
  }

  private async init(): Promise<void> {
    if (!this.ready) {
      this.ready = this.tag`CREATE TABLE IF NOT EXISTS boobs (uuid TEXT PRIMARY KEY, token_hash TEXT NOT NULL, hash TEXT NOT NULL, config JSONB NOT NULL, updated_at TEXT NOT NULL)`.then(
        () => undefined
      );
    }
    await this.ready;
  }

  async get(uuid: string): Promise<SqlRow | null> {
    await this.init();
    const rows = (await this.tag`SELECT uuid, token_hash, hash, config, updated_at FROM boobs WHERE uuid = ${uuid}`) as SqlRow[];
    return rows?.[0] ?? null;
  }

  async all(): Promise<SqlRow[]> {
    await this.init();
    const rows = (await this.tag`SELECT uuid, token_hash, hash, config, updated_at FROM boobs`) as SqlRow[];
    return rows ?? [];
  }

  async put(row: SqlRow): Promise<void> {
    await this.init();
    await this.tag`INSERT INTO boobs (uuid, token_hash, hash, config, updated_at) VALUES (${row.uuid}, ${row.token_hash}, ${row.hash}, ${JSON.stringify(row.config)}::jsonb, ${row.updated_at}) ON CONFLICT (uuid) DO UPDATE SET token_hash = EXCLUDED.token_hash, hash = EXCLUDED.hash, config = EXCLUDED.config, updated_at = EXCLUDED.updated_at`;
  }

  async remove(uuid: string): Promise<void> {
    await this.init();
    await this.tag`DELETE FROM boobs WHERE uuid = ${uuid}`;
  }
}

const backends = new Map<string, SqlBackend | null>();

export async function resolveSqlBackend(url: string): Promise<SqlBackend | null> {
  if (backends.has(url)) return backends.get(url) ?? null;

  try {
    const backend = new PgBackend(url);
    backends.set(url, backend);
    return backend;
  } catch {
  }

  for (const name of httpCandidates()) {
    try {
      const module: any = await import(/* @vite-ignore */ name);
      const factory = driverFactory(module);
      if (!factory) continue;

      const backend = new HttpBackend(url, `postgres:${name}`, factory(url));
      backends.set(url, backend);
      return backend;
    } catch {
    }
  }

  try {
    const backend = new HttpBackend(url, "postgres:http", neon(url) as unknown as SqlTag);
    backends.set(url, backend);
    return backend;
  } catch {
  }

  backends.set(url, null);
  return null;
}
