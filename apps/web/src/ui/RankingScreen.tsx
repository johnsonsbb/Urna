import { useEffect, useState } from 'react';

import { api, type RankingEntry } from '../api/client';

interface RankingScreenProps {
  currentName: string | null;
}

export function RankingScreen({ currentName }: RankingScreenProps) {
  const [entries, setEntries] = useState<RankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .ranking()
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Falha ao carregar.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="empty">
        <h2>Ranking indisponível</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!entries) {
    return (
      <div className="empty">
        <p>Carregando…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="empty">
        <h2>Ranking vazio</h2>
        <p>Ninguém entrou no covil ainda. Crie uma conta e seja o primeiro.</p>
      </div>
    );
  }

  return (
    <section className="card">
      <div className="card__head">
        <span className="card__title">Classificação global</span>
      </div>
      <div className="card__body">
        <ol className="ranking">
          {entries.map((entry) => (
            <li
              key={entry.position}
              className={'ranking__row' + (entry.name === currentName ? ' ranking__row--me' : '')}
            >
              <span className="ranking__pos tabular">{entry.position}</span>
              <span className="ranking__name">{entry.name}</span>
              <span className="ranking__level tabular">lvl {entry.level}</span>
              <span className="ranking__waves tabular">{entry.clearedWaves} ondas</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
