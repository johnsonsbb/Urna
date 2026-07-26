# Covil

MMORPG **idle** de navegador no estilo Tibia. Você monta um grupo de até 3 personagens — escolhidos entre 4 vocações —, equipa, escolhe magias e define a doutrina de combate. Eles caçam sozinhos, em ondas, dentro de arenas renderizadas como um cliente de Open Tibia.

O combate é 100% automatizado: você nunca move ninguém. A habilidade está toda na preparação. E o jogo progride **com o aplicativo fechado** — você volta e recebe o relatório da noite, com replay do que aconteceu.

> 📄 **[Documento de design](docs/GAME_DESIGN.md)** — leia antes de mexer em qualquer coisa. O design ainda está em revisão.

## Estado atual

🚧 **Arena jogável + backend autoritativo com progresso offline.**

**Funciona:** as 11 ondas do Covil Raso e o boss, movimento em grid, magias com
matriz de área, poções, morte e recomposição. Contas, login, persistência e —
o principal — **progresso offline de verdade**: o servidor reconstrói o que
aconteceu enquanto o app esteve fechado e devolve o relatório.

**Ainda não existe:** equipamento, loja na interface, ranking na interface, e a
ligação do PWA com a API (o cliente ainda roda a simulação local).

> Os sprites são placeholders desenhados em código. A arte final vem do
> [OpenTibia Sprite Pack](https://github.com/peonso/opentibia_sprite_pack)
> (CC BY 4.0), via atlas.

> O repositório ainda se chama `Urna` por herança — o jogo é **Covil**.

## Arquitetura

```
packages/core     engine determinística — tipos, fórmulas, dados, simulação, catch-up
apps/web          Vite + React + TypeScript + canvas 2D + PWA
apps/server       Fastify + SQLite (node:sqlite) + JWT
```

A mesma engine roda nos dois lados: **autoritativa no servidor** (recalcula o progresso pelo relógio dele) e **preditiva no cliente** (mesma semente, mesmo resultado, 60fps). É isso que viabiliza progresso offline, replay da sessão e verificação anticheat pelo mesmo mecanismo.

Também é o que torna o projeto barato de operar: **o servidor não gasta CPU com jogador offline.** O progresso é calculado sob demanda, no login — paga-se por login, não por hora de jogo.

## Requisitos

- Node.js ≥ 22.5 (usa o `node:sqlite` nativo)
- pnpm 10

## Começando

```bash
pnpm install
cp .env.example .env    # ajuste o JWT_SECRET antes de qualquer coisa
pnpm dev                # servidor em :3333, PWA em :5173
```

Outros comandos:

```bash
pnpm test               # engine (determinismo, offline, custo de CPU) + fumaça do servidor
pnpm typecheck
pnpm build
pnpm icons              # regenera os ícones do PWA (procedurais, sem dependências)
```

### API

| Rota | O que faz |
|---|---|
| `POST /api/auth/register` | cria conta e grupo |
| `POST /api/auth/login` | autentica e já devolve o relatório do tempo fora |
| `GET /api/game/state` | **aplica o catch-up** e devolve estado + relatório |
| `POST /api/game/command` | política, doutrina, troca de arena, compra de poções |
| `GET /api/ranking` | classificação global |
| `GET /api/arenas` | covis disponíveis |

Toda leitura de estado aplica o tempo decorrido antes de responder. O cliente
nunca informa quanto ganhou — ele pergunta que horas são, e o servidor conta o
que aconteceu.

## Licenças e assets

Código sob [MIT](LICENSE) 🔸.

O projeto **não usa** arquivos do cliente oficial do Tibia (`Tibia.spr` / `Tibia.dat`) — são propriedade da CipSoft. A base visual vem do [OpenTibia Sprite Pack](https://github.com/peonso/opentibia_sprite_pack) (CC BY 4.0) e de acervos CC0, com os créditos mantidos em `ASSETS.md`.

Fórmulas e mecânicas portadas do ecossistema Open Tibia não são protegidas por copyright; nomes de monstros, lugares e magias são marca registrada e portanto **renomeados**.

Este projeto não é afiliado à CipSoft GmbH.
