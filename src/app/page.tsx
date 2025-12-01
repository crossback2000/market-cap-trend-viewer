'use client';

import { useEffect, useMemo, useState } from 'react';
import { DateRange, DayPicker } from 'react-day-picker';
import { RankTrendChart } from './components/RankTrendChart';
import { TodayTable } from './components/TodayTable';
import { MarketCapPoint, TodayRow } from './types';

const palette = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#c084fc'];

const formatLocalDate = (date: Date) => date.toLocaleDateString('en-CA');

export default function Page() {
  const [history, setHistory] = useState<MarketCapPoint[]>([]);
  const [todayRows, setTodayRows] = useState<TodayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tickerFilter, setTickerFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const parsedTickers = useMemo(
    () =>
      tickerFilter
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean),
    [tickerFilter]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (parsedTickers.length > 0) {
          params.set('tickers', parsedTickers.join(','));
        }

        if (dateRange?.from) {
          const fromDate = dateRange.from;
          const toDate = dateRange.to ?? dateRange.from;
          params.set('from', formatLocalDate(fromDate));
          params.set('to', formatLocalDate(toDate));
        }

        const historyRes = await fetch(
          `/api/market-caps${params.toString() ? `?${params.toString()}` : ''}`
        );
        const todayRes = await fetch('/api/market-caps/today');

        if (!historyRes.ok || !todayRes.ok) {
          throw new Error('API 요청에 실패했습니다');
        }

        const historyJson = await historyRes.json();
        const todayJson = await todayRes.json();

        setHistory(historyJson.data ?? []);
        setTodayRows(todayJson.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [parsedTickers, dateRange]);

  const uniqueTickers = useMemo(
    () => Array.from(new Set(history.map((h) => h.ticker))),
    [history]
  );

  const selectedRangeLabel = useMemo(() => {
    if (!dateRange?.from) return '최근 7일 데이터';
    const from = formatLocalDate(dateRange.from);
    const to = formatLocalDate(dateRange.to ?? dateRange.from);
    if (from === to) return `${from} 데이터`;
    return `${from} ~ ${to} 데이터`;
  }, [dateRange]);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card">
        <h2 className="section-title">필터</h2>
        <div className="controls">
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#9fb2d0' }}>
            티커 필터 (쉼표 구분)
            <input
              className="input"
              placeholder="예: AAPL, MSFT"
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
            />
          </label>
        </div>

        <div className="date-picker">
          <p style={{ margin: '0 0 6px', color: '#9fb2d0' }}>
            날짜 선택 (단일 날짜 또는 범위를 선택하세요)
          </p>
          <DayPicker
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            captionLayout="dropdown"
            fromYear={2000}
            toYear={2100}
            showOutsideDays
          />
        </div>
        {uniqueTickers.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {uniqueTickers.map((ticker, idx) => (
              <span className="badge" key={ticker}>
                <span
                  className="badge-color"
                  style={{ backgroundColor: palette[idx % palette.length] }}
                />
                {ticker}
              </span>
            ))}
          </div>
        )}
        {loading && <div className="loading">데이터를 불러오는 중...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && history.length === 0 && (
          <div className="error">표시할 데이터가 없습니다.</div>
        )}
      </div>

      {!loading && !error && history.length > 0 && (
        <RankTrendChart data={history} title={selectedRangeLabel} />
      )}

      {!loading && !error && todayRows.length > 0 && <TodayTable rows={todayRows} />}
    </main>
  );
}
