import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  OFFLINE_CAP_MS,
  STAMINA_MAX,
  createPlayer,
  levelFromExp,
  memberLevel,
  runOffline,
  totalExpForLevel,
  type PlayerState,
} from '../dist/index.js';

const HOUR = 60 * 60 * 1000;

function newPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  const player = createPlayer({
    party: [
      { name: 'Bruma', vocation: 'knight' },
      { name: 'Tália', vocation: 'druid' },
      { name: 'Vesp', vocation: 'sorcerer' },
    ],
    seed: 4242,
    now: 0,
  });
  return Object.assign(player, overrides);
}

describe('nível a partir da experiência', () => {
  it('é o inverso exato da curva', () => {
    for (let level = 1; level <= 300; level++) {
      const floor = totalExpForLevel(level);
      assert.equal(levelFromExp(floor), level, `piso do nível ${level}`);
      assert.equal(levelFromExp(floor + 1), level, `piso+1 do nível ${level}`);
      if (level > 1) {
        assert.equal(levelFromExp(floor - 1), level - 1, `piso-1 do nível ${level}`);
      }
    }
  });

  it('trata zero e negativo como nível 1', () => {
    assert.equal(levelFromExp(0), 1);
    assert.equal(levelFromExp(-500), 1);
  });
});

describe('catch-up offline', () => {
  it('não faz nada quando não houve tempo decorrido', () => {
    const player = newPlayer();
    const report = runOffline(player, 0);
    assert.equal(report.simulatedMs, 0);
    assert.equal(report.exp, 0);
  });

  it('gera experiência, gold e progresso ao longo de uma noite', () => {
    const player = newPlayer();
    const report = runOffline(player, 8 * HOUR);

    assert.ok(report.kills > 0, 'deveria abater criaturas');
    assert.ok(report.exp > 0, 'deveria render experiência');
    assert.ok(report.gold > 0, 'deveria render gold');
    assert.equal(player.lastTickAt, 8 * HOUR);
    assert.ok(player.gold > 500, 'o gold do jogador deveria crescer');
  });

  it('respeita o teto offline', () => {
    const player = newPlayer();
    const report = runOffline(player, 48 * HOUR);

    assert.equal(report.skippedMs, 48 * HOUR - OFFLINE_CAP_MS);
    assert.ok(report.simulatedMs <= OFFLINE_CAP_MS);
  });

  it('é determinístico para o mesmo estado inicial', () => {
    const a = newPlayer();
    const b = newPlayer();
    const reportA = runOffline(a, 6 * HOUR);
    const reportB = runOffline(b, 6 * HOUR);

    assert.deepEqual(reportA, reportB);
    assert.deepEqual(a, b);
  });

  it('chega ao mesmo lugar em uma sessão ou em várias', () => {
    const inteiro = newPlayer();
    runOffline(inteiro, 6 * HOUR);

    const fatiado = newPlayer();
    for (let i = 1; i <= 6; i++) runOffline(fatiado, i * HOUR);

    // O catch-up é fatiado em blocos de 30 min, e sincronizar de hora em hora
    // cai nas mesmas fronteiras — então o resultado tem que bater exatamente.
    assert.equal(fatiado.clearedWaves, inteiro.clearedWaves);
    assert.equal(fatiado.gold, inteiro.gold);
    assert.deepEqual(
      fatiado.party.map((m) => m.experience),
      inteiro.party.map((m) => m.experience),
    );
  });

  it('sobe de nível durante o período, e não só no fim', () => {
    // Se a experiência fosse aplicada em bloco no fim, o grupo passaria a
    // noite inteira lutando no nível 1. Fatiado, ele fica mais forte enquanto
    // luta — e por isso abate muito mais que o dobro em o dobro do tempo.
    const curto = newPlayer();
    runOffline(curto, 1 * HOUR);

    const longo = newPlayer();
    runOffline(longo, 4 * HOUR);

    assert.ok(
      longo.totals.kills > curto.totals.kills * 4,
      `4h rendeu ${longo.totals.kills} abates contra ${curto.totals.kills} em 1h`,
    );
  });
});

describe('stamina', () => {
  it('é consumida caçando', () => {
    const player = newPlayer();
    runOffline(player, 4 * HOUR);
    assert.ok(player.stamina < STAMINA_MAX, 'deveria gastar stamina');
    assert.ok(player.stamina >= STAMINA_MAX - 4 * 60 - 1);
  });

  it('limita o tempo simulado quando acaba', () => {
    const player = newPlayer({ stamina: 30 });
    const report = runOffline(player, 8 * HOUR);

    assert.ok(
      report.simulatedMs <= 30 * 60_000,
      `simulou ${report.simulatedMs}ms com apenas 30 minutos de stamina`,
    );
    assert.ok(report.restedMs > 0, 'o tempo restante deveria virar descanso');
  });

  it('regenera enquanto o grupo descansa', () => {
    const player = newPlayer({ stamina: 0 });
    runOffline(player, 6 * HOUR);
    assert.ok(player.stamina > 0, 'stamina deveria voltar a subir');
  });

  it('nunca ultrapassa o teto', () => {
    const player = newPlayer({ stamina: STAMINA_MAX });
    runOffline(player, 40 * HOUR);
    assert.ok(player.stamina <= STAMINA_MAX);
  });
});

describe('política de caçada', () => {
  it('no farm seguro não avança para ondas novas', () => {
    const player = newPlayer({ policy: 'seguro', clearedWaves: 2 });
    const report = runOffline(player, 4 * HOUR);

    assert.equal(report.progressAfter, 2, 'não deveria destravar onda nova');
    assert.ok(report.kills > 0, 'mas deveria continuar farmando');
  });

  it('empurrando, destrava ondas novas', () => {
    const player = newPlayer({ policy: 'empurrar' });
    runOffline(player, 4 * HOUR);
    assert.ok(player.clearedWaves > 0, 'deveria vencer ondas');
  });

  it('desiste de empurrar contra uma parede alta demais', () => {
    // Grupo nível 1 jogado direto contra a onda do boss. Numa janela curta não
    // dá tempo de ganhar nível, então a build atual é a build final: o
    // esperado é apanhar e recuar, não destravar.
    const player = newPlayer({ policy: 'empurrar', clearedWaves: 10 });
    const report = runOffline(player, 25 * 60 * 1000);

    assert.ok(report.wipes > 0, 'deveria apanhar');
    assert.equal(report.progressAfter, 10, 'não deveria destravar a onda do boss');
  });

  it('a parede cede quando o grupo tem nível para ela', () => {
    const fraco = newPlayer({ policy: 'empurrar', clearedWaves: 9 });
    const forte = newPlayer({ policy: 'empurrar', clearedWaves: 9 });
    for (const member of forte.party) member.experience = totalExpForLevel(45);

    const relatorioFraco = runOffline(fraco, 25 * 60 * 1000);
    const relatorioForte = runOffline(forte, 25 * 60 * 1000);

    assert.ok(
      relatorioForte.wipes < relatorioFraco.wipes,
      'o grupo forte deveria morrer menos que o fraco na mesma onda',
    );
  });
});

describe('suprimentos', () => {
  it('consome poções e avisa quando acabam', () => {
    const player = newPlayer({ policy: 'empurrar', clearedWaves: 8 });
    for (const member of player.party) member.potions = 3;

    const report = runOffline(player, 6 * HOUR);
    assert.ok(report.potionsUsed > 0, 'deveria beber poção');
    assert.ok(report.ranOutOfSupplies, 'deveria sinalizar estoque zerado');
  });
});

describe('progressão', () => {
  it('sobe de nível e registra quem subiu', () => {
    const player = newPlayer();
    const report = runOffline(player, 6 * HOUR);

    assert.ok(report.levelUps.length > 0, 'alguém deveria subir de nível');
    for (const member of player.party) {
      assert.ok(memberLevel(member) > 1, `${member.name} deveria passar do nível 1`);
    }
  });
});
