// Render every deck (and the combined "all") to a PDF under 02_PDF_Slide_Decks/.
//
// Prerequisites:
//   1. `npm install`            — installs Playwright + vite + react.
//   2. `npx playwright install chromium`  — fetches the bundled browser.
//   3. `npm run dev`            — start the dev server in a separate terminal.
//   4. `npm run pdf`            — in this terminal, run this script.
//
// With teaching-notes overlay:
//   WITH_NOTES=1 npm run pdf    — adds &notes=1 so the board/refs overlay
//                                 prints on every slide. Useful for the
//                                 instructor copy.
//
// Override the URL (e.g., for `npm run preview`):
//   BASE_URL=http://localhost:4173 npm run pdf

import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DECKS = [
  { id: 'theory', filename: 'Theoretical_Framework' },
  { id: 'day1', filename: 'Day_1_Measurement_Science' },
  { id: 'day2', filename: 'Day_2_Variation_Design' },
  { id: 'day3', filename: 'Day_3_Higher_Dimensions' },
  { id: 'day4', filename: 'Day_4_Models' },
  { id: 'day5', filename: 'Day_5_AI_in_Biology' },
  { id: 'all',  filename: 'All_Decks_Combined' },
];

const OUT  = resolve(__dirname, '../../02_PDF_Slide_Decks');
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const NOTES = process.env.WITH_NOTES === '1';
const STUDENT = process.env.STUDENT === '1';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

console.log(`▶ rendering decks from ${BASE} → ${OUT}`);
if (NOTES)   console.log('  (with teaching-notes overlay enabled)');
if (STUDENT) console.log('  (student notes mode — A4 portrait)');

// PDF page dimensions per mode.
const PDF_W = STUDENT ? '8.27in'   : '13.333in';
const PDF_H = STUDENT ? '11.69in'  : '7.5in';

// Viewport width determines the CSS pixel base. Student notes pages are 794 px wide.
const VP_W  = STUDENT ? 794 : 1280;
const VP_H  = STUDENT ? 1123 : 720;

// CSS selector to wait for before printing.
const READY_SEL = STUDENT ? '.student-notes-stage' : '.print-stage';

const browser = await chromium.launch();
try {
  for (const deck of DECKS) {
    const params = new URLSearchParams({ deck: deck.id, print: '1' });
    if (NOTES)   params.set('notes', '1');
    if (STUDENT) params.set('student', '1');
    const url = `${BASE}/?${params}`;

    const ctx = await browser.newContext({
      viewport: { width: VP_W, height: VP_H },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.error('  page error:', e.message));

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForFunction(
        sel => document.querySelectorAll(sel).length > 0,
        READY_SEL,
        { timeout: 10000 }
      );
      await page.waitForTimeout(300);

      const suffix = STUDENT ? '_student_notes' : NOTES ? '_with_notes' : '';
      const path = `${OUT}/${deck.filename}${suffix}.pdf`;
      await page.pdf({
        path,
        width: PDF_W,
        height: PDF_H,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: true,
      });
      console.log(`  ✓ ${deck.filename}${suffix}.pdf`);
    } catch (err) {
      console.error(`  ✗ ${deck.filename}: ${err.message}`);
    } finally {
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

console.log('done.');
