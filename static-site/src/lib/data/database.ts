/**
 * DuckDB-WASM database singleton.
 * Provides a single database instance for the entire app.
 */

import * as duckdb from '@duckdb/duckdb-wasm';

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

/**
 * Initialize DuckDB-WASM. Call this once on app startup.
 */
export async function initializeDatabase(): Promise<duckdb.AsyncDuckDB> {
  if (db) {
    return db;
  }

  // Select the appropriate bundle based on browser capabilities
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

  // Pick a bundle based on browser checks
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
  );

  // Instantiate the async worker
  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);

  return db;
}

/**
 * Get a connection to the database.
 * Creates the connection if it doesn't exist.
 */
export async function getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
  if (!db) {
    await initializeDatabase();
  }
  if (!conn) {
    conn = await db!.connect();
  }
  return conn;
}

/**
 * Get the database instance.
 */
export function getDatabase(): duckdb.AsyncDuckDB | null {
  return db;
}

/**
 * Create all required tables with proper schema.
 * Uses DOUBLE for currency columns - DuckDB-WASM returns these as plain JS numbers,
 * avoiding Arrow DECIMAL conversion complexity while maintaining sufficient precision
 * for financial calculations (15-16 significant digits).
 */
export async function createTables(): Promise<void> {
  const connection = await getConnection();

  await connection.query(`
    DROP TABLE IF EXISTS us_spend;
    DROP TABLE IF EXISTS uk_spend;
    DROP TABLE IF EXISTS us_networth;
    DROP TABLE IF EXISTS uk_networth;
    DROP TABLE IF EXISTS total_comp;
    DROP TABLE IF EXISTS us_asset_allocation;
    DROP TABLE IF EXISTS uk_asset_allocation;

    CREATE TABLE us_spend (
      dates TIMESTAMP,
      total DOUBLE,
      conversion DOUBLE
    );

    CREATE TABLE uk_spend (
      dates TIMESTAMP,
      total DOUBLE,
      conversion DOUBLE
    );

    CREATE TABLE us_networth (
      dates TIMESTAMP,
      net DOUBLE,
      conversion DOUBLE
    );

    CREATE TABLE uk_networth (
      dates TIMESTAMP,
      net DOUBLE,
      conversion DOUBLE
    );

    CREATE TABLE total_comp (
      dates TIMESTAMP,
      gross DOUBLE,
      pension_contrib DOUBLE,
      net DOUBLE,
      conversion DOUBLE
    );

    CREATE TABLE us_asset_allocation (
      asset VARCHAR,
      value DOUBLE,
      account_type VARCHAR
    );

    CREATE TABLE uk_asset_allocation (
      asset VARCHAR,
      value DOUBLE,
      account_type VARCHAR,
      conversion DOUBLE
    );
  `);
}

/**
 * Convert a value from DuckDB result to JavaScript.
 * Handles BigInt values by converting to number.
 */
function convertValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return value;
}

/**
 * Execute a query and return all results.
 */
export async function query<T>(sql: string): Promise<T[]> {
  const connection = await getConnection();
  const result = await connection.query(sql);
  return result.toArray().map((row) => {
    const obj: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      obj[key] = convertValue(row[key]);
    }
    return obj as T;
  });
}

/**
 * Execute a query without returning results.
 */
export async function execute(sql: string): Promise<void> {
  const connection = await getConnection();
  await connection.query(sql);
}
