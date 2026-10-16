import { parse, stringify } from "yaml";

export default defineEventHandler((event) => {
  const doc = parse(openapiSpec);
  const branding = getBranding();

  if (doc?.info) {
    doc.info.title = branding.name;
    if (branding.description) doc.info.description = branding.description;
  }
  doc.servers = [{ url: branding.serverUrl || getRequestURL(event).origin }];

  setResponseHeader(event, "content-type", "application/yaml; charset=utf-8");
  return stringify(doc);
});