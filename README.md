# Codex CLI 실습 프로젝트

이 프로젝트는 Codex CLI 사용법을 연습하기 위한 프로젝트입니다.

## 자동차 검색 API

회사명으로 자동차 목록을 검색할 수 있습니다.

```bash
curl "http://localhost:3000/cars/search?company=HYUNDAI"
```

`company` 값을 전달하지 않으면 전체 자동차 목록을 반환합니다.

```bash
curl "http://localhost:3000/cars/search"
```

## 자동차 가격 필터 API

최소 가격과 최대 가격 사이의 자동차 목록을 검색할 수 있습니다.

```bash
curl "http://localhost:3000/cars/filter?minPrice=2000&maxPrice=3000"
```

`minPrice` 또는 `maxPrice` 값을 생략해도 동작합니다.

```bash
curl "http://localhost:3000/cars/filter?minPrice=2500"
curl "http://localhost:3000/cars/filter?maxPrice=2600"
curl "http://localhost:3000/cars/filter"
```

## 프론트엔드

React와 Vite로 만든 자동차 관리 대시보드가 `frontend` 디렉터리에 있습니다. 자동차 목록 조회, 회사명 검색, 가격 필터, 등록, 수정, 삭제 기능이 `server.js`의 자동차 API와 연결되어 있습니다.

### Codespaces 실행 방법

백엔드 서버와 프론트엔드 개발 서버를 각각 다른 터미널에서 실행합니다.

```bash
npm start
```

```bash
npm run dev
```

백엔드는 `http://localhost:3000`, 프론트엔드는 `http://localhost:5173`에서 실행됩니다. Codespaces에서는 포트 탭에서 5173번 포트를 열어 프론트엔드 화면에 접속하면 됩니다.

### API 연결 방식

프론트엔드는 기본적으로 상대 경로로 API를 호출합니다.

```text
/cars
/cars/search
/cars/filter
/cars/:id
```

개발 중에는 `frontend/vite.config.js`의 Vite proxy 설정이 `/cars` 요청을 백엔드 서버 `http://localhost:3000`으로 전달합니다. 그래서 브라우저에서는 프론트엔드 주소로 접속해도 백엔드 API와 상호작용할 수 있습니다.

별도의 백엔드 주소를 직접 지정해야 한다면 `frontend` 디렉터리에 `.env` 파일을 만들고 다음 값을 설정합니다.

```bash
VITE_API_BASE_URL=https://your-backend-url
```

### 프론트엔드 빌드

```bash
npm run build
```

루트의 `npm run build` 명령은 `frontend` 앱을 빌드하도록 설정되어 있습니다.

## GitHub Actions + Render 배포

이 프로젝트는 백엔드 Express 서버와 프론트엔드 Vite 앱을 Render에서 별도 서비스로 배포하는 구성을 기준으로 합니다.

### Render 백엔드 서비스

백엔드는 `server.js`를 실행하는 Web Service로 생성합니다.

```text
Root Directory: .
Build Command: npm ci
Start Command: npm start
Health Check Path: /healthz
```

Render가 제공하는 `PORT` 환경 변수를 사용하도록 서버가 설정되어 있으므로 포트를 직접 고정하지 않아도 됩니다.

프론트엔드 Render URL이 정해지면 백엔드 서비스의 환경 변수에 추가합니다.

```bash
FRONTEND_ORIGIN=https://your-frontend-service.onrender.com
```

여러 프론트엔드 origin을 허용해야 한다면 쉼표로 구분합니다.

```bash
FRONTEND_ORIGIN=https://your-frontend-service.onrender.com,http://localhost:5173
```

### Render 프론트엔드 서비스

프론트엔드는 Static Site로 생성합니다.

```text
Root Directory: frontend
Build Command: npm ci && npm run build
Publish Directory: dist
```

프론트엔드 서비스에는 백엔드 Render URL을 환경 변수로 설정합니다.

```bash
VITE_API_BASE_URL=https://your-backend-service.onrender.com
```

이 값은 Vite 빌드 시점에 포함됩니다. 백엔드 URL을 바꾸면 프론트엔드를 다시 빌드/배포해야 합니다.

### GitHub Actions 배포

`.github/workflows/render-deploy.yml` 워크플로는 `main` 브랜치에 push되면 빌드를 확인한 뒤 Render Deploy Hook을 호출합니다.

GitHub 저장소의 `Settings > Secrets and variables > Actions`에 다음 secrets를 등록합니다.

```text
RENDER_BACKEND_DEPLOY_HOOK_URL
RENDER_FRONTEND_DEPLOY_HOOK_URL
```

각 값은 Render 서비스의 Deploy Hook URL을 사용합니다. 둘 중 하나만 등록하면 등록된 서비스만 배포됩니다.
