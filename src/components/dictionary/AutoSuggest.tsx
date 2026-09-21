"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { suggestTranslation, suggestWords } from "@/lib/api/words.api";
import { qk } from "@/lib/tanstack/query-keys";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

interface AutoSuggestProps {
  language: string;
  targetLang?: string;
  sourceWord?: string; // The word to translate (for translation suggestions)
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  apiEndpoint?: string;
  rightElement?: React.ReactNode;
  autoFocus?: boolean;
  focusTrigger?: number;
}

export default function AutoSuggest({
  language,
  targetLang,
  sourceWord,
  value,
  onChange,
  placeholder = "Enter a word...",
  className,
  apiEndpoint = "/api/words/suggest",
  rightElement,
  autoFocus = false,
  focusTrigger = 0,
}: AutoSuggestProps) {
  const t_common = useTranslations("common");
  const queryClient = useQueryClient();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allTranslations, setAllTranslations] = useState<string[]>([]); // Cache for translations of sourceWord
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedValue = useDebounce(value, 200);
  const debouncedSourceWord = useDebounce(sourceWord, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isTranslationMode = apiEndpoint === "/api/words/translate-suggest";

  // Standard word suggestion query
  const { data: standardSuggestions } = useQuery({
    queryKey: qk.words.suggest({
      q: debouncedValue,
      lang: language,
      endpoint: apiEndpoint,
    }),
    enabled: !isTranslationMode && debouncedValue.length >= 2,
    queryFn: async () => {
      const data = await suggestWords({
        q: debouncedValue,
        lang: language,
        endpoint: apiEndpoint,
      });
      return data.suggestions || [];
    },
    staleTime: 120_000,
  });

  // Standard suggestion syncing from query cache
  useEffect(() => {
    if (isTranslationMode) return;

    if (debouncedValue.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const resolved = standardSuggestions || [];
    setSuggestions(resolved);
    setIsOpen(resolved.length > 0);
    setActiveIndex(-1);
  }, [debouncedValue, isTranslationMode, standardSuggestions]);

  // Reset translations when sourceWord or language changes
  useEffect(() => {
    if (!isTranslationMode) return;
    setAllTranslations([]);
    setSuggestions([]);
    setIsOpen(false);
  }, [sourceWord, language, targetLang, isTranslationMode]);

  // Prefetch translations in background as user finishes typing source word
  useEffect(() => {
    if (
      !isTranslationMode ||
      !debouncedSourceWord ||
      debouncedSourceWord.trim().length < 2
    ) {
      return;
    }

    const cleanWord = debouncedSourceWord.trim();
    const cacheKey = qk.words.translateSuggest({
      word: cleanWord,
      lang: language,
      targetLang,
    });

    queryClient.prefetchQuery({
      queryKey: cacheKey,
      queryFn: async () => {
        const res = await suggestTranslation({
          word: cleanWord,
          lang: language,
          targetLang,
          endpoint: apiEndpoint,
        });
        return res.suggestions || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [
    debouncedSourceWord,
    isTranslationMode,
    language,
    targetLang,
    apiEndpoint,
    queryClient,
  ]);

  // Trigger translation fetch and display options
  const triggerTranslation = useCallback(
    async (forceOpen = true) => {
      if (!isTranslationMode) {
        if (suggestions.length > 0 && forceOpen) {
          setIsOpen(true);
        }
        return;
      }

      const cleanWord = sourceWord?.trim();
      if (!cleanWord || cleanWord.length < 2) {
        return;
      }

      const cacheKey = qk.words.translateSuggest({
        word: cleanWord,
        lang: language,
        targetLang,
      });

      // 1. Check TanStack Query cache first
      const cached = queryClient.getQueryData<string[]>(cacheKey);
      if (cached && cached.length > 0) {
        setAllTranslations(cached);
        const query = value.toLowerCase().trim();
        const filtered = query
          ? cached.filter((t) => t.toLowerCase().includes(query))
          : cached;
        setSuggestions(filtered.length > 0 ? filtered : cached);
        if (forceOpen) setIsOpen(true);
        return;
      }

      // 2. Check local allTranslations state
      if (allTranslations.length > 0) {
        const query = value.toLowerCase().trim();
        const filtered = query
          ? allTranslations.filter((t) => t.toLowerCase().includes(query))
          : allTranslations;
        setSuggestions(filtered.length > 0 ? filtered : allTranslations);
        if (forceOpen) setIsOpen(true);
        return;
      }

      // 3. Fetch from API
      setIsLoading(true);
      if (forceOpen) setIsOpen(true);

      try {
        const data = await queryClient.fetchQuery({
          queryKey: cacheKey,
          queryFn: async () => {
            const res = await suggestTranslation({
              word: cleanWord,
              lang: language,
              targetLang,
              endpoint: apiEndpoint,
            });
            return res.suggestions || [];
          },
          staleTime: 5 * 60 * 1000,
        });

        const results = data || [];
        setAllTranslations(results);
        const query = value.toLowerCase().trim();
        const filtered = query
          ? results.filter((t) => t.toLowerCase().includes(query))
          : results;
        setSuggestions(filtered.length > 0 ? filtered : results);
        if (forceOpen && results.length > 0) {
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Error fetching translation suggestions:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      isTranslationMode,
      sourceWord,
      language,
      targetLang,
      value,
      allTranslations,
      suggestions.length,
      queryClient,
      apiEndpoint,
    ],
  );

  // Filter translation options when user types in the translation input
  useEffect(() => {
    if (!isTranslationMode || allTranslations.length === 0) return;

    const query = value.toLowerCase().trim();
    if (!query) {
      // Empty input: show all translation options!
      setSuggestions(allTranslations);
      if (document.activeElement === inputRef.current) {
        setIsOpen(true);
      }
      return;
    }

    const filtered = allTranslations.filter((t) =>
      t.toLowerCase().includes(query),
    );
    setSuggestions(filtered);
    if (document.activeElement === inputRef.current && filtered.length > 0) {
      setIsOpen(true);
    }
  }, [value, allTranslations, isTranslationMode]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!autoFocus) return;

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoFocus, focusTrigger]);

  const selectSuggestion = useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      setIsOpen(false);
      // Keep suggestions and allTranslations intact so clicking the empty or focused field displays them again!
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0) {
          selectSuggestion(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    if (isTranslationMode) {
      triggerTranslation(true);
    } else if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleClick = () => {
    if (isTranslationMode) {
      triggerTranslation(true);
    } else if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg)] py-2 text-lg transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20 ${
          rightElement ? "pl-3 pr-10" : "px-3"
        }`}
        autoComplete="off"
      />

      {rightElement && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {rightElement}
        </div>
      )}

      {isOpen && (isLoading || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg)] py-1 shadow-lg">
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--fg)]/60">
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              <span>{t_common("loading")}</span>
            </div>
          )}
          {!isLoading &&
            suggestions.map((suggestion, i) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className={`w-full px-3 py-2 text-left text-lg transition-colors ${
                  i === activeIndex
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
                    : "hover:bg-[var(--surface)]"
                }`}
              >
                {suggestion}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
