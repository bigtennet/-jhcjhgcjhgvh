# Instant Invoice & Receipt Generator

Create professional invoices in your browser. No backend. Export to PDF or print.

## Features
- Items with qty/price and automatic totals
- Discount and tax percentage
- Currency formatting (select currency)
- Business and client details with logo upload
- Notes section
- Save/Load multiple invoices (localStorage)
- Print-friendly and PDF export

## Run
Open `index.html` in any modern browser. No build needed.

## Deploy
- Upload these root files to any static host (GitHub Pages, Netlify, Vercel, S3, etc.)
- Or zip the folder and sell as a downloadable product (Gumroad, Lemon Squeezy, Itch, etc.)

### GitHub Pages
1. Push this repository to GitHub.
2. In GitHub repo Settings → Pages, set Source to `Deploy from a branch`, pick `main` and `/ (root)`.
3. Save. Your site will be live at the provided `github.io` URL.

### Netlify
1. Drag-and-drop this folder onto the Netlify dashboard, or connect repo.
2. Build command: (empty). Publish directory: `.`
3. Deploy. The included `netlify.toml` sets basic caching.

### Vercel
1. Import the repo into Vercel.
2. Framework preset: `Other`. Output/public directory: `.`
3. Deploy. `vercel.json` is included for static opts.

### Docker (serve via Nginx)
1. Build: `docker build -t invoice-app .`
2. Run: `docker run -p 8080:80 invoice-app`
3. Open: `http://localhost:8080`

### Amazon S3 / Cloudflare R2
1. Create a public bucket and enable static website hosting (or behind CDN).
2. Upload all files at repository root. Set `index.html` as index document.

## Sell Ideas
- Include 10+ invoice templates (colors/fonts) and market as "No-Setup Invoice Kit"
- Bundle with freelancers' docs (contract template, proposal template)
- Offer a custom branding upsell (you edit colors/logo for buyers)

## License
MIT — do anything, attribution appreciated.

