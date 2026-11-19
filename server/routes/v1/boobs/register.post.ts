export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null);
  const uuid = body?.uuid;
  const recover = body?.recover === true;

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

  let token: string;
  try {
    ({ token } = await registerUuid(uuid, recover));
  } catch (error) {
    if (error instanceof DbProblem) return dbErrorResponse(event, error.kind);
    throw error;
  }
  const legal = getLegalPayload();
  return {
    uuid,
    token,
    microsoft: !offline,
    version: API_VERSION,
    ...(Object.keys(legal).length > 0 ? { legal } : {})
  };
});