import type { MetadataRoute } from "next";
import { NEGOCIO } from "./lib/negocio";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: NEGOCIO.sitio,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
