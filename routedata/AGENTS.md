# AGENTS.md — RouteData

> Written for LLM coding agents. Describes the project, architecture rules, and Luzmo integration points.

---

## 1. Project Overview

- **Name:** RouteData
- **Purpose:** A table-first embedded analytics workspace for logistics & supply-chain teams. Tracks on-time delivery, delay, cost per shipment, throughput, exception rate, and dock utilization against configurable targets.
- **Stack:** React 19, TypeScript, Next.js 16 (App Router, `output: 'export'` static export), Tailwind v4, Luzmo Flex SDK + Analytics Components Kit (ACK) + Lucero.
- **What it does:** Live KPI dashboard, drag-and-drop dashboard builder, rule-based + AI chart suggestions, filter groups, workbook save/load. All Luzmo calls are made **directly from the browser** with a single long-lived embed key/token — there is **no backend**.

---

## Luzmo (embedded analytics)

When implementing Luzmo functionality (embed tokens, core API, Flex SDK, ACK, or Luzmo IQ), refer to Luzmo's [AGENTS.md](https://developer.luzmo.com/agents.md) file and installed Luzmo skills for official best practices and implementation guidelines.

Embed credentials live in `.env.local` (gitignored) as `ROUTEDATA_LUZMO_*` vars and are surfaced through `lib/luzmo/config.ts`. Because this is a static export with no server, they are mapped into the client bundle at build time via the `env` field in `next.config.ts` (non-`NEXT_PUBLIC_` vars are not auto-inlined) — only the derived **embed** key/token may be exposed this way, never the Luzmo API key/token. `hooks/useAuth.ts` returns them synchronously; there is no `/api/embed-token` route and no `onEmbedAuthorizationExpired` rotation — the token is valid for 1 year and is re-minted out of band. Copy `.env.example` to `.env.local` to run locally.

---

## 2. Module Structure

```
├── app/
│   ├── layout.tsx               # Root layout (fonts, globals)
│   ├── page.tsx                 # App shell: side nav + page router (home / reporting / data sources / targets / settings / dashboards)
│   └── globals.css              # Tailwind base + design tokens
├── components/
│   ├── ErrorBoundary.tsx
│   ├── ack/                     # Thin wrappers around @luzmo/analytics-components-kit web components
│   ├── charts/                  # Flex KPI chart (FlexKpiChart)
│   ├── dev/                     # Opt-in stack-label overlay for debugging (toggled from Settings)
│   ├── insights/                # SuggestedInsights + ChartSuggestionPreview (AI Mode)
│   ├── nav/                     # SideNav
│   ├── onboarding/              # First-run suggestions modal
│   ├── pages/                   # HomePage, DashboardsPage, DataSourcesPage, TargetsPage, SettingsPage
│   ├── source-table/            # Source table preview (ACK luzmo-table-item)
│   ├── ui/                      # Header, shared primitives
│   ├── workbook/                # Save / Load dialogs
│   └── workflow/                # StepSourceTable, StepDashboardBuilder (the Reporting flow)
├── hooks/
│   ├── useAuth.ts               # Returns hardcoded embed credentials
│   ├── usePlatformData.ts       # Direct POST /0.1.0/data for KPIs + targets
│   ├── useDatasetInfo.ts        # Direct POST /0.1.0/securable + /0.1.0/data row count
│   ├── useChartSuggestions.ts   # Rule-based Flex chart suggestions (no network)
│   ├── useSourceTableData.ts    # Source-table rows via POST /0.1.0/data
│   ├── useNativeChartData.ts    # KPI value via POST /0.1.0/data
│   ├── useWorkbook.ts           # localStorage workbook CRUD
│   └── useLuzmoTopNavigationGuard.ts
├── lib/
│   ├── luzmo/
│   │   ├── config.ts            # LUZMO_EMBED_KEY / LUZMO_EMBED_TOKEN / LUZMO_DATASET_ID / hosts
│   │   ├── chart-suggestions.ts # Flex slot builders
│   │   ├── flex-*.ts            # Flex viz type + slot + theme helpers
│   │   ├── enrich-slot-labels.ts
│   │   └── workbook-dataset-fields.ts
│   ├── domain/
│   │   ├── routedata.ts         # App copy, field-group labels
│   │   └── kpi-columns.ts       # Known column UUIDs for the logistics dataset
│   ├── services/                # luzmo-service (host/dataset accessors) + workbook-service (localStorage)
│   ├── ack/                     # ACK helper functions (dataset refs, slot maps)
│   ├── charts/                  # Flex chart templates
│   ├── theme/
│   └── types/
├── public/
├── next.config.ts               # output: 'export', transpilePackages for ACK / react-embed / lucero
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3. Code Quality Standard

### On every change, verify:

1. **Zero type errors.** Run `npx tsc --noEmit`.
2. **No dead code.** Remove unused imports, variables, functions, CSS rules, API routes, and hooks.
3. **No backend.** Never add `app/api/*` routes, never import `@luzmo/nodejs-sdk` in client code, never put the Luzmo **API** key/token in env or client code. The only credentials that may reach the browser are the derived **embed** key/token, read from `ROUTEDATA_LUZMO_*` env vars via `lib/luzmo/config.ts` (mapped into the bundle at build time via `env` in `next.config.ts`). All Luzmo calls go through `fetch('<LUZMO_API_HOST>/0.1.0/...')` with body-level embed credentials.
4. **Consistent naming.** `camelCase` vars/functions, `PascalCase` types, `UPPER_SNAKE` constants.
5. **No `any` types.** Use `unknown` + narrowing, or define a proper interface.
6. **Immutable state.** All store updates use spread/filter/concat.
7. **Tailwind utility classes** for layout and spacing. Design tokens live in `app/globals.css` and `lib/theme/`. No hard-coded one-off values. 
8. **Accessibility.** Every interactive element needs a visible focus state, semantic role, and `aria-label` if purpose isn't obvious.
9. **No console output in production paths.** `console.warn` / `console.error` for error reporting only.
10. **Clean imports.** Use `import type` for type-only imports. External packages first, then local modules via `@/` alias.
11. **Concise JSDoc.** Public functions and interfaces get a one-line JSDoc.

---

## 4. Do / Don't

**Do:** Use Luzmo Flex SDK and ACK web components for chart rendering and editing. Call Luzmo's REST endpoints directly from the browser using the embed key/token. Keep state transitions immutable and centralized in `useWorkbook`. Write strict TypeScript. Keep dependencies minimal.

**Don't:** Bypass Luzmo SDK with D3/Chart.js. Implement custom drag-and-drop or grid layout (use `luzmo-item-grid`). Re-introduce Next API routes or the Node SDK. Store the Luzmo **API key** anywhere in the client bundle — only the derived embed key/token may be shipped. Use `any` types.

---

## 5. Running the Project

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # emits ./out/ — static, deployable anywhere
```

## 6. Rotating the embed token

The embed credentials in `.env.local` expire after 1 year (see `ROUTEDATA_LUZMO_EMBED_EXPIRY`). Re-mint with `@luzmo/nodejs-sdk` from a trusted machine (never in this repo) and paste the new `id` / `token` / `expiry` into `.env.local`.
