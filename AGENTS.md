# 🤖 Agent Guide: Lingdbapp

Welcome to the **Lingdb** codebase. This guide is optimized for LLM agents to understand the project structure, design patterns, and technical constraints.

## 📌 Project Overview
Lingdb is a premium, full-stack language-learning platform inspired by Quizlet.
- **Core Loop**: Users create multilingual dictionaries, manage word lists with drag-and-drop, and study via flashcards/quizzes.
- **Key Features**: AI-powered word suggestions, example phrase generation, collaborative editing, and Gamified Wordle.
- **Audience**: Language learners wanting a high-performance, aesthetically pleasing study tool.

---

## 🛠️ Technology Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (Strict mode)
- **Database**: Supabase (PostgreSQL) + Drizzle ORM
- **Styling**: Tailwind CSS 4 + Vanilla CSS + Glassmorphism
- **Animations**: GSAP v3.15 + `@gsap/react` (`useGSAP`)
- **State Management**: TanStack Query v5 (Server state)
- **I18n**: `next-intl` (Supports en, fr, de, es, tr)
- **Background Jobs**: Inngest

---

## 🎨 Lingdb Design Kit
Always adhere to these styles to maintain the "Premium" feel. Avoid generic Tailwind colors.

### Colors (CSS Variables)
- **Primary Blue**: `--color-primary-500: #0001d8` (Deep Electric Blue)
- **Semantic**:
  - Success: `#51cf66`
  - Warning: `#fcc419`
  - Danger/Error: `#ff6b6b`
  - Info: `#339af0`
- **Surface**:
  - Light: `var(--bg): #ffffff`, `var(--surface): #f8f9fa`
  - Dark: `var(--bg): #0a092d`, `var(--surface): #1a1a2e`

### 🌓 Theme-Aware Styling
Do NOT use hardcoded colors like `text-white` or `text-slate-900` for main content unless specifically required for a fixed-theme element.
1. **Prefer Variables**: Use `var(--fg)` for text and `var(--bg)` for backgrounds.
2. **Tailwind Syntax**: 
   - Good: `text-foreground` (maps to `var(--fg)`)
   - Good: `text-[var(--fg)]/70` (for opacity)
   - Avoid: `text-white dark:text-black` (harder to maintain than variables)
3. **Inheritance**: Many components should omit color classes entirely to inherit the base `body` color (`var(--fg)`).

### Typography
- **Headings**: `font-family: "League Spartan", sans-serif;` (Weight 800-900)
- **Body**: `font-family: "Inter", sans-serif;` (Weight 400-600)

### 💎 Glassmorphism & Glow Effects
Use these patterns for premium cards and overlays:
1. **Glassmorphism**: 
   - Light: `bg-white/80 backdrop-blur-xl border-white/20`
   - Dark: `bg-white/10 backdrop-blur-2xl border-white/10`
2. **Glowy Borders**: 
   - Use colored borders with alpha for context (e.g., `dark:border-primary-500/30`).
   - Complement with matching box-shadows (e.g., `box-shadow: 0 0 25px -10px rgba(0, 1, 216, 0.3)`).
3. **Text Brightness**: In dark mode, prefer `text-white` or `text-white/90` for maximum legibility over gray tones.

---

## ⚡ GSAP & Animations
Animations are a first-class citizen in Lingdb.

### Guidelines
1. **Hook**: Always use `useGSAP()` from `@gsap/react`. Do NOT use `useEffect`.
2. **Scoping**: Always provide a `scope` (ref) to `useGSAP` to prevent memory leaks.
3. **Cleanup**: `useGSAP` handles cleanup automatically, but manual `gsap.set` in `onComplete` should be careful.
4. **Plugins**: Register plugins at the top of the file (e.g., `gsap.registerPlugin(ScrollTrigger)`).

### Documentation Links
- [GSAP Core Docs](https://gsap.com/docs/v3/)
- [useGSAP Hook Guide](https://gsap.com/resources/React/)
- [ScrollTrigger Plugin](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [Flip Plugin](https://gsap.com/docs/v3/Plugins/Flip/)

---

## 💾 Database Schemas (Drizzle)
Located in: `src/lib/db/schema.ts`

- **`users`**: Auth via Supabase, tracks `aiCredits`, `streakCount`, `tier`.
- **`dictionaries`**: Main entity. Has `language`, `isPublic`, and `activeMagicWords` (JSONB).
- **`words`**: Belongs to dictionaries. Has `order` for drag-and-drop.
- **`flashcard_progress`**: Leitner system tracking (`leitner_box` 1-5).
- **`blogs`**: Rich text support via JSONB `content`.

---

## 🔄 TanStack Query Standard
- **Query Keys**: Use the centralized factory in `src/lib/tanstack/query-keys.ts` (Import as `qk`).
- **Data Fetching**: Use functions from `src/lib/api/*`.
- **Patterns**:
  - Use `useQuery` for reads.
  - Use `useMutation` for writes, followed by `queryClient.invalidateQueries`.
  - Prefer Hydration for SEO-sensitive pages.

---

## 🛤️ Project Routes
- `/`: Landing Page
- `/[locale]/dictionary`: User Dashboard / Dictionary Listing
- `/[locale]/dictionary/[id]`: Dictionary Detail / Word Management
- `/[locale]/dictionary/[id]/flashcards`: Spaced Repetition Study
- `/[locale]/dictionary/[id]/quiz`: Interactive Testing
- `/[locale]/wordle`: Daily Word Game (Yordle)
- `/[locale]/games`: Games Arcade Hub (Yordle, Yaboo)
- `/[locale]/games/yaboo`: Yaboo (Fake Taboo) Teaser Page
- `/[locale]/blogs`: Blog Listing
- `/[locale]/admin/*`: Administrative Dashboards

---

## ✅ Do's & ❌ Don't's

### ✅ Do
- Use **Semantic HTML** and ARIA labels.
- Follow the **i18n** pattern using `useTranslations`.
- Implement **Optimistic Updates** for dictionary/word changes.
- Use **GSAP** for any movement/transition stronger than a simple hover.
- Use **CSS Variables** (`var(--fg)`, `var(--bg)`) for theme-aware styling.

### ❌ Don't
- Never hardcode strings; use `messages/*.json`.
- Never use direct `fetch()` calls in components; use the API layer.
- Avoid `useState` for server data; use Tanstack Query.
- Do not use generic `red-500` or `blue-500` Tailwind classes; use the design tokens.
- Never use hardcoded `text-white` or `text-black` for layout text; use `text-foreground` or `var(--fg)`.

---

## 🔑 Environment Variables
- `DATABASE_URL`: Drizzle connection.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project.
- `OPENROUTER_API_KEY`: AI engine.
- `NEXT_PUBLIC_APP_URL`: Base URL.
