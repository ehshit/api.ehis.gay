export function isOfflineUuid(uuid: string): boolean {
  return uuid.length > 14 && uuid[14]?.toLowerCase() === "3";
}

const cache = new Map<string, { result: boolean; at: number }>();
const CACHE_TTL = 60 * 60 * 1000;

export async function isMicrosoftUuid(uuid: string, userAgent: string): Promise<boolean> {
  const key = uuid.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.result;

  try {
    const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${key}`, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(5000)
    });
    const result = res.status === 200;
    cache.set(key, { result, at: Date.now() });
    if (cache.size > 10000) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    return result;
  } catch {
    return true;
  }
}