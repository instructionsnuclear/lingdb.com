'use client';

import DictionaryCard from './DictionaryCard';
import EmptyState from '@/components/common/EmptyState';
import type { Dictionary } from '@/lib/db/schema';

interface DictionaryGridProps {
  dictionaries: (Dictionary & { wordCount?: number; isShared?: boolean })[];
  onCreateClick: () => void;
  createButtonId?: string;
}

export default function DictionaryGrid({
  dictionaries,
  onCreateClick,
  createButtonId,
}: DictionaryGridProps) {
  if (dictionaries.length === 0) {
    return (
      <EmptyState
        title="No dictionaries yet"
        description="Create your first dictionary to start building your vocabulary and learning a new language."
        actionLabel="Create Dictionary"
        onAction={onCreateClick}
        actionId={createButtonId}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4">
      {dictionaries.map((dict) => (
        <DictionaryCard key={dict.id} dictionary={dict} />
      ))}
    </div>
  );
}
