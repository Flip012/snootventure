// Generiert die Root-index.html für gh-pages: eine Liste aller Branches
// mit Link auf das jeweilige Deploy-Verzeichnis /<branch>/.
// Branch-Quelle: git ls-remote (läuft im CI mit Checkout-Credentials).
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] ?? 'dist-root';

const raw = execSync('git ls-remote --heads origin', { encoding: 'utf8' });
const branches = raw
  .split('\n')
  .filter(Boolean)
  .map((line) => line.split('\t')[1]?.replace('refs/heads/', ''))
  .filter((b) => b && b !== 'gh-pages')
  .sort();

const escapeHtml = (s) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const items = branches
  .map((b) => {
    const href = './' + b.split('/').map(encodeURIComponent).join('/') + '/';
    return `      <li><a href="${href}">${escapeHtml(b)}</a></li>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Snootventure — Branch-Deploys</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #10131a; color: #dde3ee;
             max-width: 640px; margin: 3rem auto; padding: 0 1rem; }
      a { color: #7ab8ff; }
      li { margin: 0.5rem 0; }
    </style>
  </head>
  <body>
    <h1>Snootventure — Branch-Deploys</h1>
    <ul>
${items}
    </ul>
  </body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html);
console.log(`Root-Index mit ${branches.length} Branch(es) → ${outDir}/index.html`);
