# Herói de Masmorra

Um herói caminha sozinho por uma sala retangular matando inimigos que nascem em
posições aleatórias, enche a mochila, volta ao baú para depositar, e o ouro
compra melhorias que tornam esse ciclo mais rápido.

**Você não controla o herói.** Compra upgrades e assiste.

JavaScript puro com módulos ES, canvas 2D para o campo, HTML e CSS para o
painel. Sem framework, sem bundler, sem engine, sem dependência externa.

## Rodar

```bash
node tools/serve.mjs        # http://localhost:5173
```

Precisa de servidor: módulos ES não carregam por `file://`. Node 20 ou mais
novo, e nada além disso — o projeto não tem dependências.

## Estado

Fases 1 a 4 do plano, prontas: balanceamento validado sem tela, campo em canvas,
economia com compra em lote e save, andares, prestígio e ganho offline.

Fase 5 (servidor autoritativo, conta, ranking) e fase 6 (arte, som, Capacitor)
não foram começadas.

## Ferramentas

```bash
npm test          # 17 testes: pureza, determinismo, as três armadilhas, economia
npm run sim 24    # simula 24h de jogo e mede a curva
npm run sweep 24  # compara variantes de balanceamento lado a lado
npm run verify    # confere a fórmula analítica contra a simulação de tick
```

## Arquitetura

```
index.html  manifest.json  sw.js  icon.svg
src/   balance.js  game.js  render.js  ui.js  save.js  main.js
css/   style.css
tools/ simulate.mjs  sweep.mjs  verify.mjs  serve.mjs  sim-core.mjs  *.test.mjs
```

**A regra que não pode ser quebrada:** `balance.js` e `game.js` não referenciam
`document`, `window`, `canvas` nem `localStorage`. Recebem e devolvem dados
puros, e o estado é serializável em JSON sem perda.

O motivo é a fase 5: essa mesma lógica vai rodar no servidor para validar
progresso e barrar cheat. Com DOM dentro dela isso é impossível.
`tools/purity.test.mjs` falha se alguém quebrar a regra.

| arquivo | responsabilidade |
|---|---|
| `balance.js` | constantes e fórmulas. Todo número mora no objeto `TUNING` |
| `game.js` | estado do mundo e o tick, passo fixo de 0,05s, rng determinístico |
| `render.js` | desenha o estado no canvas. Sem estado próprio |
| `ui.js` | painel, atualizado 4×/s — não a cada frame |
| `save.js` | persistência atrás de `salvar`/`carregar`, para virar rede depois |
| `main.js` | acumulador de passo fixo, teto de 20 ticks por frame |

## O que a medição mudou nos números do plano

O plano definia a fase 1 como pronta quando a taxa de ouro dobrasse em ritmo
estável, entre 5 e 15 minutos por dobro, sem explodir. Com os números como
estavam escritos isso não acontecia: **52% dos dobros vinham em menos de um
minuto e só 14% caíam na janela**, alternando paredes de horas com rajadas de
dez dobros em seis segundos.

A causa é estrutural. Tocha (teto 25) e Isca (piso de 0,15s) impunham um teto
duro de produção de ~29 inimigos/s. Batido esse teto, mais Lâmina não faz
literalmente nada — a taxa fica plana, o ouro empilha sem ter no que ser gasto,
e é despejado de uma vez quando o andar novo multiplica a vida por 3,5 e torna a
Lâmina útil de novo. Daí a alternância parede/rajada.

Cinco números mudaram:

| | plano | aqui | por quê |
|---|---|---|---|
| valor do inimigo | ×6 por andar | ×4 | ×6 contra vida ×3,5 fazia o andar novo destravar uma cascata de compras |
| isca | ×0,92 | ×0,95 | 1/0,92 = 1,087 é perto demais do fator de custo 1,10 (armadilha 1) |
| piso da isca | 0,15s | 0,02s | era metade do teto de produção que congelava a taxa |
| teto da tocha | 25 | 100 | a outra metade — sem isso não sobra nada para comprar |
| custo para descer | ×11 | ×8 | ver abaixo |

O plano justificava o ×11 dizendo que o custo para descer tem que crescer mais
rápido que o valor do inimigo (×6). Mas a **taxa** não cresce ×6 por andar, e
sim ×6/3,5 = ×1,71, porque a vida do inimigo já come quase todo o ganho. A folga
real era de ×6,4 por andar, não de ×1,8 — e é por isso que cada parede ficava
seis vezes mais longa que a anterior.

Depois do ajuste, em 24h e 72h de jogo simulado: mediana de **8,5 minutos por
dobro**, nenhuma rajada, curva convergente. `npm run sim` reproduz.

Duas observações que ficaram como estão, de propósito:

- **A fórmula analítica erra até 24% para menos** contra a simulação de tick, no
  regime limitado por heróis (`npm run verify`). Como é ela que paga o offline,
  o erro é conservador: quem joga ativamente rende igual ou mais. Os fatores de
  tática do plano superestimam a caminhada real.
- **A janela de 5 a 15 minutos por dobro é impossível de manter para sempre.**
  Ela exigiria ganho multiplicativo igual ao fator de custo, que é exatamente o
  que a armadilha 1 do plano proíbe. O critério vale para as primeiras horas; o
  tempo por dobro cresce depois, e é isso que dá razão ao prestígio.

## Interface

Portrait fixo, campo em cima e painel embaixo, tudo alcançável com o polegar.
Área de toque mínima de 44px, seletor de 1 / 10 / Máx, canvas com
`devicePixelRatio`, números sempre formatados. Uma linha sob o campo diz qual
lado está travando a taxa — heróis ou spawn —, que é o que transforma a fórmula
em conselho.

Formas geométricas de propósito: círculos para inimigos, quadrados para heróis e
baú, barras de vida e de carga. O raio de alcance é desenhado, e no nível 4 da
Tática as faixas de cada herói aparecem no piso. Arte é fase 6.

## PWA

Manifest em `standalone` e `portrait`, service worker cache-first — o jogo abre
em modo avião. CSS desliga seleção de texto, bounce de scroll e destaque de
toque, para não parecer um site aberto no navegador.
