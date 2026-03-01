# FTP Deployment Checklist

Use this checklist to deploy the app to shared hosting via FTP.

## 1) Build locally

```bash
npm install
npm run predeploy
```

## 2) Prepare backend config

1. Copy `api/config.example.php` to `api/config.php`.
2. Set values in `api/config.php`:

```php
<?php
const APPSCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/your-script-id/exec';
const APPSCRIPT_SECRET = 'your-optional-secret';
```

## 3) Upload files via FTP

Upload to your web root (`public_html`, `www`, etc.):

- All contents of `dist/` (not the `dist` folder itself).
- `api/orders.php`
- `api/config.php`
- `.htaccess` (use `public/.htaccess` from this repo)

Final server structure should look like:

```text
/web-root
  /assets
  index.html
  .htaccess
  /api
    orders.php
    config.php
```

## 4) Hosting/PHP settings

Set PHP limits high enough for 5 uploads:

- `upload_max_filesize = 100M` (or higher)
- `post_max_size = 520M` (or higher)
- `max_execution_time = 120` (recommended)

## 5) Quick post-deploy test

1. Open your domain and confirm Order Form page loads.
2. Submit a real test order with 5 images.
3. Confirm response success message is shown.
4. Confirm files/data are received in your Google Apps Script destination.

## 6) Troubleshooting

- **Blank page on refresh or direct URL**: `.htaccess` missing or rewrite not enabled.
- **Upload fails immediately**: check `post_max_size` / `upload_max_filesize`.
- **Server error on submit**: verify `APPSCRIPT_WEBAPP_URL` in `api/config.php`.
- **Apps Script rejects request**: verify `APPSCRIPT_SECRET` matches Script Properties.
