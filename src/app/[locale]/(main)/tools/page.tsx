import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import {
  dictionaries,
  words,
  dictionaryLists,
  dialogueTrees,
} from "@/lib/db/schema";
import { eq, sql, desc, inArray } from "drizzle-orm";
import ToolsClient, { type ToolsUserDictionary } from "@/components/tools/ToolsClient";
import type { EnrichedDictionaryList } from "@/lib/api/playground.api";
import { APP_URL, SUPPORTED_LOCALES } from "@/lib/utils/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  const canonicalPath = `/${locale}/tools`;

  return {
    title: `${t("pageTitle")} | Lingdb`,
    description: t("pageSubtitle"),
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((supportedLocale) => [
          supportedLocale,
          `/${supportedLocale}/tools`,
        ]),
      ),
    },
    openGraph: {
      title: `${t("pageTitle")} | Lingdb`,
      description: t("pageSubtitle"),
      type: "website",
      url: `${APP_URL}${canonicalPath}`,
      locale,
    },
  };
}

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userDictionaries: ToolsUserDictionary[] = [];
  let enrichedPacks: EnrichedDictionaryList[] = [];
  let userTrees: Array<{ id: string; title: string; language: string }> = [];

  if (user) {
    const { getOrCreateDbUser } = await import("@/lib/db/auth-helper");
    let dbUser;
    try {
      dbUser = await getOrCreateDbUser(user);
    } catch (err) {
      console.error("Error fetching dbUser for tools page:", err);
    }

    if (dbUser) {
      // 1. Fetch user's dictionaries with word counts
      userDictionaries = await db
        .select({
          id: dictionaries.id,
          title: dictionaries.title,
          description: dictionaries.description,
          language: dictionaries.language,
          wordCount: sql<number>`count(distinct ${words.id})::int`,
        })
        .from(dictionaries)
        .leftJoin(words, eq(words.dictionaryId, dictionaries.id))
        .where(eq(dictionaries.userId, dbUser.id))
        .groupBy(dictionaries.id)
        .orderBy(dictionaries.updatedAt);

      // 2. Fetch saved packs and enrich
      const savedPacks = await db.query.dictionaryLists.findMany({
        where: eq(dictionaryLists.userId, dbUser.id),
        orderBy: [desc(dictionaryLists.updatedAt)],
      });

      const allDictIds = Array.from(
        new Set(savedPacks.flatMap((p) => p.dictionaryIds || [])),
      );

      const dictMetadata = allDictIds.length
        ? await db.query.dictionaries.findMany({
            where: inArray(dictionaries.id, allDictIds),
            columns: {
              id: true,
              title: true,
              language: true,
            },
          })
        : [];

      const dictMap = new Map(dictMetadata.map((d) => [d.id, d]));

      enrichedPacks = savedPacks.map((pack) => {
        const packDicts = (pack.dictionaryIds || [])
          .map((id) => dictMap.get(id))
          .filter(Boolean) as Array<{
          id: string;
          title: string;
          language: string;
        }>;

        return {
          ...pack,
          dictionaries: packDicts,
          dictionaryCount: packDicts.length,
        };
      });

      // 3. Fetch user's dialogue trees
      userTrees = await db.query.dialogueTrees.findMany({
        where: eq(dialogueTrees.userId, dbUser.id),
        columns: {
          id: true,
          title: true,
          language: true,
          nodes: true,
          updatedAt: true,
        },
        orderBy: [desc(dialogueTrees.updatedAt)],
      });
    }
  }

  return (
    <ToolsClient
      locale={locale}
      isLoggedIn={!!user}
      userDictionaries={userDictionaries}
      initialSavedPacks={enrichedPacks}
      userTrees={userTrees}
    />
  );
}
