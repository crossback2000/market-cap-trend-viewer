# Market Cap Trend Viewer

Next.js + TypeScript + SQLite(sql.js, WASM 기반) + Recharts 예제로 미국 빅테크(샘플) 시가총액 순위 변화를 시각화합니다. 상단에는 7일간의 순위 변화 라인 차트, 하단에는 가장 최근 날짜 기준 시가총액/순위 테이블이 표시됩니다.

## 사전 요구사항
- Node.js 18+ (Node.js 24.11.1에서도 동작하도록 네이티브 모듈 의존성을 제거했습니다)
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
   - 임시 데이터 티커를 바꾸고 싶다면:
     - 간단히 쉼표 구분 티커 지정: `npm run seed -- --tickers=TSLA,NVDA,AMD`
     - `.env` 또는 명령어에서 `SEED_TICKERS=TSLA,NVDA` 로 지정
     - 티커/이름을 JSON으로 정의: `npm run seed -- --tickers-file=scripts/my-tickers.json`
       ```json
       [
         { "ticker": "TSLA", "name": "Tesla Inc." },
         { "ticker": "NVDA", "name": "NVIDIA Corp." }
       ]
       ```
     - 숫자 데이터(가짜 역사 값)까지 명시하고 싶다면 `history`를 포함한 JSON을 전달하세요.
       날짜를 지정한 만큼 차트/테이블에 바로 수치가 표시됩니다.
       ```json
       [
         {
           "ticker": "TSLA",
           "name": "Tesla Inc.",
           "history": [
             { "date": "2024-04-01", "market_cap": 780000000000 },
             { "date": "2024-04-02", "market_cap": 790000000000 }
           ]
         },
         {
           "ticker": "NVDA",
           "history": [
             { "date": "2024-04-01", "market_cap": 2200000000000 },
             { "date": "2024-04-02", "market_cap": 2215000000000 }
           ]
         }
       ]
       ```
       `history`에 없는 날짜는 기존처럼 자동 생성되는 난수 데이터로 채워집니다.
     - 파일 경로는 상대/절대 모두 지원합니다.
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
│  └─ lib/db.ts                           # sql.js 기반 SQLite 쿼리 유틸
├─ scripts/seed.ts                        # 7일치 가짜 데이터 시드
├─ data/                                  # SQLite 파일(시드 실행 후 생성)
├─ package.json, tsconfig.json, next.config.mjs, .eslintrc.json
└─ .gitignore
```

## 추가 메모
- seed는 항상 날짜별 시가총액을 내림차순 정렬 후 rank를 부여합니다.
- API와 UI는 ISO 날짜 문자열(`YYYY-MM-DD`)을 사용합니다.
- 네이티브 빌드가 없는 `sql.js`를 사용해 Node 24 계열에서도 `npm install` 시 컴파일 문제가 없습니다.
- 필요 시 `@/lib/db`에서 DB 경로를 환경 변수로 교체해 배포 환경에 맞출 수 있습니다.

## Testing
- 아직 자동 테스트는 없습니다. `npm run seed` 후 `npm run dev`로 수동 확인하세요.
