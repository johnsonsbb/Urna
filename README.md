# Covil

MMORPG **idle** de navegador no estilo Tibia. Você monta um grupo de até 3 personagens — escolhidos entre 4 vocações —, equipa, escolhe magias e define a doutrina de combate. Eles caçam sozinhos, em ondas, dentro de arenas renderizadas como um cliente de Open Tibia.

O combate é 100% automatizado: você nunca move ninguém. A habilidade está toda na preparação. E o jogo progride **com o aplicativo fechado** — você volta e recebe o relatório da noite, com replay do que aconteceu.

> 📄 **[Documento de design](docs/GAME_DESIGN.md)** — leia antes de mexer em qualquer coisa. O design ainda está em revisão.

## Estado atual

🚧 **Pré-implementação.** O design está sendo fechado; o código do jogo ainda não começou.

O que existe: workspace do monorepo, tipos do domínio e o RNG determinístico.

> O repositório ainda se chama `Urna` por herança — o jogo é **Covil**.

## Arquitetura pretendida

```
packages/core     engine determinística — tipos, fórmulas, dados, simulação
apps/server       Fastify + SQLite + JWT + WebSocket (autoritativo)
apps/web          Vite + React + TypeScript + canvas 2D + PWA
```

A mesma engine roda nos dois lados: **autoritativa no servidor** (recalcula o progresso pelo relógio dele) e **preditiva no cliente** (mesma semente, mesmo resultado, 60fps). É isso que viabiliza progresso offline, replay da sessão e verificação anticheat pelo mesmo mecanismo.

Também é o que torna o projeto barato de operar: **o servidor não gasta CPU com jogador offline.** O progresso é calculado sob demanda, no login — paga-se por login, não por hora de jogo.

## Requisitos

- Node.js ≥ 22.5 (usa o `node:sqlite` nativo)
- pnpm 10

## Começando

```bash
pnpm install
cp .env.example .env    # ajuste JWT_SECRET antes de qualquer coisa
pnpm dev
```

## Licenças e assets

Código sob [MIT](LICENSE) 🔸.

O projeto **não usa** arquivos do cliente oficial do Tibia (`Tibia.spr` / `Tibia.dat`) — são propriedade da CipSoft. A base visual vem do [OpenTibia Sprite Pack](https://github.com/peonso/opentibia_sprite_pack) (CC BY 4.0) e de acervos CC0, com os créditos mantidos em `ASSETS.md`.

Fórmulas e mecânicas portadas do ecossistema Open Tibia não são protegidas por copyright; nomes de monstros, lugares e magias são marca registrada e portanto **renomeados**.

Este projeto não é afiliado à CipSoft GmbH.
