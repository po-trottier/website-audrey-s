# Audrey Stypulkowski — Website

Static single-page website for Audrey Stypulkowski (`audreyhauteurdenfant.com`).

## Architecture

**Zero frameworks, zero runtime dependencies.** The site is vanilla HTML/CSS/JS with a build step that generates static files from content data.

```
content/settings.json   ← All editable content (text, image paths, config)
template.html           ← Page layout with {{placeholders}}
build.js                ← Reads content + template → generates index.html
styles.css              ← Utility-first CSS framework (Tailwind-style, hand-written)
script.js               ← Interactivity (menu, accordion, popup, form, scroll effects)
admin/                  ← Custom admin panel with GitHub OAuth
functions/              ← Cloudflare Pages Functions (OAuth, contact form)
```

### Why this stack?

- **No framework** — faster load, no build toolchain, easy to maintain
- **Content in JSON** — clean separation from layout, editable via admin or directly
- **Build step** — content is baked into static HTML at build time for perfect SEO
- **Utility-first CSS** — reusable classes, consistent spacing/typography via CSS custom properties
- **Cloudflare Pages** — free hosting, unlimited bandwidth, global CDN, serverless functions

## Content Management

The admin panel at `/admin/` provides a visual editor for all site content. Authentication uses GitHub OAuth — anyone with collaborator access to this repo can log in and edit.

### How it works

1. Admin logs in via GitHub OAuth at `/admin/`
2. Edits text, images, toggles (popup, services, FAQ, etc.)
3. Clicks "Publish" — changes are committed to `content/settings.json` via GitHub API
4. Cloudflare Pages detects the push, runs `node build.js`, deploys the new static site (~30s)

### Content structure

All content lives in `content/settings.json` with these sections:

| Section | What's editable |
|---------|----------------|
| `seo` | Page title, meta description, OG image, favicon |
| `popup` | Enable/disable + title + message + image |
| `header` | Logo, site name, CTA button |
| `hero` | Headline, subtitle, background image, CTAs |
| `services` | Section heading + list of service cards |
| `about` | Title, bio (markdown), photo, core values |
| `education` | Section heading + educational content items |
| `faq` | Section heading + Q&A pairs |
| `contact` | Heading, subtitle, phone, address, form subject options |
| `footer` | Business name, credentials, privacy link |

## Local Development

### Prerequisites

- Node.js (any recent version)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)

### Setup

```bash
# Install dependencies
npm install

# Create local environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your GitHub OAuth credentials and Turnstile keys

# Build and start local dev server
npm run dev
```

The site will be available at `http://localhost:8788` with full Cloudflare Pages Functions support.

### Build only

```bash
node build.js
# Generates: index.html, sitemap.xml, robots.txt
```

## Deployment (Cloudflare Pages)

### 1. Authenticate Wrangler

```bash
wrangler login
```

This opens a browser window. Authorize Wrangler to access your Cloudflare account.

### 2. Create the Pages project

```bash
wrangler pages project create website-audrey-s --production-branch main
```

### 3. Set environment variables (secrets)

```bash
wrangler pages secret put GITHUB_CLIENT_ID --project-name website-audrey-s
wrangler pages secret put GITHUB_CLIENT_SECRET --project-name website-audrey-s
wrangler pages secret put TURNSTILE_SECRET --project-name website-audrey-s
wrangler pages secret put CONTACT_EMAIL --project-name website-audrey-s
```

Each command prompts for the value.

### 4. Connect to GitHub for auto-deploy

Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) > Pages > your project > Settings > Builds & deployments:

- **Production branch**: `main`
- **Build command**: `node build.js`
- **Build output directory**: `.`
- **Root directory**: `/`

Connect the GitHub repo. Every push to `main` triggers a build and deploy.

### 5. Custom domain

In the Cloudflare dashboard, go to Pages > your project > Custom domains > Add:
- Add `audreyhauteurdenfant.com`
- Follow the DNS instructions (if the domain is already on Cloudflare, it auto-configures)

### 6. GitHub OAuth App

Create at [github.com/settings/developers](https://github.com/settings/developers):
- **Application name**: `Audrey Stypulkowski Admin`
- **Homepage URL**: `https://audreyhauteurdenfant.com`
- **Callback URL**: `https://audreyhauteurdenfant.com/api/auth/callback`

Use the Client ID and Client Secret as the `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` secrets (step 3).

### 7. Cloudflare Turnstile

Create a widget at [dash.cloudflare.com/turnstile](https://dash.cloudflare.com/turnstile):
- **Site name**: `audreyhauteurdenfant.com`
- **Domains**: `audreyhauteurdenfant.com`
- Copy the **Site Key** into `template.html` (replace the test key in the `data-sitekey` attribute)
- Copy the **Secret Key** as the `TURNSTILE_SECRET` secret (step 3)

### 8. Email routing

Enable [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/) on the domain to forward contact form submissions to the configured destination (`CONTACT_EMAIL` secret).

## Bot Protection

The contact form has three layers:
1. **Honeypot field** — hidden field that bots fill, humans don't see
2. **Cloudflare Turnstile** — privacy-friendly CAPTCHA widget
3. **Server-side Turnstile verification** — token validated before processing

## Project Structure

```
.
├── admin/
│   ├── index.html          # Admin panel (login + editor UI)
│   └── admin.js            # Admin logic (OAuth, content CRUD, GitHub API)
├── assets/
│   └── images/             # Site images (uploaded via admin or manually)
├── content/
│   └── settings.json       # All editable content
├── functions/
│   └── api/
│       ├── auth/
│       │   ├── github.js   # OAuth: redirect to GitHub
│       │   └── callback.js # OAuth: exchange code for token
│       ├── contact.js      # Contact form handler + email
│       └── preview.js      # Server-side preview rendering
├── lib/
│   └── render.mjs          # Shared template engine (build + preview)
├── _headers                # Cloudflare Pages security headers
├── .gitignore
├── build.js                # Build script: content + template → index.html
├── package.json
├── script.js               # Client-side interactivity
├── styles.css              # Utility-first CSS framework
└── template.html           # HTML template with {{placeholders}}
```

## License

[MIT](LICENSE)
