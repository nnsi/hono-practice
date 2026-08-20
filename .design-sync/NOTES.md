# design-sync NOTES — actiko-frontend

This repo is the **Actiko app** (`apps/frontend`), not a published component library.
It is synced as a `package`-shape DS in **synth-entry mode** (no built dist, no real `.d.ts`).

## How the build is wired (re-sync must reproduce)

- **Package self-link (junction).** The converter resolves `PKG_DIR = node_modules/<pkg>`,
  which doesn't exist for an app. We create a junction so `PKG_DIR` → `apps/frontend`:
  ```pwsh
  New-Item -ItemType Junction -Path apps\frontend\node_modules\actiko-frontend -Target apps\frontend
  ```
  Recreate on a fresh clone (it lives under gitignored node_modules). Without it the build
  exits `[NO_DIST]` with no src.
- **Compiled CSS for `cssEntry`.** `src/main.css` is Tailwind *source* (`@tailwind` directives) —
  utilities only exist after a Tailwind compile. We compile to `apps/frontend/.ds-compiled.css`
  (gitignored) and point `cfg.cssEntry` at it:
  ```sh
  cd apps/frontend && ./node_modules/.bin/tailwindcss -i ./src/main.css -o ./.ds-compiled.css --minify
  ```
  Then **prepend the Google-Fonts `@import`** (brand fonts load at runtime in designs):
  `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');`
  It ends up at the top of `_ds_bundle.css`, reachable from `styles.css`'s import closure → `[FONT_REMOTE]`.
- **Provider.** Components read i18n (`useTranslation`) + react-query context. `apps/frontend/.ds-provider.tsx`
  exports `DSProvider` (initI18n({lng:"ja"}) + QueryClientProvider + I18nextProvider). Wired via
  `cfg.extraEntries` + `cfg.provider`. Without it, cards show raw i18n keys (`googleLinkDescription`).
  Router (`@tanstack/react-router`) is NOT provided — components using `useNavigate`/`Link`/`RouterProvider`
  render blank/floor and are deferred.
- **Fonts** are remote (Google Fonts `<link>` in index.html) → `cfg.runtimeFontPrefixes` suppresses `[FONT_MISSING]`.

## Commands

```sh
# build (synth-entry; no --entry)
node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules apps/frontend/node_modules --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle
# subagent preview loop (scoped):
node .ds-sync/lib/preview-rebuild.mjs --config .design-sync/config.json --node-modules apps/frontend/node_modules --out ./ds-bundle --components A,B
node .ds-sync/package-capture.mjs --out ./ds-bundle --components A,B
```

- **Playwright**: chromium-1208 is at `%LOCALAPPDATA%\ms-playwright` (Windows default — playwright@1.58.2 finds it automatically). `.ds-sync` has playwright@1.58.2 installed.

## Preview authoring pattern (calibrated on the solo set — all graded good)

- Import the component from the package name: `import { FormButton } from "actiko-frontend";`
  (story-imports plugin shims package + relative-to-exported imports to `window.ActikoDS`).
- Realistic **Japanese** content, never `foo`/`test` (these cards are imitated by the design agent).
- Full-width form components (`FormButton`, recording modes) need a sized `Frame` wrapper
  (`<div style={{width: 260|320}}>`), else they stretch oddly. Wrap card-like components in
  `bg-white rounded-xl border shadow-soft`.
- Compound components (recording **modes** group) take `RecordingModeProps`
  (`{activity:{id,name,emoji,quantityUnit,recordingMode,recordingModeConfig?}, kinds:[], date, onSave: async()=>{}, isSubmitting:false, todayLogs?}`) — they compose KindSelector/MemoInput/FormButton internally and render fully.
- **Solo set done + graded good + pushed**: FormButton, FormInput, FormTextarea, SettingCheckbox, NumpadMode.

## Known render warns (triaged legitimate)

- `[RENDER_THIN] ActikoLogo` — it's an SVG logo (no text); authored preview pending. Real, not broken.
- `[RENDER_THIN] SummaryTable: variants render identically` — SummaryTable starts **collapsed** (internal
  useState, no expansion prop); the default "日別・週別 合計値" expand row looks the same across cells until
  expanded. Faithful default state, not a defect. Graded good.
- `[GRID_OVERFLOW]` on stats/* and tasks/* cards — authored fixtures use fixed 320-360px Frames wider than a
  grid cell. Resolved via `cfg.overrides.<Name>.cardMode` ("column" for wide rows; "single"+primaryStory
  "Default" for DeleteConfirmDialog which is a fixed/portal modal). These are presentation-only; column/single
  can't re-flag by construction.

## Re-sync risks / watch-list

- The junction + compiled CSS + `.ds-provider.tsx` are **prerequisites** — a re-sync that skips them fails or ships unstyled.
- `.d.ts` props are weak (`[key: string]: unknown`) because synth-entry has no real types. The design agent
  won't see real prop signatures — authored `.prompt.md`/previews are the main API guidance. A future improvement
  would be a real library build emitting `.d.ts`.
- Router-dependent components (pages, AuthenticatedLayout, *Dialog with navigation) can't render without a Router
  provider → they stay floor cards (deferred). Adding a memory-router to DSProvider could rescue some.
- `componentSrcMap` is empty (auto-discovery). 102 components discovered from `src/components`.

## Wave learnings (folded from wave1 subagents)

- **Capture clock is fixed at 2024-05-15.** Any component whose render depends on "today"
  (`getToday()`/`dayjs()` — goal balance, heatmap "today" cell, day bars) computes against that date.
  Future-dated fixtures (2026) yield `totalTarget=0` / empty dynamic values. For dynamic coverage,
  prefer **props-driven** sub-components (e.g. GoalCardHeader takes savings/debt directly) or use
  dates near 2024-05 in fixtures. Empty Dexie/date-relative renders still grade good as faithful states.
- **Dexie-backed components** (TaskCard linked-activity line, TaskActivityFields kind chips,
  GoalHeatmap, GoalStatsDetail) read an **empty IndexedDB** in preview → they render their skeleton/empty
  state correctly but not data-rich rows. Seeding Dexie from the provider is not reliably flushable before
  the screenshot, so empty-state is the accepted good render.
- **Module-level emitter components can't render** (DebtFeedbackToast: driven by `emitDebtFeedback` which
  lives in `packages/frontend-shared`, NOT exported on `window.ActikoDS` since auto-discovery only scans
  `src/components`). DEFERRED (floor card). To rescue later: add the emitter via `cfg.extraEntries`.
- **External-SDK auth buttons** (AppleSignInButton, AccountSection SSO) render in their **disabled** state
  offline (Apple/Google JS SDKs don't load) — faithful, graded good. Enabled state would need SDK stubs in the provider.
- **Stats ChartData shape**: `date` is a **display label** ("1日"), not ISO. Chart sub-components
  (ChartBars/ChartGoalLines/ChartTooltip) need a sized relative-positioned box; ActivityStatCard derives
  chart+summary from `stat.kinds[].logs`.

## Wave2 learnings (folded)

- **Router deferral rule corrected.** `useNavigate()`/`useRouterState()` *hook calls* do NOT throw without a
  Router — only **navigation at render** does: `<Link>`/`<Navigate>`/`<Outlet>`/`RouterProvider`, or `navigate()`
  called during render. Handler-only navigation (in onClick/onSubmit) renders fine. This is why all 6 pages
  (ActikoPage/DailyPage/GoalsPage/StatsPage/ContactPage/TasksPage) and ApiReferencePage render their empty-state
  skeletons and grade good. Judge by render-time navigation, not by import presence.
- **`import.meta.env` is a fixed object in the IIFE bundle** (`IIFE_IMPORT_META_DEFINE`: only MODE/DEV/PROD/SSR/BASE_URL).
  Custom `VITE_*` vars are always undefined in preview → components gated on them render their "unconfigured" state.
  `GoogleSignInButton` early-returns `null` when `VITE_GOOGLE_OAUTH_CLIENT_ID` is falsy → blank card → **deferred**.
- **ModalOverlay-based modals** (fixed inset-0, centered) clip their top in the default grid cell → need
  `cfg.overrides.<Name>: {"cardMode": "single", "primaryStory": "..."}`. Content is faithful, just cropped.
- **LegalModal**: `type="terms"` renders; `privacy`/`tokushoho` content includes a `/contact` `<Link>` → router → blank. Use terms.
- `PreviewRow` returns a `<tr>` → wrap stories in `<table><tbody>`.
- Story export named `Error` shadows the global → lint NG; use `ValidationError` etc.

## Authored + graded good so far (pushed/pending)
Solo (pushed): FormButton, FormInput, FormTextarea, SettingCheckbox, NumpadMode.
Wave1 (pending push): LogCard, TaskList, TaskCard, TaskGroup, TaskActivityFields, TasksTabs,
DeleteConfirmDialog, TasksActiveSection, TasksArchivedSection, ActivityCard, GoalCard, GoalCardActions,
GoalCardHeader, GoalHeatmap, DayTargetsInput, CreateGoalFields, EditGoalFields, EditGoalFormButtons,
GoalStatsDetail, BinaryMode, CheckMode, CounterMode, ManualMode, TimerMode, KindSelector, MemoInput,
RecordingModeSelector, IconTypeSelector, EditActivityKindsField, ActivityChart, ActivityStatCard,
ChartBars, ChartGoalLines, ChartTooltip, SummarySection, SummaryTable, AccountSection, ScopeBadges,
AppleSignInButton.
Wave2 (pending push, 50): all common/* primitives, notes display components, auth forms, setting/subscription
sections, csv/*, api-reference/*, tutorial, ImageUploadField, all 11 dialogs (actiko/daily/goal/tasks), and
all 6 pages (ActikoPage/DailyPage/GoalsPage/StatsPage/ContactPage/TasksPage).

**Deferred (8, stay floor card):** DebtFeedbackToast (module emitter), LegalPage + NotFoundPage (top-level
useNavigate/`<Link>`), NotesPage + NoteDetailPage (router + Dexie), SettingsPage (`<Link to="/contact">`),
AuthenticatedLayout (useRouterState + `<Outlet>`), GoogleSignInButton (returns null — VITE_GOOGLE_OAUTH_CLIENT_ID
undefined in preview). To rescue the router ones later: add a memory-router to `DSProvider`.

**Result: 94/102 authored + graded good; 8 deferred (floor card).**
