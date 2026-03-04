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

## Order submission

Order form submits to **`/api/orders`**, which forwards to Google Apps Script.

- **Production (cPanel):** Deploy to cPanel root per [docs/CPANEL_DEPLOYMENT.md](CPANEL_DEPLOYMENT.md). Configure `api/orders/config.php` (or env vars) with `APPSCRIPT_WEBAPP_URL` and optional `APPSCRIPT_SECRET`.
- **Legacy (Vercel):** Deploy to Vercel and set env vars `APPSCRIPT_WEBAPP_URL`, `APPSCRIPT_SECRET`; run `vercel dev` for local API. `vercel.json` is only used for Vercel deployments.
- **Apps Script:** Copy [docs/appscript-doPost.gs](appscript-doPost.gs) into your Apps Script project, set `PARENT_FOLDER_ID` and `APPSCRIPT_SECRET` in Script Properties, and deploy as Web app.
- **Local dev:** Use `VITE_API_URL` to point at a deployed API, or run `vercel dev` for same-origin `/api/orders`.

## Branch Workflow

- **master** — Development & testing (default branch)
- **main** — Production deployment only
- Feature branches merge into `master`, not `main`
