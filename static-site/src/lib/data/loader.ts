/**
 * Excel file loader.
 * Parses the input workbook (US Monthly / UK Monthly / Paychecks + asset allocation
 * sheets) and loads it into DuckDB tables.
 */

import * as XLSX from 'xlsx';
import { createTables, execute } from './database';

export interface LoadProgress {
  phase: 'reading' | 'loading';
  currentSheet?: string;
  currentIndex?: number;
  totalSheets?: number;
  message: string;
}

export interface LoadError {
  sheet: string;
  row?: number;
  column?: string;
  message: string;
}

export interface LoadResult {
  success: boolean;
  errors: LoadError[];
  warnings: LoadError[];
}

export type ProgressCallback = (progress: LoadProgress) => void;

type Row = Record<string, unknown>;

/** Problems found while loading. Errors are fatal; warnings are not. */
interface Issues {
  errors: LoadError[];
  warnings: LoadError[];
}

/** One step of the load: reads a sheet from the workbook and inserts its rows. */
interface SheetLoader {
  sheet: string;
  load: (workbook: XLSX.WorkBook, issues: Issues) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Cell parsing and SQL formatting
// ---------------------------------------------------------------------------

/**
 * Parse a date value from Excel into YYYY-MM-DD.
 * Handles Date objects, Excel serial numbers, and YYYY-MM-DD / YYYY-MM strings
 * (with embedded quotes stripped).
 */
function parseDate(value: string | number | Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  if (value instanceof Date) {
    // Round to the nearest local day. Reading the local components directly (or toISOString,
    // which converts to UTC) is off by the UTC offset or by odd historical offsets (e.g. Paris).
    // The workbook is read without cellDates so this is only a safety net.
    const d = new Date(value.getTime() + 12 * 60 * 60 * 1000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  if (typeof value === 'number') {
    // Excel serial date: no timezone involved
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${pad(date.m)}-${pad(date.d)}`;
  }

  const dateStr = String(value).replace(/"/g, '');
  return /^\d{4}-\d{2}$/.test(dateStr) ? `${dateStr}-01` : dateStr;
}

/** True when the value is a date we can parse. */
function isValidDate(value: unknown): boolean {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (typeof value === 'number') {
    return value > 0; // Excel serial dates are positive
  }
  if (typeof value === 'string') {
    return /^\d{4}-\d{2}(-\d{2})?$/.test(value.replace(/"/g, ''));
  }
  return false;
}

/** Number from a raw cell value; blank, missing or non-numeric cells become 0. */
function getNum(row: Row, key: string): number {
  const v = row[key];
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

/** SQL timestamp literal for a (previously validated) date cell. */
function sqlDate(value: unknown): string {
  return `'${parseDate(value as string | number | Date)}'::TIMESTAMP`;
}

/** SQL string literal, or NULL for a blank cell. */
function sqlText(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** SQL numeric literal, or NULL for a blank or non-numeric cell. */
function sqlNumber(value: unknown): string {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return isNaN(n) ? 'NULL' : n.toString();
}

/** INSERT one row; values must already be SQL literals. */
function insert(table: string, values: Record<string, string | number>): Promise<void> {
  const columns = Object.keys(values).join(', ');
  return execute(`INSERT INTO ${table} (${columns}) VALUES (${Object.values(values).join(', ')})`);
}

function readRows(workbook: XLSX.WorkBook, sheetName: string): Row[] | null {
  const sheet = workbook.Sheets[sheetName];
  return sheet ? XLSX.utils.sheet_to_json<Row>(sheet, { raw: true }) : null;
}

// ---------------------------------------------------------------------------
// Sheet loaders
// ---------------------------------------------------------------------------

/**
 * Loader for a sheet with one row per date. Handles the shared checks (sheet
 * present, has rows, valid date) and calls `insertRow` for each valid row.
 * Problems are errors for required sheets and warnings for optional ones.
 */
function datedSheetLoader(
  sheet: string,
  required: boolean,
  insertRow: (row: Row, date: string) => Promise<void>
): SheetLoader {
  return {
    sheet,
    load: async (workbook, issues) => {
      const problems = required ? issues.errors : issues.warnings;
      const rows = readRows(workbook, sheet);

      if (!rows) {
        problems.push({
          sheet,
          message: required
            ? 'Required sheet is missing from the Excel file'
            : 'Optional sheet is missing - some features may be unavailable',
        });
        return;
      }
      if (rows.length === 0) {
        problems.push({ sheet, message: required ? 'Sheet has no data rows' : 'Sheet is empty' });
        return;
      }

      for (let i = 0; i < rows.length; i++) {
        const dateValue = rows[i]['Date'];
        if (!isValidDate(dateValue)) {
          problems.push({
            sheet,
            row: i + 2, // +1 for 1-indexing, +1 for the header row
            column: 'Date',
            message: `Invalid date value: "${dateValue}"`,
          });
          continue;
        }
        await insertRow(rows[i], sqlDate(dateValue));
      }
    },
  };
}

/**
 * US Monthly -> us_networth and us_spend.
 * Net USD = Net Override if set, else the sum of the account columns.
 * Months with no net worth are not inserted into us_networth.
 */
const usMonthly = datedSheetLoader('US Monthly', true, async (row, dates) => {
  const accounts = ['Cash', 'Taxable Brokerage', 'Roth IRA', '401k', 'HSA'];
  const netOverride = getNum(row, 'Net Override');
  const net = netOverride > 0 ? netOverride : accounts.reduce((sum, col) => sum + getNum(row, col), 0);

  if (net > 0) {
    await insert('us_networth', { dates, net, conversion: 1.0 });
  }
  await insert('us_spend', { dates, total: getNum(row, 'US Spend'), conversion: 1.0 });
});

/**
 * UK Monthly -> uk_networth and uk_spend (amounts in GBP, with the GBP/USD rate).
 * Net GBP = Net Override if set, else the sum of the account columns.
 */
const ukMonthly = datedSheetLoader('UK Monthly', false, async (row, dates) => {
  const accounts = ['Cash (£)', 'ETFs (£)', 'Pension (£)'];
  const netOverride = getNum(row, 'Net Override (£)');
  const net = netOverride > 0 ? netOverride : accounts.reduce((sum, col) => sum + getNum(row, col), 0);
  const conversion = getNum(row, 'GBP/USD') || 1.0;

  if (net > 0) {
    await insert('uk_networth', { dates, net, conversion });
  }
  await insert('uk_spend', { dates, total: getNum(row, 'UK Spend (£)'), conversion });
});

/**
 * Paychecks -> total_comp.
 * The "Approx Tax Reserves" column is for the user's reference only and is ignored.
 */
const paychecks = datedSheetLoader('Paychecks', true, async (row, dates) => {
  await insert('total_comp', {
    dates,
    gross: getNum(row, 'Gross'),
    pension_contrib: getNum(row, 'Pension Contrib'),
    net: getNum(row, 'Net'),
    conversion: getNum(row, 'GBP/USD') || 1.0,
  });
});

/**
 * Asset allocation sheets are optional and have no date column. Rows with a
 * zero or missing Value are skipped.
 */
function assetSheetLoader(sheet: string, table: string, withConversion: boolean): SheetLoader {
  return {
    sheet,
    load: async (workbook, issues) => {
      const rows = readRows(workbook, sheet);
      if (!rows) {
        issues.warnings.push({
          sheet,
          message: 'Optional sheet is missing - some features may be unavailable',
        });
        return;
      }

      for (const row of rows.filter((r) => getNum(r, 'Value') > 0)) {
        await insert(table, {
          asset: sqlText(row['Asset']),
          value: sqlNumber(row['Value']),
          account_type: sqlText(row['Account Type']),
          ...(withConversion && { conversion: sqlNumber(row['Conversion']) }),
        });
      }
    },
  };
}

const SHEET_LOADERS: SheetLoader[] = [
  usMonthly,
  ukMonthly,
  paychecks,
  assetSheetLoader('US Asset Allocation', 'us_asset_allocation', false),
  assetSheetLoader('UK Asset Allocation', 'uk_asset_allocation', true),
];

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Load an Excel file into DuckDB.
 * @param file - The Excel file to load
 * @param onProgress - Optional callback for progress updates
 */
export async function loadExcelFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<LoadResult> {
  const issues: Issues = { errors: [], warnings: [] };

  try {
    onProgress?.({ phase: 'reading', message: 'Reading Excel file...' });
    const buffer = await file.arrayBuffer();
    // No cellDates: date cells stay as Excel serial numbers, which parseDate() converts
    // exactly. JS Dates built by SheetJS depend on the browser's timezone.
    const workbook = XLSX.read(buffer, { type: 'array' });

    await createTables();

    for (let i = 0; i < SHEET_LOADERS.length; i++) {
      const { sheet, load } = SHEET_LOADERS[i];
      const position = `${i + 1}/${SHEET_LOADERS.length}`;
      onProgress?.({
        phase: 'loading',
        currentSheet: sheet,
        currentIndex: i + 1,
        totalSheets: SHEET_LOADERS.length,
        message: `Loading ${sheet} (${position})...`,
      });

      await load(workbook, issues);
      if (issues.errors.length > 0) break;
    }

    return { success: issues.errors.length === 0, ...issues };
  } catch (error) {
    console.error('Failed to load Excel file:', error);
    issues.errors.push({
      sheet: 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error loading file',
    });
    return { success: false, ...issues };
  }
}
