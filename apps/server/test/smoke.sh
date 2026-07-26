#!/usr/bin/env bash
# Teste de fumaça do servidor: sobe, exercita o fluxo inteiro e derruba.
#
#   pnpm --filter @covil/server exec bash test/smoke.sh
#
# Cobre cadastro, login, catch-up offline, comandos e ranking. Usa um banco
# temporário, então não encosta no seu .sqlite de desenvolvimento.
set -euo pipefail

BASE="http://127.0.0.1:${PORT:-3399}"
TMP="$(mktemp -d)"
trap 'kill "${SERVER_PID:-0}" 2>/dev/null || true; rm -rf "$TMP"' EXIT

falhas=0
verificar() {
  local descricao="$1" esperado="$2" obtido="$3"
  if [[ "$obtido" == "$esperado" ]]; then
    printf '  ✓ %s\n' "$descricao"
  else
    printf '  ✗ %s — esperado %s, obtido %s\n' "$descricao" "$esperado" "$obtido"
    falhas=$((falhas + 1))
  fi
}

export PORT="${PORT:-3399}"
export HOST=127.0.0.1
export NODE_ENV=test
export JWT_SECRET="segredo-de-teste-com-tamanho-mais-que-suficiente-aqui"
export DATABASE_FILE="$TMP/teste.sqlite"

node dist/index.js > "$TMP/servidor.log" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 50); do
  if curl -sf "$BASE/api/health" > /dev/null 2>&1; then break; fi
  sleep 0.2
done

if ! curl -sf "$BASE/api/health" > /dev/null 2>&1; then
  echo "servidor não subiu:"; cat "$TMP/servidor.log"; exit 1
fi

echo "Fluxo de conta"

CORPO='{"email":"teste@covil.local","password":"senha-bem-forte","name":"Testador",
        "party":[{"name":"Bruma","vocation":"knight"},
                 {"name":"Tália","vocation":"druid"},
                 {"name":"Vesp","vocation":"sorcerer"}]}'

REGISTRO="$(curl -s -X POST "$BASE/api/auth/register" -H 'content-type: application/json' -d "$CORPO")"
TOKEN="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).token ?? '')" "$REGISTRO")"
verificar "cadastro devolve token" "sim" "$([[ -n "$TOKEN" ]] && echo sim || echo não)"

CODIGO="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/register" \
  -H 'content-type: application/json' -d "$CORPO")"
verificar "e-mail duplicado é recusado" "409" "$CODIGO"

CODIGO="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" \
  -H 'content-type: application/json' \
  -d '{"email":"teste@covil.local","password":"senha-errada"}')"
verificar "senha errada é recusada" "401" "$CODIGO"

CODIGO="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/register" \
  -H 'content-type: application/json' -d '{"email":"nao-e-email","password":"123"}')"
verificar "corpo inválido é recusado" "400" "$CODIGO"

echo "Estado e autenticação"

CODIGO="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/game/state")"
verificar "estado exige token" "401" "$CODIGO"

ESTADO="$(curl -s "$BASE/api/game/state" -H "authorization: Bearer $TOKEN")"
verificar "grupo tem 3 membros" "3" \
  "$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).player.party.length))" "$ESTADO")"
verificar "gold inicial" "500" \
  "$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).player.gold))" "$ESTADO")"

echo "Comandos"

RESP="$(curl -s -X POST "$BASE/api/game/command" -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"type":"politica","policy":"seguro"}')"
verificar "política muda" "seguro" \
  "$(node -e "process.stdout.write(JSON.parse(process.argv[1]).player.policy)" "$RESP")"

RESP="$(curl -s -X POST "$BASE/api/game/command" -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"type":"doutrina","memberIndex":0,"patch":{"potionBelowPct":80}}')"
verificar "doutrina muda" "80" \
  "$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).player.party[0].doctrine.potionBelowPct))" "$RESP")"

RESP="$(curl -s -X POST "$BASE/api/game/command" -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"type":"comprar","item":"vida","quantity":6}')"
verificar "compra desconta o gold" "230" \
  "$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).player.gold))" "$RESP")"

CODIGO="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/game/command" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"type":"comprar","item":"vida","quantity":9999}')"
verificar "compra sem gold é recusada" "400" "$CODIGO"

CODIGO="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/game/command" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"type":"arena","arenaId":"inexistente"}')"
verificar "arena inexistente é recusada" "400" "$CODIGO"

echo "Catch-up offline"

# Rebobina o relógio salvo em 6 horas e confere que o servidor cobra o tempo.
node -e '
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(process.argv[1]);
  const row = db.prepare("SELECT id, state FROM players LIMIT 1").get();
  const state = JSON.parse(row.state);
  state.lastTickAt -= 6 * 60 * 60 * 1000;
  db.prepare("UPDATE players SET state = ? WHERE id = ?").run(JSON.stringify(state), row.id);
' "$DATABASE_FILE"

ESTADO="$(curl -s "$BASE/api/game/state" -H "authorization: Bearer $TOKEN")"
GANHOU_EXP="$(node -e "process.stdout.write(JSON.parse(process.argv[1]).report.exp > 0 ? 'sim' : 'não')" "$ESTADO")"
verificar "6h fora rendem experiência" "sim" "$GANHOU_EXP"
verificar "6h fora rendem abates" "sim" \
  "$(node -e "process.stdout.write(JSON.parse(process.argv[1]).report.kills > 0 ? 'sim' : 'não')" "$ESTADO")"
verificar "stamina foi consumida" "sim" \
  "$(node -e "process.stdout.write(JSON.parse(process.argv[1]).player.stamina < 2520 ? 'sim' : 'não')" "$ESTADO")"

# Sincronizar de novo em seguida não pode render nada: o tempo já foi cobrado.
ESTADO2="$(curl -s "$BASE/api/game/state" -H "authorization: Bearer $TOKEN")"
verificar "sync imediato não rende de novo" "0" \
  "$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).report.exp))" "$ESTADO2")"

echo "Ranking"

RANKING="$(curl -s "$BASE/api/ranking")"
verificar "jogador aparece no ranking" "Testador" \
  "$(node -e "process.stdout.write(JSON.parse(process.argv[1]).ranking[0]?.name ?? '')" "$RANKING")"

echo
if [[ "$falhas" -eq 0 ]]; then
  echo "Tudo certo."
else
  echo "$falhas verificação(ões) falharam."
  exit 1
fi
