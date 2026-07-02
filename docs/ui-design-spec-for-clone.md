# BDTT UI Design Spec For Clone

Date: 2026-06-26
Source app: BDTT Webapp
Purpose: use this as a practical UI blueprint when cloning the interface into another internal plant web app.

## 1. Design Intent

This UI is an internal operations app, not a public landing page. The interface should feel like a compact work tool for plant teams: clear, durable, touch-friendly, and easy to scan under time pressure.

Core direction:

- Data-first dashboard and task workspace.
- Soft industrial/pastel visual language inspired by PVCFC branding.
- Large touch targets for mobile field use.
- Dense but organized layouts for repeat daily work.
- Business flows stay visible: login, dashboard, WorkOrder/task list, progress update, reporting, Excel/data import.

Avoid:

- Marketing hero pages as the main experience.
- Decorative gradients, big illustrations, or oversized empty sections.
- Tiny table-first mobile layouts.
- Color-only status indicators.

## 2. Visual Style

Name the style: `flat pastel glass operations UI`.

It is not heavy glassmorphism. The surfaces are mostly solid white/off-white cards with thin borders, soft shadows, and a few high-contrast dark panels for emphasis.

Main visual traits:

- Background: warm light gray, not pure white.
- Primary color: lime/green for selected state, success, primary actions.
- Supporting colors: orange/accent for in-progress, red for danger/late/P1, blue for unit/info, yellow for warning.
- Cards: white surface, 1px low-contrast border, soft shadow, 16px radius.
- App shell: one large rounded container with border and shadow.
- Icons: Lucide-style outline icons, 20px default, 2px stroke.
- Progress bars: simple rounded tracks, optional diagonal stripe fill for stronger visibility.

## 3. Required Foundations

Preferred stack:

- Next.js or React.
- Tailwind CSS utility classes.
- CSS variables for tokens.
- `lucide-react` or equivalent outline icon set.
- Font: `Plus Jakarta Sans` with Vietnamese subset. Fallback: `Segoe UI`, system sans.

Do not add a component library unless the target app already uses one. The current UI is lightweight enough to rebuild with CSS variables and small shared components.

## 4. Core CSS Tokens

Use these semantic tokens first. Component code should reference `var(--token)` instead of raw hex values.

```css
:root {
  --font-sans: var(--font-plus-jakarta), "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
  --font-mono: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;

  --background: #f2f2f0;
  --foreground: #111111;
  --text-muted: #5f625a;
  --text-soft: #74786f;
  --surface: #ffffff;
  --surface-muted: #f7f7f4;
  --surface-glass: #ffffff;
  --surface-warm: #fff0dc;
  --line: #ececea;
  --line-soft: #f1f1ee;
  --border: rgba(17, 17, 17, 0.07);
  --border-strong: rgba(17, 17, 17, 0.12);

  --primary: #9bd13b;
  --primary-strong: #6fa51f;
  --primary-contrast: #ffffff;
  --primary-soft: #edf8d5;
  --primary-pale: #f5fbe8;

  --accent: #f2a24a;
  --accent-strong: #d76635;
  --accent-soft: #fff0dc;

  --warning: #b18416;
  --warning-strong: #8a6510;
  --warning-soft: #fff7c7;

  --danger: #df5b3a;
  --danger-strong: #c2452a;
  --danger-soft: #fde7e0;

  --success: #6fa51f;
  --success-strong: #5a8718;
  --success-soft: #edf8d5;

  --info: #4a90d9;
  --info-strong: #2f6fb5;
  --info-soft: #e7f0fb;

  --yellow: #e7e94a;
  --yellow-strong: #c9b735;
  --yellow-soft: #fff7c7;

  --shadow-soft-sm: 0 12px 30px rgb(16 24 40 / 0.05);
  --shadow-soft-md: 0 16px 36px -8px rgb(16 24 40 / 0.08);
  --shadow-floating: 0 24px 50px -16px rgb(16 24 40 / 0.18);

  --radius-card: 1rem;
  --radius-field: 0.75rem;
  --radius-panel: 1.25rem;

  --mobile-topbar-height: 4.35rem;
  --mobile-bottom-nav-height: 5.5rem;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

.dark {
  --background: #151612;
  --foreground: #f6f7ef;
  --text-muted: #c0c4b7;
  --text-soft: #a5aa9d;
  --surface: #20211c;
  --surface-muted: #2b2d25;
  --surface-glass: #20211c;
  --surface-warm: rgb(255 183 102 / 0.14);
  --line: rgb(255 255 255 / 0.12);
  --line-soft: rgb(255 255 255 / 0.08);
  --border: rgb(255 255 255 / 0.1);
  --border-strong: rgb(255 255 255 / 0.16);

  --primary: #b7e35a;
  --primary-strong: #b7e35a;
  --primary-contrast: #111111;
  --primary-soft: rgb(183 227 90 / 0.14);
  --primary-pale: rgb(183 227 90 / 0.09);

  --accent: #ffb766;
  --accent-strong: #ff9f43;
  --accent-soft: rgb(255 183 102 / 0.15);

  --warning: #f4d35e;
  --warning-strong: #ffda6b;
  --warning-soft: rgb(244 211 94 / 0.16);

  --danger: #ff8a6b;
  --danger-strong: #ff7354;
  --danger-soft: rgb(255 138 107 / 0.15);

  --success: #b7e35a;
  --success-strong: #d5ff7d;
  --success-soft: rgb(183 227 90 / 0.14);

  --info: #8cc7ff;
  --info-strong: #b4dcff;
  --info-soft: rgb(140 199 255 / 0.14);

  --shadow-soft-sm: 0 12px 30px rgb(0 0 0 / 0.18);
  --shadow-soft-md: 0 16px 36px -8px rgb(0 0 0 / 0.28);
  --shadow-floating: 0 24px 50px -16px rgb(0 0 0 / 0.42);
}
```

## 5. Global Utility Rules

Use these utilities in the cloned app:

```css
body {
  margin: 0;
  min-height: 100dvh;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

button,
input,
select,
textarea {
  font-family: inherit;
  letter-spacing: 0;
}

button {
  touch-action: manipulation;
  cursor: pointer;
}

.focus-ring:focus-visible {
  outline: 3px solid rgba(111, 165, 31, 0.35);
  outline-offset: 2px;
}

.pressable {
  transition: transform 180ms ease, border-color 180ms ease, background-color 180ms ease,
    box-shadow 180ms ease, color 180ms ease;
}

.pressable:hover {
  transform: translateY(-1px);
}

.pressable:active {
  transform: scale(0.985);
}

.app-shell {
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-soft-md);
}

.glass-card {
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow-soft-sm);
}

.metric-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow-soft-sm);
}

.control-pill {
  border: 1px solid var(--border-strong);
  background: var(--surface);
}

.floating-pill {
  border: 1px solid var(--border-strong);
  background: var(--surface);
  box-shadow: var(--shadow-floating);
}

.progress-track {
  height: 0.56rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--line);
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

## 6. Typography

Use a restrained type scale:

- Body: 16px, line-height 1.5.
- Small labels: 12-13px, semibold, uppercase only for section eyebrows or KPI labels.
- Widget title: 15px semibold.
- Page title: 24px mobile, 30px desktop.
- Hero title: 36-48px only on home/login, not inside dashboards.
- KPI values: 24-48px, semibold, `tabular-nums`.
- Monospace only for technical identifiers such as tagname, WorkOrder, equipment code.

Font weight:

- 400 rarely used.
- 500/600 for most labels and content.
- 700 is mostly unnecessary; the UI uses spacing and color more than heavy bold.

## 7. Layout System

### App Shell

Every primary screen should sit inside one app shell:

- Outer page: `min-h-dvh`, small padding, background `var(--background)`.
- Shell: `app-shell`, `rounded-[22px]`, `overflow-hidden`.
- Desktop shell can fill almost full viewport width.
- Do not nest decorative page cards inside other cards.

Recommended desktop shell:

```tsx
<main className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden p-3 2xl:p-4">
  <div className="app-shell mx-auto grid min-h-[calc(100dvh-1.5rem)] grid-cols-[218px_minmax(0,1fr)] overflow-hidden rounded-[22px]">
    <aside />
    <section />
  </div>
</main>
```

Recommended mobile shell:

```tsx
<main className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden px-2 pt-2 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+0.75rem)]">
  <div className="app-shell mx-auto min-h-[calc(100dvh-1rem)] overflow-hidden rounded-[22px]">
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface)]/96 backdrop-blur-xl" />
    <section />
  </div>
  <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 px-3" />
</main>
```

### Desktop Navigation

- Use left sidebar at `218px`.
- Sidebar background: `var(--surface)`.
- Border right: `1px solid var(--line)`.
- Nav item height: at least 44px.
- Active nav: `bg-[var(--primary-soft)]`, icon `var(--primary-strong)`, text foreground.
- Inactive nav: muted text, hover surface-muted.

### Mobile Navigation

- Use fixed bottom nav, max width 520px, centered.
- Bottom nav container: `floating-pill`, rounded card radius, padding 8px.
- 3-5 top-level items maximum.
- Each item: `min-h-14`, icon + label.
- Active item: primary-strong background and primary-contrast text.
- Add bottom padding to all scroll content so content is never hidden under nav.

### Sticky Regions

Mobile worker screens use two sticky layers:

- Topbar: sticky top 0, z-index 30.
- Filter/search block: sticky under the topbar, z-index 10.

Keep sticky blocks compact. The first task card should appear quickly on common phone heights.

## 8. Component Specification

### Button

Base:

- `inline-flex`, centered, gap 8px.
- Radius: `var(--radius-field)`.
- Medium size: min-height 48px, padding x 20px.
- Small size: min-height 36px, padding x 16px.
- Font: 13-15px semibold.
- Must include `.focus-ring` and `.pressable`.
- Disabled state: muted surface, muted text, no shadow, no pointer events.

Variants:

- Primary: `bg var(--primary-strong)`, `text var(--primary-contrast)`, soft shadow.
- Secondary: white surface, border-strong, foreground text.
- Danger: danger background, white text.
- Ghost: no border, muted text, surface-muted hover.

### Card / Widget

Use card for repeated objects and widgets only.

- Radius: `var(--radius-card)` or 16px.
- Border: `var(--line)`.
- Background: `var(--surface)`.
- Shadow: `var(--shadow-soft-sm)`.
- Padding: 16px default, 20px for widgets, 24px for large panels.

Widget header:

- Title: 15px semibold.
- Subtitle: 11-13px muted.
- Optional right action aligned to top.

### Input / Select / Textarea

- Use visible labels, not placeholder-only labels.
- Input height: min 48px.
- Radius: field radius.
- Background: surface.
- Border: border-strong through `control-pill`.
- Text: 16px semibold to avoid mobile auto zoom.
- Focus ring: same primary focus ring.

### Badge

Badge shape:

- Inline-flex, rounded-full.
- Height: at least 28px.
- Padding x: 10px.
- Font: 12-13px semibold.
- Use tabular nums when values are present.

Tone mapping:

- `success`: completed / done.
- `accent`: in progress.
- `warning`: warning / pending.
- `danger`: late / P1 / cancel.
- `info`: unit / data / neutral blue info.
- `neutral`: count / duration / generic metadata.
- `primary`: selected or primary category.

### Progress Bar

Two styles:

- Normal: 9px rounded track, fill with semantic color.
- Striped: 16px or 20px flat bar with diagonal stripes for task progress visibility.

Progress color rules:

- 0%: primary or neutral.
- 1-99%: accent.
- 100%: success.
- Late or blocked: danger.

Always set `role="progressbar"` and `aria-valuenow`.

### Icons

- Use one icon family only.
- Default size: 20px x 20px.
- Stroke width: 2.
- Icons are decorative unless used as standalone controls.
- Icon-only buttons must have accessible labels.

## 9. Screen Patterns

### Home

Desktop:

- Centered app shell, max width around 1024px.
- Two columns: intro panel and status/metric panel.
- Brand appears top-left, theme toggle top-right.
- Primary action button leads to login.

Mobile:

- Single column.
- Keep title shorter and compact.
- Avoid pushing the main action below the fold.

### Login

Desktop:

- Two-column shell.
- Left dark panel: internal workspace explanation and two small metrics.
- Right light panel: brand, developer mark if needed, title, form.

Mobile:

- Hide the dark side panel.
- Show the login form immediately after brand.
- Keep PWA install as secondary.

Form rules:

- Username and password have visible labels.
- Password has show/hide trailing button.
- Remember checkbox uses at least 48px row height.
- Error appears near submit area via alert.
- Submit button shows loading state and is disabled while submitting.

### Admin Dashboard

Desktop:

- Sidebar navigation.
- Header with page title, subtitle, theme/mode/account controls.
- Content grid with tabs, KPI strip, charts/widgets, tables.
- KPI cards use `metric-card`, compact labels, large tabular values.

Mobile:

- Header sticky.
- Bottom nav replaces sidebar.
- KPI cards become 1-2 columns depending width.
- Avoid wide tables; use cards or stacked rows.

Dashboard tabs:

- Use segmented control inside a `glass-card`.
- Active tab can use dark foreground background for strong contrast.

### Worker Workspace

Desktop:

- Sidebar tab navigation: tasks, overview, history.
- Header with online/offline status, theme toggle, account menu.
- Tasks view has three zones:
  - KPI strip.
  - Filter/search widget.
  - Main workspace split: task list and sticky selected task detail.
- Task detail panel should remain visible while list scrolls.

Mobile:

- Topbar sticky with title, account, online/offline, current worker summary.
- Tasks tab is default.
- Use bottom tabs: work, overview, history.
- Filter row includes:
  - summary pills,
  - status segmented filter,
  - P1/cancel buttons,
  - search/group controls.
- Task cards are the main mobile unit.
- Pending update bar floats above bottom nav.

Task card anatomy:

- Left progress ring.
- Tagname in monospace.
- Task name two-line clamp.
- Right percent chip.
- Badge row: cancel, priority, unit, duration, recorded details.
- Striped progress bar.
- Progress editor with quick percent choices and manual percent input.
- Optional notes/photo/cancel controls behind expand action.

Progress editor:

- Quick choices: 0, 25, 50, 75, 100.
- Manual numeric input in same segmented control.
- Clamp value to 0-100.
- Notes textarea and photo capture are secondary details.
- Save state must be visible near progress title.

## 10. Interaction And Accessibility

Minimum interaction quality:

- Touch target: at least 44px, preferably 48px.
- Every interactive element gets visible focus.
- Hover cannot be the only affordance.
- Press feedback should happen through color/shadow/scale, not layout shifts.
- Use `aria-live` for online/offline, saving, and error states.
- Use `aria-expanded` for expandable history/task sections.
- Charts should have `role="img"` and text `aria-label`.
- Respect `prefers-reduced-motion`.
- Text must wrap safely on mobile; do not allow button labels to overflow.

Text overflow rules:

- Data IDs can truncate.
- Important labels should wrap instead of overflow.
- Bottom nav labels should be short; if long, allow two-line wrapping.
- Use `min-w-0` aggressively in flex/grid children.

## 11. Clone Checklist

Before calling the clone complete:

- CSS tokens are defined once at root.
- Light and dark themes both map semantic tokens.
- Main screens use `app-shell`.
- Desktop navigation uses sidebar; mobile uses fixed bottom nav.
- Cards/widgets use the same radius, border, and shadow.
- Buttons, inputs, badges, progress bars are token-driven.
- Mobile content has bottom padding above the nav.
- All status colors have text labels, not color alone.
- Touch targets are at least 44px.
- No public/SEO/marketing layout has replaced the operational workflow.
- No sensitive plant/process data is exposed in sample UI.

## 12. Implementation Prompt For Another App

Use this prompt when asking another coding agent to clone the UI:

```text
Clone the BDTT internal operations UI style into this app.

Use a flat pastel glass operations style: warm light-gray background, white cards, thin borders, soft shadows, 16px card radius, 12px field radius, lime/green primary, orange in-progress, red danger, blue info, and dark high-contrast panels only for emphasis.

Build with semantic CSS variables, Plus Jakarta Sans or a similar modern sans font, Lucide-style outline icons, large 44-48px touch targets, visible focus rings, and mobile-safe fixed bottom navigation.

Preserve the target app's business flow and data model. Only change presentation/components/layout. Use app-shell, glass-card, metric-card, control-pill, floating-pill, token-driven buttons/inputs/badges/progress bars, desktop sidebar navigation, and mobile bottom tabs.

For dashboard screens, prioritize dense operational scanning: KPI strip, charts/widgets, compact tables or stacked mobile cards. For worker/task screens, use mobile task cards with progress ring, metadata badges, striped progress bar, quick percent controls, manual percent input, notes/photo actions, and a floating pending-update bar.

Avoid marketing hero layouts, decorative gradients, oversized empty spacing, emoji icons, tiny mobile tables, and raw hex values inside components.
```
