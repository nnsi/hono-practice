# Actiko — design system conventions

Actiko is a mobile-first, offline-first personal activity tracker. The UI is **Japanese**, warm,
minimal, and quiet. All components are real React components from `actiko-frontend`, rendered against
this DS's compiled Tailwind stylesheet.

## Importing & wrapping

- Import components from the library: `import { FormButton, GoalCard } from "actiko-frontend";`
- Components are styled by **Tailwind utility classes baked into the shipped stylesheet** (`styles.css` →
  `_ds_bundle.css`). Just render them inside a normal page; the tokens/fonts load from that stylesheet.
- Some components read **i18n** (react-i18next) and **react-query** context. When composing a runnable app,
  wrap the tree in the app's `I18nextProvider` (Japanese) + `QueryClientProvider`. Without i18n, text falls
  back to raw translation keys; without react-query, data-driven sections stay in their loading/empty state.
- Recording-mode components (`ManualMode`, `NumpadMode`, `TimerMode`, `CounterMode`, `BinaryMode`, `CheckMode`)
  take a shared `RecordingModeProps` (`activity`, `kinds`, `date`, `onSave`, `isSubmitting`). Modals/dialogs
  (`*Dialog`, `*Modal`, `ModalOverlay`) render centered overlays — open them with their `isOpen`/content props.

## Styling idiom — Tailwind utilities (this is the vocabulary to use)

Style your own layout glue with Tailwind utilities. This DS customizes the default palette and type:

- **Neutrals are remapped to warm *stone*** — `bg-gray-50 … bg-gray-950` render as warm stone
  (`#fafaf9` → `#0c0a09`), not cool gray. Page background is `bg-gray-100` (`#f5f5f4`); primary text `text-gray-900`.
- **Brand accent is amber/orange**: `bg-amber-500`/`text-amber-500` (`#f59e0b`, the active/brand color),
  plus `amber-100/200/600/700` and `orange-500/600/700`. The focus ring is amber.
- **Fonts**: `Outfit` (Latin) + `Zen Kaku Gothic New` (Japanese), already the default `font-sans`.
- **Elevation**: `shadow-soft`, `shadow-lifted`, `shadow-modal` (warm, low-opacity). Radius: `rounded-lg`/`rounded-xl`/`rounded-2xl`.
- **Motion** (subtle): `animate-fade-in`, `animate-scale-in`.
- **Named DS component classes** (defined in the stylesheet, use as-is): `glass-nav` (frosted bottom nav),
  `sticky-header`, `modal-backdrop`, `nav-pill` / `nav-pill-active`, `activity-done` (teal "recorded today" glow),
  `date-pill-today`, `stagger` (list entrance), `press-effect`.

Build cards with `bg-white rounded-xl border border-gray-200 shadow-soft`. Reach for `amber` for emphasis,
warm `gray-*` for everything neutral. Don't introduce cool grays, hard shadows, or non-amber accents.

## Where the truth lives

- `styles.css` (and its `@import`s, incl. `_ds_bundle.css`) — the full token + utility surface. Read it before styling.
- Per component: `components/<group>/<Name>/<Name>.prompt.md` (usage) and `<Name>.d.ts` (props).

## One idiomatic snippet

```tsx
import { GoalCard, FormButton } from "actiko-frontend";

export function GoalPanel() {
  return (
    <div className="max-w-md mx-auto p-4 space-y-3 bg-gray-100 min-h-screen font-sans">
      <h2 className="text-lg font-semibold text-gray-900">目標</h2>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-4">
        {/* real DS component for the control */}
        <GoalCard /* …goal props… */ />
      </div>
      <FormButton variant="primary" label="新規目標を追加" className="w-full" />
    </div>
  );
}
```
