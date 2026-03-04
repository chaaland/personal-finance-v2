# Personal Finance Dashboard

A self-hosted personal finance dashboard for tracking net worth, income, spending, savings rate, and FIRE (Financial Independence, Retire Early) projections across US and UK accounts.

**Your financial data never leaves your browser.** Upload an Excel file, explore your finances, close the tab — nothing is stored or transmitted.

![Summary](screenshots/summary-tab.png)

---

## Features

| Tab | What It Shows |
| --- | --- |
| **Summary** | Net worth snapshot, YTD income, projected annual spending, savings rate, FIRE progress |
| **Net Worth** | Net worth over time (US + UK), YoY changes, asset allocation by stock and account type |
| **Income** | Annual gross vs. net income comparison |
| **Spending** | Monthly spending with rolling median, annual totals, savings rate by year |
| **FIRE** | Retirement runway simulation, portfolio drawdown by account, withdrawal sources |

---

## Screenshots

<table>
  <tr>
    <td><img src="screenshots/net-worth-tab.png" alt="Net Worth tab" width="480"/></td>
    <td><img src="screenshots/fire-tab.png" alt="FIRE tab" width="480"/></td>
  </tr>
  <tr>
    <td align="center"><em>Net Worth</em></td>
    <td align="center"><em>FIRE projections</em></td>
  </tr>
  <tr>
    <td><img src="screenshots/spending-tab.png" alt="Spending tab" width="480"/></td>
    <td><img src="screenshots/summary-tab-light.png" alt="Light mode" width="480"/></td>
  </tr>
  <tr>
    <td align="center"><em>Spending</em></td>
    <td align="center"><em>Light mode</em></td>
  </tr>
</table>

---

## Privacy: Your Data Stays Local

This dashboard is a **fully static site** — there is no backend, no database, and no server that receives your data. When you upload your Excel file:

1. The file is read directly by your browser using the [xlsx](https://sheetjs.com/) library
2. Data is loaded into [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview.html), an in-browser SQL engine running as a WebAssembly module
3. All queries and calculations execute locally inside the browser tab
4. When you close or refresh the tab, all data is gone

### How to Verify

You can confirm no data is uploaded using your browser's built-in developer tools:

1. Open the dashboard and press **F12** (or `Cmd+Option+I` on Mac) to open DevTools
2. Click the **Network** tab
3. Upload your Excel file
4. Filter requests by **Fetch/XHR** (Chrome) or **XHR** (Firefox)

You will see requests only for static assets (`.js`, `.wasm`, `.css` files loaded once on startup) — never any POST requests containing your financial data. The WASM files are the DuckDB engine itself being downloaded to run locally.

---

## Tech Stack

| Concern | Technology |
| --- | --- |
| Framework | [Svelte 5](https://svelte.dev/) + [Vite](https://vitejs.dev/) + TypeScript |
| In-browser SQL | [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview.html) |
| Charts | [Plotly.js](https://plotly.com/javascript/) |
| Excel parsing | [xlsx (SheetJS)](https://sheetjs.com/) |
| Numeric precision | [decimal.js](https://mikemcl.github.io/decimal.js/) |
| Hosting | GitHub Pages (static) |

---

## Data Format

The dashboard expects a single Excel file (`.xlsx`) with the following sheets:

| Sheet | Required Columns | Notes |
| --- | --- | --- |
| `US Spend` | `Dates`, `Total`, `Conversion` | Monthly USD spending |
| `UK Spend` | `Dates`, `Total`, `Conversion` | Monthly GBP spending with USD conversion |
| `US Networth` | `Dates`, `Net`, `Conversion` | Periodic US net worth snapshots |
| `UK Networth` | `Dates`, `Net`, `Conversion` | Periodic UK net worth snapshots |
| `Total Comp` | `Dates`, `Gross`, `Pension Contrib`, `Net`, `Conversion` | Payslip-level income data |
| `US Asset Allocation` | `Asset`, `Value`, `Account Type` | Current US holdings |
| `UK Asset Allocation` | `Asset`, `Value`, `Account Type`, `Conversion` | Current UK holdings |

All `Conversion` columns should contain the USD exchange rate at the time of the row.

---

## Running Locally

```bash
cd static-site
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

To build for production:

```bash
npm run build   # outputs to static-site/dist/
```

---

## FIRE Methodology

The FIRE tab uses a **Least Absolute Deviation (LAD) regression** on historical net worth data to project a FIRE date. LAD is preferred over ordinary least squares because it is robust to outliers (market crashes, windfalls) that would skew an OLS fit.

The projected FIRE date is calculated against a hardcoded goal of **$4,250,000** at safe withdrawal rates of 3%, 3.5%, 4%, and 4.5%.

The retirement drawdown simulation applies account-specific growth rates and models the withdrawal order across account types (taxable → tax-deferred → tax-free) to project portfolio longevity.
