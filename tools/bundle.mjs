// Empacota o jogo inteiro num único arquivo HTML, que roda com duplo clique —
// sem servidor, sem Node, sem instalar nada.
//
//   node tools/bundle.mjs              -> dist/heroi-de-masmorra.html
//   node tools/bundle.mjs --artefato   -> dist/artefato.html (sem <html>/<head>)
//
// Cada módulo vira uma função que devolve seus exports, e os imports viram
// leitura de um registro. Um script clássico só, sem módulos, sem Blob URL e
// sem data: URL — nada que uma CSP restritiva possa recusar.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ARTEFATO = process.argv.includes('--artefato');
const ENTRADA = 'main.js';

const ler = (rel) => readFile(join(RAIZ, rel), 'utf8');

const RE_DEP = /from\s+'\.\/([\w.-]+\.js)'/g;
const RE_NOME_VAR = /^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
const RE_NOME_FN = /^export\s+function\s+([A-Za-z_$][\w$]*)/gm;

// Ordem topológica a partir dos imports reais, para não depender de uma lista
// escrita à mão que envelhece à primeira dependência nova.
async function ordenar(entrada) {
  const fontes = new Map();
  const ordem = [];
  const visitando = new Set();

  async function visitar(nome) {
    if (fontes.has(nome)) return;
    if (visitando.has(nome)) throw new Error(`import circular em ${nome}`);
    visitando.add(nome);

    const src = await ler(join('src', nome));
    for (const m of src.matchAll(RE_DEP)) await visitar(m[1]);

    visitando.delete(nome);
    fontes.set(nome, src);
    ordem.push(nome);
  }

  await visitar(entrada);
  return { ordem, fontes };
}

// Troca as declarações de import por leitura do registro e tira o `export` das
// declarações, guardando os nomes para devolver no fim.
function transformar(nome, src) {
  const exportados = [
    ...[...src.matchAll(RE_NOME_VAR)].map((m) => m[1]),
    ...[...src.matchAll(RE_NOME_FN)].map((m) => m[1]),
  ];

  const corpo = src
    .replace(/^import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+'\.\/([\w.-]+\.js)';?$/gm,
      (_, alias, dep) => `const ${alias} = __mods[${JSON.stringify(dep)}];`)
    .replace(/^import\s+\{([^}]+)\}\s+from\s+'\.\/([\w.-]+\.js)';?$/gm,
      (_, nomes, dep) => `const {${nomes}} = __mods[${JSON.stringify(dep)}];`)
    .replace(/^export\s+/gm, '');

  const sobrou = corpo.match(/^\s*(import|export)\s/m);
  if (sobrou) throw new Error(`${nome}: import/export não tratado — "${sobrou[0].trim()}"`);

  return `__mods[${JSON.stringify(nome)}] = (function () {\n${corpo}\nreturn { ${exportados.join(', ')} };\n})();`;
}

const { ordem, fontes } = await ordenar(ENTRADA);

const html = await ler('index.html');
const css = await ler('css/style.css');
const icone = await ler('icon.svg');

// O corpo sai do index.html: uma marcação só, sem cópia que possa divergir.
const corpo = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).trim()
  .replace(/\n?\s*<script type="module"[^>]*><\/script>/, '');

const script = `<script>
(function () {
  'use strict';
  const __mods = {};

${ordem.map((n) => transformar(n, fontes.get(n))).join('\n\n')}
})();
</script>`;

const miolo = `<title>Herói de Masmorra</title>
<style>
${css}
</style>

${corpo}

${script}`;

const favicon = `data:image/svg+xml;base64,${Buffer.from(icone).toString('base64')}`;

const final = ARTEFATO ? miolo : `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
<meta name="theme-color" content="#0d0b12">
<link rel="icon" href="${favicon}">
<title>Herói de Masmorra</title>
<style>
${css}
</style>
</head>
<body>
${corpo}

${script}
</body>
</html>`;

await mkdir(join(RAIZ, 'dist'), { recursive: true });
const arquivo = ARTEFATO ? 'dist/artefato.html' : 'dist/heroi-de-masmorra.html';
await writeFile(join(RAIZ, arquivo), final);

console.log(`  ${arquivo}  —  ${(final.length / 1024).toFixed(0)} KB`);
console.log(`  módulos: ${ordem.join(' → ')}`);
