import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../src/balance.js';
import * as G from '../src/game.js';

const rodar = (s, segundos) => { for (let i = 0; i < segundos / B.TICK; i++) G.tick(s); };

test('mesma semente, mesma partida', () => {
  const a = G.createState(7);
  const b = G.createState(7);
  rodar(a, 120);
  rodar(b, 120);
  assert.equal(a.gold, b.gold);
  assert.equal(a.stats.kills, b.stats.kills);
  assert.deepEqual(a.heroes, b.heroes);
});

test('o estado sobrevive a uma volta pelo JSON', () => {
  const a = G.createState(11);
  rodar(a, 60);
  const b = JSON.parse(JSON.stringify(a));
  rodar(a, 60);
  rodar(b, 60);
  assert.equal(b.gold, a.gold);
  assert.equal(b.stats.kills, a.stats.kills);
});

test('o jogo não começa limitado por spawn (armadilha 3)', () => {
  const b = B.bottleneck({ upgrades: B.emptyUpgrades(), floor: 1 });
  assert.equal(b.limitedBy, 'herois');
  assert.ok(b.production > b.consumption * 2, 'tem que sobrar oferta no começo');
});

test('nenhum ganho multiplicativo chega perto do fator de custo (armadilha 1)', () => {
  const t = B.TUNING;
  const custo = Math.min(...Object.values(t.cost).map((c) => c.factor));
  for (const ganho of [t.speedStep, t.damageStep, 1 / t.spawnStep]) {
    assert.ok(ganho < custo * 0.99, `${ganho} está perto demais de ${custo}`);
  }
});

test('a essência sai do andar, nunca do ouro (armadilha 2)', () => {
  const a = G.createState(3);
  a.floor = 9;
  const b = G.createState(3);
  b.floor = 9;
  b.gold = 1e12;
  assert.equal(G.prestigeGain(a), G.prestigeGain(b));
});

test('comprar desconta o ouro e sobe o nível', () => {
  const s = G.createState(1);
  s.gold = 1000;
  const antes = s.gold;
  const n = G.buyUpgrade(s, 'botas', 10);
  assert.equal(n, 10);
  assert.equal(s.upgrades.botas, 10);
  assert.equal(s.gold, antes - B.bulkCost('botas', 0, 10));
  assert.equal(G.buyUpgrade(s, 'botas', 99999), 0, 'sem ouro, não compra');
});

test('companheiro entrega herói, e o teto é respeitado', () => {
  const s = G.createState(1);
  s.gold = 1e12;
  G.buyUpgrade(s, 'companheiro', 'max');
  assert.equal(s.upgrades.companheiro, B.upgradeCap('companheiro'));
  assert.equal(s.heroes.length, B.heroCount(s.upgrades.companheiro));
});

test('descer cobra, sobe o andar e limpa a sala', () => {
  const s = G.createState(1);
  rodar(s, 30);
  assert.equal(G.descend(s), false);
  s.gold = B.descendCost(1);
  assert.equal(G.descend(s), true);
  assert.equal(s.floor, 2);
  assert.equal(s.enemies.length, 0);
  assert.equal(s.stats.bestFloor, 2);
});

test('prestígio guarda essência e tática, e zera o resto', () => {
  const s = G.createState(1);
  s.floor = 5;
  s.gold = 5000;
  s.upgrades.tatica = 2;
  s.upgrades.botas = 30;
  assert.ok(G.canPrestige(s));
  const ganho = G.prestige(s);
  assert.equal(ganho, 5);
  assert.equal(s.essence, 5);
  assert.equal(s.upgrades.tatica, 2, 'tática é conhecimento');
  assert.equal(s.upgrades.botas, 0);
  assert.equal(s.gold, 0);
  assert.equal(s.floor, 1);
  assert.equal(s.stats.prestiges, 1);
});

test('o prestígio só abre quando vale 1,5x o que já se tem', () => {
  const s = G.createState(1);
  s.floor = 5;
  s.essence = 5;
  assert.equal(G.canPrestige(s), false, '5 não é 1,5x 5');
  s.floor = 6;
  assert.equal(G.canPrestige(s), false, 'no andar 6 o ganho é 7, e o mínimo é 7,5');
  s.floor = 7;
  assert.equal(G.canPrestige(s), true, 'no andar 7 o ganho é 12');
});

test('o offline usa a taxa congelada, não a de agora', () => {
  const s = G.createState(1);
  const congelada = G.rate(s);
  s.gold = 0;
  s.upgrades.lamina = 200;   // como se tivesse comprado tudo antes de fechar
  const r = G.applyOffline(s, 3600, congelada);
  assert.equal(r.rate, congelada);
  assert.equal(s.gold, congelada * 3600 * B.OFFLINE_RATE);
});

test('o offline tem teto de 4 horas', () => {
  const s = G.createState(1);
  const r = G.applyOffline(s, 40 * 3600, 1);
  assert.equal(r.seconds, B.OFFLINE_CAP);
  assert.equal(r.capped, true);
});

test('na tática 0 dois heróis podem disputar o mesmo alvo; a partir da 1, não', () => {
  const s = G.createState(5);
  s.upgrades.companheiro = 3;
  G.syncHeroes(s);
  rodar(s, 20);
  const vistos = new Set();
  let repetido = false;
  for (const h of s.heroes) {
    if (h.tid && vistos.has(h.tid)) repetido = true;
    if (h.tid) vistos.add(h.tid);
  }
  assert.equal(repetido || s.enemies.length > 0, true);

  const t = G.createState(5);
  t.upgrades.companheiro = 3;
  t.upgrades.tatica = 1;
  G.syncHeroes(t);
  rodar(t, 60);
  const ids = t.heroes.map((h) => h.tid).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'ninguém rouba alvo reservado');
});

test('a sala e o teto de inimigos crescem com a tocha', () => {
  assert.deepEqual(B.roomSize(0), { w: 300, h: 220 });
  assert.deepEqual(B.roomSize(1), { w: 340, h: 250 });
  assert.ok(B.enemyCap(10) > B.enemyCap(0));
});
