export default defineEventHandler(async (event) => {
  const token = getBearerToken(getHeader(event, "authorization"));
  if (!token) throw unauthorizedResponse();

  const body = await readBody(event).catch(() => null);
  const uuid = body?.uuid;

  if (!isValidUuid(uuid)) throw invalidUuidResponse(event);

  const entry = await readEntry(uuid);
  if (!entry || !tokensMatch(entry.tokenHash, token)) throw unauthorizedResponse();

  const config = sanitizeConfig(body);
  if (Object.keys(config).length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Bad Request", message: "no valid config fields" });
  }

  const result = await putConfig(uuid, config);
  return { uuid, hash: configHash(config), ...result };
});