"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createDictionary } from "@/lib/api/dictionaries.api";
import { getErrorMessage } from "@/lib/api/errors";
import { z } from "zod";

interface CreateDictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const languages = [
  { code: "en", flagClass: "fi fi-gb" },
  { code: "fr", flagClass: "fi fi-fr" },
  { code: "de", flagClass: "fi fi-de" },
  { code: "es", flagClass: "fi fi-es" },
  { code: "tr", flagClass: "fi fi-tr" },
];

export default function CreateDictionaryModal({
  isOpen,
  onClose,
}: CreateDictionaryModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dictionary.create");
  const t_settings = useTranslations("settings");
  const t_common = useTranslations("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createDictionaryMutation = useMutation({
    mutationFn: createDictionary,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dictionaries"] });
    },
  });

  const createDictionarySchema = z.object({
    title: z.string().min(1, t("error_title_required")).max(100),
    description: z.string().max(500).optional(),
    language: z.enum(["en", "fr", "de", "es", "tr"]),
    isPublic: z.boolean(),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [isPublic, setIsPublic] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = createDictionarySchema.safeParse({
      title,
      description: description || undefined,
      language,
      isPublic,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createDictionaryMutation.mutateAsync(result.data);

      toast(t("success"), "success");
      onClose();
      setTitle("");
      setDescription("");
      setLanguage("en");
      setIsPublic(false);
      if (res?.dictionary?.id) {
        router.push(`/${locale}/dictionary/${res.dictionary.id}`);
      } else {
        router.refresh();
      }
    } catch (error: unknown) {
      toast(getErrorMessage(error, t_common("errors.generic")), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("title")} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t("field_title")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("placeholder_title")}
          state={errors.title ? "error" : "default"}
          hint={errors.title}
          autoFocus
        />

        <div className="space-y-1.5">
          <label className="text-lg font-medium">
            {t("field_description")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("placeholder_description")}
            rows={2}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-lg transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-lg font-medium">{t("field_language")}</label>
          <div className="grid grid-cols-5 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm transition-all ${
                  language === lang.code
                    ? "border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
                    : "border-[var(--border-color)] hover:bg-[var(--surface)]"
                }`}
              >
                <span
                  className={`text-2xl rounded-sm overflow-hidden ${lang.flagClass}`}
                ></span>
                <span className="font-medium">
                  {t_settings(`languages.${lang.code}`)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[var(--border-color)] p-4">
          <div>
            <p className="text-lg font-medium">{t("field_public")}</p>
            <p className="text-sm text-[var(--fg)]/50">{t("public_hint")}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              isPublic ? "bg-primary-500" : "bg-[var(--border-color)]"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                isPublic ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {t_common("cancel")}
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {t_common("create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
