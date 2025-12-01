import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'market_caps.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
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

const tickers = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corp.' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'GOOG', name: 'Alphabet Inc. (C)' },
];

const insertStock = db.prepare(
  'INSERT OR IGNORE INTO stocks (ticker, name, sector) VALUES (@ticker, @name, NULL)'
);
const findStockId = db.prepare('SELECT id FROM stocks WHERE ticker = ?');
const upsertCap = db.prepare(
  `INSERT OR REPLACE INTO daily_market_caps (id, stock_id, date, market_cap, rank)
   VALUES (
     COALESCE((SELECT id FROM daily_market_caps WHERE stock_id = @stock_id AND date = @date), NULL),
     @stock_id,
     @date,
     @market_cap,
     @rank
   )`
);

function randomWalk(base: number, step: number) {
  return base + Math.round((Math.random() - 0.5) * step);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function seed() {
  const tx = db.transaction(() => {
    tickers.forEach((entry) => insertStock.run(entry));

    const stockMap = new Map<string, number>();
    tickers.forEach((entry) => {
      const row = findStockId.get(entry.ticker) as { id: number };
      stockMap.set(entry.ticker, row.id);
    });

    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const iso = formatDate(date);

      const generated = tickers.map((entry, idx) => {
        const base = 2500 - idx * 400;
        const marketCap = randomWalk(base * 1_000_000_000, 120_000_000);
        return {
          ticker: entry.ticker,
          stock_id: stockMap.get(entry.ticker)!,
          date: iso,
          market_cap: marketCap,
        };
      });

      generated
        .sort((a, b) => b.market_cap - a.market_cap)
        .forEach((row, rankIdx) => {
          upsertCap.run({
            ...row,
            rank: rankIdx + 1,
          });
        });
    }
  });

  tx();
}

seed();
console.log(`Seed complete. Database located at ${dbPath}`);
