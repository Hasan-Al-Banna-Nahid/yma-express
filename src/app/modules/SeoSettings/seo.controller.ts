import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import { ApiResponse } from "../../utils/apiResponse";
import { SeoSettings } from "./seo.model";
import { ISeoSettings } from "./seo.interface";

type SeoPayload = Partial<Omit<ISeoSettings, "key">>;

const getDefaultSeoSettings = (): ISeoSettings => ({
  key: "global",
  siteName: "",
  defaultMetaTitle: "",
  defaultMetaDescription: "",
  defaultMetaKeywords: "",
  defaultCanonicalBaseUrl: "",
  defaultOpenGraphTitle: "",
  defaultOpenGraphDescription: "",
  defaultRobots: "index, follow",
});

const getDefaultsWithoutKey = () => {
  const { key: _key, ...rest } = getDefaultSeoSettings();
  return rest;
};

const normalizePayload = (payload: SeoPayload) => {
  const cleaned: SeoPayload = {};

  if (typeof payload.siteName === "string") {
    cleaned.siteName = payload.siteName.trim();
  }
  if (typeof payload.defaultMetaTitle === "string") {
    cleaned.defaultMetaTitle = payload.defaultMetaTitle.trim();
  }
  if (typeof payload.defaultMetaDescription === "string") {
    cleaned.defaultMetaDescription = payload.defaultMetaDescription.trim();
  }
  if (typeof payload.defaultMetaKeywords === "string") {
    cleaned.defaultMetaKeywords = payload.defaultMetaKeywords.trim();
  }
  if (typeof payload.defaultCanonicalBaseUrl === "string") {
    cleaned.defaultCanonicalBaseUrl = payload.defaultCanonicalBaseUrl.trim();
  }
  if (typeof payload.defaultOpenGraphTitle === "string") {
    cleaned.defaultOpenGraphTitle = payload.defaultOpenGraphTitle.trim();
  }
  if (typeof payload.defaultOpenGraphDescription === "string") {
    cleaned.defaultOpenGraphDescription =
      payload.defaultOpenGraphDescription.trim();
  }
  if (typeof payload.defaultRobots === "string") {
    cleaned.defaultRobots = payload.defaultRobots.trim();
  }

  return cleaned;
};

export const getSeoSettings = asyncHandler(async (_req: Request, res: Response) => {
  const defaults = getDefaultSeoSettings();
  const settings = await SeoSettings.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: defaults },
    { new: true, upsert: true },
  );

  ApiResponse(res, 200, "SEO settings retrieved", {
    settings,
  });
});

export const updateSeoSettings = asyncHandler(async (req: Request, res: Response) => {
  const updateData = normalizePayload(req.body ?? {});

  if (Object.keys(updateData).length === 0) {
    throw new ApiError("No fields to update", 400);
  }

  const settings = await SeoSettings.findOneAndUpdate(
    { key: "global" },
    { $set: updateData, $setOnInsert: { key: "global" } },
    { new: true, upsert: true, runValidators: true },
  );

  ApiResponse(res, 200, "SEO settings updated successfully", {
    settings,
  });
});

export const resetSeoSettings = asyncHandler(async (_req: Request, res: Response) => {
  const defaults = getDefaultsWithoutKey();
  const settings = await SeoSettings.findOneAndUpdate(
    { key: "global" },
    { $set: defaults, $setOnInsert: { key: "global" } },
    { new: true, upsert: true, runValidators: true },
  );

  ApiResponse(res, 200, "SEO settings reset successfully", {
    settings,
  });
});
