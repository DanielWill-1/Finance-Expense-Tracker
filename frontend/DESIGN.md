---
name: GhostLedger
description: A calm, local-first workspace for reviewing everyday finances.
colors:
  canvas: '#F8FAFC'
  surface: '#FFFFFF'
  ink: '#1E293B'
  muted-ink: '#64748B'
  outline: '#E2E8F0'
  guide-teal: '#0F766E'
  guide-teal-hover: '#0D6B63'
  teal-wash: '#E5F3F0'
  teal-mark: '#CCFBF1'
  outflow-coral: '#B4534B'
typography:
  display:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
    fontSize: '1.875rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.03em'
  headline:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: '-0.02em'
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.5
  metric:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.025em'
    fontFeature: 'tnum'
rounded:
  field: '8px'
  control: '12px'
  card: '16px'
  large: '20px'
  full: '9999px'
spacing:
  unit: '4px'
  control-gap: '8px'
  compact: '12px'
  gutter: '16px'
  card-inset: '20px'
  roomy: '24px'
  section: '32px'
  desktop-inset: '40px'
components:
  button-primary:
    backgroundColor: '{colors.guide-teal}'
    textColor: '{colors.surface}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '8px 16px'
    height: '44px'
  button-outline:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '8px 16px'
    height: '44px'
  navigation-active:
    backgroundColor: 'rgba(15, 118, 110, 0.10)'
    textColor: '{colors.guide-teal}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '8px 12px'
    height: '44px'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.card}'
    padding: '20px'
  metric:
    textColor: '{colors.guide-teal}'
    typography: '{typography.metric}'
  finance-field:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.field}'
    padding: '8px 12px'
  cash-flow-legend:
    textColor: '{colors.muted-ink}'
    typography: '{typography.label}'
  transaction-table-row:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    padding: '16px 24px'
---

# Design System: GhostLedger

## Overview

**Creative North Star: “Soft-White Civic Wayfinding”**

GhostLedger gives everyday money review a calm, navigable visual language. A cool, soft-white canvas lets white surfaces carry the working content; slate typography keeps balances and labels easy to scan. Teal acts as a small guide mark across navigation, primary actions, positive values, and the income series. Muted coral is reserved for outflows.

The system favors familiar controls and an open reading order over decoration. Account snapshots lead the dashboard, followed by monthly cash flow and recent activity; secondary spending views remain available below. A single system-sans family, tabular figures, subtle borders, and compact state feedback keep the interface steady during frequent use.

**Key Characteristics:**

- Soft-white surfaces over a cool neutral canvas.
- Teal marks positive values and active wayfinding; coral marks expenses.
- Financial figures use tabular numerals and fixed breakpoint sizes.
- Borders define cards; shadows are reserved for floating interface elements.

## Colors

The palette moves from cool slate neutrals to restrained teal and coral signals, with each accent assigned a clear financial or navigation meaning.

### Primary

- **Ledger Teal** (`colors.guide-teal`): Primary actions, active navigation, positive totals, and the income series.
- **Ledger Teal, Hover** (`colors.guide-teal-hover`): A slightly deeper action state used on hover.

### Secondary

- **Outflow Coral** (`colors.outflow-coral`): Expense amounts, the expense line, and expense-category bars.

### Neutral

- **Cool Canvas** (`colors.canvas`): The application background behind working surfaces.
- **Paper Surface** (`colors.surface`): Cards, sidebar, buttons, and panels.
- **Slate Ink** (`colors.ink`): Headings and primary content.
- **Quiet Slate** (`colors.muted-ink`): Supporting copy, dates, axes, and secondary labels.
- **Hairline Slate** (`colors.outline`): Card borders, table dividers, and navigation separation.
- **Pale Teal Wash** (`colors.teal-wash`): Text selection and low-emphasis teal states.
- **Teal Mark** (`colors.teal-mark`): The soft field behind the brand mark.

### Named Rules

**The Signal-Meaning Rule.** Teal carries positive or active meaning; coral carries expense meaning. Do not use either as decoration.

## Theme Modes

GhostLedger provides two deliberate presentations of the same soft, scan-friendly interface. Light mode remains the default and preserves the approved white surfaces. Dark mode uses a slate canvas, slightly lifted working surfaces, soft slate borders, and a brighter teal signal. Components consume semantic CSS variables from `src/index.css` through the shared Tailwind color aliases; page components should not introduce mode-specific hex values.

| Semantic token              | Light     | Dark      |
| --------------------------- | --------- | --------- |
| Canvas                      | `#F8FAFC` | `#111827` |
| Sidebar                     | `#FFFFFF` | `#151F2E` |
| Surface / dialog            | `#FFFFFF` | `#1B2636` |
| Elevated surface / tooltip  | `#F1F5F9` | `#243244` |
| Primary text                | `#1E293B` | `#F1F5F9` |
| Secondary text / chart axes | `#64748B` | `#A8B5C5` |
| Border / chart grid         | `#E2E8F0` | `#334155` |
| Accent / positive / focus   | `#0F766E` | `#2DD4BF` |
| Expense / negative          | `#B4534B` | `#FDA29B` |
| Input surface               | `#F8FAFC` | `#151F2E` |

The token set also covers selected and hover states, focus rings, dialog scrims, tooltip surfaces, chart hover marks, and floating shadows. Keep financial meaning distinguishable with labels and signs as well as color. Inputs, dialogs, navigation, buttons, empty states, errors, tables, and charts use these same role-based tokens.

The shell toggle uses Moon/Sun icons, a 44px target, visible keyboard focus, and action labels (“Switch to dark mode” / “Switch to light mode”). The choice is stored separately from finance data at `localStorage['ghostledger-theme']` as `light` or `dark`. A small synchronous script in `index.html` applies a valid stored value before the React interface loads; invalid or unavailable storage falls back to light. React keeps the `data-theme` attribute, `.dark` class, document `color-scheme`, and stored choice in sync. The user's explicit choice is used across routes, reloads, browser restarts, and other open tabs; no external storage or telemetry is involved.

### Chart Theming

Charts read their series, grid, axis, tooltip, and hover colors from semantic CSS variables. A theme change updates the existing SVG and tooltip styles immediately without a reload. Preserve one row per currency. Category bars and their amount-list markers share the expense token, and the list stays associated with its chart for keyboard and screen-reader use.

## Typography

**Display Font:** System UI sans-serif stack (`system-ui`, with platform UI fallbacks)

**Body Font:** The same system UI sans-serif stack
**Label/Mono Font:** JetBrains Mono, Fira Code, or monospace where a form field already uses the mono role

**Character:** The sans voice uses the platform's familiar interface typeface, with restrained tracking on headings and values. It loads locally without a remote font request. Dashboard amounts stay in the same family as surrounding text so they read as finance data, not as a technical display.

### Hierarchy

- **Display** (600, 1.875rem, 1.2): The page heading, with compact negative tracking.
- **Headline** (600, 1.125rem, 1.5): Section titles such as Recent Transactions and Cash Flow.
- **Metric** (600, 1.5rem by default and 1.875rem at the large breakpoint, 1.25): Emphasized values use fixed rem steps; supporting values use 1.25rem by default and 1.5rem at the large breakpoint.
- **Body** (400, 0.875rem, 1.5): Transaction descriptions, table content, and supporting copy.
- **Label** (500, 0.75rem, 1.5): Metric labels, dates, categories, chart legends, and secondary detail.

### Named Rules

**The Tabular Figure Rule.** Monetary values use tabular numerals; metric sizes change at breakpoints rather than scaling with viewport width.

## Layout

The desktop shell gives navigation a 232px column; at tablet widths it uses a compact 208px labeled sidebar, and below that it becomes a fixed, labeled bottom navigation. The main canvas is capped at 1440px and uses 20px mobile, 24px small-screen, and 40px large-screen side padding. Cards and sections follow a steady 16–32px rhythm, with 20px card insets and 32px section separation.

Financial metrics use one column at narrow widths, two from the small breakpoint, and four at extra-large widths. Cash flow and categories stack until extra-large widths, where the chart gets the wider share. The transaction table keeps its four columns on wider screens and becomes a readable stacked list on mobile. The status bar stays in the desktop footer and sits above the mobile navigation.

## Elevation & Depth

Working cards stay flat: a thin neutral border separates the white surface from the canvas. The mobile navigation uses one soft upward shadow to remain distinct from scrolling content, while the chart tooltip uses a restrained offset shadow for transient focus. There is no resting shadow on dashboard cards.

### Named Rules

**The Border-Before-Shadow Rule.** Use borders for persistent card structure; use a soft shadow only when an element floats above or responds to the page.

## Shapes

Cards have softly rounded 16px corners, while buttons and active navigation use 12px corners. Borders remain one pixel and neutral except for the thin teal navigation guide and the subtle net-worth emphasis. Keep surfaces comfortably rounded without turning data rows or labels into pills.

## Components

### Buttons

- **Shape:** Gently rounded corners (12px).
- **Primary:** Teal fill with white text, 8px by 16px padding, and a 44px minimum height for the main action.
- **Hover / Focus:** Hover deepens the teal; keyboard focus uses a visible two-pixel teal ring with offset. Disabled actions lower opacity and retain their shape.
- **Secondary / Ghost:** Outline actions use a white surface and neutral border; ghost actions gain a quiet neutral hover background.

### Cards / Containers

- **Corner Style:** Soft 16px corners.
- **Background:** White on the cool canvas.
- **Shadow Strategy:** Flat at rest; see Elevation & Depth for floating controls.
- **Border:** One-pixel neutral outline. The net-worth card receives a subtle teal-tinted outline.
- **Internal Padding:** 20px by default, increasing to 24px in wider panels where space allows.

### Navigation

- Desktop uses a white 232px sidebar; tablet uses a compact 208px labeled sidebar; mobile uses a labeled fixed bottom bar with a 44px minimum control target.
- Active navigation combines a pale teal field, teal text, and a narrow teal guide at the left edge. Hover remains neutral and low contrast.
- Theme switching is available from the application footer on every route; the action name changes with the current theme.
- Keep Logout absent: GhostLedger has no sign-in or logout flow.

### Financial Summary

- Show Current Net Worth, Total Income, Total Expenses, and Net Savings in that order.
- Align labels and values across each row. Keep account balance snapshots distinct from transaction totals.
- Show the API-reported transaction period once near the section heading. “All time” applies to transaction totals; Current Net Worth remains a current account-balance snapshot.
- Use tabular figures; preserve each currency as its own value rather than combining unlike units.

### Cash Flow Chart

- Plot the existing 12-month income and expense series separately for each currency.
- Use teal for income and coral for expenses, thin neutral grid lines, legible month labels, and an interactive tooltip.
- Label the six-completed-calendar-month average as “Average monthly expenses” and keep its basis visible.
- Keep category names and exact formatted amounts visible in a compact currency-specific list associated with the existing chart.
- Keep a screen-reader table with month, income, and expense values alongside the visual chart.

### Transactions

- Desktop rows keep Date, Description, Category, and right-aligned Amount columns with subtle dividers.
- Mobile rows stack the same information; long descriptions wrap fully instead of disappearing behind truncation.
- Use teal for income amounts and coral for expenses without adding colorful category badges.

## Do's and Don'ts

### Do:

- **Do** keep balances, activity, and each currency visually distinct.
- **Do** use tabular figures for money and align monetary table values to the right.
- **Do** preserve visible keyboard focus and reduced-motion support.
- **Do** keep empty, loading, and error states in the same surface and type system.

### Don't:

- **Don't** invent financial comparisons, trend percentages, or controls without supporting behavior or data.
- **Don't** use teal or coral as general decoration.
- **Don't** combine currencies into a single total.
- **Don't** add remote font or image dependencies to the local-first interface.
- **Don't** add heavy shadows, gradients, dark panels, or stacked decorative cards.
