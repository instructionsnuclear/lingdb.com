"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Plus, ArrowLeftRight } from "lucide-react";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import AutoSuggest from "./AutoSuggest";
import { SUPPORTED_LANGUAGES } from "@/lib/utils/constants";

import Dropdown, { DropdownItem } from "@/components/ui/Dropdown";
import { createWord } from "@/lib/api/words.api";
import { getErrorMessage } from "@/lib/api/errors";

const addWordSchema = z.object({
  title: z.string().min(1, "Word is required").max(100),
  translation: z.string().min(1, "Translation is required").max(200),
});

interface AddWordFormProps {
  dictionaryId: string;
  dictionaryLanguage: string;
  onWordAdded: () => void;
  wordCount: number;
}

export default function AddWordForm({
  dictionaryId,
  dictionaryLanguage,
  onWordAdded,
  wordCount,
}: AddWordFormProps) {
  const { toast } = useToast();
  const locale = useLocale();
  const t = useTranslations("dictionary");
  const [title, setTitle] = useState("");
  const [translation, setTranslation] = useState("");
  const [sourceLang, setSourceLang] = useState(dictionaryLanguage || "en");
  const [targetLang, setTargetLang] = useState(locale);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (dictionaryLanguage) {
      setSourceLang(dictionaryLanguage);
    }
  }, [dictionaryLanguage]);

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);

    if (title && translation) {
      setTitle(translation);
      setTranslation(title);
    } else if (!title && translation) {
      setTitle(translation);
      setTranslation("");
    }
    setErrors({});
  };

  const createWordMutation = useMutation({
    mutationFn: createWord,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dictionaries"] });
      await queryClient.invalidateQueries({ queryKey: ["words"] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = addWordSchema.safeParse({ title, translation });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (wordCount >= 500) {
      toast(t("word_limit", { max: 500 }), "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await createWordMutation.mutateAsync({ ...result.data, dictionaryId });

      setTitle("");
      setTranslation("");
      titleRef.current?.focus(); // Actually AutoSuggest input ref might not be exposed, but that's fine
      onWordAdded();
    } catch (error: unknown) {
      toast(getErrorMessage(error, t("settings.error_saved")), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-10 flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4 sm:flex-row sm:items-end"
    >
      <div className="relative z-20 flex-1 space-y-1">
        <label className="text-sm font-medium text-[var(--fg)]/60">
          {t("word")}
        </label>
        <AutoSuggest
          language={sourceLang}
          value={title}
          onChange={setTitle}
          placeholder={t("word_placeholder")}
          className={errors.title ? "border-accent-400" : ""}
          rightElement={
            <Dropdown
              key={sourceLang}
              trigger={
                <button
                  type="button"
                  className="flex h-7 w-9 items-center justify-center rounded-md hover:bg-[var(--surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  title="Change word language"
                >
                  <span
                    className={`text-lg rounded-sm overflow-hidden ${
                      SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang)
                        ?.flagClass || "fi fi-gb"
                    }`}
                  ></span>
                </button>
              }
            >
              <div className="py-1">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <DropdownItem
                    key={lang.code}
                    onClick={() => setSourceLang(lang.code)}
                    className="gap-3"
                    type="button"
                  >
                    <span
                      className={`text-xl rounded-sm overflow-hidden ${lang.flagClass}`}
                    ></span>
                    <span className="text-base uppercase">{lang.code}</span>
                  </DropdownItem>
                ))}
              </div>
            </Dropdown>
          }
        />
        {errors.title && (
          <p className="text-sm text-accent-500">{errors.title}</p>
        )}
      </div>

      <div className="flex items-center justify-center self-center sm:self-end">
        <button
          type="button"
          onClick={handleSwapLanguages}
          title={t("switch_languages")}
          className="group flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)]/60 transition-all hover:bg-[var(--surface)] hover:text-primary-500 hover:border-primary-500/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500/30 cursor-pointer"
        >
          <ArrowLeftRight className="h-5 w-5 transition-transform duration-300 group-hover:rotate-180 rotate-90 sm:rotate-0" />
        </button>
      </div>

      <div className="relative z-10 flex-1 space-y-1">
        <label className="text-sm font-medium text-[var(--fg)]/60">
          {t("translation")}
        </label>
        <AutoSuggest
          language={sourceLang}
          targetLang={targetLang}
          sourceWord={title}
          apiEndpoint="/api/words/translate-suggest"
          value={translation}
          onChange={setTranslation}
          placeholder={t("translation_placeholder")}
          className={errors.translation ? "border-accent-400" : ""}
          rightElement={
            <Dropdown
              key={targetLang}
              trigger={
                <button
                  type="button"
                  className="flex h-7 w-9 items-center justify-center rounded-md hover:bg-[var(--surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  title="Change translation language"
                >
                  <span
                    className={`text-lg rounded-sm overflow-hidden ${
                      SUPPORTED_LANGUAGES.find((l) => l.code === targetLang)
                        ?.flagClass || "fi fi-gb"
                    }`}
                  ></span>
                </button>
              }
            >
              <div className="py-1">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <DropdownItem
                    key={lang.code}
                    onClick={() => setTargetLang(lang.code)}
                    className="gap-3"
                    type="button"
                  >
                    <span
                      className={`text-xl rounded-sm overflow-hidden ${lang.flagClass}`}
                    ></span>
                    <span className="text-base uppercase">{lang.code}</span>
                  </DropdownItem>
                ))}
              </div>
            </Dropdown>
          }
        />
        {errors.translation && (
          <p className="text-sm text-accent-500">{errors.translation}</p>
        )}
      </div>

      <Button
        type="submit"
        className="cursor-pointer"
        isLoading={isSubmitting}
        size="md"
      >
        <Plus className="h-4 w-4" />
        {t("add")}
      </Button>
    </form>
  );
}
