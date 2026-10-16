import { parse as parseYaml } from "yaml";
import { getUserAgent } from "./appconfig";

const OWNER = "microsoft";
const REPO = "winget-pkgs";
const API = "https://api.github.com";
const CACHE_TTL = 10 * 60 * 1000;

interface CacheEntry {
  at: number;
  data: any;
}

const cache = new Map<string, CacheEntry>();

function cacheGet(key: string) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  return hit.data;
}

function cacheSet(key: string, data: any) {
  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), data });
}

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": getUserAgent(),
    Accept: "application/vnd.github+json"
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function ghFetch(path: string, asText = false) {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const cached = cacheGet(url);
  if (cached !== undefined) return cached;

  const isApi = url.startsWith(API);
  const headers: Record<string, string> = isApi
    ? ghHeaders()
    : { "User-Agent": getUserAgent(), Accept: "text/plain, application/yaml, */*" };
  if (!isApi && process.env.GITHUB_TOKEN && url.includes("github")) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const rateLimited = (res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0";
    throw createError({
      statusCode: rateLimited ? 429 : res.status === 404 ? 404 : 502,
      statusMessage: rateLimited ? "Too Many Requests" : res.status === 404 ? "Not Found" : "Bad Gateway",
      message: rateLimited
        ? "github rate limit hit, set GITHUB_TOKEN to raise it"
        : res.status === 404
          ? "not found on winget-pkgs"
          : `github responded ${res.status}`
    });
  }

  const data = asText ? await res.text() : await res.json();
  cacheSet(url, data);
  return data;
}

function ghContents(dir: string): Promise<Array<{ name: string; path: string; type: string; download_url?: string }>> {
  return ghFetch(`/repos/${OWNER}/${REPO}/contents/${dir.split("/").map(encodeURIComponent).join("/")}`);
}

function findCaseInsensitive(entries: Array<{ name: string }>, wanted: string) {
  const lower = wanted.toLowerCase();
  return entries.find((e) => e.name.toLowerCase() === lower)?.name ?? null;
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.\-_+]/);
  const pb = b.split(/[.\-_+]/);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? "0";
    const y = pb[i] ?? "0";
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      const diff = Number(x) - Number(y);
      if (diff !== 0) return diff;
    } else {
      const diff = x.localeCompare(y);
      if (diff !== 0) return diff;
    }
  }
  return 0;
}

export interface WingetQuery {
  package: string;
  publisher?: string;
  letter?: string;
  version?: string;
  locale?: string;
  full?: boolean;
}

export function splitQuery(query: WingetQuery) {
  const identifierInput = query.package.trim();
  let publisher = query.publisher?.trim();
  let name: string;

  if (publisher) {
    name = identifierInput;
  } else {
    const dot = identifierInput.indexOf(".");
    if (dot > 0) {
      publisher = identifierInput.slice(0, dot);
      name = identifierInput.slice(dot + 1);
    } else {
      publisher = identifierInput;
      name = identifierInput;
    }
  }

  const first = publisher.charAt(0).toLowerCase();
  const letter = query.letter?.trim().toLowerCase() || first;

  return { letter, publisher, name };
}

export async function resolveWinget(query: WingetQuery) {
  const { letter, publisher, name } = splitQuery(query);

  if (!/^[0-9a-z]$/.test(letter)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "letter must be 0-9 or a-z, pass ?letter= explicitly"
    });
  }

  const publishers = await ghContents(`manifests/${letter}`);
  const publisherDir = findCaseInsensitive(publishers, publisher);
  if (!publisherDir) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: `publisher "${publisher}" not found under manifests/${letter}. pass ?publisher= and ?letter= if it lives elsewhere`
    });
  }

  const packages = await ghContents(`manifests/${letter}/${publisherDir}`);
  const packageDir = findCaseInsensitive(packages, name);
  if (!packageDir) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: `package "${name}" not found under ${publisherDir}`
    });
  }

  const versionsPath = `manifests/${letter}/${publisherDir}/${packageDir}`;
  const versions = (await ghContents(versionsPath)).filter((e) => e.type === "dir");
  if (versions.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Not Found", message: "no versions published" });
  }

  const sorted = versions.map((v) => v.name).sort(compareVersions);
  const requested = query.version?.trim();
  const version = requested
    ? findCaseInsensitive(versions, requested)
    : sorted[sorted.length - 1];

  if (!version) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: `version "${requested}" not found, latest is ${sorted[sorted.length - 1]}`
    });
  }

  const versionPath = `${versionsPath}/${version}`;
  const files = await ghContents(versionPath);
  const identifier = `${publisherDir}.${packageDir}`;
  const lowerId = identifier.toLowerCase();

  const versionFile =
    files.find((f) => f.name.toLowerCase() === `${lowerId}.yaml`) ??
    files.find(
      (f) =>
        f.name.endsWith(".yaml") &&
        !f.name.toLowerCase().includes(".installer.") &&
        !f.name.toLowerCase().includes(".locale.")
    );

  if (!versionFile) {
    throw createError({ statusCode: 502, statusMessage: "Bad Gateway", message: "version manifest missing" });
  }

  const localeFiles = files.filter((f) => f.name.toLowerCase().includes(".locale."));
  const availableLocales = localeFiles
    .map((f) => /\.locale\.([a-z0-9-]+)\.ya?ml$/i.exec(f.name)?.[1] ?? null)
    .filter((l): l is string => !!l);

  const localeWanted = query.locale?.trim();
  const localeFile = localeWanted
    ? localeFiles.find((f) => f.name.toLowerCase() === `${lowerId}.locale.${localeWanted.toLowerCase()}.yaml`)
    : localeFiles.find((f) => f.name.toLowerCase().endsWith(".locale.en-us.yaml")) ?? localeFiles[0];

  if (localeWanted && !localeFile) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: `no ${localeWanted} locale manifest, available: ${availableLocales.join(", ") || "none"}`
    });
  }

  const localeUsed = /\.locale\.([a-z0-9-]+)\.ya?ml$/i.exec(localeFile?.name ?? "")?.[1] ?? null;

  const installerFile = files.find((f) => f.name.toLowerCase().endsWith(".installer.yaml"));

  const [versionManifest, localeManifest, installerManifest] = await Promise.all([
    ghFetch(versionFile.download_url!, true).then(safeYaml),
    localeFile ? ghFetch(localeFile.download_url!, true).then(safeYaml) : Promise.resolve(undefined),
    installerFile ? ghFetch(installerFile.download_url!, true).then(safeYaml) : Promise.resolve(undefined)
  ]);

  return {
    letter,
    publisher: publisherDir,
    name: packageDir,
    identifier: (versionManifest?.PackageIdentifier as string) || identifier,
    version,
    latestVersion: sorted[sorted.length - 1],
    versionCount: sorted.length,
    locale: localeUsed,
    availableLocales,
    manifestPath: `${versionPath}/${versionFile.name}`,
    manifestUrl: versionFile.download_url ?? null,
    manifestUrls: {
      version: versionFile.download_url ?? null,
      locale: localeFile?.download_url ?? null,
      installer: installerFile?.download_url ?? null
    },
    repoUrl: `https://github.com/${OWNER}/${REPO}/tree/master/${versionsPath}/${version}`,
    details: buildDetails(versionManifest, localeManifest, installerManifest, !!query.full),
    manifests: { version: versionManifest, locale: localeManifest, installer: installerManifest }
  };
}

const MAX_DESCRIPTION = 900;
const MAX_NOTES = 400;

function cleanText(value: string): string {
  return value
    .replace(/\uFFFD/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export function deepClean(value: any): any {
  if (typeof value === "string") return cleanText(value);
  if (Array.isArray(value)) return value.map(deepClean);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, inner] of Object.entries(value)) out[key] = deepClean(inner);
    return out;
  }
  return value;
}

function safeYaml(text: string) {
  try {
    return parseYaml(text);
  } catch {
    return undefined;
  }
}

function pick(...sources: Array<Record<string, any> | undefined>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (out[key] === undefined && value !== undefined && value !== null) out[key] = value;
    }
  }
  return out;
}

const DETAIL_KEYS = [
  "PackageIdentifier",
  "PackageVersion",
  "PackageLocale",
  "ManifestVersion",
  "PackageName",
  "Publisher",
  "PublisherUrl",
  "PublisherSupportUrl",
  "PrivacyUrl",
  "Author",
  "PackageUrl",
  "License",
  "LicenseUrl",
  "Copyright",
  "CopyrightUrl",
  "ShortDescription",
  "Description",
  "Moniker",
  "Tags",
  "InstallationNotes",
  "ReleaseNotes",
  "ReleaseNotesUrl",
  "InstallerType",
  "NestedInstallerType",
  "InstallerUrl",
  "InstallerSha256",
  "InstallerLocale",
  "Scope",
  "MinimumOSVersion",
  "UpgradeBehavior",
  "Commands",
  "Protocols",
  "FileExtensions",
  "Dependencies"
];

function buildDetails(
  versionManifest?: Record<string, any>,
  localeManifest?: Record<string, any>,
  installerManifest?: Record<string, any>,
  full = false
) {
  const merged = pick(localeManifest, versionManifest, installerManifest);
  const details: Record<string, any> = {};
  for (const key of DETAIL_KEYS) {
    if (merged[key] === undefined) continue;

    if (!full && key === "Description" && typeof merged[key] === "string") {
      details[key] = truncate(merged[key] as string, MAX_DESCRIPTION);
      continue;
    }

    if (!full && (key === "ReleaseNotes" || key === "InstallationNotes")) {
      continue;
    }

    details[key] = merged[key];
  }

  const installers = installerManifest?.Installers;
  if (Array.isArray(installers) && installers.length > 0) {
    details.Installers = installers.map((entry: any) => ({
      Architecture: entry.Architecture,
      InstallerType: entry.InstallerType,
      InstallerUrl: entry.InstallerUrl,
      Scope: entry.Scope,
      InstallerLocale: entry.InstallerLocale,
      MinimumOSVersion: entry.MinimumOSVersion
    }));
  }

  if (full && typeof merged.ReleaseNotes === "string") {
    details.ReleaseNotes = truncate(merged.ReleaseNotes as string, MAX_NOTES);
  }

  return details;
}