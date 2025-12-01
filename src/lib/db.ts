import Database from 'better-sqlite3';
import path from 'path';

const defaultPath = path.join(process.cwd(), 'data', 'market_caps.sqlite');
const dbPath = process.env.DATABASE_PATH || defaultPath;

let db: Database.Database | null = null;

export const getDb = () => {
  if (!db) {
    db = new Database(dbPath);
  }
  return db;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLatestDate(database: Database.Database) {
  const latestDateStmt = database.prepare(
    'SELECT date FROM daily_market_caps ORDER BY date DESC LIMIT 1'
  );
  const latest = latestDateStmt.get() as { date?: string } | undefined;
  return latest?.date;
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

export function getMarketCaps({
  tickers,
  from,
  to,
}: {
  tickers?: string[];
  from?: string;
  to?: string;
}): MarketCapRow[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  const latestDate = getLatestDate(db);

  if (!latestDate) {
    return [];
  }

  if (tickers && tickers.length > 0) {
    clauses.push(`s.ticker IN (${tickers.map((_, i) => `@ticker${i}`).join(',')})`);
    tickers.forEach((ticker, i) => {
      params[`ticker${i}`] = ticker;
    });
  }

  if (from || to) {
    if (from) {
      clauses.push('dmc.date >= @from');
      params.from = from;
    }

    if (to) {
      clauses.push('dmc.date <= @to');
      params.to = to;
    }
  } else {
    const end = new Date(latestDate);
    const start = new Date(latestDate);
    start.setDate(end.getDate() - 6);

    clauses.push('dmc.date >= @from');
    clauses.push('dmc.date <= @to');
    params.from = formatDate(start);
    params.to = latestDate;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const stmt = db.prepare(
    `SELECT s.ticker, s.name, dmc.date, dmc.market_cap, dmc.rank
     FROM daily_market_caps dmc
     INNER JOIN stocks s ON s.id = dmc.stock_id
     ${where}
     ORDER BY dmc.date ASC, dmc.rank ASC`
  );

  return stmt.all(params) as MarketCapRow[];
}

export function getLatestRanks(): LatestRankRow[] {
  const db = getDb();
  const latestDateStmt = db.prepare(
    'SELECT date FROM daily_market_caps ORDER BY date DESC LIMIT 1'
  );
  const latest = latestDateStmt.get() as { date?: string } | undefined;
  if (!latest?.date) {
    return [];
  }

  const stmt = db.prepare(
    `SELECT s.ticker, s.name, dmc.market_cap, dmc.rank
     FROM daily_market_caps dmc
     INNER JOIN stocks s ON s.id = dmc.stock_id
     WHERE dmc.date = @date
     ORDER BY dmc.rank ASC`
  );

  return stmt.all({ date: latest.date }) as LatestRankRow[];
}
