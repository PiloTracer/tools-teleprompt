# Test fixtures

## `axe.min.js`

Vendored [axe-core](https://github.com/dequelabs/axe-core) 4.10.2 for Playwright a11y e2e. Loaded from disk because production CSP (`deploy/Caddyfile`) allows only `script-src 'self'`, which blocks CDN injection.

To refresh:

```bash
curl -fsSL "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js" -o axe.min.js
```
