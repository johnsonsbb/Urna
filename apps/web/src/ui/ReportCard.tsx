import { formatDuration, formatNumber, type OfflineReport } from '@covil/core';

interface ReportCardProps {
  report: OfflineReport;
  onDismiss: () => void;
}

/**
 * A tela de retorno.
 *
 * É o momento de dopamina do jogo: o jogador abre o app e descobre o que o
 * grupo fez enquanto ele vivia a vida dele. Merece ser a tela mais bem feita
 * — e merece dizer também o que deu errado, porque é disso que sai a próxima
 * decisão de build.
 */
export function ReportCard({ report, onDismiss }: ReportCardProps) {
  const goldPerHour =
    report.simulatedMs > 0 ? (report.gold / report.simulatedMs) * 3_600_000 : 0;

  const avancou = report.progressAfter > report.progressBefore;

  return (
    <div className="report" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="report__card">
        <h2 className="report__title" id="report-title">
          Você esteve fora por {formatDuration(report.elapsedMs)}
        </h2>

        <div className="report__grid">
          <Stat label="Abates" value={formatNumber(report.kills)} />
          <Stat label="Experiência" value={formatNumber(report.exp)} />
          <Stat label="Gold" value={formatNumber(report.gold)} />
          <Stat label="Gold/hora" value={formatNumber(Math.round(goldPerHour))} />
        </div>

        {report.levelUps.length > 0 && (
          <div className="report__levels">
            {report.levelUps.map((levelUp, index) => (
              <span key={`${levelUp.name}-${index}`} className="report__level">
                <b>{levelUp.name}</b>{' '}
                {levelUp.to - levelUp.from === 1
                  ? `subiu para o nível ${levelUp.to}`
                  : `subiu ${levelUp.to - levelUp.from} níveis — ${levelUp.from} → ${levelUp.to}`}
              </span>
            ))}
          </div>
        )}

        <ul className="report__lines">
          {avancou ? (
            <li className="report__line report__line--good">
              {report.progressBefore === 0
                ? `Limpou até a onda ${report.progressAfter}.`
                : `Avançou da onda ${report.progressBefore} para a ${report.progressAfter}.`}
            </li>
          ) : (
            <li className="report__line">
              {report.policy === 'empurrar'
                ? `A onda ${report.progressBefore + 1} não caiu desta vez.`
                : `Ciclo seguro até a onda ${report.progressBefore}.`}
            </li>
          )}

          <li className="report__line">
            {report.wavesCleared} onda{report.wavesCleared === 1 ? '' : 's'} concluída
            {report.wavesCleared === 1 ? '' : 's'} · {report.potionsUsed} poç
            {report.potionsUsed === 1 ? 'ão' : 'ões'} consumida
            {report.potionsUsed === 1 ? '' : 's'}
          </li>

          {report.wipes > 0 && (
            <li className="report__line report__line--bad">
              O grupo foi derrotado {report.wipes} vez{report.wipes === 1 ? '' : 'es'}.
              {report.policy === 'empurrar' && ' Depois de três tentativas sem progresso, recuou.'}
            </li>
          )}

          {report.ranOutOfSupplies && (
            <li className="report__line report__line--bad">
              Alguém ficou <b>sem poções</b>. Reponha o estoque na loja antes da próxima caçada.
            </li>
          )}

          {report.restedMs > 0 && (
            <li className="report__line">
              Ficou {formatDuration(report.restedMs)} descansando por falta de stamina —
              recuperou {Math.round(report.staminaRegen)} min.
            </li>
          )}

          {report.skippedMs > 0 && (
            <li className="report__line report__line--warn">
              {formatDuration(report.skippedMs)} foram além do teto de progresso offline e não
              contaram.
            </li>
          )}
        </ul>

        <button type="button" className="btn btn--primary report__action" onClick={onDismiss}>
          Continuar
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="report__stat">
      <span className="report__stat-label">{label}</span>
      <span className="report__stat-value tabular">{value}</span>
    </div>
  );
}
