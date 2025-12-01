'use client';

import { TodayRow } from '@/app/types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

type Props = {
  rows: TodayRow[];
};

export function TodayTable({ rows }: Props) {
  return (
    <div className="card">
      <h2 className="section-title">오늘 기준 시가총액/순위</h2>
      <table>
        <thead>
          <tr>
            <th style={{ width: '12%' }}>Rank</th>
            <th style={{ width: '18%' }}>Ticker</th>
            <th>Name</th>
            <th style={{ width: '24%' }}>Market Cap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ticker}>
              <td>#{row.rank}</td>
              <td>{row.ticker}</td>
              <td>{row.name}</td>
              <td>{formatCurrency(row.market_cap)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
