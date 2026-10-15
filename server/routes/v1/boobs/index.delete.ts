export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const uuid = typeof query.uuid === "string" ? query.uuid : "";
  const token =
    getBearerToken(getHeader(event, "authorization")) ??
    (typeof query.token === "string" ? query.token : null);

  if (!isValidUuid(uuid)) throw invalidUuidResponse(event);
  if (!token) throw unauthorizedResponse();

  const result = await deleteEntry(uuid, token);
  if (!result.authed) throw unauthorizedResponse();

  return { ok: true };
});