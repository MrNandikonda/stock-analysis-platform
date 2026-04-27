# Watchlist UI Redesign Team Plan

Date: 2026-04-26  
Status: Planning only — no application code implementation in this task.

## 1. Objective

Redesign the visible **Watchlists** section into a simpler, more attractive, mobile-friendly research hub inspired by the broad usability patterns of Robinhood and Groww, while keeping a distinct RythuMarket identity.

This document is for review before implementation. It gathers opinions from the full agent team and includes sample web-view concepts.

## 2. Non-Negotiable Guardrails

- Do **not** copy Robinhood or Groww exactly: no logos, no brand colors copied directly, no trade dress, no proprietary layouts.
- Use public/common investing-app patterns only: clean watch rows, clear price movement, quick add, mobile-first cards, organized holdings/watchlist grouping.
- Keep the product as **research support only**.
- No buy/sell/trade execution flows.
- No broker account linking.
- No new heavy infrastructure.
- Preserve the lightweight stack: FastAPI, SQLite, React/Vite/Tailwind, Docker Compose.
- Use existing APIs first; backend changes should be optional and additive.

Recommended language:

- “screens as constructive”
- “mixed evidence”
- “cautious context”
- “requires confirmation”
- “stale data lowers confidence”
- “track in portfolio”

Avoid:

- “buy”
- “sell”
- “strong buy”
- “AI recommends”
- “guaranteed”
- “risk-free”
- “will go up”
- “trade now”

## 3. Current Repo Facts

Current Watchlists implementation is concentrated in:

- `frontend/src/pages/WatchlistsPage.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/types.ts`
- `backend/app/api/watchlists.py`
- `backend/app/services/watchlist_service.py`
- `backend/app/schemas/watchlist.py`

Current visible app tabs are:

- Dashboard
- Watchlists
- Portfolio
- News

Current Watchlists page already supports:

- Create/delete watchlists
- Add symbols
- Remove symbols
- CSV import
- Alerts
- AI watchlist settings
- Manual AI run
- AI summary
- AI stock analysis detail
- Analyst report panel
- Add-to-portfolio modal

Current watchlist item contract is thin:

| Field | Available now |
|---|---|
| `symbol` | Yes |
| `price` | Yes, nullable |
| `change_1d` | Yes, nullable |
| `updated_at` | Yes, nullable |
| company name | No, optional future |
| exchange | No, optional future |
| sector | No, optional future |
| volume / RSI / P/E | No in watchlist item, optional future |
| quote source / fallback flag | No, optional future |
| sparkline | No, optional future |

## 4. External Reference Observations

### Robinhood-inspired patterns to borrow safely

Public search results and common app patterns suggest Robinhood-style watchlists focus on:

- Fast list creation and organization.
- Simple, scan-friendly stock rows.
- Strong symbol / price / daily move hierarchy.
- Minimal controls until the user taps or expands an item.
- Mobile-first interaction.

Use these as generic UX patterns only.

### Groww-inspired patterns to borrow safely

Groww public product/update pages emphasize:

- Clean investing experience.
- Unified view of financial items.
- Organized dashboards.
- Security and privacy messaging.
- Smart segregation/grouping.
- Automatic refresh/sync language.

Use these concepts as inspiration for grouping, security copy, and a cleaner dashboard-like layout.

## 5. Team Opinions

### 5.1 FRONTEND_AGENT Opinion

Primary concern: the current page is too dense. The watched symbols are not visually the hero; they are currently small chips inside a management card.

Recommended frontend direction:

- Make symbols the main content.
- Use app-like rows/cards instead of small chips.
- Move advanced controls into drawers/disclosures.
- Keep TanStack Query and Zustand patterns.
- Keep API calls in `frontend/src/lib/api.ts`.
- Keep shared types in `frontend/src/lib/types.ts`.
- Avoid a heavy UI framework.

Recommended component split for future implementation:

| Component | Purpose |
|---|---|
| `WatchlistSelectorRail` | Select list, show symbol count and AI state |
| `WatchlistHeroCard` | Selected list summary: count, gainers, decliners, freshness |
| `SymbolAddComposer` | Search-backed add flow plus paste chips |
| `WatchlistInstrumentList` | Primary symbol list/card grid |
| `WatchlistInstrumentRow` | Symbol, price, change, freshness, actions |
| `WatchlistAIInsightPanel` | Compact AI summary and run/settings actions |
| `AIAnalysisDetailDrawer` | Detail view for selected symbol |
| `AlertComposer` | Contextual alert setup |
| `CsvImportDisclosure` | Hidden-by-default CSV import |
| `WatchlistEmptyState` | First-run and no-symbol guidance |

Frontend phasing:

1. Safe refactor without API changes.
2. Replace chips with instrument cards.
3. Add symbol composer and CSV disclosure.
4. Recompose AI and alerts into side rail/drawer.
5. Polish accessibility and responsive behavior.

### 5.2 BACKEND_AGENT Opinion

Primary concern: the redesign can start frontend-only. Backend changes should only be added if the UI needs richer data.

Existing backend support is enough for first pass:

- `GET /api/v1/watchlists`
- `POST /api/v1/watchlists`
- `DELETE /api/v1/watchlists/{id}`
- `POST /api/v1/watchlists/{id}/items`
- `DELETE /api/v1/watchlists/{id}/items/{symbol}`
- `POST /api/v1/watchlists/{id}/import-csv`
- `GET/POST /api/v1/watchlists/alerts`
- `POST /api/v1/watchlists/alerts/check`
- Existing AI watchlist routes.

Optional backend enhancements for later:

| Enhancement | Why | Migration needed? |
|---|---|---|
| Enrich `GET /watchlists` item fields | company, exchange, sector, volume, RSI, P/E | No, if joined from existing tables |
| `GET /watchlists/{id}/summary` | reduce frontend fanout | No |
| `PATCH /watchlists/{id}` | rename watchlist | No |
| Per-symbol add/import result payloads | better invalid/duplicate feedback | No |
| Watchlist metadata: color/icon/pinned/sort order/notes | stronger UX personalization | Yes, additive only |

Backend warning:

- Do not call live market providers from page-load endpoints.
- Keep watchlist reads SQLite-only.
- Avoid unbounded provider calls during CSV import.
- If metadata is needed, add a new SQL migration; do not rewrite old migrations.

### 5.3 MARKET_DATA_AGENT Opinion

Primary concern: the UI can look real-time, but must be honest that data is cached/local and provider-limited.

Recommended freshness badge model:

| Badge | Rule | UI copy |
|---|---|---|
| Fresh | quote age <= 3 minutes during market hours | Fresh |
| Delayed | 3–15 minutes during market hours | Delayed |
| Stale | > 15 minutes during market hours | Stale |
| Closed | market closed, quote exists | Market closed · last updated |
| Missing | no price or timestamp | No quote |
| Error | future provider status says failed | Provider error |
| Fallback | future fallback flag exists | Fallback data |

Fields usable now:

- Watchlist name and count
- Symbol
- Price
- 1D change
- Last updated
- Fresh/stale/missing derived from `updated_at`
- AI summary fields
- Search result symbol/name/exchange/asset type
- Market status from `/market/status`

Optional future fields:

- `exchange`
- `asset_type`
- `name`
- `sector`
- `currency`
- `data_freshness`
- `quote_source`
- `quote_status`
- `is_fallback`
- `is_synthetic`
- `provider_message`
- `volume`
- `rsi_14`
- `pe`
- `pb`
- `pcr`
- `iv`

Refresh strategy:

- Prefer scheduler and cached metrics.
- Watchlists page can poll every 30–60 seconds.
- Do not auto-trigger full market refresh on page load.
- Manual refresh should be explicit and scoped in a future endpoint.
- Large watchlists should show “refresh may be slower” messaging.

### 5.4 QUANT_RISK_AGENT Opinion

Primary concern: the watchlist should be a research triage board, not a trading terminal.

Recommended hierarchy per symbol card:

1. Raw market snapshot
   - Symbol
   - Price
   - 1D move
   - Freshness chip
2. Research signal
   - Conservative label
   - Score
   - Confidence
3. Risk/context chips
   - Fresh data
   - Stale data
   - High IV
   - Event risk
   - Portfolio concentration
   - Sparse news
4. Actions
   - View analysis
   - Set alert
   - Track in portfolio
   - Open report
   - Remove

Recommended AI label mapping:

| Backend signal | UI label |
|---|---|
| `strong_bullish` | Strong constructive screen |
| `bullish` | Constructive screen |
| `neutral` | Mixed / watch |
| `bearish` | Cautious screen |
| `strong_bearish` | High-caution screen |
| `no_data` | Insufficient data |

Rename detail sections:

| Current | Safer UI label |
|---|---|
| Bullish | Supportive factors |
| Bearish | Risk / pressure factors |
| Neutral | Context / incomplete evidence |
| Top Bullish | Most constructive by AI score |
| Top Bearish | Most cautious by AI score |

Alert language:

> Alerts are local research notifications based on cached market metrics. They are not order instructions or trading recommendations.

Portfolio conversion language:

- Use “Track in portfolio” or “Save tracked position.”
- Do not use “Buy,” “Invest now,” or “Confirm buy.”

### 5.5 DEVOPS_DOCKER_AGENT Opinion

Primary concern: the redesign should not require Docker/nginx/env changes.

Recommendation:

- Plan as frontend-only static asset redesign first.
- No Compose resource increase needed.
- No nginx change needed.
- No new env var needed.
- Rebuild only frontend if implementation is frontend-only.

Performance constraints:

- Keep Watchlists chunk under roughly 100–150 KB uncompressed unless justified.
- Avoid new charting/UI frameworks.
- Avoid external CDN assets.
- Avoid per-symbol history requests on render.
- Respect reduced motion.

Future rollout commands if frontend-only implementation is approved:

```powershell
cd frontend
npm run build
cd ..
docker compose config --quiet
docker compose build frontend
docker compose up -d --force-recreate frontend
```

Public hosting cautions:

- Watchlists reveal user interests.
- Enable Basic Auth for public exposure.
- Keep backend bound to localhost.
- Do not expose provider secrets in frontend.

### 5.6 QA_SECURITY_AGENT Opinion

Primary concern: redesign must improve validation, accessibility, and safety without weakening existing protections.

Security/privacy concerns:

- No broker flows.
- No account linking.
- No external analytics widgets.
- No localStorage persistence of sensitive financial interests unless approved.
- Keep API calls under `/api/v1` proxy.
- Keep optional Basic Auth, CORS, and rate limiting.

Form validation requirements:

- Watchlist name: trim, 1–120 chars.
- Symbol input: uppercase, dedupe, safe characters, support comma/newline paste.
- Alerts: finite numeric targets, condition-specific validation.
- AI settings: respect backend bounds and provider availability.
- CSV: preview rows, handle BOM/Windows line endings, detect duplicates/blank rows, bound size.

Accessibility requirements:

- Visible labels, not placeholder-only fields.
- Icon actions need accessible names.
- Keyboard navigable rows, drawers, menus, category toggles.
- `aria-live` for mutation results.
- Focus management after modal/drawer open and close.
- 44px-ish touch targets on mobile.
- Contrast-safe green/red states.
- Respect reduced motion.

Testing recommendations if implemented:

- Frontend component tests for empty, loading, error, add symbol, CSV, alerts, AI controls.
- Backend tests for watchlist CRUD/import/alerts if API changes are added.
- Runtime validation with frontend load, watchlist flows, and Basic Auth on/off.

## 6. Candidate Web-View Concepts

These are sample review concepts. They are **wireframes**, not implementation.

### Option A — FRONTEND_AGENT “Clean App Cards”

Best for: modern visual clarity and mobile-first simplicity.

Desktop sample:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Watchlists                                           3 lists | AI Ready       │
│ Research support only · cached quotes · not trading advice                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Growth 12] [NSE Leaders 18] [US Tech 9] [+ New list]                       │
├───────────────────────────────────────────────────────────┬──────────────────┤
│ Growth Watchlist                                          │ AI Snapshot      │
│ 12 symbols · 7 gainers · 4 decliners · Fresh 2m ago       │ Mixed / Watch    │
│ [Search or paste symbols...] [+ Add]                      │ Confidence 0.62  │
│                                                           │ Last run 9:30 PM │
│ ┌───────────────────────────────────────────────────────┐ │ Top constructive│
│ │ RELIANCE        ₹2,920.15     +1.24%      Fresh       │ │ RELIANCE, INFY  │
│ │ Constructive screen · Conf 0.68                      │ │ Top cautious    │
│ │ [Report] [Track] [Alert] [More]                      │ │ TSLA            │
│ └───────────────────────────────────────────────────────┘ │ [Run now]       │
│ ┌───────────────────────────────────────────────────────┐ │ [Settings ▾]    │
│ │ AAPL             $182.20     -0.42%      Delayed      │ │ [Alerts ▾]      │
│ │ Mixed / watch · Freshness lowers confidence           │ │ [CSV Import ▾]  │
│ │ [Report] [Track] [Alert] [More]                      │ │                 │
│ └───────────────────────────────────────────────────────┘ │                 │
└───────────────────────────────────────────────────────────┴──────────────────┘
```

Mobile sample:

```text
┌──────────────────────────────┐
│ Watchlists                   │
│ [Growth] [NSE] [US Tech] [+] │
│ Search or paste symbols      │
│ [+ Add]                      │
├──────────────────────────────┤
│ RELIANCE        +1.24% Fresh │
│ ₹2,920.15                    │
│ Constructive screen          │
│ [Analysis] [Alert] [Track]   │
├──────────────────────────────┤
│ AAPL           -0.42% Delayed│
│ $182.20                      │
│ Mixed / watch                │
│ [Analysis] [Alert] [Track]   │
├──────────────────────────────┤
│ AI Summary ▾                 │
│ Alerts ▾                     │
│ CSV Import ▾                 │
│ Settings ▾                   │
└──────────────────────────────┘
```

Pros:

- Best immediate UI improvement.
- Uses current API.
- Easy to make responsive.

Cons:

- Richer metadata still limited unless backend is enhanced later.

### Option B — BACKEND_AGENT “Data-Rich Research Cards”

Best for: richer rows with company/exchange/sector/fundamentals after optional backend enrichment.

Desktop sample:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Watchlist Hub · Growth                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Add Symbol] [Import CSV] [Rename] [Refresh cached quotes]                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Symbol      Company        Exch   Price    1D     RSI   P/E   Freshness      │
│ RELIANCE    Reliance Ind.  NSE    2920.15  +1.2%  58    28x   Fresh          │
│ AAPL        Apple Inc.     NASDAQ 182.20   -0.4%  49    29x   Delayed        │
│ INFY        Infosys        NSE    1512.40  +0.7%  61    24x   Fresh          │
└──────────────────────────────────────────────────────────────────────────────┘
```

Pros:

- Most informative for power users.
- Supports sorting/filtering later.

Cons:

- Needs optional backend response enrichment.
- More testing required.
- Must avoid live-provider fanout.

### Option C — MARKET_DATA_AGENT “Freshness-First Watchlist”

Best for: transparency and trust in cached/stale data.

Desktop sample:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Growth Watchlist · Cached local quote snapshots                              │
│ NSE: Open · NYSE: Pre-market · Last page refresh: 2m ago                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Fresh 8] [Delayed 3] [Stale 1] [No quote 0]                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ RELIANCE  ₹2,920.15  +1.24%  Fresh   Updated 2m ago   NSE                   │
│ AAPL      $182.20    -0.42%  Delayed Updated 9m ago   US                    │
│ XYZ       --          --      No quote Provider unavailable                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Pros:

- Honest about data quality.
- Reduces user confusion around missing prices.

Cons:

- Less visually exciting unless paired with richer card design.

### Option D — QUANT_RISK_AGENT “Research Triage Board”

Best for: serious research workflow with safe financial semantics.

Desktop sample:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Watchlist Research Triage · Growth                                           │
│ Raw quote → Research signal → Risk context → User decision                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ RELIANCE  +1.24% Fresh                                                       │
│ Signal: Constructive screen · Score +32 · Confidence 0.68                    │
│ Chips: Fresh data · Fundamentals supportive · Event risk low                 │
│ Supportive factors: margin trend, volume confirmation                        │
│ Risk factors: valuation requires confirmation                                │
│ [View analysis] [Set research alert] [Track in portfolio]                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ AAPL  -0.42% Delayed                                                         │
│ Signal: Mixed / watch · Score +4 · Confidence 0.54                           │
│ Chips: Delayed quote · High valuation · Source freshness moderate            │
│ [View analysis] [Set research alert] [Track in portfolio]                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

Pros:

- Best safety and clarity for financial semantics.
- Makes AI more useful without turning it into advice.

Cons:

- More text-heavy.
- Needs careful UI density control.

### Option E — QA_SECURITY_AGENT “Accessible Workflow Board”

Best for: reliability, forms, accessibility, and import-heavy users.

Desktop sample:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Watchlists                                                                  │
│ Status region: 3 lists loaded · no pending actions                           │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ Create / Add / Import          │ Selected Watchlist                           │
│ Watchlist name label           │ RELIANCE +1.24% Fresh                        │
│ [input] [Create]               │ AAPL -0.42% Delayed                          │
│ Symbol label                   │                                              │
│ [input] [Validate] [Add]       │ Focus-safe action buttons                    │
│ CSV Preview ▾                  │ Clear mutation messages                     │
│ Alerts ▾                       │ Keyboard-friendly row actions               │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

Pros:

- Best accessibility and validation outcome.
- Strongest for CSV/import/error scenarios.

Cons:

- Needs visual polish from frontend design option.

## 7. Recommended Hybrid: “RythuMarket Watch Hub”

The best review candidate is a hybrid:

- FRONTEND_AGENT layout as the base.
- MARKET_DATA_AGENT freshness badges on every row.
- QUANT_RISK_AGENT safe signal language.
- BACKEND_AGENT optional enrichment roadmap.
- QA_SECURITY_AGENT validation and accessibility checklist.
- DEVOPS_DOCKER_AGENT lightweight deployment constraints.

### Recommended desktop web view

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ RythuMarket · Watchlists                                        3 lists | AI Ready │
│ Track symbols with cached quotes, research signals, and local alerts.              │
│ Research support only — not investment advice or trade instructions.               │
├────────────────────────────────────────────────────────────────────────────────────┤
│ [Growth 12] [NSE Leaders 18] [US Tech 9]                  [+ New list] [Import ▾] │
├───────────────────────────────────────────────────────────────┬────────────────────┤
│ Growth                                                        │ Insight Rail        │
│ 12 tracked · 7 up · 4 down · 1 flat · latest quote 2m ago     │ Watchlist signal    │
│ [Search symbol or paste: RELIANCE, AAPL...]        [+ Add]    │ Mixed / watch       │
│                                                               │ Avg conf 0.62       │
│ ┌───────────────────────────────────────────────────────────┐ │ Last run 9:30 PM   │
│ │ RELIANCE                             Fresh · NSE          │ │ Next run 10:30 PM  │
│ │ ₹2,920.15                            +1.24% today         │ │                    │
│ │ Constructive screen · confidence 0.68                     │ │ Data quality       │
│ │ Chips: Fresh data · Fundamentals supportive · Event watch │ │ 8 fresh · 3 delayed│
│ │ [Analysis] [Report] [Alert] [Track position] [⋯]          │ │ 1 stale            │
│ └───────────────────────────────────────────────────────────┘ │                    │
│ ┌───────────────────────────────────────────────────────────┐ │ Most constructive  │
│ │ AAPL                                 Delayed · US         │ │ RELIANCE · INFY    │
│ │ $182.20                              -0.42% today         │ │ Most cautious      │
│ │ Mixed / watch · confidence 0.54                          │ │ TSLA               │
│ │ Chips: Delayed quote · valuation watch · source moderate  │ │                    │
│ │ [Analysis] [Report] [Alert] [Track position] [⋯]          │ │ [Run AI]           │
│ └───────────────────────────────────────────────────────────┘ │ [AI Settings ▾]    │
│                                                               │ [Alert Setup ▾]    │
└───────────────────────────────────────────────────────────────┴────────────────────┘
```

### Recommended mobile web view

```text
┌──────────────────────────────┐
│ Watchlists                   │
│ Research support only        │
├──────────────────────────────┤
│ [Growth] [NSE] [US Tech] [+] │
├──────────────────────────────┤
│ Growth                       │
│ 12 tracked · latest 2m ago   │
│ Search or paste symbols      │
│ [+ Add]                      │
├──────────────────────────────┤
│ RELIANCE              +1.24% │
│ ₹2,920.15             Fresh  │
│ Constructive screen          │
│ Confidence 0.68              │
│ [Analysis] [Alert] [Track]   │
├──────────────────────────────┤
│ AAPL                  -0.42% │
│ $182.20              Delayed │
│ Mixed / watch                │
│ Confidence 0.54              │
│ [Analysis] [Alert] [Track]   │
├──────────────────────────────┤
│ AI summary ▾                 │
│ Import CSV ▾                 │
│ Alerts ▾                     │
│ Settings ▾                   │
└──────────────────────────────┘
```

### Recommended empty state

```text
┌──────────────────────────────────────────────┐
│ Create your first watchlist                  │
│ Track NSE and US symbols in one clean board. │
│ Quotes are cached locally and refreshed by   │
│ the scheduler when available.                │
│                                              │
│ [Watchlist name: Long Term Ideas] [Create]   │
│ or                                           │
│ [Import CSV ▾]                               │
└──────────────────────────────────────────────┘
```

### Recommended no-symbol state

```text
┌──────────────────────────────────────────────┐
│ Growth is empty                              │
│ Add symbols to start tracking quotes, alerts │
│ and research context.                        │
│                                              │
│ [Search RELIANCE, AAPL, SPY...] [+ Add]      │
│ [Paste comma-separated symbols]              │
└──────────────────────────────────────────────┘
```

### Recommended AI detail drawer

```text
┌─────────────────────────────────────┐
│ RELIANCE · Research detail           │
│ Constructive screen · confidence .68 │
├─────────────────────────────────────┤
│ Executive summary                    │
│ RELIANCE screens constructive, but   │
│ valuation requires confirmation.     │
├─────────────────────────────────────┤
│ Supportive factors                   │
│ • Fundamentals supportive            │
│ • Trend remains constructive         │
│                                     │
│ Risk / pressure factors              │
│ • Valuation premium                  │
│ • Event risk watch                   │
├─────────────────────────────────────┤
│ Source health                        │
│ Fresh quote · AI analysis expires... │
│ [Source provenance ▾]                │
└─────────────────────────────────────┘
```

## 8. Proposed Future Implementation Phases

No implementation is being done in this task. If approved later, recommended sequence:

### Phase 1 — Frontend-only layout refactor

Files likely touched later:

- `frontend/src/pages/WatchlistsPage.tsx`
- New components under `frontend/src/components/watchlists/`
- Possibly `frontend/src/App.test.tsx` or new Watchlists tests

Scope:

- Extract subcomponents.
- Preserve existing API and behavior.
- Add loading/error/empty states.
- Keep all current features reachable.

Validation:

- `cd frontend && npm run build`
- `cd frontend && npm test`

### Phase 2 — Symbol card redesign

Scope:

- Replace current symbol chips with card/row design.
- Add freshness badges from current `updated_at`.
- Move actions into row-level buttons/menus.
- Keep analyst report and portfolio modal lazy/user-triggered.

### Phase 3 — Better add/import UX

Scope:

- Search-backed symbol add composer using existing `/market/search`.
- Paste chips for comma/newline input.
- CSV import disclosure with preview.
- Clear partial-success messaging using current `inserted` count, then richer backend result if later approved.

### Phase 4 — AI/alerts recomposition

Scope:

- Move AI summary into compact insight rail.
- Move AI settings into disclosure/drawer.
- Contextual alert setup from selected symbol.
- Rename AI labels to research-safe language.

### Phase 5 — Optional backend enrichment

Only if review says richer cards are needed.

Potential files later:

- `backend/app/api/watchlists.py`
- `backend/app/services/watchlist_service.py`
- `backend/app/schemas/watchlist.py`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/types.ts`
- backend/frontend tests

Potential enhancements:

- Add optional fields from `stocks` and `stock_metrics`.
- Add per-symbol import/add results.
- Add summary endpoint.
- Add rename route.

Migration:

- Not required for response enrichment.
- Required only for persistent UI metadata such as pinned items, sort order, notes, icons, or colors.

### Phase 6 — Validation and redeploy

Frontend-only:

```powershell
cd frontend
npm run build
npm test
cd ..
git diff --check
docker compose config --quiet
docker compose build frontend
docker compose up -d --force-recreate frontend
```

Backend/API included:

```powershell
cd backend
python -m compileall app
python -m pytest -q
cd ..
docker compose build backend frontend
docker compose up -d --force-recreate backend scheduler frontend
```

Smoke checks:

```powershell
$health = Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
$front = Invoke-WebRequest http://localhost/ -UseBasicParsing
[pscustomobject]@{
  BackendStatus = $health.status
  FrontendStatus = $front.StatusCode
  HtmlBytes = $front.Content.Length
} | Format-List
```

## 9. Risks and Decisions for Review

| Area | Current recommendation | Risk if ignored |
|---|---|---|
| API contract | Start with existing API | Larger backend scope, more tests |
| Data freshness | Show cached/stale/missing labels | User may assume realtime quotes |
| AI language | Use research-safe labels | Could look like investment advice |
| Provider calls | No per-row live fetches | Rate limits, slow UI |
| CSV import | Hide behind disclosure and preview | Confusing partial imports |
| Alerts | Call them one-time research alerts | Could be mistaken for trading triggers |
| Portfolio action | “Track in portfolio” | Could imply broker execution |
| Docker | Frontend-only deploy first | Unnecessary backend/scheduler restarts |
| Accessibility | Build labels/focus/touch targets into design | Attractive but hard to use |
| IP/trade dress | Inspired, not cloned | Brand/copyright/trade-dress risk |

## 10. Master Recommendation

Choose the **Recommended Hybrid: RythuMarket Watch Hub**.

Why:

- It keeps the simplified portal direction.
- It gives the user the clean, modern watchlist feel they want.
- It can start frontend-only with existing APIs.
- It is honest about cached/stale data.
- It keeps AI analysis useful without sounding like financial advice.
- It avoids Docker/backend scope unless richer data is explicitly approved.

Best implementation order after review:

1. Approve visual direction and wireframe.
2. Implement frontend-only cards/rails/drawers.
3. Validate build/tests.
4. Deploy frontend only.
5. Decide later whether backend enrichment is worth adding.

## 11. Review Checklist

Before implementation, decide:

- Preferred concept: A, B, C, D, E, or Recommended Hybrid.
- Should AI be visible by default, or collapsed by default?
- Should the card list be compact rows, large cards, or both with a toggle?
- Should CSV import remain available on the page, or move behind an advanced menu?
- Should backend enrichment be part of the first implementation, or deferred?
- Should watchlist rename/pinning/sorting be included later?
- Should the app keep the current colorful theme or shift Watchlists to cleaner white cards with only accent colors?
