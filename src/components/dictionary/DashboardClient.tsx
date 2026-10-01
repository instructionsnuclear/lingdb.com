'use client';

import { useState, useMemo } from 'react';
import { Plus, Layers } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/common/SearchBar';
import DictionaryGrid from '@/components/dictionary/DictionaryGrid';
import CreateDictionaryModal from '@/components/dictionary/CreateDictionaryModal';
import DictionaryListSelectorModal from '@/components/playground/DictionaryListSelectorModal';
import Button from '@/components/ui/Button';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { Dictionary } from '@/lib/db/schema';
import type { EnrichedDictionaryList } from '@/lib/api/playground.api';

interface DashboardClientProps {
  dictionaries: (Dictionary & { wordCount: number })[];
  savedPacks?: EnrichedDictionaryList[];
}

export default function DashboardClient({
  dictionaries,
  savedPacks = [],
}: DashboardClientProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMixModalOpen, setIsMixModalOpen] = useState(false);
  const [currentSavedPacks, setCurrentSavedPacks] = useState<EnrichedDictionaryList[]>(savedPacks);
  const debouncedSearch = useDebounce(search);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return dictionaries;
    const q = debouncedSearch.toLowerCase();
    return dictionaries.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
    );
  }, [dictionaries, debouncedSearch]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('search_placeholder')}
          className="w-full sm:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          {dictionaries.length >= 2 && (
            <button
              type="button"
              id="mashup-dictionaries-btn"
              onClick={() => setIsMixModalOpen(true)}
              className="inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.97] bg-white/80 dark:bg-white/5 border border-primary-500/30 hover:border-primary-500 hover:bg-primary-500/10 text-primary-600 dark:text-primary-300 px-4 py-2.5 text-base sm:text-lg rounded-xl gap-2 shadow-xs hover:shadow-md backdrop-blur-md cursor-pointer"
              title={t('mashup_dictionaries')}
            >
              <Layers className="h-4 w-4 text-primary-500" />
              {t('mashup_dictionaries')}
            </button>
          )}

          <Button id="create-dictionary-btn" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('create_new')}
          </Button>
        </div>
      </div>

      {debouncedSearch && filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[var(--fg)]/50">
            No dictionaries matching &quot;{debouncedSearch}&quot;
          </p>
        </div>
      ) : (
        <DictionaryGrid
          dictionaries={filtered}
          onCreateClick={() => setIsCreateOpen(true)}
          createButtonId="create-dictionary-btn"
        />
      )}

      <CreateDictionaryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <DictionaryListSelectorModal
        isOpen={isMixModalOpen}
        isInline={false}
        onClose={() => setIsMixModalOpen(false)}
        savedPacks={currentSavedPacks}
        userDictionaries={dictionaries}
        onSelectPack={(pack) => {
          setIsMixModalOpen(false);
          if (pack.id) {
            router.push(`/${locale}/playground?packId=${pack.id}`);
          } else {
            const q = new URLSearchParams({
              dictIds: pack.dictionaryIds.join(','),
              lang: pack.language,
              title: pack.title,
            });
            router.push(`/${locale}/playground?${q.toString()}`);
          }
        }}
        onPackCreated={(newPack) => {
          setCurrentSavedPacks((prev) => [newPack, ...prev]);
          setIsMixModalOpen(false);
          router.push(`/${locale}/playground?packId=${newPack.id}`);
        }}
        onPackDeleted={(packId) => {
          setCurrentSavedPacks((prev) => prev.filter((p) => p.id !== packId));
        }}
      />
    </>
  );
}
