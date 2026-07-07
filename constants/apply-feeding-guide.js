// One-time codemod: merges the detailed feeding guide content into
// constants/ingredient.ts, replacing only the `feeding: { en: [...], vi: [...] }`
// field inside each matching item. Robust to formatting/indentation differences
// (e.g. after Prettier/ESLint reformatting) since it locates items by their
// `id: '...'` text rather than by exact whitespace layout.
//
// Usage:
//   1. Put this file and feeding-guide-detailed.ts next to ingredient.ts
//      (or adjust the paths below).
//   2. node apply-feeding-guide.js
//   3. Review the diff, then delete this script + feeding-guide-detailed.ts.

const fs = require('fs');
const path = require('path');

const INGREDIENT_PATH = path.resolve(__dirname, 'ingredient.ts'); // <-- adjust if needed
const FEEDING_GUIDE_PATH = path.resolve(__dirname, 'feeding-guide-detailed.ts');

function loadFeedingGuide() {
  const raw = fs.readFileSync(FEEDING_GUIDE_PATH, 'utf8');
  const objText = raw
    .replace(/^[\s\S]*?FEEDING_GUIDE_DETAILED[^=]*=\s*/, '')
    .replace(/;\s*$/, '');
  // eslint-disable-next-line no-eval
  return eval('(' + objText + ')');
}

function escapeForJsString(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function main() {
  const feedingGuide = loadFeedingGuide();
  let src = fs.readFileSync(INGREDIENT_PATH, 'utf8');

  // All `id: '...'` occurrences in file order, with their positions.
  const idRegex = /id:\s*'([^']+)'/g;
  const idMatches = [];
  let m;
  while ((m = idRegex.exec(src)) !== null) {
    idMatches.push({ id: m[1], index: m.index });
  }

  let updatedCount = 0;
  const missing = [];

  // Walk ids in reverse so earlier replacements don't shift later indices.
  for (let i = idMatches.length - 1; i >= 0; i--) {
    const { id, index } = idMatches[i];
    const entry = feedingGuide[id];
    if (!entry) continue;

    const windowEnd = i + 1 < idMatches.length ? idMatches[i + 1].index : src.length;
    const before = src.slice(0, index);
    const windowStr = src.slice(index, windowEnd);

    // Tolerant of multi-line formatting: 's' flag lets '.' match newlines.
    const feedingRegex = /feeding:\s*\{\s*en:\s*\[[^\]]*\]\s*,\s*vi:\s*\[[^\]]*\]\s*\}\s*,?/s;
    if (!feedingRegex.test(windowStr)) {
      missing.push(id + ' (no feeding field found in range — probably not a safe item, or format differs further)');
      continue;
    }

    const enList = entry.en.map((s) => `'${escapeForJsString(s)}'`).join(', ');
    const viList = entry.vi.map((s) => `'${escapeForJsString(s)}'`).join(', ');
    const replacement = `feeding: { en: [${enList}], vi: [${viList}] },`;

    const newWindow = windowStr.replace(feedingRegex, replacement);
    src = before + newWindow + src.slice(windowEnd);
    updatedCount += 1;
  }

  fs.writeFileSync(INGREDIENT_PATH, src, 'utf8');
  console.log(`Done. Updated feeding guide for ${updatedCount} ingredient(s).`);
  if (missing.length) {
    console.log(`\nNot matched (${missing.length}):`);
    missing.forEach((line) => console.log(' -', line));
  }
}

main();