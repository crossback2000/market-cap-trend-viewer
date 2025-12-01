# Market Cap Trend Viewer

Next.js + TypeScript + SQLite + Recharts 예제로 미국 빅테크(샘플) 시가총액 순위 변화를 시각화합니다. 상단에는 7일간의 순위 변화 라인 차트, 하단에는 가장 최근 날짜 기준 시가총액/순위 테이블이 표시됩니다.

## 사전 요구사항
- Node.js 18+
- npm(or pnpm/yarn). 패키지는 아직 설치하지 않아도 되지만, 실제 실행 시 `npm install`이 필요합니다.

## 시작하기
1. 의존성 설치
   ```bash
   npm install
   ```
2. SQLite 시드 생성(가짜 데이터, 최근 7일 AAPL/MSFT/AMZN/GOOG)
   ```bash
   npm run seed
   ```
   - 기본 DB 경로: `data/market_caps.sqlite`
   - 다른 위치를 쓰려면 `DATABASE_PATH` 환경변수를 지정하세요.
3. 개발 서버 실행
   ```bash
   npm run dev
   ```
   브라우저에서 `http://localhost:3000` 확인.

## 주요 설계 포인트
- **스키마**: `stocks`, `daily_market_caps` 테이블에 날짜별 시가총액과 `rank` 저장. 같은 날짜 내 `market_cap DESC` 기준으로 1,2,3,... 계산.
- **API (App Router)**
  - `GET /api/market-caps?tickers=...&from=...&to=...` : 기간별 시가총액+순위 반환. `from`/`to`를 지정하지 않으면 가장 최신 날짜를 포함한 최근 7일 범위를 자동으로 반환합니다.
  - `GET /api/market-caps/today` : 가장 최근 날짜 기준 테이블 데이터 반환.
- **차트**: Recharts `LineChart`, Y축 `reversed` 옵션으로 1위가 위에 위치.
- **UI**: 티커 필터 입력, 순위 변화 차트, 오늘 기준 테이블.

## 프로젝트 구조
```
├─ src
│  ├─ app
│  │  ├─ api/market-caps/route.ts         # 범위 조회 API
│  │  ├─ api/market-caps/today/route.ts   # 최신 날짜 테이블 API
│  │  ├─ components/
│  │  │  ├─ RankTrendChart.tsx            # 순위 변화 라인 차트
│  │  │  └─ TodayTable.tsx                # 오늘 기준 테이블
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  └─ lib/db.ts                           # SQLite 커넥션/쿼리 유틸
├─ scripts/seed.ts                        # 7일치 가짜 데이터 시드
├─ data/                                  # SQLite 파일(시드 실행 후 생성)
├─ package.json, tsconfig.json, next.config.mjs, .eslintrc.json
└─ .gitignore
```

## 추가 메모
- seed는 항상 날짜별 시가총액을 내림차순 정렬 후 rank를 부여합니다.
- API와 UI는 ISO 날짜 문자열(`YYYY-MM-DD`)을 사용합니다.
- 필요 시 `@/lib/db`에서 DB 경로를 환경 변수로 교체해 배포 환경에 맞출 수 있습니다.

## Testing
- 아직 자동 테스트는 없습니다. `npm run seed` 후 `npm run dev`로 수동 확인하세요.
# Market Cap Trend Viewer Plan

Roadmap to build a US stock market-cap trend viewer (Next.js + TypeScript + SQLite + Recharts). Steps reflect requested order and constraints.

## 1) 프로젝트 초기화
- Next.js(TypeScript) 앱 생성 후 ESLint/Prettier 정리.
- Recharts(또는 대안 React 차트 라이브러리) 설치.
- SQLite 클라이언트(`better-sqlite3` 권장)와 타입 의존성 추가.
- `.env.local` 템플릿에 DB 파일 경로 추가(예: `DATABASE_PATH=./data/market_caps.sqlite`).

## 2) DB/SQLite 스키마
- DB 파일은 `data/market_caps.sqlite`에 저장.
- 테이블 정의
  - `stocks(id INTEGER PRIMARY KEY, ticker TEXT UNIQUE NOT NULL, name TEXT, sector TEXT)`
  - `daily_market_caps(id INTEGER PRIMARY KEY, stock_id INTEGER NOT NULL, date TEXT NOT NULL, market_cap REAL NOT NULL, rank INTEGER NOT NULL, FOREIGN KEY(stock_id) REFERENCES stocks(id), UNIQUE(stock_id, date))`
- `rank`는 같은 날짜 내에서 `market_cap` DESC 기준으로 1,2,3,...를 계산해 삽입.
- 초기 생성/마이그레이션/인덱스 스크립트 추가(`date`, `stock_id`, `rank`).

## 3) 데이터 수집/시드 스크립트(가짜 데이터)
- `scripts/seed.ts` 작성 후 `tsx scripts/seed.ts`로 실행.
- 대상 티커: AAPL, MSFT, AMZN, GOOG 등 3~5개.
- 최근 7일치 날짜에 대해 `daily_market_caps`에 임의 시가총액을 생성하고, 날짜별로 시가총액 DESC로 rank를 재계산 후 저장.
- 중복 실행 시 데이터를 초기화하거나 upsert.

## 4) API 라우트 (Next.js App Router)
- 경로: `src/app/api/.../route.ts` 구조 사용.
- 엔드포인트 예시
  - `GET /api/market-caps?tickers=...&from=...&to=...`: 기간별 시가총액+rank 반환.
  - `GET /api/market-caps/today`: 가장 최근 날짜 기준 시가총액/순위 테이블 반환.
- `lib/db.ts` 유틸에서 싱글톤 연결과 쿼리 헬퍼(`getMarketCapsByDateRange`, `getLatestRanks`) 제공.
- 응답/요청 타입을 TypeScript로 정의하고 날짜 포맷을 ISO(YYYY-MM-DD)로 통일.

## 5) 프론트엔드 UI
- 상단: 순위 변화 라인 차트
  - Recharts `LineChart` + `Line` + `XAxis(date)` + `YAxis(rank, reversed)` + `Tooltip` + `Legend`.
  - Y축 `reversed` 옵션으로 1위가 위에 오도록 설정.
  - 티커별 색상 매핑 및 범례.
- 하단: 오늘(최근 날짜) 기준 시가총액/순위 테이블
  - 컬럼: ticker, 회사명, 시가총액, rank(+옵션: sector).
  - 정렬/검색 필터 고려, 로딩/에러 상태 처리.
- 데이터 fetch
  - `useEffect` 또는 SWR/React Query로 `/api/market-caps`와 `/api/market-caps/today` 호출.
  - 로딩/에러/빈 상태 UI 제공.
- 레이아웃/스타일
  - 상단 차트 전체 폭, 하단 테이블 스크롤 또는 페이지네이션.
  - 라이트/다크 테마 여부 결정 후 글로벌 스타일 적용.

## 6) 향후 확장 체크리스트
- 실제 데이터 수집 파이프라인(크론 + 외부 시가총액 API)으로 대체.
- 캐싱/성능: API 레벨 캐시, 인덱스/쿼리 최적화.
- 배포 시 SQLite 파일 동기화 전략 검토.
- E2E/통합 테스트(차트 렌더 스모크, API 스냅샷) 추가.

## Testing
- 계획 수립만 진행했으므로 테스트 없음.
