export const qk = {
  auth: {
    session: ["auth", "session"] as const,
    profile: (supabaseId: string) => ["auth", "profile", supabaseId] as const,
  },
  users: {
    profile: (id: string) => ["users", "profile", id] as const,
    search: (query: string) => ["users", "search", query] as const,
    usernameCheck: (username: string) =>
      ["users", "usernameCheck", username] as const,
  },
  dictionaries: {
    list: (
      params: { q?: string; lang?: string; sort?: string; page?: number } = {},
    ) => ["dictionaries", "list", params] as const,
    detail: (id: string) => ["dictionaries", "detail", id] as const,
    editors: (id: string) => ["dictionaries", "editors", id] as const,
  },
  words: {
    list: (dictionaryId: string) => ["words", "list", dictionaryId] as const,
    detail: (id: string) => ["words", "detail", id] as const,
    suggest: (params: { q?: string; lang?: string; endpoint?: string }) =>
      ["words", "suggest", params] as const,
    translateSuggest: (params: {
      word?: string;
      lang?: string;
      targetLang?: string;
    }) => ["words", "translateSuggest", params] as const,
  },
  phrases: {
    byWord: (wordId: string) => ["phrases", "byWord", wordId] as const,
  },
  wordle: {
    game: (gameId: string) => ["wordle", "game", gameId] as const,
  },
  study: {
    flashcards: (dictionaryId: string) =>
      ["study", "flashcards", dictionaryId] as const,
    quiz: (dictionaryId: string) => ["study", "quiz", dictionaryId] as const,
  },
  leaderboard: {
    all: ["leaderboard", "all"] as const,
  },
  admin: {
    users: ["admin", "users"] as const,
    dictionaries: ["admin", "dictionaries"] as const,
    blogs: ["admin", "blogs"] as const,
    coupons: ["admin", "coupons"] as const,
    wordle: ["admin", "wordle"] as const,
    globals: ["admin", "globals"] as const,
  },
  globals: {
    site: ["globals", "site"] as const,
  },
  payment: {
    status: ["payment", "status"] as const,
  },
  coupons: {
    redeem: ["coupons", "redeem"] as const,
  },
  playground: {
    lists: ["playground", "lists"] as const,
    dictionaries: (ids: string[]) =>
      ["playground", "dictionaries", ids.slice().sort().join(",")] as const,
  },
  dialogueTrees: {
    lists: ["dialogueTrees", "lists"] as const,
    detail: (id: string) => ["dialogueTrees", "detail", id] as const,
  },
} as const;
