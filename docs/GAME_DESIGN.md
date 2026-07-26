# Covil — Documento de Design

> **Status:** primeiro esboço, aberto a revisão.
> Tudo marcado com 🔸 é decisão em aberto. Números marcados com *(ajustável)* são chutes iniciais para balanceamento, não verdades.

---

## 1. Pitch

Um **MMORPG idle de navegador** no estilo Tibia. Você monta um grupo de até 3 personagens, equipa, escolhe magias e suprimentos, define a doutrina de combate — e eles caçam sozinhos, em ondas, dentro de arenas fechadas renderizadas como um cliente de Open Tibia.

O combate é **100% automatizado**. Você nunca move ninguém. Sua habilidade está inteiramente na **preparação**: composição do grupo, equipamento, magias, regras de poção e até onde vale a pena empurrar.

E ele progride com o aplicativo fechado. Você volta de manhã e recebe o relatório da noite.

---

## 2. Posicionamento

| Referência | Força | Fraqueza que a gente ataca |
|---|---|---|
| **Minibia** (server global no navegador) | profundidade total do Tibia | exige atenção ativa; não dá pra jogar com uma mão no ônibus |
| **Baiak Idle** | ergonomia idle + visual de OT autêntico | interface de desktop puro; progresso aparentemente atrelado à aba aberta |
| **Stonegy / idles de box** | entra em 5 segundos, joga sozinho | acaba em dois dias — sem economia, sem risco, sem escolha |

**Nossas duas apostas:**

1. **Mobile de verdade.** PWA instalável, uma coluna, alvos de toque grandes, respeitando safe area. É onde nenhum concorrente está.
2. **Offline de verdade.** Fecha o app, progride, volta e recebe o relatório. É arquitetural — não é algo que se copia numa sprint.

---

## 3. Pilares de design

1. **A preparação é o jogo.** Nenhum controle durante o combate. Toda decisão acontece antes.
2. **A parede é a build, não o relógio.** Você nunca progride além do que seu equipamento aguenta, dormindo ou acordado. Melhorar a build é a única forma de avançar.
3. **Ausência nunca é punida.** Sem imposto de "offline rende 50%". O jogo trabalha enquanto você vive sua vida.
4. **Risco é econômico, não pessoal.** Fracassar queima suprimento e gold. Nunca pune o jogador por algo que ele não podia influenciar.
5. **Herança do Tibia onde ela é boa.** Vocações, skills que sobem por uso, stamina, analyzers, economia de loot. Sem o peso de andar por um mapa.
6. **Barato de operar.** Custo de infraestrutura é restrição de design, não detalhe de implementação. Nenhuma mecânica pode exigir CPU contínua por jogador.

---

## 4. Loop de jogo

### 4.1 Loop de sessão (30 segundos a 10 minutos)

```
abre o app
   ↓
RELATÓRIO: "farmou a wave 8 por 6h14. Tentou a wave 9 três vezes, morreu nas três."
   ↓
DIAGNÓSTICO: replay + analyzers → o druida ficou sem mana aos 2 minutos
   ↓
RECONFIGURA: troca a magia de cura, compra mana potion melhor, reequipa o cajado
   ↓
POLÍTICA: deixa em "empurrar" ou volta pro "farm seguro"
   ↓
fecha o app
```

### 4.2 Loop de progressão (dias a semanas)

```
vence waves  →  loot melhor  →  build melhor  →  vence waves mais altas
     ↑                                                      │
     └──── mais gold, mais suprimento, novo slot ◄──────────┘
```

### 4.3 A forma do dia

Três check-ins de 30 segundos quando não há tempo. Uma sessão de 10 minutos à noite para ajustar a build e empurrar. O jogo nunca exige mais que isso.

---

## 5. Combate

### 5.1 Arena

Sala fechada de **15×11 tiles** *(ajustável)*, um andar, renderizada como um cliente de OT: piso, decoração, criaturas com nome e barra de vida, números de dano flutuando, falas de magia, efeitos em área.

Sem mapa aberto, sem streaming, sem escadas, sem múltiplos andares. A arena é o palco inteiro.

### 5.2 Estrutura de onda

- **10 waves + 1 boss** por área
- A trilha de waves fica visível no topo (como no Baiak): quadradinhos preenchidos + ícone de boss no fim
- Vencer a wave 10 e o boss **conclui a área** e libera a próxima
- Áreas no v1: **5** *(ajustável)*

### 5.3 Automação total

A IA controla movimento, alvo, rotação de magias e uso de poção. O jogador **nunca** dá uma ordem durante o combate.

Ainda assim, o posicionamento **importa** — ele é consequência da sua build e da sua doutrina. Um tank com armadura ruim morre e o druida fica cercado. Uma magia em área acerta 5 se as criaturas se aglomerarem.

### 5.4 Doutrina — a agência sobre movimento sem controlar movimento

Configurado antes, executado pela IA:

| Ajuste | Opções |
|---|---|
| **Formação** | quem segura a frente, quem fica atrás |
| **Prioridade de alvo** | mais fraco primeiro / mais forte primeiro / conjuradores primeiro |
| **Distância de engajamento** | por personagem, em tiles (o paladino mantém 3, o druida 4) |
| **Regras de poção** | bebe vida abaixo de X%, mana abaixo de Y% |
| **Rotação de magias** | quais estão equipadas e em que ordem de prioridade |

🔸 *Em aberto:* a doutrina é totalmente livre desde o começo, ou vai destravando com um atributo tipo "Tática" (que o Baiak parece ter)?

---

## 6. O grupo

### 6.1 Slots

**3 slots**, liberados progressivamente:

| Slot | Como libera | Racional |
|---|---|---|
| 1 | início | — |
| 2 | **progressão** — concluir a primeira área | é o slot que ensina grupo e papéis; cobrar aqui trava o aprendizado |
| 3 | gold, valor alto mas alcançável 🔸 | primeira meta econômica de longo prazo |

🔸 O slot 3 pode passar a aceitar moeda premium como atalho. Fica para quando o modelo de monetização for definido — a mecânica não muda, só a forma de pagar.

### 6.2 Vocações e papéis

| Vocação | Papel | Característica |
|---|---|---|
| **Knight** | tank | segura a frente, muita vida e armadura, dano corpo a corpo |
| **Paladin** | dano à distância | mantém distância, dano constante, consome munição |
| **Sorcerer** | dano mágico | dano em área alto, frágil, sedento de mana |
| **Druid** | suporte | cura o grupo, controle, fica atrás |

### 6.3 A escolha: 3 de 4

**São 4 vocações para 3 slots.** Isso é deliberado — significa que compor o grupo é uma decisão real desde o primeiro dia, e que ela continua sendo decisão no endgame.

Cada corte tem um preço concreto:

| Grupo | Ganha | Paga |
|---|---|---|
| sem Knight | mais dano | ninguém segura a frente; o grupo inteiro apanha |
| sem Druid | mais dano | sem cura — depende inteiramente de poção, o que dói no gold |
| sem Sorcerer | mais resistência | sofre contra ondas numerosas, sem dano em área |
| sem Paladin | mais resistência | pouco dano constante; waves longas viram desgaste |

Não existe composição obviamente correta, e a melhor escolha deve variar por área — uma arena de muitas criaturas fracas pede Sorcerer; uma de poucas e fortes, não.

**Isso vira uma meta de longo prazo:** o jogador acaba querendo os 4 personagens desenvolvidos para trocar conforme a área, mesmo levando só 3 por vez. 🔸 *A definir:* personagens no banco ficam "guardados" (dá pra trocar sem custo) ou trocar exige algum custo?

---

## 7. Progressão

### 7.1 Nível e experiência

Curva do TFS, mantida por familiaridade com o gênero:

```
expTotalPara(n) = (50·(n−1)³ − 150·(n−1)² + 400·(n−1)) / 3
```

Dá 100 no nível 2 e 4.200 no nível 8 — idêntico ao Tibia.

### 7.2 Skills

Sobem **por uso**, como no Tibia: cada golpe é uma tentativa, cada ponto de mana gasto conta para magic level. Custo cresce geometricamente com multiplicador por vocação.

| Skill | Como treina |
|---|---|
| Melee | golpes corpo a corpo acertados |
| Distance | golpes à distância acertados |
| Magic | mana gasta |
| Shielding | golpes bloqueados/recebidos |

### 7.3 Equipamento

8 slots por personagem: elmo, amuleto, arma, escudo, armadura, anel, pernas, botas.

Raridades: **comum · incomum · raro · épico · lendário**.

🔸 *Em aberto:* existe refino/upgrade de item, ou o progresso é só encontrar peça melhor?

---

## 8. Offline

### 8.1 Regra central

**Tudo roda offline, inclusive waves novas e boss.** Nada exige presença.

O que limita é a build e a stamina — nunca a sua atenção.

### 8.2 Política: a decisão que você toma antes de fechar o app

| Modo | Comportamento | Custo |
|---|---|---|
| **Farmar seguro** | refaz o covil do início até a última wave vencida, em ciclo | nenhum — ganho estável |
| **Empurrar** | mesmo ciclo, mais **uma** wave além da fronteira | queima suprimento; pode morrer e recuar |

> **Por que o ciclo, e não repetir a wave mais difícil.** Repetir só a última
> vencida coloca o grupo na wave em que ele mal sobrevive, a noite inteira,
> sem ninguém olhando — e ele morre em loop. Refazer o covil do início mistura
> waves fáceis com difíceis, é auto-corretivo e é o que o jogador espera de um
> botão de "loop". O preço é que farmar a mesma arena satura: o ganho por hora
> para de crescer com o nível, o que empurra para a arena seguinte. Isso é
> intencional.

Depois de **três derrotas seguidas sem progresso**, o grupo desiste de empurrar
e volta ao ciclo seguro pelo resto do período — em vez de torrar o estoque de
poção contra uma parede que a build atual não vence.

### 8.3 Stamina

Teto do tempo produtivo por dia, herdado do Tibia:

- Máximo: **42 h** *(ajustável)*
- Gasta 1 min por minuto caçando
- Abaixo de 14 h: ganho de experiência reduzido pela metade
- Em 0: sem experiência (loot continua) 🔸
- Regenera enquanto o grupo está parado

### 8.4 Relatório de retorno

A tela mais importante do jogo. Merece ser a mais bem feita.

```
Você esteve fora por 6h14.

  341 criaturas abatidas          +2 níveis (Johnsons)
  wave 8 repetida 27 vezes        +1 nível (John ED)
  4.290.232 gold/hora

  Wave 9 tentada 3 vezes — derrota nas três
  → o druida ficou sem mana aos 2min

  ACHADOS:  Escudo Rúnico (raro)  ·  Elmo de Aço  ·  ×47 pérolas

  [ Ver replay ]   [ Ajustar build ]
```

### 8.5 Replay

Como a simulação é determinística e semeada, o servidor guarda apenas **a semente e o snapshot inicial** — e o cliente reconstrói a noite inteira quadro a quadro.

Você assiste a tentativa fracassada da wave 9 acelerada em 30 segundos, e vê o momento exato em que a build quebrou. Ninguém no gênero faz isso.

---

## 9. Risco e morte

O grupo derrotado numa tentativa de wave:

- perde os **suprimentos consumidos** na tentativa
- **recua para o farm seguro** e perde o tempo restante que estava empurrando

**Sem perda de experiência acumulada no v1.** Racional: punir progressão por uma decisão que a IA tomou, sem o jogador poder intervir, é frustrante em vez de tenso. O risco vive na economia — que o jogador **controla**, decidindo quanto suprimento levar e se empurra ou não.

🔸 *Em aberto:* se o jogo se provar seguro demais, entra perda de experiência com "bênção" comprável (estilo Tibia) como mitigação.

---

## 10. Economia

### 10.1 Fluxo

```
loot das criaturas ──► Loot Pouch ──► venda ao NPC ──► gold
                                                        │
                            ┌───────────────────────────┤
                            ▼                           ▼
                       suprimentos                 equipamento
                    (poções, munição)              (loja e loot)
```

### 10.2 Moedas

| Moeda | Origem | Gasto |
|---|---|---|
| **Gold** | loot e venda | suprimento, equipamento, slot 3 e 4 |
| **Moeda premium** 🔸 | compra | atalhos cosméticos e de conveniência |

### 10.3 Suprimentos

Poções de vida e mana, munição do paladino. **Consumo real durante a caçada** — é isso que dá peso à decisão de empurrar, e é o principal dreno de gold do jogo.

### 10.4 Monetização

🔸 *Em aberto.* Princípio que eu defenderia: **nada que compre progressão direta**. Slots, conveniência, cosmético, espaço de bolsa. O momento de decidir isso é antes do lançamento, não agora.

---

## 11. Interface

### 11.1 Mobile-first

O Baiak é desktop de três colunas com fonte de 11px. A gente faz o contrário: **uma coluna, navegação inferior, painéis em bottom sheet.**

| Aba | Conteúdo |
|---|---|
| **Arena** | o viewport, trilha de waves, política seguro/empurrar, log |
| **Grupo** | os 3 ativos e os guardados, atributos, skills, doutrina |
| **Mochila** | equipamento, inventário, loot pouch, suprimentos |
| **Loja** | compra de suprimento e equipamento, venda de loot |
| **Ranking** | classificação global |

Cinco abas — o limite recomendado para navegação inferior.

Em telas ≥1024px vira layout de três colunas, aí sim aproveitando o espaço como o Baiak faz.

### 11.2 Regras de qualidade não-negociáveis

- Alvos de toque ≥44px, com 8px de respiro
- `env(safe-area-inset-*)` respeitado — nada embaixo da barra de gestos
- `min-height: 100dvh`, nunca `100vh`
- Animações em `transform`/`opacity` apenas, 150–300ms
- `prefers-reduced-motion` respeitado
- Números com fonte tabular (não dançam ao atualizar)
- Contraste ≥4.5:1 — tema escuro, testado de verdade
- Ícones em SVG, nunca emoji

### 11.3 PWA

- Instalável na tela de início do iOS e do Android
- `display: standalone`, ícones maskable, apple-touch-icon
- Service worker com shell offline: **abre e mostra o último estado conhecido mesmo sem rede**
- 🔸 Notificação push quando a stamina enche ou o grupo trava numa wave

### 11.4 Sem muro de login

Abriu o link, está caçando em 3 segundos, personagem local. Cadastra quando quiser salvar ou entrar no ranking. Jogo de navegador que pede e-mail antes de mostrar o jogo perde a maior parte de quem clicou.

---

## 12. Arquitetura

### 12.1 Princípio

**Uma única engine determinística**, compartilhada entre cliente e servidor:

- **No servidor**: autoritativa. Recalcula o progresso a partir do último snapshot e do relógio dele. O cliente nunca informa quanto ganhou.
- **No cliente**: previsão. Mesma semente, mesmo resultado, 60fps na tela. A cada sincronização o estado do servidor manda.

É isso que permite offline real, replay e anticheat pelo mesmo mecanismo.

### 12.2 Monorepo

```
packages/core     engine determinística, tipos, fórmulas, dados de jogo
apps/server       Fastify + SQLite + JWT + WebSocket
apps/web          Vite + React + TypeScript + canvas + PWA
```

### 12.3 Por que não forkar o TFS

O TFS entregaria mapa, IA e magias de graça. Mas ele simula **em tempo real, com o jogador presente** — não sabe comprimir 8 horas de arena em 50ms. O progresso offline, que é a nossa aposta principal, é justamente o que ele não faz e não pode passar a fazer.

O que **aproveitamos** do ecossistema OT: fórmulas, tabelas de stats e loot, matrizes de área de magia, flags de IA de monstro — tudo importável por script.

### 12.4 Renderização

**Canvas 2D com atlas de sprites.** Ordenação por linha (y-sort), interpolação de caminhada tile a tile, efeitos por sprite sheet. Canvas 2D dá conta de uma sala desse tamanho com folga e é mais leve no celular que WebGL. PixiJS fica como plano B.

### 12.5 Risco técnico conhecido — custo do catch-up

Simular 12 h a 100ms/tick = 432.000 ticks × ~10 entidades com pathfinding. Em JavaScript isso pode custar **1 a 2 segundos de CPU por login**, o que não escala com muitos jogadores.

**Mitigação planejada:** fidelidade adaptativa. As tentativas de wave nova rodam em simulação completa (são poucas e é o que o jogador quer ver no replay); o farm seguro repetitivo roda em modelo comprimido — simula K ciclos representativos e extrapola, mantendo o determinismo pela semente.

Isso precisa ser medido cedo. **É o maior risco de engenharia do projeto.**

### 12.6 Custo operacional

Custo de infra é restrição de design (pilar 6), então vale explicitar de onde ele vem — e o desenho aqui é excepcionalmente favorável:

**O servidor não gasta CPU com jogador offline.** Um MMO tradicional paga processamento por jogador *conectado*, continuamente. Aqui o progresso é calculado sob demanda, no login. Pagamos por **login**, não por hora de jogo. Um jogador que caça 8 horas por dia custa alguns milissegundos de CPU — os mesmos milissegundos de quem caçou 20 minutos.

Isso não é otimização, é consequência direta da simulação determinística. E é o que separa este projeto de qualquer coisa construída sobre um servidor de OT.

| Componente | Escolha | Custo |
|---|---|---|
| Front-end | estático, build do Vite | **R$ 0** — CDN gratuita (Cloudflare Pages, Netlify) |
| Renderização | roda no cliente | **R$ 0** de servidor |
| Banco | SQLite, arquivo único | **R$ 0** de banco gerenciado |
| Servidor | 1 VPS pequeno | ~R$ 30–80/mês |
| WebSocket | só enquanto alguém assiste, e é opcional | desprezível |
| Armazenamento | ~10 KB de snapshot por personagem | 100 mil personagens ≈ 1 GB |
| Domínio | — | ~R$ 40/ano |

**O que deliberadamente não fazemos**, porque cada um desses custa caro e nenhum melhora a jogabilidade:

- tick de mundo persistente rodando 24/7
- processo ou thread por jogador
- sincronização em tempo real entre jogadores
- qualquer coisa transmitida como vídeo ou estado pesado do servidor
- banco gerenciado com réplica antes de existir demanda para isso

**Alavancas quando crescer**, em ordem de uso: orçamento de CPU por catch-up (fidelidade adaptativa), fila para picos de login simultâneo, e só então mais máquinas — particionando por personagem, que é trivial porque não há mundo compartilhado.

**Onde o custo pode escapar:** o catch-up (§12.5), e o dia em que entrar market entre jogadores — o único sistema planejado que exige estado realmente compartilhado. Vale lembrar disso quando ele for priorizado.

---

## 13. Assets e licenciamento

| Fonte | Licença | Uso |
|---|---|---|
| **OpenTibia Sprite Pack** (peonso) | CC BY 4.0 | base visual — exige crédito no repositório |
| **OpenGameArt / CC0** | CC0 | complementos |
| `Tibia.spr` / `Tibia.dat` | **proprietário da CipSoft** | ❌ **nunca** |

Fórmulas e mecânicas não são protegidas por copyright — podem ser portadas. **Nomes** (monstros, lugares, magias) são marca: entidades importadas de distros OT são **renomeadas**.

Um `ASSETS.md` mantém o crédito de cada peça, como a CC BY exige.

### 13.1 O nome

**Covil.** Curto, sem acento, fácil de digitar e de falar, inequivocamente sombrio — e literal: cada área *é* um covil que você limpa, onda por onda, até o boss.

O repositório ainda se chama `Urna` (herdado, e em português a palavra remete mais a urna eletrônica que a funerária). Renomear no GitHub é um clique nas configurações, quando você quiser.

🔸 Alternativas, caso não agrade: **Ermo** (o ermo, terra desolada — 4 letras) ou **Vigília** (o grupo mantém a vigília enquanto você dorme — combina com o idle, mas tem acento).

---

## 14. Escopo

### v1 — o mínimo que já é divertido

- Conta, login, grupo de até 3 (slots 1 e 2 acessíveis; o 3º por gold)
- 5 áreas × (10 waves + boss)
- Combate automatizado em grid com doutrina configurável
- Equipamento, inventário, loot pouch, suprimentos
- Loja NPC (compra e venda)
- Offline total com relatório de retorno
- Replay da sessão offline
- Ranking global
- PWA instalável

### Depois

Market entre jogadores · guildas e chat · arena PvP assíncrona · mais vocações que slots · eventos temporais · notificação push · prestígio

---

## 15. Riscos do projeto

| Risco | Gravidade | Mitigação |
|---|---|---|
| Custo de CPU do catch-up offline | **alta** | fidelidade adaptativa; medir na primeira semana |
| Automação total deixar o jogo sem graça | **alta** | a parede da build + diagnóstico via replay são a gameplay; validar cedo com gente de verdade |
| Balanceamento de 5 áreas × 11 encontros | média | importar curvas de distros OT em vez de inventar do zero |
| Volume de arte | média | pack CC BY + arena precisa de bem menos sprite que um MMO |
| Nome/IP | baixa | fantasia própria, sprites licenciados, entidades renomeadas |

Sobre o primeiro: mesmo no pior caso medido (2 s de CPU por login), 10 mil logins diários somam ~5,5 horas de CPU por dia — cerca de 23% de um núcleo. O problema real não é o volume, é o **pico de logins simultâneos**, que se resolve com fila. Ainda assim é o item a medir antes de qualquer outra coisa, porque ele valida a aposta central do projeto.

---

## 16. Decisões em aberto

| # | Questão | Quando precisa ser resolvida |
|---|---|---|
| 1 | Doutrina livre desde o início ou destravada por atributo de "Tática"? | antes da engine de combate |
| 2 | Trocar personagem guardado por ativo tem custo? | antes da tela de grupo |
| 3 | Existe refino/upgrade de equipamento? | antes da economia |
| 4 | Stamina em 0 zera só a experiência ou também o loot? | no balanceamento |
| 5 | Modelo de monetização | antes do lançamento |
| 6 | Notificação push no v1? | antes do PWA final |

Nenhuma delas bloqueia o próximo passo (§17).

---

## 18. Registro de decisões

| Decisão | Escolha | Por quê |
|---|---|---|
| Offline vs AFK | **offline total**, inclusive boss | exigir presença sem dar controle é tarefa, não jogo |
| Controle em combate | **nenhum** | a agência vive na preparação e na doutrina |
| O que trava o progresso | **a build** | dá propósito a equipar, e nunca pune ausência |
| Custo do fracasso | **suprimento**, não experiência | punir progressão por decisão da IA é frustrante |
| Slots × vocações | **3 slots, 4 vocações** | compor o grupo vira decisão real e permanente |
| Servidor | **próprio**, não fork de TFS | TFS não comprime tempo; offline é a aposta central |
| Posição no grid | **simulada**, não cosmética | a referência mostra área de magia e aglomeração importando |
| Banco | **SQLite** | sem custo de banco gerenciado; troca para Postgres é contida |
| Renderização | **canvas 2D** | leve no celular; WebGL é plano B |

---

## 17. Próximo passo proposto

Construir a **arena como peça isolada e jogável** — grid, grupo caminhando, atacando, soltando magia em área com efeitos, rodando com dados falsos. Sem backend, sem depender de nenhuma decisão ainda aberta.

Você abre no celular, olha, e diz se é isso que estava na sua cabeça. Se for, ela vira o coração do jogo. Se não for, perdemos uma semana e não o projeto.
