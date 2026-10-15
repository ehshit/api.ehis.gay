export default defineEventHandler(async (event) => {
  if (!readAllowed(clientIp(event))) throw rateLimitedResponse();

  const query = getQuery(event);
  const raw = query.uuids ?? query.multiple ?? query.uuid;

  if (raw === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "provide ?uuids=a,b,c"
    });
  }

  const uuids = String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (uuids.length === 0) throw invalidUuidResponse(event);
  if (uuids.length > 50) {
    throw createError({ statusCode: 400, statusMessage: "Bad Request", message: "max 50 uuids per batch" });
  }

  return await getManyConfigs(uuids);
});