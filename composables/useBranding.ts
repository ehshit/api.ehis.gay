export interface BrandingInfo {
  name: string;
  description: string;
  userAgent: string;
}

const FALLBACK: BrandingInfo = {
  name: "api.ehis.gay",
  description: "",
  userAgent: "api.ehis.gay"
};

export function useBranding() {
  return useAsyncData<BrandingInfo>(
    "branding",
    () => $fetch<BrandingInfo>("/branding"),
    {
      default: () => ({ ...FALLBACK }),
      transform: (data) => ({
        name: data?.name?.trim() || FALLBACK.name,
        description: data?.description?.trim() || "",
        userAgent: data?.userAgent?.trim() || data?.name?.trim() || FALLBACK.userAgent
      })
    }
  );
}