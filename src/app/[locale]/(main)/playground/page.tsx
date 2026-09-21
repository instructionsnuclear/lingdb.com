import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { dictionaries, words, dictionaryLists } from "@/lib/db/schema";
import { eq, sql, desc, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import PlaygroundClient from "@/components/playground/PlaygroundClient";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground" });
  return {
    title: `${t("title")} | Lingdb`,
    description: t("subtitle"),
  };
}

export default async function PlaygroundPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ packId?: string }>;
}) {
  const { locale } = await params;
  const { packId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?returnUrl=/${locale}/playground`);
  }

  const { getOrCreateDbUser } = await import("@/lib/db/auth-helper");
  let dbUser;
  try {
    dbUser = await getOrCreateDbUser(user);
  } catch (err) {
    console.error("Error getting user for playground:", err);
  }

  if (!dbUser) {
    redirect(`/${locale}/login?error=db_sync_failed`);
  }

  // Fetch all user's dictionaries with word counts for the pack selector
  const userDictionaries = await db
    .select({
      id: dictionaries.id,
      title: dictionaries.title,
      description: dictionaries.description,
      language: dictionaries.language,
      isPublic: dictionaries.isPublic,
      wordCount: sql<number>`count(distinct ${words.id})::int`,
    })
    .from(dictionaries)
    .leftJoin(words, eq(words.dictionaryId, dictionaries.id))
    .where(eq(dictionaries.userId, dbUser.id))
    .groupBy(dictionaries.id)
    .orderBy(dictionaries.title);

  // Fetch user's saved packs
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

  const enrichedPacks = savedPacks.map((pack) => {
    const packDicts = (pack.dictionaryIds || [])
      .map((id) => dictMap.get(id))
      .filter(Boolean) as Array<{ id: string; title: string; language: string }>;

    return {
      ...pack,
      dictionaries: packDicts,
      dictionaryCount: packDicts.length,
    };
  });

  return (
    <PlaygroundClient
      locale={locale}
      initialUserDictionaries={userDictionaries}
      initialSavedPacks={enrichedPacks}
      initialPackId={packId}
      aiCredits={dbUser.aiCredits}
    />
  );
}
