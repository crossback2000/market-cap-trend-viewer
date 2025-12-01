import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Market Cap Trend Viewer',
  description: 'Track US stock market cap rankings over time',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0, fontSize: 26 }}>Market Cap Trend Viewer</h1>
            <p style={{ margin: '6px 0 0', color: '#9fb2d0' }}>
              Track market-cap rankings with a 7-day sample dataset.
            </p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
