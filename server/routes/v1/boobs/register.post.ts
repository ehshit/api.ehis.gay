export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null);
  const uuid = body?.uuid;

  if (!isValidUuid(uuid)) throw invalidUuidResponse(event);

  const ip = clientIp(event);
  if (!registerAllowed(ip)) throw rateLimitedResponse();

  const config = loadAppConfig();
  const offline = isOfflineUuid(uuid);

  if (config.boobs.requireMicrosoft && !config.boobs.separateOffline) {
    if (offline || !(await isMicrosoftUuid(uuid, getUserAgent()))) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
        message: "cracked_account"
      });
    }
  }

  const { token } = await registerUuid(uuid);
  return { uuid, token, microsoft: !offline, version: API_VERSION };
});