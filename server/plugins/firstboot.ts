import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export default defineNitroPlugin(() => {
  let dir = process.cwd();
  try {
    if (process.env.API_CONFIG_DIR?.trim()) dir = process.env.API_CONFIG_DIR.trim();
  } catch {}

  const marker = join(dir, "data", ".sync_welcome_shown");

  try {
    if (existsSync(marker)) return;
  } catch {
    return;
  }

  let configPort = "";
  try {
    configPort = loadAppConfig().port.port;
  } catch {}

  const host = process.env.HOST?.trim() || "localhost";
  const port = process.env.PORT?.trim() || configPort || "3000";
  const url = `http://${host}:${port}`;

  console.log(
    "If you are here for boobs syncing, you can test the server by going to " +
      `Mod Menu > Over The Limits > Sync > API URL and putting in ${url}\n\n` +
      "If you want to put this public, you might need port forwarding / tunneling which is now up to you\n\n" +
      `Most cases the tunnel needs to be pointed at ${url} btw`
  );

  try {
    mkdirSync(join(dir, "data"), { recursive: true });
    writeFileSync(marker, "", "utf8");
  } catch {}
});