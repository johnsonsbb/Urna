import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSim,
  getSpell,
  resolveArea,
  rotatePattern,
  runSim,
  stepSim,
  totalExpForLevel,
  type PartyConfig,
  type SimState,
} from '../dist/index.js';

const PARTY: PartyConfig[] = [
  { name: 'Bruma', vocation: 'knight', level: 20 },
  { name: 'Tal', vocation: 'druid', level: 18 },
  { name: 'Vesp', vocation: 'sorcerer', level: 18 },
];

function newSim(seed = 777): SimState {
  return createSim({ arenaId: 'covil_raso', party: PARTY, seed });
}

describe('curva de experiência', () => {
  it('reproduz os valores do Tibia', () => {
    assert.equal(totalExpForLevel(1), 0);
    assert.equal(totalExpForLevel(2), 100);
    assert.equal(totalExpForLevel(3), 200);
    assert.equal(totalExpForLevel(8), 4200);
  });

  it('cresce de forma estritamente monotônica', () => {
    for (let level = 1; level < 200; level++) {
      assert.ok(
        totalExpForLevel(level + 1) > totalExpForLevel(level),
        `nível ${level + 1} deveria exigir mais que o ${level}`,
      );
    }
  });
});

describe('rotação de área de magia', () => {
  const cone = getSpell('onda_gelida').area;

  it('mantém a matriz apontando para leste', () => {
    assert.deepEqual(rotatePattern(cone, 'leste'), cone);
  });

  it('espelha para oeste', () => {
    const rotated = rotatePattern(cone, 'oeste');
    assert.deepEqual(rotated[2], [1, 1, 2]);
  });

  it('gira para o sul com a origem no topo', () => {
    const rotated = rotatePattern(cone, 'sul');
    assert.equal(rotated.length, 3);
    assert.deepEqual(rotated[0], [0, 0, 2, 0, 0]);
    assert.deepEqual(rotated[2], [1, 1, 1, 1, 1]);
  });

  it('gira para o norte com a origem embaixo', () => {
    const rotated = rotatePattern(cone, 'norte');
    assert.deepEqual(rotated[0], [1, 1, 1, 1, 1]);
    assert.deepEqual(rotated[2], [0, 0, 2, 0, 0]);
  });
});

describe('resolução de área', () => {
  it('não atinge o tile do próprio conjurador', () => {
    const spell = getSpell('golpe_giratorio');
    const tiles = resolveArea(spell, { x: 5, y: 5 }, 'leste');
    assert.equal(tiles.length, 8, 'as 8 casas ao redor, sem a do centro');
    assert.ok(!tiles.some((t) => t.x === 5 && t.y === 5));
  });

  it('atinge o tile do alvo quando a origem é o alvo', () => {
    const spell = getSpell('bola_de_fogo');
    const tiles = resolveArea(spell, { x: 7, y: 4 }, 'leste');
    assert.ok(tiles.some((t) => t.x === 7 && t.y === 4));
    assert.equal(tiles.length, 5, 'cruz de 5 casas');
  });

  it('projeta o cone à frente do conjurador', () => {
    const spell = getSpell('onda_gelida');
    const tiles = resolveArea(spell, { x: 5, y: 5 }, 'leste');
    assert.ok(tiles.every((t) => t.x > 5), 'todo o cone fica a leste da origem');
  });
});

describe('determinismo', () => {
  it('produz estados idênticos para a mesma semente', () => {
    const a = newSim();
    const b = newSim();
    runSim(a, 60_000);
    runSim(b, 60_000);
    assert.deepEqual(a, b);
  });

  it('produz estados diferentes para sementes diferentes', () => {
    const a = newSim(1);
    const b = newSim(2);
    runSim(a, 60_000);
    runSim(b, 60_000);
    assert.notDeepEqual(a.totals, b.totals);
  });

  it('não depende de rodar em um passo só ou em vários', () => {
    const inteiro = newSim();
    runSim(inteiro, 30_000);

    const fatiado = newSim();
    for (let i = 0; i < 6; i++) runSim(fatiado, 5_000);

    assert.deepEqual(inteiro, fatiado);
  });
});

describe('simulação de combate', () => {
  it('mata criaturas e avança as ondas', () => {
    const state = newSim();
    runSim(state, 120_000);
    assert.ok(state.totals.kills > 0, 'o grupo deveria abater alguma coisa');
    assert.ok(state.totals.wavesCleared > 0, 'deveria concluir ao menos uma onda');
    assert.ok(state.totals.exp > 0);
  });

  it('mantém o grupo dentro dos limites da arena', () => {
    const state = newSim();
    runSim(state, 90_000);
    for (const c of state.combatants) {
      assert.ok(c.pos.x >= 0 && c.pos.x < 15, `${c.name} saiu no eixo x`);
      assert.ok(c.pos.y >= 0 && c.pos.y < 11, `${c.name} saiu no eixo y`);
    }
  });

  it('nunca deixa dois combatentes vivos no mesmo tile', () => {
    const state = newSim();
    for (let i = 0; i < 900; i++) {
      stepSim(state);
      const seen = new Set<string>();
      for (const c of state.combatants) {
        if (!c.alive) continue;
        const key = `${c.pos.x},${c.pos.y}`;
        assert.ok(!seen.has(key), `dois combatentes em ${key} no passo ${i}`);
        seen.add(key);
      }
    }
  });

  it('mantém vida e mana dentro dos limites', () => {
    const state = newSim();
    runSim(state, 120_000);
    for (const c of state.combatants) {
      assert.ok(c.hp >= 0 && c.hp <= c.maxHp, `vida fora do limite em ${c.name}`);
      assert.ok(c.mana >= 0 && c.mana <= c.maxMana, `mana fora do limite em ${c.name}`);
    }
  });

  it('emite efeitos visuais durante o combate', () => {
    const state = newSim();
    const { fx, log } = runSim(state, 45_000);
    assert.ok(fx.some((f) => f.kind === 'dano'), 'deveria haver números de dano');
    assert.ok(fx.some((f) => f.kind === 'fala'), 'deveria haver falas de magia');
    assert.ok(log.length > 0);
  });
});

describe('orçamento de CPU do catch-up', () => {
  it('simula 1 hora bem abaixo do limite de um login', () => {
    const state = newSim();
    const started = performance.now();
    runSim(state, 60 * 60 * 1000, false);
    const elapsed = performance.now() - started;

    // Referência do design: o catch-up é o maior risco de engenharia. Este
    // teste existe para o custo aparecer quando regredir, não para cravar
    // um número — daí o limite generoso.
    assert.ok(
      elapsed < 5000,
      `1h de simulação levou ${elapsed.toFixed(0)}ms, acima do orçamento`,
    );
    console.log(`      → 1h de arena simulada em ${elapsed.toFixed(0)}ms`);
  });
});
