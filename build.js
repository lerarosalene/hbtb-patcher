const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');
const path = require('node:path');
const fs = require('node:fs');

const fsp = fs.promises;

async function main() {
  const result = await esbuild.build({
    write: false,
    entryPoints: [path.join('src', 'index.ts')],
    bundle: true,
    minify: true,
    outfile: path.join('dist', 'index.js'),
    target: 'es2015',
  });
  const html = await fsp.readFile(path.join('src', 'index.html'), 'utf-8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const script = document.getElementById("bundle");
  script.appendChild(document.createTextNode(result.outputFiles[0].text));
  script.removeAttribute("id");

  const bundle = dom.serialize();

  await fsp.mkdir('dist', { recursive: true });
  await fsp.writeFile(path.join('dist', 'index.html'), bundle);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
