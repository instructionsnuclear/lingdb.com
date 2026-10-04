import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  unique,
  index,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ──────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);
export const userTierEnum = pgEnum("user_tier", ["FREE", "PREMIUM"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "TRIAL",
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
]);
export const flashcardStatusEnum = pgEnum("flashcard_status", [
  "NEW",
  "LEARNING",
  "REVIEW",
  "MASTERED",
]);
export const dictionaryEditorStatusEnum = pgEnum("dictionary_editor_status", [
  "PENDING",
  "ACCEPTED",
]);
export const blogStatusEnum = pgEnum("blog_status", ["DRAFT", "PUBLISHED"]);

// ─── Users ──────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  supabaseId: text("supabase_id").notNull().unique(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  locale: text("locale").notNull().default("en"),
  tier: userTierEnum("tier").notNull().default("FREE"),
  role: userRoleEnum("role").notNull().default("USER"),
  aiCredits: integer("ai_credits").notNull().default(30),
  creditsResetAt: timestamp("credits_reset_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  totalWords: integer("total_words").notNull().default(0),
  totalFlashcards: integer("total_flashcards").notNull().default(0),
  totalQuizzes: integer("total_quizzes").notNull().default(0),
  streakCount: integer("streak_count").notNull().default(0),
  lastActiveDate: timestamp("last_active_date", { withTimezone: true }),
  lastReminderSentAt: timestamp("last_reminder_sent_at", {
    withTimezone: true,
  }),
  hasCompletedTour: boolean("has_completed_tour").notNull().default(false),
  hasCompletedDictTour: boolean("has_completed_dict_tour")
    .notNull()
    .default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  emailOptOut: boolean("email_opt_out").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Dictionaries ───────────────────────────────────────────

export const dictionaries = pgTable(
  "dictionaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    language: text("language").notNull(), // "en", "fr", "de", "es", "tr"
    isPublic: boolean("is_public").notNull().default(false),
    slug: text("slug").unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeMagicWords:
      jsonb("active_magic_words").$type<
        { word: string; translation: string; isAdded: boolean }[]
      >(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoGeneratedAt: timestamp("seo_generated_at", { withTimezone: true }),
    lastDailyUpdateSentAt: timestamp("last_daily_update_sent_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("dictionaries_user_id_idx").on(table.userId),
    index("dictionaries_is_public_idx").on(table.isPublic),
    index("dictionaries_slug_idx").on(table.slug),
  ],
);

// ─── Words ──────────────────────────────────────────────────

export const words = pgTable(
  "words",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    translation: text("translation").notNull(),
    order: integer("order").notNull().default(0),
    dictionaryId: uuid("dictionary_id")
      .notNull()
      .references(() => dictionaries.id, { onDelete: "cascade" }),
    lastModifiedById: uuid("last_modified_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("words_dictionary_id_idx").on(table.dictionaryId),
    index("words_last_modified_by_id_idx").on(table.lastModifiedById),
  ],
);

// ─── Example Phrases ────────────────────────────────────────

export const examplePhrases = pgTable(
  "example_phrases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phrase: text("phrase").notNull(),
    translation: text("translation").notNull(),
    wordId: uuid("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    isAiGenerated: boolean("is_ai_generated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("example_phrases_word_id_idx").on(table.wordId)],
);

// ─── Dictionary Editors ─────────────────────────────────────

export const dictionaryEditors = pgTable(
  "dictionary_editors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dictionaryId: uuid("dictionary_id")
      .notNull()
      .references(() => dictionaries.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: dictionaryEditorStatusEnum("status").notNull().default("PENDING"),
    inviteToken: text("invite_token"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("dictionary_editors_unique").on(table.dictionaryId, table.userId),
    index("dictionary_editors_user_id_idx").on(table.userId),
    index("dictionary_editors_token_idx").on(table.inviteToken),
  ],
);

// ─── Forks ──────────────────────────────────────────────────

export const forks = pgTable(
  "forks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceDictionaryId: uuid("source_dictionary_id")
      .notNull()
      .references(() => dictionaries.id, { onDelete: "cascade" }),
    forkedById: uuid("forked_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("forks_source_user_unique").on(
      table.sourceDictionaryId,
      table.forkedById,
    ),
  ],
);

// ─── Subscriptions ──────────────────────────────────────────

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  iyzicoSubId: text("iyzico_sub_id"),
  status: subscriptionStatusEnum("status").notNull().default("TRIAL"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Activity Log (for streak tracking) ─────────────────────

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "flashcard", "quiz", "word_added"
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_logs_user_created_idx").on(table.userId, table.createdAt),
  ],
);

// ─── Flashcard Progress (Leitner spaced repetition) ─────────

export const flashcardProgress = pgTable(
  "flashcard_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wordId: uuid("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    status: flashcardStatusEnum("status").notNull().default("NEW"),
    leitnerBox: integer("leitner_box").notNull().default(1), // 1-5
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    lastReviewAt: timestamp("last_review_at", { withTimezone: true }),
    reviewCount: integer("review_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("flashcard_progress_user_word_unique").on(
      table.userId,
      table.wordId,
    ),
    index("flashcard_progress_user_id_idx").on(table.userId),
  ],
);

// ─── Quiz History ───────────────────────────────────────────

export const quizHistory = pgTable(
  "quiz_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dictionaryId: uuid("dictionary_id")
      .notNull()
      .references(() => dictionaries.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    percentage: integer("percentage").notNull(),
    questionTypes: jsonb("question_types"), // ["multiple_choice", "type_answer"]
    duration: integer("duration"), // seconds
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("quiz_history_user_id_idx").on(table.userId)],
);

// ─── Coupons ────────────────────────────────────────────────

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  maxUses: integer("max_uses").notNull().default(1),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Yordle Games ──────────────────────────────────────────

export const wordleGames = pgTable(
  "wordle_games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    solution: text("solution").notNull(),
    language: text("language").notNull().default("en"),
    noteToSolver: text("note_to_solver"),
    wordLength: integer("word_length").notNull(),
    maxTries: integer("max_tries").notNull().default(6),
    isOfficial: boolean("is_official").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("wordle_games_created_at_idx").on(table.createdAt),
    index("wordle_games_expires_at_idx").on(table.expiresAt),
  ],
);

// ─── Blogs ──────────────────────────────────────────────────

export const blogs = pgTable(
  "blogs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    content: jsonb("content").notNull(), // Rich text JSON
    keywords: text("keywords"), // Comma separated or JSON array
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: blogStatusEnum("status").notNull().default("DRAFT"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    schemaData: jsonb("schema_data"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("blogs_slug_idx").on(table.slug),
    index("blogs_author_id_idx").on(table.authorId),
  ],
);

// ─── Blog Translations ──────────────────────────────────────

export const blogTranslations = pgTable(
  "blog_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blogId: uuid("blog_id")
      .notNull()
      .references(() => blogs.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(), // 'fr', 'de', 'es', 'tr'
    title: text("title").notNull(),
    description: text("description"),
    content: jsonb("content").notNull(),
    keywords: text("keywords"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("blog_translations_blog_locale_unique").on(
      table.blogId,
      table.locale,
    ),
    index("blog_translations_blog_id_idx").on(table.blogId),
    index("blog_translations_locale_idx").on(table.locale),
  ],
);

// ─── Coupon Redemptions ─────────────────────────────────────

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("coupon_redemptions_user_coupon_unique").on(
      table.couponId,
      table.userId,
    ),
    index("coupon_redemptions_user_id_idx").on(table.userId),
  ],
);

// ─── Dictionary Lists (Playground Packs) ───────────────────

export interface SavedPlaygroundPhrase {
  id: string;
  phrase: string;
  translation: string;
  matchedWords?: string[];
  context?: string;
  createdAt?: string;
}

export const dictionaryLists = pgTable(
  "dictionary_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    language: text("language").notNull(),
    dictionaryIds: jsonb("dictionary_ids").$type<string[]>().notNull(),
    positions: jsonb("positions").$type<Record<string, { x: number; y: number }>>(),
    savedPhrases: jsonb("saved_phrases").$type<SavedPlaygroundPhrase[]>().default([]),
    metaContext: text("meta_context"),
    level: text("level").default("B1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("dictionary_lists_user_id_idx").on(table.userId),
  ],
);

// ─── Dialogue Trees ────────────────────────────────────────

export interface DialogueTreeNode {
  id: string;
  parentId: string | null;
  text: string;
  translation?: string;
  childrenIds: string[];
  x: number;
  y: number;
  aiSuggestions?: string[];
}

export const dialogueTrees = pgTable(
  "dialogue_trees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    language: text("language").notNull().default("en"),
    nodes: jsonb("nodes").$type<DialogueTreeNode[]>().notNull().default([]),
    pan: jsonb("pan").$type<{ x: number; y: number }>().default({ x: 0, y: 0 }),
    zoom: real("zoom").default(1),
    metaContext: text("meta_context"),
    level: text("level").default("B1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("dialogue_trees_user_id_idx").on(table.userId),
  ],
);

// ─── Relations ──────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  dictionaries: many(dictionaries),
  dictionaryLists: many(dictionaryLists),
  dialogueTrees: many(dialogueTrees),
  dictionaryEditors: many(dictionaryEditors),
  forks: many(forks),
  activityLogs: many(activityLogs),
  flashcardProgress: many(flashcardProgress),
  quizHistory: many(quizHistory),
  modifiedWords: many(words, { relationName: "modifier" }),
  couponRedemptions: many(couponRedemptions),
}));

export const dictionariesRelations = relations(
  dictionaries,
  ({ one, many }) => ({
    user: one(users, {
      fields: [dictionaries.userId],
      references: [users.id],
    }),
    words: many(words),
    dictionaryEditors: many(dictionaryEditors),
    forks: many(forks),
    quizHistory: many(quizHistory),
  }),
);

export const wordsRelations = relations(words, ({ one, many }) => ({
  dictionary: one(dictionaries, {
    fields: [words.dictionaryId],
    references: [dictionaries.id],
  }),
  lastModifiedBy: one(users, {
    fields: [words.lastModifiedById],
    references: [users.id],
    relationName: "modifier",
  }),
  examplePhrases: many(examplePhrases),
  flashcardProgress: many(flashcardProgress),
}));

export const examplePhrasesRelations = relations(examplePhrases, ({ one }) => ({
  word: one(words, {
    fields: [examplePhrases.wordId],
    references: [words.id],
  }),
}));

export const dictionaryEditorsRelations = relations(
  dictionaryEditors,
  ({ one }) => ({
    dictionary: one(dictionaries, {
      fields: [dictionaryEditors.dictionaryId],
      references: [dictionaries.id],
    }),
    user: one(users, {
      fields: [dictionaryEditors.userId],
      references: [users.id],
    }),
  }),
);

export const forksRelations = relations(forks, ({ one }) => ({
  sourceDictionary: one(dictionaries, {
    fields: [forks.sourceDictionaryId],
    references: [dictionaries.id],
  }),
  forkedBy: one(users, {
    fields: [forks.forkedById],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const flashcardProgressRelations = relations(
  flashcardProgress,
  ({ one }) => ({
    user: one(users, {
      fields: [flashcardProgress.userId],
      references: [users.id],
    }),
    word: one(words, {
      fields: [flashcardProgress.wordId],
      references: [words.id],
    }),
  }),
);

export const quizHistoryRelations = relations(quizHistory, ({ one }) => ({
  user: one(users, {
    fields: [quizHistory.userId],
    references: [users.id],
  }),
  dictionary: one(dictionaries, {
    fields: [quizHistory.dictionaryId],
    references: [dictionaries.id],
  }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  redemptions: many(couponRedemptions),
}));

export const couponRedemptionsRelations = relations(
  couponRedemptions,
  ({ one }) => ({
    coupon: one(coupons, {
      fields: [couponRedemptions.couponId],
      references: [coupons.id],
    }),
    user: one(users, {
      fields: [couponRedemptions.userId],
      references: [users.id],
    }),
  }),
);

export const blogsRelations = relations(blogs, ({ one, many }) => ({
  author: one(users, {
    fields: [blogs.authorId],
    references: [users.id],
  }),
  translations: many(blogTranslations),
}));

export const blogTranslationsRelations = relations(
  blogTranslations,
  ({ one }) => ({
    blog: one(blogs, {
      fields: [blogTranslations.blogId],
      references: [blogs.id],
    }),
  }),
);

export const dictionaryListsRelations = relations(dictionaryLists, ({ one }) => ({
  user: one(users, {
    fields: [dictionaryLists.userId],
    references: [users.id],
  }),
}));

export const dialogueTreesRelations = relations(dialogueTrees, ({ one }) => ({
  user: one(users, {
    fields: [dialogueTrees.userId],
    references: [users.id],
  }),
}));

export const siteGlobals = pgTable("site_globals", {
  id: text("id").primaryKey().default("default"),
  navLinks: jsonb("nav_links").notNull(),
  footerLinks: jsonb("footer_links").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Type Exports ───────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Dictionary = typeof dictionaries.$inferSelect;
export type NewDictionary = typeof dictionaries.$inferInsert;
export type Word = typeof words.$inferSelect;
export type NewWord = typeof words.$inferInsert;
export type DictionaryEditor = typeof dictionaryEditors.$inferSelect;
export type NewDictionaryEditor = typeof dictionaryEditors.$inferInsert;
export type ExamplePhrase = typeof examplePhrases.$inferSelect;
export type NewExamplePhrase = typeof examplePhrases.$inferInsert;
export type Fork = typeof forks.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type FlashcardProgress = typeof flashcardProgress.$inferSelect;
export type QuizHistory = typeof quizHistory.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type NewCouponRedemption = typeof couponRedemptions.$inferInsert;
export type Blog = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;
export type BlogTranslation = typeof blogTranslations.$inferSelect;
export type NewBlogTranslation = typeof blogTranslations.$inferInsert;
export type DictionaryList = typeof dictionaryLists.$inferSelect;
export type NewDictionaryList = typeof dictionaryLists.$inferInsert;
export type DialogueTree = typeof dialogueTrees.$inferSelect;
export type NewDialogueTree = typeof dialogueTrees.$inferInsert;
export type SiteGlobals = typeof siteGlobals.$inferSelect;
export type NewSiteGlobals = typeof siteGlobals.$inferInsert;
