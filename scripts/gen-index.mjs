// Generates a root index.html on the gh-pages branch that links to every
// deployed branch. A "branch" is any directory (possibly nested, since branch
// names can contain slashes) that directly contains an index.html.
//
// Usage: node scripts/gen-index.mjs <gh-pages-dir>

import { readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? '.';
const found = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (existsSync(join(full, 'index.html'))) {
      found.push(relative(root, full).split('\\').join('/'));
    }
    walk(full);
  }
}

walk(root);
const branches = found.sort();

const items =
  branches.length > 0
    ? branches
        .map((b) => `      <li><a href="./${b}/">${b}</a></li>`)
        .join('\n')
    : '      <li class="empty">No branch builds deployed yet.</li>';

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Snootventure — Branch Builds</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        background: #12161f;
        color: #e6e9ef;
        margin: 0;
        padding: 2.5rem 1.5rem;
      }
      main { max-width: 640px; margin: 0 auto; }
      h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
      p.sub { color: #8b93a7; margin-top: 0; }
      ul { list-style: none; padding: 0; margin-top: 1.5rem; }
      li {
        background: #1b2130;
        border: 1px solid #2a3242;
        border-radius: 8px;
        margin-bottom: 0.6rem;
      }
      li a {
        display: block;
        padding: 0.85rem 1rem;
        color: #4fa4ff;
        text-decoration: none;
        font-family: ui-monospace, monospace;
        word-break: break-all;
      }
      li a:hover { background: #222a3c; }
      li.empty { padding: 0.85rem 1rem; color: #8b93a7; }
    </style>
  </head>
  <body>
    <main>
      <h1>Snootventure — Layer Prototype</h1>
      <p class="sub">Deployed branch builds:</p>
      <ul>
${items}
      </ul>
    </main>
  </body>
</html>
`;

writeFileSync(join(root, 'index.html'), html);
console.log(`Wrote ${join(root, 'index.html')} with ${branches.length} branch(es).`);
