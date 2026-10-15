export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null);
  const uuid = body?.uuid;
  const token = typeof body?.token === "string" ? body.token : "";

  if (!isValidUuid(uuid)) throw invalidUuidResponse(event);
  if (!token) throw unauthorizedResponse();

  const result = await deleteEntry(uuid, token);
  if (!result.authed) throw unauthorizedResponse();

  return { ok: true };
});