# Phase 6: Polish & Deploy Design

## Overview

Complete the static site migration with error handling, loading states, bundle optimization, and GitHub Pages deployment.

## Requirements

- All data processing must remain client-side
- No user data transmitted over the network
- DuckDB WASM loaded from CDN (standard practice, doesn't leak user data)

## Design

### 1. Enhanced Error Handling

**Validation in loader.ts:**
- Check each sheet has at least one data row
- Validate date columns contain parseable dates
- Validate numeric columns contain numbers
- Return specific, user-friendly error messages

**ErrorDisplay component:**
- Structured error display: which sheet failed, what went wrong
- "Try Again" button to re-upload

**Graceful degradation:**
- Non-critical sheet issues show warnings but continue loading
- Critical sheets (US Spend, US Networth, Total Comp) must be valid

### 2. Loading States

**Three loading phases:**
- `initializing`: DuckDB WASM loading from CDN
- `processing`: Excel file parsing and sheet loading
- `ready`: Data loaded, app ready

**Progress feedback:**
- Sheet-by-sheet progress: "Loading US Spend (1/7)..."
- Progress callback from loadExcelFile()

### 3. Bundle Optimization

- Vite chunk splitting for vendor/app separation
- Keep full Plotly bundle (simplicity over ~500KB savings)
- Tree-shaking for xlsx and decimal.js

### 4. GitHub Pages Deployment

**Build config:**
- Base path: `/personal-finance-v2/`
- Output: `dist/`

**COOP/COEP headers:**
- Use `coi-serviceworker` for SharedArrayBuffer support
- GitHub Pages doesn't support custom headers natively

**GitHub Actions:**
- Trigger on push to `main`
- Build and deploy to gh-pages branch

## Files to Modify

| File | Changes |
|------|---------|
| `static-site/src/lib/data/loader.ts` | Add validation, progress callback |
| `static-site/src/lib/components/ErrorDisplay.svelte` | New component |
| `static-site/src/App.svelte` | Loading phases, error display integration |
| `static-site/vite.config.ts` | Base path, chunk splitting |
| `static-site/public/coi-serviceworker.js` | New file for COOP/COEP |
| `static-site/public/index.html` | Register service worker |
| `.github/workflows/deploy.yml` | New workflow |
| `MIGRATION_PLAN.md` | Mark Phase 6 complete |
