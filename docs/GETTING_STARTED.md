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

## Order submission (FTP / shared hosting)

Order form submits to `/api/orders.php` by default. The PHP endpoint forwards the request to Google Apps Script.

### FTP deployment steps

1. Build app locally:

```bash
npm run build
```

2. Upload to hosting (via FTP):
	- Upload everything inside `dist/` to your web root (`public_html`, `www`, etc.).
	- Upload `api/orders.php` and `api/config.php` to `<web-root>/api/`.
	- Ensure `<web-root>/.htaccess` exists (SPA fallback). You can copy it from `public/.htaccess`.

3. Configure server-side secret values in `api/config.php` (based on `api/config.example.php`):
	- `APPSCRIPT_WEBAPP_URL` (required)
	- `APPSCRIPT_SECRET` (optional, but recommended)

4. Ensure PHP upload limits are high enough in hosting control panel / `php.ini`:
	- `upload_max_filesize` >= `100M`
	- `post_max_size` >= `520M` (5 images + form payload)

5. Optional frontend override:
	- Set `VITE_API_URL` only if you want to use a different endpoint.
	- `VITE_API_URL` is treated as a full URL now (example: `https://yourdomain.com/api/orders.php`).

### Local development note

- `npm run dev` serves frontend only.
- If you need to test uploads end-to-end locally, use an endpoint via `VITE_API_URL` or run behind a local PHP server.

## Branch Workflow

- **master** — Development & testing (default branch)
- **main** — Production deployment only
- Feature branches merge into `master`, not `main`
