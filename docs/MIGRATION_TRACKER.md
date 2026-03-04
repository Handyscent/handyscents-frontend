# cPanel PHP Migration – TODO / Issue Tracker

Single list for tracking migration tasks and issues for **upload.handyscents.com** (root deploy).

## Status overview

| Item | Status | Notes |
|------|--------|--------|
| PHP `/api/orders` endpoint | Done | `public/api/orders/index.php` + `config.example.php` |
| Apache `.htaccess` SPA + API | Done | `public/.htaccess` excludes `/api/*` |
| Frontend API URL handling | Done | `getOrdersApiUrl()` in OrderForm.tsx |
| cPanel deployment docs | Done | [CPANEL_DEPLOYMENT.md](CPANEL_DEPLOYMENT.md) |
| Production build verification | Done | `dist/` contains index.html, assets/, .htaccess, api/orders/index.php, api/orders/config.example.php |
| Live smoke tests | Pending | After first deploy to upload.handyscents.com |

## Master TODO list

- [ ] Deploy `dist/` to cPanel root (upload.handyscents.com).
- [ ] Create `api/orders/config.php` on server from `config.example.php`.
- [ ] Run smoke tests (SPA load, route refresh, order submit, 5 images).
- [ ] (Optional) Remove or archive Vercel deployment once cPanel is verified.

## Encountered issues

Record any issues here; update status and notes as resolved.

| Date | Issue | Resolution |
|------|--------|------------|
| _none yet_ | — | — |
