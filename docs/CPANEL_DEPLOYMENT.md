# cPanel Deployment (upload.handyscents.com)

Production deployment to cPanel root at **https://upload.handyscents.com** using PHP for same-origin `/api/orders`.

## Prerequisites

- Node.js 18+ (for build only)
- cPanel hosting with PHP 7.4+ (curl enabled), Apache mod_rewrite
- Google Apps Script Web App deployed ([docs/appscript-doPost.gs](appscript-doPost.gs))

## 1. Build for production

```bash
npm install
npm run build
```

Output is in **`dist/`**. Contents to deploy:

- All files and folders under `dist/` (including `index.html`, `assets/`, `.htaccess`, `api/`)
- Deploy **entire `dist/`** to the document root of the domain (e.g. `public_html` for upload.handyscents.com).

## 2. Server / environment configuration

### PHP API config (required)

The `/api/orders` endpoint needs your Apps Script Web App URL and optional secret.

**Option A – config file (recommended on cPanel)**

1. On the server, in the folder that contains your deployed app, go to `api/orders/`.
2. Copy `config.example.php` to `config.php`.
3. Edit `config.php`:
   - Set `APPSCRIPT_WEBAPP_URL` to your Apps Script Web App **exec** URL (e.g. `https://script.google.com/macros/s/.../exec`).
   - Set `APPSCRIPT_SECRET` if your Apps Script expects it (must match Script Properties).

**Option B – environment variables**

If your host allows setting env vars (e.g. cPanel “Environment Variables” or `SetEnv` in `.htaccess`), set:

- `APPSCRIPT_WEBAPP_URL` – Apps Script Web App exec URL
- `APPSCRIPT_SECRET` – optional secret

Config file takes precedence over env vars.

### Apache

- **mod_rewrite** must be enabled (usual on cPanel).
- Root `.htaccess` is included in `dist/`; it sends non-file requests to `index.html` (SPA) and does **not** rewrite `/api/*`.

## 3. Upload / deploy

1. Upload the **contents** of `dist/` to the document root for **https://upload.handyscents.com** (e.g. `public_html` or the subdomain’s root).
2. Ensure `api/orders/config.php` exists on the server (created from `config.example.php` as above). Do not commit `config.php`; it is server-specific.
3. Confirm permissions: PHP can read `config.php` and write to temp if needed for uploads.

## 4. Smoke-test checklist

- [ ] **Home / SPA**: Open https://upload.handyscents.com — app loads, no 404.
- [ ] **Route refresh**: Open a deep link (e.g. `/resubmit`), refresh the page — same page loads (no 404).
- [ ] **Order submit**: Submit the order form with valid data and 5 images — success message and no console/network errors.
- [ ] **API error handling**: If Apps Script is misconfigured, form shows a clear error (e.g. “Server Error Please Contact Support” or message from Apps Script).

## 5. Troubleshooting: No data in Sheet / Drive

If the form shows success but nothing appears in the Apps Script execution log, Sheet, or Drive:

1. **Use the exec URL, not dev**  
   In `api/orders/config.php`, `APPSCRIPT_WEBAPP_URL` must be the **Web app** URL ending in **`/exec`** (e.g. `https://script.google.com/macros/s/SCRIPT_ID/exec`). The **`/dev`** URL only works when you run the script from the editor; it will not work for POSTs from your server.

2. **Deploy the Apps Script as a Web app**  
   In the Apps Script project: Deploy → New deployment → Type “Web app”. Set “Execute as” to **Me**, “Who has access” to **Anyone** (or Anyone with Google account). Deploy and copy the **exec** URL into `config.php`.

3. **Config on the server**  
   Confirm `api/orders/config.php` exists on the server (not only locally) and contains the correct `APPSCRIPT_WEBAPP_URL`. If the URL is wrong or the file is missing, the PHP returns 500 or the error message shown in the form.

4. **Drive permission**  
   In Apps Script, run **`authorizeDrive()`** once from the editor (Run → authorizeDrive). This grants Drive access when “Execute as: Me” is used. Set the Script Property **`PARENT_FOLDER_ID`** to the Drive folder ID where order folders should be created.

5. **Check the error message**  
   If the form shows an error after submit, that message is from the PHP or Apps Script response (e.g. “Apps Script request failed: …” or “Order number is required”). Use it to see whether the request reached Apps Script and what it returned.

6. **Apps Script Execution log**  
   In the Apps Script project: Executions. After a submit, check if `doPost` ran. If there are no executions, the request is not reaching the script (wrong URL or server issue). If `doPost` ran but threw an error, the execution log shows the exception.

## 6. Rollback

- Keep a backup of the previous `public_html` (or document root) before uploading a new build.
- To roll back: restore the previous files so that `index.html`, `assets/`, `.htaccess`, and `api/` are as before.
- If only the frontend changed, replacing `index.html` and `assets/` may be enough; if API or `.htaccess` changed, restore the full set.

## 7. Frontend API URL (optional override)

By default the app uses same-origin **`/api/orders`**. To point to another endpoint (e.g. another domain or path), set at **build time**:

- `VITE_API_URL` – base URL (e.g. `https://other.com/api`) or full endpoint (e.g. `https://other.com/api/orders`).

Then run `npm run build` and deploy the new `dist/`. For cPanel production at upload.handyscents.com, leave `VITE_API_URL` unset so the app uses `/api/orders` on the same host.
