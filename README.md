# CashFlow

PWA pessoal de previsão financeira. Mostra quais contas caem em quais dias da
semana e quanto sobra no fim do período. Um usuário só, sem login, sem backend,
sem conexão com banco. Os dados ficam no IndexedDB do próprio aparelho, com
exportar e importar backup em JSON.

Alvo principal: iPhone, instalado na tela inicial via Safari.

O escopo completo está em [`docs/escopo.md`](docs/escopo.md).

## Estado atual

**Fase 1 (núcleo) — pronta.** Setup do Vite, tokens de cor e tipografia,
schema do Dexie e o módulo de recorrência com testes. Ainda sem interface.

| Fase | O que é | Estado |
|---|---|---|
| 1 | Núcleo: tokens, schema, recorrência | pronta |
| 2 | A semana: régua, lista do dia, navegação | a fazer |
| 3 | Cadastros: CRUD de recorrentes, gasto avulso | a fazer |
| 4 | Painel: períodos, totais, categorias | a fazer |
| 5 | PWA e backup | a fazer |

## Rodar

```sh
pnpm install
pnpm dev        # servidor de desenvolvimento
pnpm test       # testes do módulo de recorrência
pnpm typecheck  # tsc --noEmit
pnpm build      # build de produção
```

## Como o projeto está montado

```
src/core/       módulo puro: sem React, sem banco
  types.ts        modelo de dados
  dates.ts        ponte ISO <-> Date, sempre em horário local
  recurrence.ts   expansão de ocorrências a partir das regras
  money.ts        formatação de centavos em AUD
  categories.ts   lista fixa de categorias
src/db/         Dexie: três tabelas mais o registro de settings
src/styles.css  tokens do Tailwind v4 no bloco @theme e os @font-face
public/fonts/   .woff2 auto-hospedados
```

Três regras que valem para o código inteiro:

1. **Dinheiro é inteiro em centavos.** Nunca float. A divisão por 100 acontece
   só em `formatMoney`, na borda de exibição.
2. **Data de calendário é string ISO `YYYY-MM-DD`**, sem timezone. `Date` só
   aparece dentro de `core/dates.ts` e `core/recurrence.ts`, sempre em horário
   local — `toISOString()` é proibido, converte para UTC e erra o dia.
3. **Ocorrências não são armazenadas.** São calculadas a partir das regras a
   cada consulta. O banco guarda só as exceções, na tabela `overrides`.

## Fontes

Archivo, IBM Plex Sans e IBM Plex Mono, baixadas do Google Fonts sob a licença
OFL e versionadas em `public/fonts` como `.woff2`. Sem CDN: o app tem que abrir
sem internet. Archivo entra pelo eixo variável `wdth` em 112, via a utilidade
`type-display`; todo número monetário usa Plex Mono com `tabular-nums`, via a
utilidade `type-num`.
