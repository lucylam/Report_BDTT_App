# BDTT Webapp Design Audit - Desktop And Mobile

Audit date: 2026-06-08
Target: `http://localhost:3001`
Capture method: local Chrome headless screenshots using an isolated temporary browser profile.

## Screenshots

- [Desktop home](desktop-01-home.png)
- [Desktop login](desktop-02-login.png)
- [Desktop admin dashboard](desktop-03-admin-dashboard.png)
- [Desktop worker workspace](desktop-04-worker.png)
- [Mobile home](mobile-01-home.png)
- [Mobile login](mobile-02-login.png)
- [Mobile admin dashboard](mobile-03-admin-dashboard.png)
- [Mobile worker workspace](mobile-04-worker.png)

## Audit Scope

Reviewed the first visible desktop and mobile states for home, login, admin dashboard, and worker task update surfaces. The audit focuses on layout, task clarity, responsive behavior, visible accessibility risks, and internal-use workflow friction.

## Step Review

1. Home page - Healthy on desktop, heavy on mobile.
   - Desktop gives clear entry points for Login, Admin, and Excel.
   - Mobile hero text is very large and pushes navigation cards far down; the Excel card starts below the fold.
   - For internal repeat use, the home screen could be more compact, especially on phones.

2. Login page - Clear, but security and density need attention.
   - Form labels, inputs, and primary action are easy to see.
   - Mobile sizing is comfortable for touch.
   - The default password is displayed directly in helper text. This is convenient for demo, but risky for an internal plant app once real accounts exist.
   - The PWA install card is useful, but it competes with the login task. Consider reducing its prominence until after login.

3. Admin dashboard - Strong desktop layout, mobile content starts too low.
   - Desktop sidebar, KPI cards, and dashboard sections are easy to scan.
   - The top KPI row communicates status quickly.
   - On mobile, the install prompt takes a large block above the KPI cards, so the admin's first operational data starts lower than expected.
   - Mobile bottom navigation overlaps the lower part of visible content in the captured viewport. Add enough bottom padding to scroll content above the nav.

4. Worker workspace - Best-aligned with field use, but mobile controls are tall.
   - Desktop worker view has a clear three-zone structure: filters, task list, selected task detail.
   - Mobile worker view is practical: status, deadline warning, summary, filters, search, grouping, and bottom tabs are all reachable.
   - The sticky filter/search area is tall; on mobile it consumes much of the screen before the task list appears.
   - Bottom nav again sits over content near the bottom of the viewport.

## Strengths

- Responsive variants exist for the worker flow instead of forcing a desktop table onto mobile.
- Touch targets are generally large enough for field use.
- Status color language is consistent across KPI, worker progress, warning, success, and danger states.
- Desktop admin and desktop worker screens are organized around real operational tasks rather than marketing-style content.
- Vietnamese text renders correctly in the browser screenshots.

## UX Risks

1. Mobile first-screen efficiency is weak on home, admin, and worker.
   - The app is for repeat internal use; users likely want the fastest path to update or check work.
   - Recommendation: reduce hero/header size on mobile and prioritize the primary task entry or first operational data.

2. PWA install card competes with core work.
   - It appears prominently on login and mobile admin.
   - Recommendation: show it as a smaller dismissible action, or move it to account/settings after the first login.

3. Mobile bottom navigation can cover content.
   - Seen on mobile admin and mobile worker screenshots.
   - Recommendation: verify each mobile page has bottom padding at least equal to bottom nav height plus safe-area inset.

4. Worker mobile filters are powerful but visually heavy.
   - Summary cards, filter tabs, P1/cancel chips, search, unit chips, and grouping controls appear before the first task card.
   - Recommendation: keep high-frequency controls visible, but collapse less-used filters behind a filter button or secondary row.

5. Login helper text exposes the demo default password.
   - Recommendation: remove the literal default password from the UI before real internal use. Provide it through onboarding, admin reset, or one-time account setup instead.

## Accessibility Risks

- Contrast appears mostly acceptable, but muted gray text on warm backgrounds should be checked with an automated contrast tool.
- Bottom nav labels on mobile are small and dense; long labels such as "Xem worker" wrap and may be harder to scan.
- Keyboard focus styling exists in CSS, but this audit did not verify full keyboard navigation order.
- Screenshot review cannot confirm screen reader labels, form error announcement behavior, or whether charts have usable text alternatives.

## Recommended Next Changes

1. Fix mobile bottom-nav overlap on admin and worker pages.
2. Remove or hide the default password from the login screen for non-demo use.
3. Reduce mobile home hero size and bring all three entry cards higher.
4. Make PWA install less prominent during login/admin work.
5. Compact the mobile worker filter/search block so the first task appears sooner.
6. Run a focused keyboard and contrast check after layout fixes.

