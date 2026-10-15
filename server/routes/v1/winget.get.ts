import { deepClean, resolveWinget } from "~~/server/utils/winget";

export default defineEventHandler(async (event) => {
  if (!readAllowed(clientIp(event))) throw rateLimitedResponse();

  const query = getQuery(event);
  const pkg = query.package;

  if (typeof pkg !== "string" || pkg.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message:
        "provide ?package=Microsoft.PowerToys (or ?package=PowerToys&publisher=Microsoft&letter=m). add &locale=en-US for a specific locale."
    });
  }

  const full = query.full === "1" || query.full === "true";

  const result = await resolveWinget({
    package: pkg,
    publisher: typeof query.publisher === "string" ? query.publisher : undefined,
    letter: typeof query.letter === "string" ? query.letter : undefined,
    version: typeof query.version === "string" ? query.version : undefined,
    locale: typeof query.locale === "string" ? query.locale : undefined,
    full
  });

  const cleaned = deepClean(result);
  const block = (cleaned as any).manifests;
  delete (cleaned as any).manifests;
  if (full && block) (cleaned as any).full = block;

  return cleaned;
});
