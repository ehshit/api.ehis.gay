import { parse, stringify } from "yaml";

export default defineEventHandler(async (event) => {
  const raw = await useStorage("assets:openapi").getItemRaw<string | Uint8Array>("openapi.yml");
  const text = typeof raw === "string" ? raw : raw ? new TextDecoder().decode(raw) : "";
  if (!text) {
    throw createError({ statusCode: 500, statusMessage: "OpenAPI spec missing" });
  }

  const doc = parse(text);
  const branding = getBranding();

  if (doc?.info) {
    doc.info.title = branding.name;
    if (branding.description) doc.info.description = branding.description;
  }
  doc.servers = [{ url: branding.serverUrl || getRequestURL(event).origin }];

  setResponseHeader(event, "content-type", "application/yaml; charset=utf-8");
  return stringify(doc);
});