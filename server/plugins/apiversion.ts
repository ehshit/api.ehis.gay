export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("request", (event) => {
    setResponseHeader(event, "X-API-Version", String(API_VERSION));
  });
});