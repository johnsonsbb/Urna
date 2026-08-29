// Servidor estático sem dependência, só para desenvolver. Módulos ES precisam
// de http: abrir o index.html por file:// não funciona.
//
//   node tools/serve.mjs [porta]

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PORTA = Number(process.argv[2]) || 5173;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const servidor = createServer(async (req, res) => {
  try {
    let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (caminho.endsWith('/')) caminho += 'index.html';
    // normalize + prefixo: sem isso, ../ sai da pasta do projeto.
    const alvo = join(RAIZ, normalize(caminho).replace(/^(\.\.[/\\])+/, ''));
    if (!alvo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }

    const corpo = await readFile(alvo);
    res.writeHead(200, {
      'content-type': TIPOS[extname(alvo)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(corpo);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('não encontrado');
  }
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n  A porta ${PORTA} já está ocupada (é a padrão do Vite, entre outros).`);
    console.error(`  Escolha outra:  node tools/serve.mjs ${PORTA + 1}\n`);
    process.exit(1);
  }
  throw e;
});

servidor.listen(PORTA, () => {
  console.log(`\n  Herói de Masmorra`);
  console.log(`  http://localhost:${PORTA}`);
  for (const [nome, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) console.log(`  http://${a.address}:${PORTA}   (${nome} — celular na mesma rede)`);
    }
  }
  console.log(`\n  Ctrl+C para parar.\n`);
});
