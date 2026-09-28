import YabooTeaserClient from "@/components/games/YabooTeaserClient";
import type { Metadata } from "next";
import { APP_URL, SUPPORTED_LOCALES } from "@/lib/utils/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonicalPath = `/${locale}/games/yaboo`;

  return {
    title: "Yaboo (Taboo Party Game) | Coming Soon | Lingdb",
    description:
      "Get ready for Yaboo! The hilarious multilingual forbidden word party game. Coming soon to Lingdb Games.",
    keywords: [
      "yaboo",
      "taboo online",
      "taboo game",
      "multilingual taboo",
      "party games",
      "forbidden words",
      "lingdb games",
    ],
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((supportedLocale) => [
          supportedLocale,
          `/${supportedLocale}/games/yaboo`,
        ]),
      ),
    },
    openGraph: {
      title: "Yaboo (Taboo Party Game) | Coming Soon | Lingdb",
      description:
        "Get ready for Yaboo! The hilarious multilingual forbidden word party game. Coming soon to Lingdb Games.",
      type: "website",
      url: `${APP_URL}${canonicalPath}`,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: "Yaboo (Taboo Party Game) | Coming Soon | Lingdb",
      description:
        "Get ready for Yaboo! The hilarious multilingual forbidden word party game. Coming soon to Lingdb Games.",
    },
  };
}

export default async function YabooPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <YabooTeaserClient locale={locale} />;
}
