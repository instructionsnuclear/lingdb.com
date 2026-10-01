import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { dictionaries, words, users, dictionaryEditors, dictionaryLists } from "@/lib/db/schema";
import { eq, sql, or, and, desc, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dictionary/DashboardClient";
import OnboardingTour from "@/components/tutorial/OnboardingTour";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Get DB user - auto-create if missing to fix sync issues
  const { getOrCreateDbUser } = await import("@/lib/db/auth-helper");

  let dbUser;
  try {
    dbUser = await getOrCreateDbUser(user);
  } catch (error) {
    console.error("Error getting/creating DB user:", error);
  }

  if (!dbUser) {
    console.error("!!! REDIRECTING to db_sync_failed !!!");
    redirect(`/${locale}/login?error=db_sync_failed`);
  }

  // Get dictionaries with word counts
  const rawDictionaries = await db
    .select({
      id: dictionaries.id,
      title: dictionaries.title,
      description: dictionaries.description,
      language: dictionaries.language,
      isPublic: dictionaries.isPublic,
      slug: dictionaries.slug,
      userId: dictionaries.userId,
      seoTitle: dictionaries.seoTitle,
      seoDescription: dictionaries.seoDescription,
      seoGeneratedAt: dictionaries.seoGeneratedAt,
      lastDailyUpdateSentAt: dictionaries.lastDailyUpdateSentAt,
      createdAt: dictionaries.createdAt,
      updatedAt: dictionaries.updatedAt,
      activeMagicWords: dictionaries.activeMagicWords,
      wordCount: sql<number>`count(distinct ${words.id})::int`,
      isShared:
        sql<boolean>`EXISTS(SELECT 1 FROM dictionary_editors de WHERE de.dictionary_id = ${dictionaries.id} AND de.status = 'ACCEPTED')`.mapWith(
          Boolean,
        ),
    })
    .from(dictionaries)
    .leftJoin(words, eq(words.dictionaryId, dictionaries.id))
    .leftJoin(
      dictionaryEditors,
      eq(dictionaryEditors.dictionaryId, dictionaries.id),
    )
    .where(
      or(
        eq(dictionaries.userId, dbUser.id),
        and(
          eq(dictionaryEditors.userId, dbUser.id),
          eq(dictionaryEditors.status, "ACCEPTED"),
        ),
      ),
    )
    .groupBy(dictionaries.id, dictionaries.userId)
    .orderBy(dictionaries.updatedAt);

  // Ensure unique dictionary instances based on DB groupBy
  const userDictionaries = rawDictionaries;

  // Fetch user's saved packs for the mashup modal
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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <OnboardingTour
        hasCompletedTour={dbUser.hasCompletedTour}
        userId={dbUser.id}
      />
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{t("title")}</h1>
        <p className="mt-3 text-xl text-[var(--fg)]/50">
          {userDictionaries.length} {t("dictionaries_count")}
        </p>
      </div>

      <div id="dictionary-grid">
        <DashboardClient
          dictionaries={userDictionaries}
          savedPacks={enrichedPacks}
        />
      </div>
    </main>
  );
}
