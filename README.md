# Covil

MMORPG **idle** de navegador no estilo Tibia. Você monta um grupo de até 3 personagens — escolhidos entre 4 vocações —, equipa, escolhe magias e define a doutrina de combate. Eles caçam sozinhos, em ondas, dentro de arenas renderizadas como um cliente de Open Tibia.

O combate é 100% automatizado: você nunca move ninguém. A habilidade está toda na preparação. E o jogo progride **com o aplicativo fechado** — você volta e recebe o relatório da noite, com replay do que aconteceu.

> 📄 **[Documento de design](docs/GAME_DESIGN.md)** — leia antes de mexer em qualquer coisa. O design ainda está em revisão.

## Estado atual

🚧 **Protótipo da arena — jogável, sem backend.**

Roda de ponta a ponta: as 11 ondas do Covil Raso, o boss, movimento em grid,
magias com matriz de área, poções, morte e recomposição do grupo. A doutrina é
editável com a arena rodando, e vale no mesmo instante.

O que ainda **não** existe: contas, persistência, progresso offline, economia,
equipamento. O protótipo serve para validar o combate e o enquadramento em
tela antes de investir no resto.

> Os sprites são placeholders desenhados em código. A arte final vem do
> [OpenTibia Sprite Pack](https://github.com/peonso/opentibia_sprite_pack)
> (CC BY 4.0), via atlas.

> O repositório ainda se chama `Urna` por herança — o jogo é **Covil**.

## Arquitetura

```
packages/core     engine determinística — tipos, fórmulas, dados, simulação
apps/web          Vite + React + TypeScript + canvas 2D + PWA
apps/server       Fastify + SQLite + JWT + WebSocket  (ainda não escrito)
```

A mesma engine roda nos dois lados: **autoritativa no servidor** (recalcula o progresso pelo relógio dele) e **preditiva no cliente** (mesma semente, mesmo resultado, 60fps). É isso que viabiliza progresso offline, replay da sessão e verificação anticheat pelo mesmo mecanismo.

Também é o que torna o projeto barato de operar: **o servidor não gasta CPU com jogador offline.** O progresso é calculado sob demanda, no login — paga-se por login, não por hora de jogo.

## Requisitos

- Node.js ≥ 22.5 (usa o `node:sqlite` nativo)
- pnpm 10

## Começando

```bash
pnpm install
pnpm dev:web            # abre em http://localhost:5173
```

Outros comandos:

```bash
pnpm test               # testes do engine, incluindo determinismo e custo de CPU
pnpm typecheck
pnpm build
pnpm icons              # regenera os ícones do PWA (procedurais, sem dependências)
```

Quando o servidor existir, `cp .env.example .env` e ajuste o `JWT_SECRET` antes
de qualquer coisa.

## Licenças e assets

Código sob [MIT](LICENSE) 🔸.

O projeto **não usa** arquivos do cliente oficial do Tibia (`Tibia.spr` / `Tibia.dat`) — são propriedade da CipSoft. A base visual vem do [OpenTibia Sprite Pack](https://github.com/peonso/opentibia_sprite_pack) (CC BY 4.0) e de acervos CC0, com os créditos mantidos em `ASSETS.md`.

Fórmulas e mecânicas portadas do ecossistema Open Tibia não são protegidas por copyright; nomes de monstros, lugares e magias são marca registrada e portanto **renomeados**.

Este projeto não é afiliado à CipSoft GmbH.
