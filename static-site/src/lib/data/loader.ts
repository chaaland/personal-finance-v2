/**
 * Excel file loader.
 * Parses Excel files and loads data into DuckDB tables.
 * Mirrors Python data/loader.py
 */

import * as XLSX from 'xlsx';
import { createTables, execute } from './database';

interface SheetMapping {
  sheetName: string;
  tableName: string;
  columns: string[];
  required: boolean;
}

export interface LoadProgress {
  phase: 'reading' | 'validating' | 'loading';
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

const SHEET_MAPPINGS: SheetMapping[] = [
  {
    sheetName: 'US Spend',
    tableName: 'us_spend',
    columns: ['dates', 'total', 'conversion'],
    required: true,
  },
  {
    sheetName: 'UK Spend',
    tableName: 'uk_spend',
    columns: ['dates', 'total', 'conversion'],
    required: false,
  },
  {
    sheetName: 'US Networth',
    tableName: 'us_networth',
    columns: ['dates', 'net', 'conversion'],
    required: true,
  },
  {
    sheetName: 'UK Networth',
    tableName: 'uk_networth',
    columns: ['dates', 'net', 'conversion'],
    required: false,
  },
  {
    sheetName: 'Total Comp',
    tableName: 'total_comp',
    columns: ['dates', 'gross', 'pension_contrib', 'net', 'conversion'],
    required: true,
  },
  {
    sheetName: 'US Asset Allocation',
    tableName: 'us_asset_allocation',
    columns: ['asset', 'value', 'account_type'],
    required: false,
  },
  {
    sheetName: 'UK Asset Allocation',
    tableName: 'uk_asset_allocation',
    columns: ['asset', 'value', 'account_type', 'conversion'],
    required: false,
  },
];

/**
 * Column name mapping from Excel headers to DB columns.
 */
const COLUMN_MAP: Record<string, string> = {
  Dates: 'dates',
  Total: 'total',
  Conversion: 'conversion',
  Net: 'net',
  Gross: 'gross',
  'Pension Contrib': 'pension_contrib',
  Asset: 'asset',
  Value: 'value',
  'Account Type': 'account_type',
};

/**
 * Parse a date string from Excel.
 * Handles formats: YYYY-MM-DD, YYYY-MM, and embedded quotes from xlsx2csv.
 */
function parseDate(value: string | number | Date): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  // String date - remove embedded quotes (xlsx2csv artifact)
  let dateStr = String(value).replace(/"/g, '');

  // Handle YYYY-MM format (used in Total Comp sheet)
  if (dateStr.length === 7 && /^\d{4}-\d{2}$/.test(dateStr)) {
    dateStr = `${dateStr}-01`;
  }

  return dateStr;
}

/**
 * Safely extract a number from a raw cell value, returning 0 for blank/null/NaN.
 */
function getNum(row: Record<string, unknown>, key: string): number {
  const v = row[key];
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

/**
 * Escape a string value for SQL insertion.
 */
function escapeString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Format a value for SQL insertion.
 */
function formatValue(value: unknown, columnName: string): string {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }

  if (columnName === 'dates') {
    const dateStr = parseDate(value as string | number | Date);
    return `'${dateStr}'::TIMESTAMP`;
  }

  if (typeof value === 'string') {
    // Check if it's a numeric string
    const num = parseFloat(value);
    if (!isNaN(num) && columnName !== 'asset' && columnName !== 'account_type') {
      return num.toString();
    }
    return `'${escapeString(value)}'`;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  return `'${escapeString(String(value))}'`;
}

/**
 * Validate a date value.
 * Returns true if valid, false otherwise.
 */
function isValidDate(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (typeof value === 'number') {
    // Excel serial date - should be positive
    return value > 0;
  }
  if (typeof value === 'string') {
    const dateStr = value.replace(/"/g, '');
    // Check YYYY-MM-DD or YYYY-MM format
    return /^\d{4}-\d{2}(-\d{2})?$/.test(dateStr);
  }
  return false;
}

/**
 * Validate a numeric value.
 * Returns true if valid number, false otherwise.
 */
function isValidNumber(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (typeof value === 'number') {
    return !isNaN(value);
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num);
  }
  return false;
}

/**
 * Validate a single row of data.
 * Returns array of validation errors for the row.
 */
function validateRow(
  row: Record<string, unknown>,
  mapping: SheetMapping,
  rowIndex: number
): LoadError[] {
  const errors: LoadError[] = [];

  for (const col of mapping.columns) {
    const excelCol = Object.keys(COLUMN_MAP).find((k) => COLUMN_MAP[k] === col);
    const value = excelCol ? row[excelCol] : row[col];

    if (col === 'dates') {
      if (!isValidDate(value)) {
        errors.push({
          sheet: mapping.sheetName,
          row: rowIndex + 2, // +2 for 1-indexed and header row
          column: 'Dates',
          message: `Invalid date value: "${value}"`,
        });
      }
    } else if (['total', 'net', 'gross', 'pension_contrib', 'conversion', 'value'].includes(col)) {
      if (!isValidNumber(value)) {
        errors.push({
          sheet: mapping.sheetName,
          row: rowIndex + 2,
          column: excelCol || col,
          message: `Expected a number, got: "${value}"`,
        });
      }
    }
  }

  return errors;
}

/**
 * Returns true when the workbook uses the consolidated input-sheet format
 * (US Monthly / UK Monthly / Paychecks) instead of the legacy output-sheet format.
 */
function isConsolidatedFormat(workbook: XLSX.WorkBook): boolean {
  return workbook.SheetNames.includes('US Monthly');
}

/**
 * Load US Monthly sheet into us_networth and us_spend tables.
 * Net USD = netOverride > 0 ? netOverride : cash + taxable + rothIra + k401 + hsa
 * Only rows where netUsd > 0 are inserted into us_networth.
 */
async function loadUsMonthly(
  workbook: XLSX.WorkBook,
  errors: LoadError[],
  _warnings: LoadError[]
): Promise<void> {
  const sheet = workbook.Sheets['US Monthly'];
  if (!sheet) {
    errors.push({ sheet: 'US Monthly', message: 'Required sheet is missing from the Excel file' });
    return;
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });
  if (rows.length === 0) {
    errors.push({ sheet: 'US Monthly', message: 'Sheet has no data rows' });
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const dateVal = row['Date'];
    if (!isValidDate(dateVal)) {
      errors.push({ sheet: 'US Monthly', row: i + 2, column: 'Date', message: `Invalid date value: "${dateVal}"` });
      continue;
    }

    const dateSql = formatValue(dateVal, 'dates');

    const cash = getNum(row, 'Cash');
    const taxable = getNum(row, 'Taxable Brokerage');
    const rothIra = getNum(row, 'Roth IRA');
    const k401 = getNum(row, '401k');
    const hsa = getNum(row, 'HSA');
    const netOverride = getNum(row, 'Net Override');
    const spend = getNum(row, 'US Spend');

    const netUsd = netOverride > 0 ? netOverride : cash + taxable + rothIra + k401 + hsa;

    if (netUsd > 0) {
      await execute(
        `INSERT INTO us_networth (dates, net, conversion) VALUES (${dateSql}, ${netUsd}, 1.0)`
      );
    }

    await execute(
      `INSERT INTO us_spend (dates, total, conversion) VALUES (${dateSql}, ${spend}, 1.0)`
    );
  }

}

/**
 * Load UK Monthly sheet into uk_networth and uk_spend tables.
 * Net GBP = netOverride > 0 ? netOverride : cash + etfs + pension
 * Only rows where netGbp > 0 are inserted into uk_networth.
 */
async function loadUkMonthly(
  workbook: XLSX.WorkBook,
  _errors: LoadError[],
  warnings: LoadError[]
): Promise<void> {
  const sheet = workbook.Sheets['UK Monthly'];
  if (!sheet) {
    warnings.push({ sheet: 'UK Monthly', message: 'Optional sheet is missing - some features may be unavailable' });
    return;
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });
  if (rows.length === 0) {
    warnings.push({ sheet: 'UK Monthly', message: 'Sheet is empty' });
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const dateVal = row['Date'];
    if (!isValidDate(dateVal)) {
      warnings.push({ sheet: 'UK Monthly', row: i + 2, column: 'Date', message: `Invalid date value: "${dateVal}"` });
      continue;
    }

    const dateSql = formatValue(dateVal, 'dates');

    const cash = getNum(row, 'Cash (£)');
    const etfs = getNum(row, 'ETFs (£)');
    const pension = getNum(row, 'Pension (£)');
    const netOverride = getNum(row, 'Net Override (£)');
    const spend = getNum(row, 'UK Spend (£)');
    const conversion = getNum(row, 'GBP/USD') || 1.0;

    const netGbp = netOverride > 0 ? netOverride : cash + etfs + pension;

    if (netGbp > 0) {
      await execute(
        `INSERT INTO uk_networth (dates, net, conversion) VALUES (${dateSql}, ${netGbp}, ${conversion})`
      );
    }

    await execute(
      `INSERT INTO uk_spend (dates, total, conversion) VALUES (${dateSql}, ${spend}, ${conversion})`
    );
  }
}

/**
 * Load Paychecks sheet into total_comp table.
 * Skips the "Approx Tax Reserves" column (col D) — it is for user reference only.
 */
async function loadPaychecks(
  workbook: XLSX.WorkBook,
  errors: LoadError[],
  _warnings: LoadError[]
): Promise<void> {
  const sheet = workbook.Sheets['Paychecks'];
  if (!sheet) {
    errors.push({ sheet: 'Paychecks', message: 'Required sheet is missing from the Excel file' });
    return;
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });
  if (rows.length === 0) {
    errors.push({ sheet: 'Paychecks', message: 'Sheet has no data rows' });
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const dateVal = row['Date'];
    if (!isValidDate(dateVal)) {
      errors.push({ sheet: 'Paychecks', row: i + 2, column: 'Date', message: `Invalid date value: "${dateVal}"` });
      continue;
    }

    const dateSql = formatValue(dateVal, 'dates');
    const gross = getNum(row, 'Gross');
    const pensionContrib = getNum(row, 'Pension Contrib');
    const net = getNum(row, 'Net');
    const conversion = getNum(row, 'GBP/USD') || 1.0;

    await execute(
      `INSERT INTO total_comp (dates, gross, pension_contrib, net, conversion) VALUES (${dateSql}, ${gross}, ${pensionContrib}, ${net}, ${conversion})`
    );
  }

}

/**
 * Load the consolidated format (US Monthly / UK Monthly / Paychecks + asset sheets).
 * Asset allocation sheets are unchanged from the legacy path.
 */
async function loadConsolidatedFormat(
  workbook: XLSX.WorkBook,
  onProgress?: ProgressCallback
): Promise<LoadResult> {
  const errors: LoadError[] = [];
  const warnings: LoadError[] = [];

  const reportProgress = (progress: LoadProgress) => {
    if (onProgress) onProgress(progress);
  };

  await createTables();

  reportProgress({ phase: 'loading', currentSheet: 'US Monthly', currentIndex: 1, totalSheets: 5, message: 'Loading US Monthly (1/5)...' });
  await loadUsMonthly(workbook, errors, warnings);
  if (errors.length > 0) return { success: false, errors, warnings };

  reportProgress({ phase: 'loading', currentSheet: 'UK Monthly', currentIndex: 2, totalSheets: 5, message: 'Loading UK Monthly (2/5)...' });
  await loadUkMonthly(workbook, errors, warnings);
  if (errors.length > 0) return { success: false, errors, warnings };

  reportProgress({ phase: 'loading', currentSheet: 'Paychecks', currentIndex: 3, totalSheets: 5, message: 'Loading Paychecks (3/5)...' });
  await loadPaychecks(workbook, errors, warnings);
  if (errors.length > 0) return { success: false, errors, warnings };

  // Asset allocation sheets — reuse legacy column-map logic
  const assetMappings = SHEET_MAPPINGS.filter((m) => m.tableName.includes('asset_allocation'));
  for (let i = 0; i < assetMappings.length; i++) {
    const mapping = assetMappings[i];
    reportProgress({
      phase: 'loading',
      currentSheet: mapping.sheetName,
      currentIndex: 4 + i,
      totalSheets: 5,
      message: `Loading ${mapping.sheetName} (${4 + i}/5)...`,
    });

    const sheet = workbook.Sheets[mapping.sheetName];
    if (!sheet) {
      warnings.push({ sheet: mapping.sheetName, message: 'Optional sheet is missing - some features may be unavailable' });
      continue;
    }

    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });
    const filteredData = jsonData.filter((row) => parseFloat(String(row['Value'] || 0)) > 0);

    for (const row of filteredData) {
      const values = mapping.columns.map((col) => {
        const excelCol = Object.keys(COLUMN_MAP).find((k) => COLUMN_MAP[k] === col);
        const value = excelCol ? row[excelCol] : row[col];
        return formatValue(value, col);
      });
      await execute(
        `INSERT INTO ${mapping.tableName} (${mapping.columns.join(', ')}) VALUES (${values.join(', ')})`
      );
    }
  }

  return { success: errors.length === 0, errors, warnings };
}

/**
 * Load an Excel file into DuckDB.
 * @param file - The Excel file to load
 * @param onProgress - Optional callback for progress updates
 */
export async function loadExcelFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<LoadResult> {
  const errors: LoadError[] = [];
  const warnings: LoadError[] = [];

  const reportProgress = (progress: LoadProgress) => {
    if (onProgress) {
      onProgress(progress);
    }
  };

  try {
    // Phase 1: Read the Excel file
    reportProgress({ phase: 'reading', message: 'Reading Excel file...' });
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    // Dispatch to consolidated loader when the new input-sheet format is detected
    if (isConsolidatedFormat(workbook)) {
      return loadConsolidatedFormat(workbook, onProgress);
    }

    // Phase 2: Validate sheets exist
    reportProgress({ phase: 'validating', message: 'Validating file structure...' });

    const missingRequired: string[] = [];
    const missingOptional: string[] = [];

    for (const mapping of SHEET_MAPPINGS) {
      if (!workbook.SheetNames.includes(mapping.sheetName)) {
        if (mapping.required) {
          missingRequired.push(mapping.sheetName);
        } else {
          missingOptional.push(mapping.sheetName);
        }
      }
    }

    // Missing required sheets are fatal errors
    if (missingRequired.length > 0) {
      for (const sheet of missingRequired) {
        errors.push({
          sheet,
          message: 'Required sheet is missing from the Excel file',
        });
      }
      return { success: false, errors, warnings };
    }

    // Missing optional sheets are warnings
    for (const sheet of missingOptional) {
      warnings.push({
        sheet,
        message: 'Optional sheet is missing - some features may be unavailable',
      });
    }

    // Create fresh tables
    await createTables();

    // Phase 3: Load each sheet
    const sheetsToProcess = SHEET_MAPPINGS.filter((m) =>
      workbook.SheetNames.includes(m.sheetName)
    );
    const totalSheets = sheetsToProcess.length;

    for (let i = 0; i < sheetsToProcess.length; i++) {
      const mapping = sheetsToProcess[i];

      reportProgress({
        phase: 'loading',
        currentSheet: mapping.sheetName,
        currentIndex: i + 1,
        totalSheets,
        message: `Loading ${mapping.sheetName} (${i + 1}/${totalSheets})...`,
      });

      const sheet = workbook.Sheets[mapping.sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        raw: true,
      });

      // Check for empty sheets
      if (jsonData.length === 0) {
        if (mapping.required) {
          errors.push({
            sheet: mapping.sheetName,
            message: 'Sheet has no data rows',
          });
        } else {
          warnings.push({
            sheet: mapping.sheetName,
            message: 'Sheet is empty',
          });
        }
        continue;
      }

      // Filter out rows with zero values for asset allocation
      let filteredData = jsonData;
      if (mapping.tableName.includes('asset_allocation')) {
        filteredData = jsonData.filter((row) => {
          const value = parseFloat(String(row['Value'] || 0));
          return value > 0;
        });
      }

      // Validate each row
      const sheetErrors: LoadError[] = [];
      for (let rowIdx = 0; rowIdx < filteredData.length; rowIdx++) {
        const rowErrors = validateRow(filteredData[rowIdx], mapping, rowIdx);
        sheetErrors.push(...rowErrors);
      }

      // For required sheets, validation errors are fatal
      // For optional sheets, they become warnings and we skip the sheet
      if (sheetErrors.length > 0) {
        if (mapping.required) {
          errors.push(...sheetErrors);
        } else {
          warnings.push(...sheetErrors);
          continue; // Skip loading this optional sheet
        }
      }

      // If we have fatal errors, don't try to insert
      if (errors.length > 0) {
        continue;
      }

      // Build and execute INSERT statements
      for (const row of filteredData) {
        const values = mapping.columns.map((col) => {
          const excelCol = Object.keys(COLUMN_MAP).find((k) => COLUMN_MAP[k] === col);
          const value = excelCol ? row[excelCol] : row[col];
          return formatValue(value, col);
        });

        const sql = `INSERT INTO ${mapping.tableName} (${mapping.columns.join(', ')}) VALUES (${values.join(', ')})`;
        await execute(sql);
      }
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    console.error('Failed to load Excel file:', error);
    errors.push({
      sheet: 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error loading file',
    });
    return { success: false, errors, warnings };
  }
}
