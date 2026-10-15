export default defineEventHandler(async (event) => {
  if (!readAllowed(clientIp(event))) throw rateLimitedResponse();

  const query = getQuery(event);
  const single = query.uuid ?? query.ids;
  const batch = query.multiple ?? query.uuids;

  if (single !== undefined && batch === undefined) {
    if (!isValidUuid(single)) throw invalidUuidResponse(event);
    const config = await getConfig(single);
    if (!config) {
      throw createError({ statusCode: 404, statusMessage: "Not Found", message: "no config stored" });
    }
    return { [single]: config };
  }

  if (batch !== undefined) {
    const uuids = String(batch)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (uuids.length === 0) throw invalidUuidResponse(event);
    if (uuids.length > 50) {
      throw createError({ statusCode: 400, statusMessage: "Bad Request", message: "max 50 uuids per batch" });
    }
    return await getManyConfigs(uuids);
  }

  throw createError({ statusCode: 400, statusMessage: "Bad Request", message: "provide ?uuid= or ?uuids=" });
});