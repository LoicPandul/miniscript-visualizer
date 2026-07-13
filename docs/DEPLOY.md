# Deploying to Cloudflare Pages

The app is a fully static Vite build: no backend, no environment secrets, no redirects. Cloudflare Pages serves it as-is, and it works with a private GitHub repository (Cloudflare accesses it through its GitHub app).

## One-time setup

1. In the Cloudflare dashboard, open Workers & Pages, then Create, then Pages, then "Connect to Git".
2. Authorize the Cloudflare GitHub app on the `miniscript-visualizer` repository and select it.
3. Configure the build:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22` (Vite 8 needs Node 20.19 or newer)
4. Save and deploy.

The site is then served at `https://<project-name>.pages.dev`. Every push to `main` triggers a production deploy; pushes to other branches get preview URLs automatically.

## Notes

- The Miniscript compiler ships as plain JavaScript (wasm2js), so no WASM MIME or header configuration is needed.
- There is nothing to configure for SPA routing: the app is a single page.
