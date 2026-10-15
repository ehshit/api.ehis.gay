export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null);
  const uuid = body?.uuid;

  if (!isValidUuid(uuid)) throw invalidUuidResponse(event);

  const ip = clientIp(event);
  if (!registerAllowed(ip)) throw rateLimitedResponse();

  const { token } = await registerUuid(uuid);
  return { uuid, token };
});