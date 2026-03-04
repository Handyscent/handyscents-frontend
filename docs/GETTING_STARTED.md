# Getting Started

Setup guide for HandyScent Frontend when cloning the repo locally.

## Prerequisites

- **Node.js** 18+ ([nodejs.org](https://nodejs.org))
- **npm** (included with Node.js)

## Setup Steps

### 1. Clone the repository

```bash
git clone https://github.com/Handyscent/handyscents-frontend.git
cd handyscents-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run development server

```bash
npm run dev
```

App runs at **http://localhost:5173**

### 4. Other commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Order submission (serverless)

Order form submits to `/api/orders` (Vercel serverless) which forwards to Google Apps Script. For production:

1. Deploy to Vercel and set env vars: `APPSCRIPT_WEBAPP_URL`, `APPSCRIPT_SECRET` (optional).
2. Copy [docs/appscript-doPost.gs](docs/appscript-doPost.gs) into your Apps Script project, set `PARENT_FOLDER_ID` and `APPSCRIPT_SECRET` in Script Properties, and deploy as Web app.
3. Local dev: run `vercel dev` so `/api/orders` works; or test against a deployed URL via `VITE_API_URL`.

## Branch Workflow

- **master** — Development & testing (default branch)
- **main** — Production deployment only
- Feature branches merge into `master`, not `main`
