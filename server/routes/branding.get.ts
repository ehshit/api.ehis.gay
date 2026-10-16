export default defineEventHandler(() => {
  const branding = getBranding();
  return {
    name: branding.name,
    description: branding.description,
    userAgent: getUserAgent()
  };
});