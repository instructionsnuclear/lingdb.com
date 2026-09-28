import GamesClient from "@/components/games/GamesClient";
import type { Metadata } from "next";
import { APP_URL, SUPPORTED_LOCALES } from "@/lib/utils/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonicalPath = `/${locale}/games`;

  return {
    title: "Language Games Arcade | Lingdb",
    description:
      "Play interactive language games: challenge your vocabulary with Yordle and discover the upcoming party game Yaboo!",
    keywords: [
      "language games",
      "wordle",
      "yordle",
      "taboo",
      "yaboo",
      "multilingual wordle",
      "vocabulary games",
      "lingdb arcade",
    ],
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((supportedLocale) => [
          supportedLocale,
          `/${supportedLocale}/games`,
        ]),
      ),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: "Language Games Arcade | Lingdb",
      description:
        "Play interactive language games: challenge your vocabulary with Yordle and discover the upcoming party game Yaboo!",
      type: "website",
      url: `${APP_URL}${canonicalPath}`,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: "Language Games Arcade | Lingdb",
      description:
        "Play interactive language games: challenge your vocabulary with Yordle and discover the upcoming party game Yaboo!",
    },
  };
}

export default async function GamesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <GamesClient locale={locale} />;
}
