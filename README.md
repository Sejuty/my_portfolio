# Nishat Tafannum — Research Map

Static portfolio site built with Vite + TypeScript (no framework).

## Develop

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # typecheck + production build to dist/
npm run preview   # serve dist/ locally
```

## Edit content

- Prose sections (publications, skills, contact…): `index.html`
- Fig. 1 path map: `src/data.ts`. `TRACKS` are the lines (education, engineering, research themes), `SPANS` the degree and job roles, `NODES` the project stations (`short` = label used where space is tight)
- Styles / colour tokens: `src/styles.css`
- CV: put the PDF at `public/cv.pdf`

## Deploy (GitHub Pages)

The site lives in the `Sejuty/my_portfolio` repo and is served at https://sejuty.github.io/my_portfolio/.

1. The repo must be **public** (GitHub Pages on a private repo needs a paid plan).
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` and publishes the site.

`vite.config.ts` sets `base: '/my_portfolio/'` to match the repo name. If you rename the repo, update it; if you
move the site to a repo named `Sejuty.github.io` (served at https://sejuty.github.io/), set it to `'/'`.
