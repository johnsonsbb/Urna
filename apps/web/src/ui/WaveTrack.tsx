import { IconSkull } from './Icons';

interface WaveTrackProps {
  current: number;
  total: number;
  isBoss: boolean;
}

/**
 * Trilha de ondas — a mesma leitura instantânea que os idles do gênero usam:
 * quanto falta para o boss, sem ler número nenhum.
 */
export function WaveTrack({ current, total, isBoss }: WaveTrackProps) {
  const pips = Array.from({ length: Math.max(0, total - 1) }, (_, index) => index);

  return (
    <div
      className="waves"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label={`Onda ${current + 1} de ${total}`}
    >
      {pips.map((index) => (
        <span
          key={index}
          className={
            'waves__pip' +
            (index < current ? ' waves__pip--done' : '') +
            (index === current ? ' waves__pip--current' : '')
          }
        />
      ))}
      <span className={'waves__boss' + (isBoss ? ' waves__boss--active' : '')}>
        <IconSkull size={16} />
      </span>
    </div>
  );
}
