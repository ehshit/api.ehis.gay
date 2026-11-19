export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const uuid = typeof query.uuid === "string" ? query.uuid : "";
  const token =
    getBearerToken(getHeader(event, "authorization")) ??
    (typeof query.token === "string" ? query.token : null);

  if (!isValidUuid(uuid)) throw invalidUuidResponse(event);
  if (!token) throw unauthorizedResponse();

  let result: Awaited<ReturnType<typeof deleteEntry>>;
  try {
    result = await deleteEntry(uuid, token);
  } catch (error) {
    if (error instanceof DbProblem) return dbErrorResponse(event, error.kind);
    throw error;
  }
  if (!result.authed) throw unauthorizedResponse();

  return { ok: true };
});