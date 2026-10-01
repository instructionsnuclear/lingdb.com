import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { dictionaries, words, dialogueTrees } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import DialogueTreeClient from "@/components/dialogue-trees/DialogueTreeClient";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dialogueTrees" });
  return {
    title: `${t("title")} | Lingdb`,
    description: t("subtitle"),
  };
}

export default async function DialogueTreesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ treeId?: string }>;
}) {
  const { locale } = await params;
  const { treeId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?returnUrl=/${locale}/dialogue-trees`);
  }

  const { getOrCreateDbUser } = await import("@/lib/db/auth-helper");
  let dbUser;
  try {
    dbUser = await getOrCreateDbUser(user);
  } catch (err) {
    console.error("Error getting user for dialogue trees:", err);
  }

  if (!dbUser) {
    redirect(`/${locale}/login?error=db_sync_failed`);
  }

  // Fetch all user's dialogue trees
  const userTrees = await db.query.dialogueTrees.findMany({
    where: eq(dialogueTrees.userId, dbUser.id),
    orderBy: [desc(dialogueTrees.updatedAt)],
  });

  // Fetch user's dictionaries
  const userDicts = await db.query.dictionaries.findMany({
    where: eq(dictionaries.userId, dbUser.id),
    orderBy: [desc(dictionaries.updatedAt)],
  });

  const dictIds = userDicts.map((d) => d.id);

  // Fetch all words from user's dictionaries for word highlighting
  const userWordsList = dictIds.length > 0
    ? await db.query.words.findMany({
        where: inArray(words.dictionaryId, dictIds),
        columns: {
          id: true,
          title: true,
          translation: true,
          dictionaryId: true,
        },
      })
    : [];

  const dictMap = new Map(userDicts.map((d) => [d.id, d.title]));

  const enrichedWords = userWordsList.map((w) => ({
    id: w.id,
    title: w.title,
    translation: w.translation,
    dictionaryTitle: dictMap.get(w.dictionaryId) || "",
  }));

  const userDictMeta = userDicts.map((d) => ({
    id: d.id,
    title: d.title,
    language: d.language,
  }));

  return (
    <DialogueTreeClient
      initialTrees={userTrees}
      initialTreeId={treeId}
      initialUserDictionaries={userDictMeta}
      initialSavedWords={enrichedWords}
      initialAiCredits={dbUser.aiCredits}
      locale={locale}
    />
  );
}
