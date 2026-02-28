# Deploy to Vercel

Step-by-step setup for deploying the HandyScents frontend and orders API to Vercel.

## Prerequisites

- **Git** – repo pushed to GitHub (or GitLab/Bitbucket).
- **Vercel account** – [vercel.com](https://vercel.com) (sign up with GitHub).
- **Apps Script** – Web App deployed and URL ready (see [appscript-doPost.gs](appscript-doPost.gs)).

## 1. Connect the repo to Vercel

### Option A: Vercel dashboard (recommended)

1. Go to [vercel.com/new](https://vercel.com/new).
2. **Import** your Git repository (e.g. `handyscents-frontend`).
3. Vercel will detect the project. Confirm:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` (from `vercel.json`)
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Do **not** deploy yet. Go to **Settings** (or the next step) to add environment variables first.

### Option B: Vercel CLI

```bash
npm i -g vercel
cd handyscents-frontend
vercel login
vercel
```

Follow the prompts (link to existing project or create new). Add env vars in the dashboard or with `vercel env add` (see below).

---

## 2. Set environment variables

In the Vercel project: **Settings → Environment Variables**.

| Name | Value | Notes |
|------|--------|--------|
| `APPSCRIPT_WEBAPP_URL` | `https://script.google.com/macros/s/AKfycbzLMrPGkxACmt2FeCNg_cOUs4FYREYx0DdQPQP3WlR10Erj8OBSrxIRQYuPLno_nQ7B/exec` | Your Apps Script Web App URL. Required. |
| `APPSCRIPT_SECRET` | (your secret string) | Optional. Only if you validate it in Apps Script `doPost`. |

- Apply to **Production**, **Preview**, and **Development** if you use preview deployments.
- Redeploy after changing env vars so the serverless function picks them up.

---

## 3. What this project uses (`vercel.json`)

- **Build:** `npm run build` → output in `dist`.
- **Hosting:** Static files from `dist` (React SPA).
- **Rewrites:**  
  - Requests to `/api/orders` → handled by the serverless function `api/orders.ts`.  
  - All other paths → `/index.html` (client-side routing).
- **Function:** `api/orders.ts` – 1024 MB memory, 60 s max duration (for file uploads and Apps Script call).

No need to change Framework or Root Directory unless the repo structure is different (e.g. monorepo).

---

## 4. Deploy

- **From dashboard:** After saving env vars, open the **Deployments** tab and click **Redeploy** on the latest, or push a new commit to trigger a deploy.
- **From CLI:** Run `vercel --prod` in the project root (after `vercel` link).

---

## 5. Apps Script checklist

Before testing the order form in production:

1. **Copy** [appscript-doPost.gs](appscript-doPost.gs) into your Google Apps Script project (bound to the correct spreadsheet).
2. **Script Properties:** Set `PARENT_FOLDER_ID` (Drive folder for order files). Optionally set `APPSCRIPT_SECRET` if you use it.
3. **Deploy as Web app:** Execute as **Me**, who has access **Anyone** (or **Anyone with Google account**). Copy the **Web app URL** and use it as `APPSCRIPT_WEBAPP_URL` in Vercel.

---

## 6. Verify

1. Open the Vercel URL (e.g. `https://your-project.vercel.app`).
2. Fill and submit the order form. You should see success and a new row in the spreadsheet (and files in Drive if Apps Script is set up).
3. If submit fails: check **Vercel → Project → Logs** (Runtime Logs for the `api/orders` function) and the browser Network tab for the `/api/orders` response.

---

## 7. Local dev with the same API

To hit the same logic locally (e.g. without deploying on every change):

```bash
vercel dev
```

Then open `http://localhost:3000`. The app will call `/api/orders` on the local server. Set `APPSCRIPT_WEBAPP_URL` (and `APPSCRIPT_SECRET`) in `.env` or via `vercel env pull` so the local function can reach Apps Script.
