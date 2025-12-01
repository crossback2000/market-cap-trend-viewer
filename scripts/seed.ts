import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import type { ErrnoException } from 'node:fs';

async function seed() {
  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'market_caps.sqlite');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), 'node_modules/sql.js/dist', file),
  });

  let dbFile: Uint8Array | undefined;
  try {
    const buffer = await fs.promises.readFile(dbPath);
    dbFile = new Uint8Array(buffer);
  } catch (err) {
    if ((err as ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  const db = new SQL.Database(dbFile);

  db.run(`
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
    'INSERT OR IGNORE INTO stocks (ticker, name, sector) VALUES (?, ?, NULL)'
  );
  const findStockId = db.prepare('SELECT id FROM stocks WHERE ticker = ?');
  const upsertCap = db.prepare(
    `INSERT OR REPLACE INTO daily_market_caps (id, stock_id, date, market_cap, rank)
     VALUES (
       COALESCE((SELECT id FROM daily_market_caps WHERE stock_id = ? AND date = ?), NULL),
       ?,
       ?,
       ?,
       ?
     )`
  );

  function randomWalk(base: number, step: number) {
    return base + Math.round((Math.random() - 0.5) * step);
  }

  function formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  db.run('BEGIN');
  try {
    tickers.forEach((entry) => insertStock.run([entry.ticker, entry.name]));

    const stockMap = new Map<string, number>();
    tickers.forEach((entry) => {
      findStockId.bind([entry.ticker]);
      const hasRow = findStockId.step();
      const row = hasRow ? (findStockId.getAsObject() as { id: number }) : undefined;
      findStockId.reset();

      if (!row || row.id === undefined) {
        throw new Error(`Failed to load stock id for ticker ${entry.ticker}`);
      }

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
          upsertCap.run([
            row.stock_id,
            row.date,
            row.stock_id,
            row.date,
            row.market_cap,
            rankIdx + 1,
          ]);
        });
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  } finally {
    insertStock.free();
    findStockId.free();
    upsertCap.free();
  }

  const data = db.export();
  await fs.promises.writeFile(dbPath, Buffer.from(data));

  console.log(`Seed complete. Database located at ${dbPath}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
