// Empacota o jogo inteiro num único arquivo HTML, que roda com duplo clique —
// sem servidor, sem Node, sem instalar nada.
//
//   node tools/bundle.mjs              -> dist/heroi-de-masmorra.html
//   node tools/bundle.mjs --artefato   -> dist/artefato.html (sem <html>/<head>)
//
// Como funciona: cada módulo entra na página como texto puro, e um carregador
// de seis linhas transforma cada um em Blob URL, reescrevendo os imports para
// apontar para o Blob do módulo anterior. Assim nada precisa ser reescrito na
// marra — o navegador continua carregando módulos ES de verdade, e o código
// empacotado é byte a byte o mesmo do src/.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ARTEFATO = process.argv.includes('--artefato');
const ENTRADA = 'main.js';

const ler = (rel) => readFile(join(RAIZ, rel), 'utf8');

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
    for (const m of src.matchAll(/from\s+'\.\/([\w.-]+\.js)'/g)) await visitar(m[1]);

    visitando.delete(nome);
    fontes.set(nome, src);
    ordem.push(nome);
  }

  await visitar(entrada);
  return { ordem, fontes };
}

const { ordem, fontes } = await ordenar(ENTRADA);

const html = await ler('index.html');
const css = await ler('css/style.css');
const icone = await ler('icon.svg');

// O corpo sai do index.html: uma marcação só, sem cópia que possa divergir.
const corpo = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).trim()
  .replace(/\n?\s*<script type="module"[^>]*><\/script>/, '');

const favicon = `data:image/svg+xml;base64,${Buffer.from(icone).toString('base64')}`;

// Texto puro em vez de template literal: o código tem crases e ${...}, que
// dentro de uma string JS precisariam de escape e quebrariam na primeira
// distração.
const modulos = ordem
  .map((nome) => `<script type="text/plain" data-modulo="${nome}">\n${fontes.get(nome)}\n</script>`)
  .join('\n');

const carregador = `<script type="module">
  // Cada módulo vira um Blob URL, na ordem de dependência, e os imports são
  // reescritos para o Blob já criado. Nenhuma transformação de sintaxe.
  const ordem = ${JSON.stringify(ordem)};
  const urls = {};
  for (const nome of ordem) {
    const src = document.querySelector('[data-modulo="' + nome + '"]').textContent
      .replace(/from\\s+'\\.\\/([\\w.-]+\\.js)'/g, (_, dep) => "from '" + urls[dep] + "'");
    urls[nome] = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  }
  await import(urls[${JSON.stringify(ENTRADA)}]);
</script>`;

const miolo = `<title>Herói de Masmorra</title>
<style>
${css}
</style>

${corpo}

${modulos}

${carregador}`;

const saida = ARTEFATO ? miolo : `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
<meta name="theme-color" content="#0d0b12">
<link rel="icon" href="${favicon}">
${miolo.replace('<title>', '<title>')}
</head>
<body>
</body>
</html>`.replace('</head>\n<body>\n</body>', `</head>\n<body>\n</body>`);

// No modo standalone o miolo tem que ficar dentro do body, não do head.
const final = ARTEFATO ? saida : `<!doctype html>
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

${modulos}

${carregador}
</body>
</html>`;

await mkdir(join(RAIZ, 'dist'), { recursive: true });
const arquivo = ARTEFATO ? 'dist/artefato.html' : 'dist/heroi-de-masmorra.html';
await writeFile(join(RAIZ, arquivo), final);

console.log(`  ${arquivo}  —  ${(final.length / 1024).toFixed(0)} KB`);
console.log(`  módulos na ordem: ${ordem.join(' → ')}`);
