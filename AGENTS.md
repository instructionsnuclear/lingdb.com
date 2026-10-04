# 🤖 Agent Guide: Lingdbapp

Welcome to the **Lingdb** codebase. This guide is optimized for LLM agents to understand the project structure, design patterns, and technical constraints.

## 📌 Project Overview
Lingdb is a premium, full-stack language-learning platform inspired by Quizlet.
- **Core Loop**: Users create multilingual dictionaries, manage word lists with drag-and-drop, and study via flashcards/quizzes.
- **Key Features**: AI-powered word suggestions, example phrase generation, collaborative editing, Gamified Wordle, and Interactive Dialogue Trees.
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

## 🌳 Dialogue Trees
Interactive branching conversation builder helping learners discover dialogue continuations and expand vocabulary.

### Architecture & Components
- **Page Route**: `/[locale]/dialogue-trees`
- **Canvas (`DialogueTreeCanvas.tsx`)**: Infinite pan & zoom canvas (centered focal mouse-wheel zoom, spacebar/middle-click drag, dot grid background, auto-layout, dnd-kit draggable node context with scale compensation).
- **Node Cards (`DialogueTreeNodeCard.tsx`)**: Glassmorphic cards with Speaker badges (`Prompt (Root)`, `Speaker A`, `Speaker B`), header drag handle (`GripVertical`), audio pronunciation icon button (`Volume2`), pencil inline edit tool, sparkle AI ideas trigger, delete button, and a translation toggle/on-demand translation icon button (`Languages`) at the bottom-right of every phrase (instantly displays saved translation, or translates manually entered phrases on demand via `OPENROUTER_TRANSLATION_MODEL` and persists to tree). Elevated stacking (`z-index: 50`) prevents boxes from appearing behind neighbor cards.
- **Audio Pronunciation (`speechSynthesis`)**: Consistent with the Playground, nodes and generated AI suggestion phrases feature audio pronunciation buttons (`Volume2`) using Web Speech API synthesis configured with the tree's target language (e.g. `de-DE`, `es-ES`, `fr-FR`, `en-US`, `tr-TR`) with active pulse animations and cancellation handling.
- **Connections (`DialogueTreeConnections.tsx`) & Smart Routing (`smart-arrow.ts`)**: Procedural, obstacle-aware cubic Bezier paths that dynamically recalculate in real-time as phrase blocks move in 2D space. Clean, crisp curves without glow or arrowheads flush to card boundaries.
- **Link Handles**: Hoverable/clickable right-side arrow handle with `+` icon on every card to branch out custom responses infinitely. Anchored directly to the phrase card's vertical center.
- **AI Continuation Engine (`/api/dialogue-trees/suggest`)**:
  - Traces the exact linear branch via `getConversationLine()` from root to active node (avoiding neighbor branch cross-contamination).
  - Prompts OpenRouter to suggest 3 distinct, natural continuations.
  - **Scenario Meta Context (Fake RAG Memory Border)**: Users can define custom background scenario context, character roles, and domain knowledge (max 5,000 characters). This functions as memory guardrails/borders to keep suggestions strictly in character/context without hijacking organic conversational flow.
  - **CEFR Language Level Guidance**: Allows choosing language proficiency levels from A1 (Beginner) to C2 (Mastery) to calibrate vocabulary complexity and grammatical depth.
  - **Contextual Translations in Website Language**: Continuations are generated with high-quality translations matching the current global website locale (e.g. `tr`, `en`, `de`, `es`, `fr`), rendered beneath each phrase as tiny gray text.
  - **Settings Modal (`DialogueTreeSettingsModal.tsx`)**: Accessed via the top-bar gear button on the canvas, or set upon tree creation via the selector/creation modals.
  - Credit consumption: Auto-generated continuations (on adding a phrase or editing text) do NOT consume AI credits. Only manual refresh via the refresh icon button consumes 1 AI credit.
  - Rate limiting: Rate-limited via `checkRateLimit` and `activityLogs`. Regular users: 5 generations/minute, 30/hour. Admins: 60 generations/minute, 500 generations/hour with unlimited refreshes.
  - Multi-box support: Multiple suggestion boxes can remain open simultaneously with independent close (`X`) buttons. Re-opening a box preserves previous suggestions without redundant AI calls.
- **Word Highlighting & Direct Word Save (`DialoguePhraseWords.tsx`)**:
  - Words existing in any user dictionary appear in **bold orange** (`text-amber-500 font-bold`).
  - Both saved and unsaved words are clickable. Clicking opens a React Portalled (`createPortal`) dictionary and translation popup right beneath the word (immune to canvas CSS transforms) featuring an audio pronunciation button (`Volume2`) in the top-right header to listen to the word solely.
  - **Instant Word Translation**: Clicking any word automatically displays its contextual translation right next to the word header in the portal popup (e.g. `"besser" • daha iyi`). If previously saved, it loads instantly from dictionary metadata; otherwise, it translates via `OPENROUTER_TRANSLATION_MODEL` (`/api/dialogue-trees/translate-word`).
  - Saving reuses the existing/in-flight translation immediately (bypassing AI re-translation for instant saves), or generates one if missing, and adds the word to the target dictionary via `/api/dialogue-trees/save-word`.
  - **Duplicate Prevention & Quick Removal**: Dictionaries already containing the word cannot be clicked again to save duplicates, display an orange check icon, and feature an inline `X` icon button to immediately delete the word from that dictionary via `/api/words/[id]` with real-time state updates across the canvas.

---

## 💾 Database Schemas (Drizzle)
Located in: `src/lib/db/schema.ts`

- **`users`**: Auth via Supabase, tracks `aiCredits`, `streakCount`, `tier`.
- **`dictionaries`**: Main entity. Has `language`, `isPublic`, and `activeMagicWords` (JSONB).
- **`words`**: Belongs to dictionaries. Has `order` for drag-and-drop.
- **`dialogue_trees`**: Conversational tree entity with JSONB `nodes`, `pan`, `zoom`, `metaContext` (text, max 5000 chars), and `level` (CEFR A1-C2).
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
- `/[locale]/dialogue-trees`: Interactive Dialogue Tree Canvas & Branching Builder
- `/[locale]/playground`: Infinite Playground Canvas (Vocab Combination)
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
