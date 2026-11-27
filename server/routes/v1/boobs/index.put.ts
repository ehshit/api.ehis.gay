export default defineEventHandler(async (event) => {
  const token = getBearerToken(getHeader(event, "authorization"));
  if (!token) throw unauthorizedResponse();

  const body = await readBody(event).catch(() => null);
  const uuid = body?.uuid;

  if (!isValidUuid(uuid)) throw invalidUuidResponse(event);

  let entry: Awaited<ReturnType<typeof readEntry>>;
  try {
    entry = await readEntry(uuid);
  } catch (error) {
    if (error instanceof DbProblem) return dbErrorResponse(event, error.kind);
    throw error;
  }
  if (!entry || !entryTokensMatch(entry, token)) throw unauthorizedResponse();

  const config = sanitizeConfig(body);
  if (Object.keys(config).length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Bad Request", message: "no valid config fields" });
  }

  let result: Awaited<ReturnType<typeof putConfig>>;
  try {
    result = await putConfig(uuid, config);
  } catch (error) {
    if (error instanceof DbProblem) return dbErrorResponse(event, error.kind);
    throw error;
  }
  return { uuid, hash: configHash(config), ...result };
});