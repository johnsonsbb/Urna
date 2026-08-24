# Escopo do Projeto: App Pessoal de Previsão Financeira

**Nome:** CashFlow
**Versão do documento:** 1.0
**Autor:** Luiz
**Destino:** implementação via Claude Code

---

## 1. Resumo em uma frase

Um PWA de uso pessoal que mostra, de forma imediata, quais contas caem em quais dias da semana e quanto sobra no fim do período, sem nenhuma conexão com banco.

## 2. Princípios do produto

1. **Previsão, não contabilidade.** O app não controla saldo bancário, não concilia extrato, não conecta com banco. Ele responde uma pergunta só: "o que vai sair e entrar, e quando".
2. **A semana é a unidade principal.** Tudo gira em torno dela. Mês e quinzena são visões secundárias.
3. **Zero atrito.** Registrar um gasto avulso tem que levar menos de 10 segundos. Contas recorrentes se pagam sozinhas, sem exigir manutenção.
4. **Tom informativo e administrativo.** O app informa o que vai cair e quando. Não alerta, não julga gasto, não dá conselho, não usa cor de perigo para chamar atenção. É um painel de consulta, não um vigia.
5. **Um usuário só.** Sem login, sem cadastro, sem multiusuário, sem permissões.

## 3. O que está fora do escopo

Deixe explícito, não implemente nada disso:

- Integração com bancos, Open Banking, importação de OFX ou CSV de extrato
- Autenticação, contas de usuário, backend, servidor
- Saldo bancário, conciliação, investimentos
- Múltiplas moedas
- Notificações push
- Compartilhamento entre usuários

---

## 4. Stack técnica

Todas as escolhas abaixo foram verificadas em agosto de 2026.

| Camada | Escolha | Versão | Motivo |
|---|---|---|---|
| Build | Vite + React + TypeScript | Vite 8.x | Padrão atual, PWA bem suportado |
| Estilo | Tailwind CSS v4 via `@tailwindcss/vite` | 4.x | Config em CSS, sem PostCSS |
| Dados | IndexedDB via **Dexie.js** | 4.4.x | Três tabelas com índices, transações, migração de schema |
| Reatividade | **dexie-react-hooks** (`useLiveQuery`) | acompanha o Dexie | A tela reage ao banco sozinha |
| Datas | **date-fns** | 4.x (não v5) | Recorrência precisa de aritmética de data confiável |
| PWA | **vite-plugin-pwa** (Workbox) | 1.3.x | Gera manifest e service worker |
| Ícones | **@vite-pwa/assets-generator** | 1.x | Gera todos os tamanhos a partir de uma imagem só |
| Gráficos | SVG na mão, sem biblioteca | - | São 2 gráficos simples, biblioteca é peso morto |
| Testes | **Vitest** | 4.x | O 3.x só aceita Vite 7, e a tabela fixa Vite 8 |
| Fontes | `.woff2` auto-hospedados em `public/fonts` | - | O app tem que abrir offline, CDN não serve |

**Sem gerenciador de estado.** O `useLiveQuery` do Dexie faz o componente reagir a mudanças no IndexedDB automaticamente. Não instale Redux, Zustand, React Query nem monte Context para dados. Estado local de formulário com `useState` e pronto.

**Por que date-fns e não o Temporal nativo.** O Temporal virou padrão oficial em 2026 e já está no Chrome e no Firefox, mas **o Safari ainda não tem em versão estável**. Como o alvo é iPhone, usar Temporal exigiria polyfill, o que anula a vantagem de não ter dependência. Reavaliar quando o Safari lançar.

**Fixar em date-fns v4.** A v5 está em alpha e remove coisas. Não use.

---

## 5. Modelo de dados

Tudo em IndexedDB. Três tabelas.

### 5.1 `recurrings` (recorrentes: débitos e ganhos)

```ts
type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
type Flow = 'out' | 'in'; // saída ou entrada

interface Recurring {
  id: string;              // uuid
  name: string;            // "Aluguel", "Salário", "Netflix"
  flow: Flow;
  amount: number;          // em centavos, sempre inteiro (AUD)
  isVariable: boolean;     // true = valor é só estimativa, varia todo mês
  categoryId: string;
  frequency: Frequency;

  // regra de data, preencher conforme a frequency:
  dayOfWeek?: number;      // 0=domingo..6=sábado  -> weekly
  anchorDate?: string;     // ISO 'YYYY-MM-DD'     -> fortnightly (primeira ocorrência)
  dayOfMonth?: number;     // 1..31                -> monthly
  month?: number;          // 1..12                -> yearly (com dayOfMonth)

  startDate: string;       // ISO, ocorrências antes disso não existem
  endDate?: string;        // ISO, opcional. Usado para parcelamentos
  active: boolean;         // pausar sem apagar
  notes?: string;
  createdAt: string;
}
```

### 5.2 `entries` (lançamentos avulsos)

```ts
interface Entry {
  id: string;
  name: string;
  flow: Flow;
  amount: number;          // centavos
  date: string;            // ISO
  categoryId: string;
  notes?: string;
  createdAt: string;
}
```

### 5.3 `overrides` (exceções de ocorrências)

Ponto central da arquitetura: **ocorrências não são armazenadas**. Elas são calculadas em tempo real a partir das regras. Só se grava algo quando o comportamento padrão é quebrado.

```ts
interface Override {
  id: string;              // chave composta: `${recurringId}:${date}`
  recurringId: string;
  date: string;            // ISO da ocorrência original
  paidEarly?: boolean;     // usuário deu check antes do dia
  paidAt?: string;         // ISO datetime do check
  skipped?: boolean;       // essa ocorrência não vai acontecer
  amountOverride?: number; // valor real dessa ocorrência (contas variáveis)
}
```

### 5.4 `settings` (registro único)

Quarta tabela do Dexie, com chave fixa `'app'`. Fica no IndexedDB e não no localStorage, para sair junto no backup da seção 10.

```ts
interface Settings {
  weekStartsOn: 0 | 1;     // padrão 1 (segunda)
  currency: 'AUD';
  locale: 'pt-BR' | 'en-AU'; // padrão 'pt-BR', toda a interface em português
  schemaVersion: number;
}
```

### 5.5 Categorias

Lista fixa embutida no código na v1 (não editável pelo usuário ainda). Cada uma com id, rótulo e ícone: Moradia, Contas, Transporte, Mercado, Assinaturas, Saúde, Lazer, Trabalho, Outros. Para entradas: Salário, Extra, Outros.

Cada ícone precisa representar a categoria de forma reconhecível. Nada de reticências, hambúrguer, ponto ou qualquer glifo genérico de interface: o usuário lê isso como botão quebrado, não como categoria. Se não houver ícone óbvio para uma categoria, use a inicial da categoria num círculo em `steel`, que é honesto e não parece bug.

---

## 6. Lógica de recorrência

Módulo puro e isolado, sem dependência de UI. É a peça mais delicada do sistema, deve ter testes.

### 6.1 Função principal

```ts
function expandOccurrences(
  recurrings: Recurring[],
  overrides: Override[],
  from: string,   // ISO 'YYYY-MM-DD', inclusivo
  to: string,     // ISO 'YYYY-MM-DD', inclusivo
  today?: string  // ISO. Injetável para tornar o status determinístico nos testes.
                  // Omitido, lê o relógio do sistema
): Occurrence[]
```

Retorna todas as ocorrências dentro do intervalo, já com override aplicado.

```ts
interface Occurrence {
  recurringId: string;
  name: string;
  flow: Flow;
  amount: number;          // já com amountOverride aplicado se existir
  isEstimate: boolean;     // true se isVariable e sem amountOverride
  date: string;
  categoryId: string;
  status: 'previsto' | 'pago-antecipado' | 'pago';
}
```

### 6.2 Regras de cálculo de data

- **weekly:** toda ocorrência de `dayOfWeek` dentro do intervalo
- **fortnightly:** `anchorDate` mais múltiplos de 14 dias. Nunca use "duas vezes por mês", são coisas diferentes
- **monthly:** dia `dayOfMonth` de cada mês. **Se o mês não tem esse dia, usa o último dia do mês.** Dia 31 em fevereiro vira 28 ou 29, e volta a ser 31 em março
- **yearly:** `month` + `dayOfMonth`, mesma regra de clamp

Sempre filtrar por `active === true`, `startDate <= data`, `endDate >= data` (quando existir), e descartar ocorrências com `skipped === true`.

### 6.3 Derivação do status

Nesta ordem:

1. Existe override com `paidEarly === true`? → `pago-antecipado`
2. `date < hoje`? → `pago`
3. Caso contrário → `previsto`

O dia de hoje conta como `previsto` até virar a meia-noite. Não existe estado "atrasado".

### 6.4 Casos de teste obrigatórios

- Mensal dia 31 atravessando fevereiro, abril e março
- Mensal dia 29 em ano bissexto e não bissexto
- Quinzenal atravessando virada de mês e de ano
- Recorrente com `endDate` no meio do intervalo consultado
- Recorrente pausado no meio do intervalo
- Ocorrência com override de valor e de skip simultâneos
- Intervalo que começa e termina no mesmo dia

---

## 7. Telas

**Navegação.** Barra inferior fixa com quatro abas: Semana, Recorrentes, Painel, Ajustes. Ícones em `steel`, aba ativa em `ink`. Respeita `env(safe-area-inset-bottom)`. Formulários e modais cobrem a barra, com Cancelar e Salvar no topo.

Abaixo de 360px os rótulos das abas somem e ficam só os ícones. Quatro rótulos não cabem em 320px com respiro: encostados um no outro eles leem como uma frase corrida, não como quatro botões. O título no topo de cada tela já diz onde o usuário está.

Nenhum ícone pode se repetir entre a barra de navegação e as categorias. Se o glifo já é usado por uma categoria, a aba precisa de outro.

### 7.1 Home: a semana

Tela de abertura. Sem menu, sem boas-vindas, sem onboarding. Abre já mostrando a semana atual.

**Estrutura, de cima para baixo:**

1. **Cabeçalho compacto:** intervalo da semana ("25 ago a 31 ago") e setas para navegar entre semanas. Botão "hoje" aparece só quando você não está na semana atual.
2. **A régua da semana** (elemento assinatura, detalhado na seção 8).
3. **Linha de resultado:** entra, sai, sobra. A "sobra" é o número dominante da tela.

**Sobra negativa vira FALTA.** Quando o resultado é negativo, o rótulo troca de `SOBRA` para `FALTA` e o número perde o sinal: `FALTA $ 1.694,89`, nunca `SOBRA -$ 1.694,89`. Mesma cor, mesma fonte, mesmo tamanho, sem ícone e sem pontuação extra. O motivo é legibilidade, não alarme: a informação mais importante da tela não pode depender de um traço fino. Vale igual na Home e no painel.
4. **Lista do dia selecionado:** por padrão, hoje. Ordenada por valor decrescente, entradas e saídas juntas. Nunca em ordem alfabética, que não carrega informação nenhuma. Cada item mostra nome, categoria, valor, e um check tocável para marcar pagamento antecipado. Contas variáveis mostram o valor com marca de estimativa e permitem editar o valor real ali mesmo.
5. **Botão flutuante** de adicionar gasto avulso.

**Comportamento:** tocar numa coluna da régua troca a lista abaixo. Arrastar para o lado troca de semana.

### 7.2 Painel

Alternador de período: **Semana / Quinzena / Mês / Ano**.

Conteúdo:
- Entradas, saídas recorrentes, saídas avulsas, sobra
- Quebra das **saídas** por categoria (recorrente e avulso somados), em barras horizontais ordenadas do maior para o menor. As entradas não entram: elas já aparecem inteiras no total de cima
- Cada barra tem um trilho de fundo em `hairline` ocupando a largura total. Sem trilho, uma categoria pequena vira um toco de 3px que parece defeito, em vez de ler como fração pequena do total

A quinzena é calculada a partir da semana atual mais a seguinte, não como "metade do mês".

### 7.3 Recorrentes

Lista única, separada em duas seções: **Sai** e **Entra**. Cada item mostra nome, valor, e a regra em linguagem natural ("toda quinta", "dia 15 de cada mês", "a cada 14 dias desde 3 ago").

A regra é a informação principal do cartão e **nunca trunca**: ela ocupa linha própria e pode quebrar em até duas linhas. A categoria não aparece nessa linha, o ícone já a representa. Só o nome trunca.

Ações por item: editar, pausar, excluir. Excluir pede confirmação e avisa que o histórico some junto.

### 7.4 Formulário de recorrente

Campos na ordem: nome, entra ou sai, valor, "esse valor varia?" (toggle), categoria, frequência, e então o campo de data que muda conforme a frequência escolhida. Depois, num bloco recolhido: data de início, data de fim, observações.

Ao preencher, mostrar embaixo uma prévia: "Próximas 3: 28 ago, 11 set, 25 set".

### 7.5 Adicionar gasto avulso

Modal que sobe de baixo. Três campos visíveis: valor (teclado numérico, foco automático), nome, categoria. A data vem preenchida com hoje e fica recolhida. Um botão: "Adicionar".

### 7.6 Ajustes

Início da semana, idioma, **exportar backup**, **importar backup**, apagar tudo.

---

## 8. Direção visual

O app é para alguém que trabalha com armação de ferro e faz entregas: o dinheiro entra e sai em ciclos curtos e a semana é o horizonte real. A linguagem visual vem daí, do concreto e do aço, não de dashboard corporativo.

### 8.1 Paleta

No Tailwind v4 **não existe `tailwind.config.js`**. Os tokens vão num bloco `@theme` dentro do CSS principal, como `--color-concrete: #EDECE8`, e viram utilitários (`bg-concrete`, `text-ink`) automaticamente.

```
--color-concrete   #EDECE8   fundo da aplicação, cinza morno de concreto curado
--color-slab       #F8F7F4   superfície dos cartões
--color-ink        #15181C   texto principal e barras de saída
--color-steel      #656F7A   texto secundário, rótulos, eixos
--color-hivis      #D8F034   acento único: entradas, dia de hoje, ação primária
--color-hairline   #D6D4CE   divisórias de 1px
```

Regra dura: `--hivis` aparece no máximo em três lugares por tela. É colete refletivo, não decoração.

Saídas e entradas **não** usam vermelho e verde. Saída é `--ink`, entrada é `--hivis`. Isso evita a cara de planilha e mantém a tela calma.

### 8.2 Tipografia

- **Display:** Archivo variável, eixo `wdth` em 112, pesos 600 e 700. Usada **só nos títulos de seção e rótulos de cabeçalho**. É uma face de sinalização, combina com o assunto
- **Corpo:** IBM Plex Sans, 400 e 500
- **Números:** IBM Plex Mono com `font-variant-numeric: tabular-nums`. Vale para **todo** número monetário do app, do valor de R$ 12 numa lista até o número grande da sobra. Nenhum valor em dinheiro usa Archivo

Carregar as três com `@font-face` apontando para `.woff2` locais em `public/fonts`, com `font-display: swap`. Baixar do Google Fonts (licença OFL) e versionar no repositório. Sem CDN, sem `@fontsource`.

Escala: 44 / 28 / 20 / 16 / 14 / 12. Nada abaixo de 12. Todo `input` com no mínimo 16px, senão o Safari dá zoom ao focar.

### 8.3 Elemento assinatura: a régua da semana

Sete colunas de largura igual. Cada coluna tem, de cima para baixo:

```
 SEG   TER   QUA   QUI   SEX   SÁB   DOM
  25    26    27    28    29    30    31
             ▁     █     ▃           ▁
                   ▀
```

- A **altura da barra** é proporcional ao total que sai naquele dia, normalizada pelo maior dia da semana
- Barras de entrada crescem para baixo da linha de base, em `--hivis`
- O dia de hoje tem a coluna inteira com fundo `--slab` e o número em negrito
- O dia selecionado tem uma linha de 2px em `--ink` no topo da coluna
- Dias vazios não têm barra, só o número em `--steel`

O ponto é que você olha para o relevo da semana antes de ler qualquer número. É o mapa do terreno da semana.

### 8.4 Regras de execução

- Cantos: 10px nos cartões, 6px nos botões. Nunca pílula, nunca quadrado total
- Sombras: nenhuma. Separação por cor de superfície e hairlines
- Movimento: só a transição da régua ao trocar de dia (120ms) e o modal subindo (200ms). Respeitar `prefers-reduced-motion`
- Modo escuro: não na v1

---

## 9. Requisitos de PWA e mobile

Alvo principal: iPhone, instalado na tela inicial via Safari.

### 9.1 Manifest

```json
{
  "name": "CashFlow",
  "short_name": "CashFlow",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#EDECE8",
  "theme_color": "#EDECE8",
  "start_url": "/",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 9.2 Meta tags obrigatórias no `index.html`

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="CashFlow">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### 9.3 Detalhes que quebram no iOS se ignorados

- Usar `100dvh`, nunca `100vh`
- Respeitar `env(safe-area-inset-bottom)` no botão flutuante e na barra inferior, e `env(safe-area-inset-top)` no cabeçalho
- Desabilitar o bounce de scroll do body (`overscroll-behavior: none`)
- Alvos de toque com no mínimo 44x44px
- `-webkit-tap-highlight-color: transparent`
- Service worker com estratégia offline-first: o app tem que abrir e funcionar 100% sem internet, porque não existe servidor mesmo

### 9.4 Persistência do armazenamento (obrigatório)

O WebKit apaga dados por origem quando o aparelho fica sem espaço ou quando a origem passa muito tempo sem interação. Um app instalado na tela inicial tem contagem própria de uso, o que já ajuda, mas não é garantia.

Chamar `navigator.storage.persist()` **em toda abertura do app**. O Safari costuma conceder o modo persistente para apps instalados, e origens em modo persistente ficam de fora da limpeza automática. A permissão não sobrevive de forma confiável entre sessões, por isso a chamada é repetida sempre.

```ts
if (navigator.storage?.persist) {
  await navigator.storage.persist();
}
```

Mostrar nos Ajustes o resultado de `navigator.storage.persisted()` e a estimativa de `navigator.storage.estimate()`, para você saber em que pé está.

### 9.5 Responsividade

**Faixa que importa:** de 320px (iPhone SE) a 430px (Pro Max). É onde o app vai viver. Tudo acima disso é secundário e só precisa não ficar feio.

**Dois breakpoints, só.**

- **Padrão (até 767px):** layout de coluna única ocupando a largura toda, com 16px de respiro nas laterais.
- **768px para cima:** o conteúdo trava numa coluna centralizada de no máximo 480px, com o fundo `concrete` preenchendo o resto. Nada de reorganizar em duas colunas, nada de sidebar, nada de layout de desktop. O app foi desenhado pra ser segurado na mão, e esticar isso numa tela de 27 polegadas só piora.

**Régua da semana em tela estreita.** Sete colunas de largura igual via CSS Grid (`grid-cols-7`), com as colunas em fração, nunca em pixel fixo. Em 320px cada coluna fica com cerca de 40px, o que ainda respeita o alvo mínimo de toque. O rótulo do dia usa três letras (SEG, TER) em **todas** as larguras: em 320px a coluna tem 41px e o rótulo de 12px ocupa cerca de 28px, então cabe. Não abreviar para uma letra, porque em português as iniciais repetem (S, T, Q, Q, S, S, D) e o rótulo deixa de informar. A altura da régua é fixa em 88px, não escala com a largura.

**Texto e números.** O nome do item trunca com reticências, o valor **nunca** trunca nem quebra linha: o valor é a informação, o nome é o rótulo. Use `min-width: 0` nos containers flex, senão o truncamento não funciona.

**Tipografia fixa, não fluida.** A escala da seção 8.2 é a mesma em qualquer largura. Nada de `clamp()` nem de tamanho proporcional ao viewport, que numa faixa tão estreita só gera inconsistência.

**Orientação.** O manifest trava em retrato, mas isso só vale com o app instalado. Aberto no Safari normal, o usuário consegue virar o aparelho. Em paisagem, o layout apenas centraliza e continua funcionando, não precisa de tratamento especial.

**Interação.** Nenhuma função pode depender de `hover`, que não existe em touch. Todo estado interativo precisa de `:active` e de `:focus-visible` visível. Campos de valor com `inputmode="decimal"` para abrir o teclado numérico.

**Larguras de teste obrigatórias:** 320, 390, 430 e 768. Se quebrar em alguma, não passou.

---

## 10. Backup e persistência

O IndexedDB do Safari não tem garantia de durabilidade. Instalar na tela inicial e pedir modo persistente (seção 9.4) reduz muito o risco, mas o WebKit ainda pode limpar tudo se o iPhone ficar sem espaço, e limpar o histórico do Safari também derruba os dados. O backup manual é parte do produto, não um extra.

- **Exportar:** gera um `.json` com as três tabelas mais settings e `schemaVersion`, nome do arquivo `cashflow-backup-YYYY-MM-DD.json`. Dispara o share sheet do iOS
- **Importar:** aceita o mesmo formato, valida o `schemaVersion`, e pergunta se é para **substituir tudo** ou **mesclar** (mesclar ignora ids já existentes). Na caixa de confirmação, **mesclar é a ação primária sólida e substituir é a secundária**: substituir apaga dados existentes, e a ação destrutiva nunca é a que o dedo acerta por reflexo
- Nos Ajustes, mostrar a data do último backup e um aviso discreto se passou de 30 dias

---

## 11. Fases de implementação

Construir nesta ordem, cada fase funcionando antes de passar para a próxima.

**Fase 1: núcleo**
Setup do Vite, tokens do Tailwind, schema do Dexie, módulo de recorrência com os testes da seção 6.4. Sem UI ainda.

**Fase 2: a semana**
Home com a régua, lista do dia, navegação entre semanas, check de pagamento antecipado.

**Fase 3: cadastros**
CRUD de recorrentes, formulário com prévia das próximas ocorrências, modal de gasto avulso.

**Fase 4: painel**
Alternador de período, os quatro totais, quebra por categoria. Sem comparação com período anterior.

**Fase 5: PWA e backup**
Manifest, ícones via `@vite-pwa/assets-generator`, service worker, `navigator.storage.persist()`, exportar e importar, tela de ajustes.

**Depois da v1:** comparação com o período anterior, lista dos maiores gastos, calendário mensal, categorias editáveis, gasto parcelado que vira recorrente automático, busca, tema escuro.

---

## 12. Decisões em aberto

Nenhuma. O escopo da v1 está fechado.

---

## 13. Instruções para o Claude Code

- Todo valor monetário é **inteiro em centavos**. Nunca use float para dinheiro. Formate na exibição com `Intl.NumberFormat` em AUD
- Datas de calendário são **strings ISO `YYYY-MM-DD`**, sem timezone. Só use `Date` dentro do módulo de recorrência, e sempre em horário local
- O módulo de recorrência é puro: entra dado, sai dado, sem acesso ao banco e sem React
- Não invente telas nem funcionalidades que não estão aqui. Se algo estiver ambíguo, pergunte antes de implementar
- Siga a seção 8 literalmente. Não substitua a paleta, as fontes nem a régua da semana por escolhas próprias
- Mobile first de verdade: desenvolva na largura de 390px e siga a seção 9.5. Testar nas quatro larguras listadas lá antes de dar qualquer fase por pronta
- A stack da seção 4 foi verificada. Não troque nenhuma peça por outra sem me perguntar antes, e não instale nada que não esteja na tabela
- Tailwind é v4: configuração em CSS com `@theme`, sem `tailwind.config.js` e sem PostCSS. Se você se pegar rodando `npx tailwindcss init`, parou no caminho errado
