export type SeoSettingsKey = "global";

export interface ISeoSettings {
  key: SeoSettingsKey;
  siteName: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  defaultMetaKeywords: string;
  defaultCanonicalBaseUrl: string;
  defaultOpenGraphTitle: string;
  defaultOpenGraphDescription: string;
  defaultRobots: string;
}
