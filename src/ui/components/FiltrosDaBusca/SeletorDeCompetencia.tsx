import React from 'react';
import styles from './FiltrosDaBusca.module.css';

export interface SeletorDeCompetenciaProps {
  readonly ano: string;
  readonly mes: string;
  readonly onAnoChange: (ano: string) => void;
  readonly onMesChange: (mes: string) => void;
  readonly mostrarAno: boolean;
  readonly mostrarMes: boolean;
}

const MESES: readonly string[] = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Ano/Mês do módulo de Notas Fiscais. No Recesso nada disso se aplica e o bloco
 * inteiro não é renderizado — um flex item vazio ocuparia posição no space-between
 * e desalinharia a busca.
 */
export const SeletorDeCompetencia: React.FC<SeletorDeCompetenciaProps> = ({
  ano,
  mes,
  onAnoChange,
  onMesChange,
  mostrarAno,
  mostrarMes
}) => {
  if (!mostrarAno && !mostrarMes) return null;

  return (
    <div className={styles.competenceSelector}>
      {mostrarAno && (
        <div className={styles.formGroup}>
          <label htmlFor="select-ano">Ano</label>
          <select
            id="select-ano"
            className={styles.formControl}
            value={ano}
            onChange={(evento) => onAnoChange(evento.target.value)}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      )}
      {mostrarMes && (
        <div className={styles.formGroup}>
          <label htmlFor="select-mes">Mês</label>
          <select
            id="select-mes"
            className={styles.formControl}
            value={mes}
            onChange={(evento) => onMesChange(evento.target.value)}
          >
            {MESES.map((nome, indice) => {
              const valor = String(indice + 1).padStart(2, '0');
              return <option key={valor} value={valor}>{`${nome} (${valor})`}</option>;
            })}
          </select>
        </div>
      )}
    </div>
  );
};
