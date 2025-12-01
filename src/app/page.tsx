'use client';

import { useEffect, useMemo, useState } from 'react';
import { RankTrendChart } from './components/RankTrendChart';
import { TodayTable } from './components/TodayTable';
import { MarketCapPoint, TodayRow } from './types';

const palette = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#c084fc'];

export default function Page() {
  const [history, setHistory] = useState<MarketCapPoint[]>([]);
  const [todayRows, setTodayRows] = useState<TodayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tickerFilter, setTickerFilter] = useState('');

  const availableTickers = useMemo(
    () => Array.from(new Set(history.map((h) => h.ticker))),
    [history]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const historyRes = await fetch('/api/market-caps');
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
  }, []);

  const filteredHistory = useMemo(() => {
    if (!tickerFilter.trim()) return history;
    const tokens = tickerFilter
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    return history.filter((h) => tokens.includes(h.ticker.toUpperCase()));
  }, [history, tickerFilter]);

  const uniqueTickers = useMemo(
    () => Array.from(new Set(filteredHistory.map((h) => h.ticker))),
    [filteredHistory]
  );

  const missingTickers = useMemo(() => {
    if (!tickerFilter.trim()) return [] as string[];
    const tokens = tickerFilter
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    return tokens.filter((t) => !availableTickers.includes(t));
  }, [availableTickers, tickerFilter]);

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
          {availableTickers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: '#9fb2d0' }}>사용 가능한 티커</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {availableTickers.map((ticker, idx) => (
                  <span className="badge" key={ticker}>
                    <span
                      className="badge-color"
                      style={{ backgroundColor: palette[idx % palette.length] }}
                    />
                    {ticker}
                  </span>
                ))}
              </div>
            </div>
          )}
          {uniqueTickers.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
        </div>
        {loading && <div className="loading">데이터를 불러오는 중...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && missingTickers.length > 0 && (
          <div className="error">
            {missingTickers.join(', ')} 티커에 대한 데이터가 없습니다. 위 목록에서 사용 가능한
            티커를 확인해 주세요.
          </div>
        )}
        {!loading && !error && filteredHistory.length === 0 && (
          <div className="error">표시할 데이터가 없습니다.</div>
        )}
      </div>

      {!loading && !error && filteredHistory.length > 0 && (
        <RankTrendChart data={filteredHistory} />
      )}

      {!loading && !error && todayRows.length > 0 && <TodayTable rows={todayRows} />}
    </main>
  );
}
