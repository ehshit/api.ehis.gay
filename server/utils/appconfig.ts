import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { parse as parseToml } from "smol-toml";

const DEFAULT_BRANDING_NAME = "api.ehis.gay";
const DEFAULT_BRANDING_DESCRIPTION = "API for ehis.gay with stuff!";

export interface AppConfig {
  branding: { name: string; description: string; serverUrl: string };
  http: { userAgent: string };
  port: { port: string };
  storage: {
    driver: "" | "json" | "sqlite" | "postgres";
    path: string;
    databaseUrl: string;
  };
  boobs: {
    requireMicrosoft: boolean;
    separateOffline: boolean;
    offlineDatabase: string;
  };
  configPath: string | null;
}

const TEMPLATE = `# Reboot the app after you edit the config file

[branding]
# what this app is named as?
name = "api.ehis.gay"
# Description for the Scalar documentation/OpenAPI
description = "API for ehis.gay with stuff!"
# server url shown on the Scalar docs
server_url = ""

[http]
# What is its user-agent when making requests
# leave empty to fall back to branding.name
user_agent = ""

[port]
# Sets the port to go to
port = ""

[storage]
# leave driver empty ("") to use environment defaults
# options: json | sqlite | postgres
driver = ""
# json: directory that holds boobs.json (default to the data folder)
# sqlite: path to a .db file (default to: data/boobs.db)
# relative paths are resolved next to this config
path = "data"
# postgres connection (when driver is set to "postgres")
database_url = ""

[boobs]
# Enforce players who connect to your API to have an valid Microsoft Account
require_microsoft = false
# Send offline (cracked) uuids to a separate database
separate_offline = false
# connection target for offline accounts, using the same format as [storage]
offline_database = ""
`;

let cached: AppConfig | null = null;

function defaults(configPath: string | null): AppConfig {
  return {
    branding: { name: DEFAULT_BRANDING_NAME, description: DEFAULT_BRANDING_DESCRIPTION, serverUrl: "" },
    http: { userAgent: "" },
    port: { port: "" },
    storage: { driver: "", path: "data", databaseUrl: "" },
    boobs: { requireMicrosoft: false, separateOffline: false, offlineDatabase: "" },
    configPath
  };
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function looksLikeNodeRuntime(): boolean {
  try {
    return /^(node|bun|deno)(\.exe)?$/i.test(basename(process.execPath));
  } catch {
    return true;
  }
}

export function configDir(): string | null {
  const override = process.env.API_CONFIG_DIR?.trim();
  if (override) return resolve(override);

  if (looksLikeNodeRuntime()) {
    try {
      const local = join(process.cwd(), "config.toml");
      if (existsSync(local)) return process.cwd();
    } catch {}
    return null;
  }

  try {
    return dirname(process.execPath);
  } catch {
    return null;
  }
}

export function loadAppConfig(): AppConfig {
  if (cached) return cached;

  const dir = configDir();
  if (!dir) return (cached = defaults(null));

  const file = join(dir, "config.toml");

  let exists = false;
  try {
    exists = existsSync(file);
  } catch {
    return (cached = defaults(null));
  }

  if (!exists) {
    try {
      writeFileSync(file, TEMPLATE, "utf8");
    } catch {
      return (cached = defaults(null));
    }
  }

  try {
    const parsed = parseToml(readFileSync(file, "utf8")) as Record<string, any>;
    const branding = parsed.branding ?? {};
    const http = parsed.http ?? {};
    const portSection = parsed.port ?? {};
    const storage = parsed.storage ?? {};
    const boobs = parsed.boobs ?? {};

    const rawDriver = pickString(storage.driver, "").toLowerCase();
    const driver: AppConfig["storage"]["driver"] =
      rawDriver === "json" || rawDriver === "sqlite" || rawDriver === "postgres" ? rawDriver : "";

    return (cached = {
      branding: {
        name: pickString(branding.name, DEFAULT_BRANDING_NAME),
        description: pickString(branding.description, DEFAULT_BRANDING_DESCRIPTION),
        serverUrl: pickString(branding.server_url, "")
      },
      http: { userAgent: pickString(http.user_agent, "") },
      port: { port: pickString(portSection.port, "") },
      storage: {
        driver,
        path: pickString(storage.path, "data"),
        databaseUrl: pickString(storage.database_url, "")
      },
      boobs: {
        requireMicrosoft: boobs.require_microsoft === true,
        separateOffline: boobs.separate_offline === true,
        offlineDatabase: pickString(boobs.offline_database, "")
      },
      configPath: file
    });
  } catch (error) {
    console.warn("[config] failed to parse config.toml, using defaults:", error);
    return (cached = defaults(null));
  }
}

export function applyStorageEnv(config: AppConfig = loadAppConfig()): void {
  if (!config.configPath) return;

  const dir = dirname(config.configPath);
  const abs = (value: string) => (isAbsolute(value) ? value : resolve(dir, value));
  const storage = config.storage;

  if (!storage.driver) {
    if (!process.env.DATA_DIR) {
      let path = storage.path || "data";
      if (/\.json$/i.test(path)) path = dirname(path);
      process.env.DATA_DIR = abs(path);
    }
    return;
  }

  if (storage.driver === "json") {
    let path = storage.path || "data";
    if (/\.json$/i.test(path)) path = dirname(path);
    process.env.STORAGE = "json";
    process.env.DATA_DIR = abs(path);
    delete process.env.DATABASE_URL;
    return;
  }

  if (storage.driver === "sqlite") {
    let path = storage.path || join("data", "boobs.db");
    if (!/\.(db|sqlite3?)$/i.test(path)) path = join(path, "boobs.db");
    process.env.STORAGE = abs(path);
    delete process.env.DATABASE_URL;
    return;
  }

  if (storage.driver === "postgres") {
    const url = storage.databaseUrl;
    if (!url) {
      console.warn("[config] storage.driver = postgres but storage.database_url is empty");
      return;
    }
    process.env.STORAGE = url;
    process.env.DATABASE_URL = url;
  }
}

export function getBranding() {
  return loadAppConfig().branding;
}

export function getUserAgent(): string {
  const config = loadAppConfig();
  return config.http.userAgent || config.branding.name;
}