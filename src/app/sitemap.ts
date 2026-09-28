import { MetadataRoute } from "next";
import { db } from "@/lib/db/client";
import { dictionaries, blogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { APP_URL } from "@/lib/utils/constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = APP_URL;
  const locales = ["en", "fr", "de", "es", "tr"];

  // Fetch all public dictionaries with slugs
  const publicDicts = await db.query.dictionaries.findMany({
    where: eq(dictionaries.isPublic, true),
    columns: { slug: true, updatedAt: true },
  });

  // Fetch all published blogs
  const publishedBlogs = await db.query.blogs.findMany({
    where: eq(blogs.status, "PUBLISHED"),
    columns: { slug: true, updatedAt: true },
  });

  const routes = [
    "",
    "/library",
    "/games",
    "/wordle",
    "/wordle/create",
    "/tiers",
    "/login",
    "/signup",
    "/privacy",
    "/terms",
    "/cookies",
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Use the most recent blog update as lastModified for the blog list page
  const latestBlogDate = publishedBlogs.length
    ? publishedBlogs.reduce((latest, b) => {
        const d = b.updatedAt || new Date(0);
        return d > latest ? d : latest;
      }, new Date(0))
    : new Date();

  for (const locale of locales) {
    // Basic routes — all locales
    for (const route of routes) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: route === "" ? 1 : 0.8,
      });
    }

    // Blog list page — all locales
    sitemapEntries.push({
      url: `${baseUrl}/${locale}/blogs`,
      lastModified: latestBlogDate,
      changeFrequency: "daily",
      priority: 0.8,
    });

    // Individual blog posts — all locales
    for (const blog of publishedBlogs) {
      if (blog.slug) {
        sitemapEntries.push({
          url: `${baseUrl}/${locale}/blogs/${blog.slug}`,
          lastModified: blog.updatedAt || new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  }

  // Dynamic dictionaries — English only, using slug
  for (const dict of publicDicts) {
    if (dict.slug) {
      sitemapEntries.push({
        url: `${baseUrl}/en/library/${dict.slug}`,
        lastModified: dict.updatedAt || new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return sitemapEntries;
}
