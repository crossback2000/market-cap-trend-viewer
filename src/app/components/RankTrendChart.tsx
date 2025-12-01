'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MarketCapPoint } from '@/app/types';

const palette = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#c084fc'];

function groupByDate(points: MarketCapPoint[]) {
  const dates = Array.from(new Set(points.map((p) => p.date))).sort();
  const tickers = Array.from(new Set(points.map((p) => p.ticker)));

  return dates.map((date) => {
    const row: Record<string, string | number | null> = { date };
    tickers.forEach((ticker) => {
      const found = points.find((p) => p.date === date && p.ticker === ticker);
      row[ticker] = found ? found.rank : null;
    });
    return row;
  });
}

type Props = {
  data: MarketCapPoint[];
};

export function RankTrendChart({ data }: Props) {
  const grouped = groupByDate(data);
  const tickers = Array.from(new Set(data.map((p) => p.ticker)));

  return (
    <div className="card">
      <h2 className="section-title">순위 변화 (최근 7일)</h2>
      <p style={{ marginTop: 0, color: '#9fb2d0' }}>
        Y축은 1위가 위로 가도록 반전되었습니다. 데이터가 없는 날짜는 점이 표시되지 않습니다.
      </p>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={grouped} margin={{ top: 10, left: 0, right: 0 }}>
            <XAxis dataKey="date" tickMargin={10} stroke="#9fb2d0" />
            <YAxis
              stroke="#9fb2d0"
              allowDecimals={false}
              reversed
              domain={[1, 'dataMax']}
            />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1f2a44' }}
              labelStyle={{ color: '#e3e7ef' }}
              formatter={(value, name) => [value as number, name as string]}
            />
            <Legend wrapperStyle={{ color: '#e3e7ef' }} />
            {tickers.map((ticker, idx) => (
              <Line
                key={ticker}
                type="monotone"
                dataKey={ticker}
                name={ticker}
                stroke={palette[idx % palette.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
