'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import Badge from '@/components/ui/Badge';
import {
  Globe,
  Lock,
  Users,
  BookOpen,
  Clock,
  Sparkles,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';
import type { Dictionary } from '@/lib/db/schema';

const languageFlags: Record<string, string> = {
  en: 'fi fi-gb',
  fr: 'fi fi-fr',
  de: 'fi fi-de',
  es: 'fi fi-es',
  tr: 'fi fi-tr',
};

interface DictionaryCardProps {
  dictionary: Dictionary & {
    wordCount?: number;
    isShared?: boolean;
  };
}

export default function DictionaryCard({ dictionary }: DictionaryCardProps) {
  const locale = useLocale();
  const tDict = useTranslations('dictionary');
  const tDash = useTranslations('dashboard');
  const tExplore = useTranslations('explore');
  const flagClass = languageFlags[dictionary.language] || 'fi fi-xx';

  const langName = tExplore.has(dictionary.language)
    ? tExplore(dictionary.language)
    : dictionary.language.toUpperCase();

  const updated = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dictionary.updatedAt));

  return (
    <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5 sm:p-6 transition-all duration-200 hover:border-primary-500/40 hover:shadow-xl hover:shadow-primary-500/5 overflow-hidden">
      {/* Quizlet-style left accent indicator on card hover */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Main content */}
      <div className="flex-1 min-w-0 pr-0 sm:pr-4">
        {/* Meta badges row */}
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          {/* Flag & Language pill */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bg)] border border-[var(--border-color)] text-[var(--fg)]/85 shadow-2xs">
            <span className={`text-base rounded-xs overflow-hidden ${flagClass}`}></span>
            <span>{langName}</span>
          </span>

          {/* Word count pill */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{tDash('word_count', { count: dictionary.wordCount ?? 0 })}</span>
          </span>

          {/* Visibility badge */}
          {dictionary.isPublic ? (
            <Badge variant="default" className="text-xs py-1">
              <Globe className="mr-1 h-3 w-3" />
              {tDict('public')}
            </Badge>
          ) : (
            <Badge variant="warning" className="text-xs py-1">
              <Lock className="mr-1 h-3 w-3" />
              {tDict('private')}
            </Badge>
          )}

          {dictionary.isShared && (
            <Badge variant="secondary" className="text-xs py-1">
              <Users className="mr-1 h-3 w-3" />
              Shared
            </Badge>
          )}
        </div>

        {/* Title & Saved Word Demos inline - Forced single text line */}
        <h3 className="truncate whitespace-nowrap overflow-hidden text-ellipsis text-lg sm:text-xl font-extrabold font-heading tracking-tight leading-snug">
          <Link
            href={`/${locale}/dictionary/${dictionary.id}`}
            className="after:absolute after:inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-2xl text-[var(--fg)] group-hover:text-primary-500 transition-colors"
          >
            {dictionary.title}
          </Link>
          {dictionary.description && (
            <span className="ml-2 text-sm sm:text-base font-normal font-sans text-[var(--fg)]/45">
              ({dictionary.description})
            </span>
          )}
        </h3>

        {/* Timestamp */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--fg)]/45">
          <Clock className="h-3.5 w-3.5" />
          <span>{tDash('last_updated', { date: updated })}</span>
        </div>
      </div>

      {/* Right side: Quick Study Actions + Chevron */}
      <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0 border-t border-[var(--border-color)]/60 sm:border-0 sm:self-center shrink-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/dictionary/${dictionary.id}/flashcards`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl bg-primary-500/10 hover:bg-primary-500 text-primary-600 dark:text-primary-400 hover:text-white transition-all duration-150 active:scale-[0.98] shadow-2xs cursor-pointer"
            title={tDict('flashcards_tab')}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{tDict('flashcards_tab')}</span>
          </Link>
          <Link
            href={`/${locale}/dictionary/${dictionary.id}/quiz`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[var(--bg)] border border-[var(--border-color)] hover:border-primary-500/40 hover:bg-primary-500/5 text-[var(--fg)]/80 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-150 active:scale-[0.98] shadow-2xs cursor-pointer"
            title={tDict('quiz_tab')}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>{tDict('quiz_tab')}</span>
          </Link>
        </div>

        <div className="hidden sm:flex items-center pl-1 text-[var(--fg)]/30 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-200">
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
