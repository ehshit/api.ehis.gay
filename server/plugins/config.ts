export default defineNitroPlugin(() => {
  try {
    const config = loadAppConfig();
    applyStorageEnv(config);
    if (config.configPath) {
      console.log(`[config] using ${config.configPath} (branding: ${config.branding.name})`);
    }
  } catch (error) {
    console.warn("[config] failed to load config.toml:", error);
  }
});