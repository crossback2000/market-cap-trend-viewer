import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlDatabase, SqlJsStatic } from 'sql.js';
import type { ErrnoException } from 'node:fs';

const defaultPath = path.join(process.cwd(), 'data', 'market_caps.sqlite');
const dbPath = process.env.DATABASE_PATH || defaultPath;

let sqlPromise: Promise<SqlJsStatic> | null = null;
let dbPromise: Promise<SqlDatabase> | null = null;
let lastModifiedMs: number | null = null;

async function loadSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: (file) => path.join(process.cwd(), 'node_modules/sql.js/dist', file),
    });
  }
  return sqlPromise;
}

async function loadDatabase() {
  const stat = await fs.promises
    .stat(dbPath)
    .catch((err: ErrnoException) => (err.code === 'ENOENT' ? null : Promise.reject(err)));

  const modifiedMs = stat?.mtimeMs ?? null;

  // Reload the database from disk if it hasn't been loaded yet or if the file changed
  if (!dbPromise || (modifiedMs && modifiedMs !== lastModifiedMs)) {
    lastModifiedMs = modifiedMs;
    dbPromise = (async () => {
      const SQL = await loadSql();
      let fileBuffer: Uint8Array | undefined;
      try {
        const buffer = await fs.promises.readFile(dbPath);
        fileBuffer = new Uint8Array(buffer);
      } catch (err) {
        if ((err as ErrnoException).code !== 'ENOENT') {
          throw err;
        }
      }
      const database = new SQL.Database(fileBuffer);
      ensureSchema(database);
      return database;
    })();
  }
  return dbPromise;
}

function ensureSchema(database: SqlDatabase) {
  database.run(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY,
      ticker TEXT UNIQUE NOT NULL,
      name TEXT,
      sector TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_market_caps (
      id INTEGER PRIMARY KEY,
      stock_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      market_cap REAL NOT NULL,
      rank INTEGER NOT NULL,
      UNIQUE(stock_id, date),
      FOREIGN KEY(stock_id) REFERENCES stocks(id)
    );
  `);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLatestDate(database: SqlDatabase) {
  const stmt = database.prepare('SELECT date FROM daily_market_caps ORDER BY date DESC LIMIT 1');
  let latest: string | undefined;
  if (stmt.step()) {
    const row = stmt.getAsObject() as { date?: string };
    latest = row.date;
  }
  stmt.free();
  return latest;
}

export type MarketCapRow = {
  ticker: string;
  name: string;
  date: string;
  market_cap: number;
  rank: number;
};

export type LatestRankRow = {
  ticker: string;
  name: string;
  market_cap: number;
  rank: number;
};

export async function getMarketCaps({
  tickers,
  from,
  to,
}: {
  tickers?: string[];
  from?: string;
  to?: string;
}): Promise<MarketCapRow[]> {
  const db = await loadDatabase();
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  const latestDate = getLatestDate(db);

  if (!latestDate) {
    return [];
  }

  if (tickers && tickers.length > 0) {
    clauses.push(`s.ticker IN (${tickers.map((_, i) => `@ticker${i}`).join(',')})`);
    tickers.forEach((ticker, i) => {
      params[`@ticker${i}`] = ticker;
    });
  }

  if (from || to) {
    if (from) {
      clauses.push('dmc.date >= @from');
      params['@from'] = from;
    }

    if (to) {
      clauses.push('dmc.date <= @to');
      params['@to'] = to;
    }
  } else {
    const end = new Date(latestDate);
    const start = new Date(latestDate);
    start.setDate(end.getDate() - 6);

    clauses.push('dmc.date >= @from');
    clauses.push('dmc.date <= @to');
    params['@from'] = formatDate(start);
    params['@to'] = latestDate;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const stmt = db.prepare(
    `SELECT s.ticker, s.name, dmc.date, dmc.market_cap, dmc.rank
     FROM daily_market_caps dmc
     INNER JOIN stocks s ON s.id = dmc.stock_id
     ${where}
     ORDER BY dmc.date ASC, dmc.rank ASC`
  );

  stmt.bind(params);
  const rows: MarketCapRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as MarketCapRow);
  }
  stmt.free();

  return rows;
}

export async function getLatestRanks(): Promise<LatestRankRow[]> {
  const db = await loadDatabase();
  const latestDateStmt = db.prepare(
    'SELECT date FROM daily_market_caps ORDER BY date DESC LIMIT 1'
  );
  let latest: string | undefined;
  if (latestDateStmt.step()) {
    const row = latestDateStmt.getAsObject() as { date?: string };
    latest = row.date;
  }
  latestDateStmt.free();

  if (!latest) {
    return [];
  }

  const stmt = db.prepare(
    `SELECT s.ticker, s.name, dmc.market_cap, dmc.rank
     FROM daily_market_caps dmc
     INNER JOIN stocks s ON s.id = dmc.stock_id
     WHERE dmc.date = @date
     ORDER BY dmc.rank ASC`
  );

  stmt.bind({ date: latest });
  const rows: LatestRankRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as LatestRankRow);
  }
  stmt.free();

  return rows;
}
