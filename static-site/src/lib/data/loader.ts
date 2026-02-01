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
}

const SHEET_MAPPINGS: SheetMapping[] = [
  {
    sheetName: 'US Spend',
    tableName: 'us_spend',
    columns: ['dates', 'total', 'conversion'],
  },
  {
    sheetName: 'UK Spend',
    tableName: 'uk_spend',
    columns: ['dates', 'total', 'conversion'],
  },
  {
    sheetName: 'US Networth',
    tableName: 'us_networth',
    columns: ['dates', 'net', 'conversion'],
  },
  {
    sheetName: 'UK Networth',
    tableName: 'uk_networth',
    columns: ['dates', 'net', 'conversion'],
  },
  {
    sheetName: 'Total Comp',
    tableName: 'total_comp',
    columns: ['dates', 'gross', 'pension_contrib', 'net', 'conversion'],
  },
  {
    sheetName: 'US Asset Allocation',
    tableName: 'us_asset_allocation',
    columns: ['asset', 'value', 'account_type'],
  },
  {
    sheetName: 'UK Asset Allocation',
    tableName: 'uk_asset_allocation',
    columns: ['asset', 'value', 'account_type', 'conversion'],
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
 * Load an Excel file into DuckDB.
 */
export async function loadExcelFile(file: File): Promise<{ success: boolean; error?: string }> {
  try {
    // Read the Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    // Verify all required sheets exist
    const missingSheets = SHEET_MAPPINGS.filter((m) => !workbook.SheetNames.includes(m.sheetName)).map(
      (m) => m.sheetName
    );

    if (missingSheets.length > 0) {
      return {
        success: false,
        error: `Missing required sheets: ${missingSheets.join(', ')}`,
      };
    }

    // Create fresh tables
    await createTables();

    // Process each sheet
    for (const mapping of SHEET_MAPPINGS) {
      const sheet = workbook.Sheets[mapping.sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        raw: true, // Get raw numeric values, not formatted strings like "2,870,000"
      });

      // Filter out rows with zero values for asset allocation
      let filteredData = jsonData;
      if (mapping.tableName.includes('asset_allocation')) {
        filteredData = jsonData.filter((row) => {
          const value = parseFloat(String(row['Value'] || 0));
          return value > 0;
        });
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

    return { success: true };
  } catch (error) {
    console.error('Failed to load Excel file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error loading file',
    };
  }
}
