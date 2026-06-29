# Biology in Higher Dimensions — React presentation app

This is the source for the slide decks. It also drives the PDF render pipeline.

## Quick start

```sh
npm install
npx playwright install chromium   # only needed if you'll render PDFs
npm run dev                       # serves on http://localhost:5173
```

## Keys while presenting

- `→` / `Space` — next slide
- `←` — previous slide
- `D` — toggle drawing (Apple Pencil / mouse)
- `C` — clear drawings on the current slide
- `N` — toggle the teaching-notes overlay
- `F` — fullscreen

## Render to PDF

In a second terminal (leave `npm run dev` running in the first):

```sh
npm run pdf          # student copies of all six decks
npm run pdf:notes    # instructor copies with the notes overlay
```

PDFs land under `../02_PDF_Slide_Decks/`.

See `../RENDER.md` for full details, troubleshooting, and the workshop-documents (Markdown → PDF) pipeline.

## File layout

```
src/
  App.jsx              top-level composition; reads ?deck= and ?print= URL flags
  components.jsx       Toolbar, Slide, DrawLayer, field renderers
  visuals.jsx          typed SVG visualisations (matrix, vectors, PCA, UMAP, …)
  slidesData.js        all slide content for the 5 days
  styles.css           layout + print rules
  main.jsx             React entry point
scripts/
  build-pdfs.mjs       Playwright render script
vite.config.mjs        Vite + React plugin config
```
