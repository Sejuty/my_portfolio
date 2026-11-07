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

The site lives in the `Sejuty/sejuty` repo and is served at https://sejuty.github.io/sejuty/.
