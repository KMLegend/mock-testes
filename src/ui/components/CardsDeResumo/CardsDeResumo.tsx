import React from 'react';
import styles from './CardsDeResumo.module.css';
import { ResumoRollup } from '../../../domain/collections/LinhasDeStatus';

export interface CardsDeResumoProps {
  readonly resumo: ResumoRollup;
  readonly onCardClick: (statusFilter: string) => void;
}

export const CardsDeResumo: React.FC<CardsDeResumoProps> = ({ resumo, onCardClick }) => {
  return (
    <section className={styles.summaryCards} id="summary-section">
      <div className={styles.card}>
        <div className={styles.cardBody}>
          <span className={styles.cardLabel}>Total de Fornecedores Ativos</span>
          <span className={styles.cardValue} id="count-total">{resumo.total}</span>
        </div>
      </div>

      <div
        className={`${styles.card} ${styles.cardStatus}`}
        onClick={() => onCardClick('Pendente')}
      >
        <div className={styles.cardBody}>
          <span className={styles.cardLabel}>Pendentes</span>
          <span className={styles.cardValue} id="count-pendente">{resumo.pendente}</span>
        </div>
        <div className={`${styles.cardIndicator} ${styles.bgPendente}`} />
      </div>

      <div
        className={`${styles.card} ${styles.cardStatus}`}
        onClick={() => onCardClick('Enviado')}
      >
        <div className={styles.cardBody}>
          <span className={styles.cardLabel}>Enviados</span>
          <span className={styles.cardValue} id="count-enviado">{resumo.enviado}</span>
        </div>
        <div className={`${styles.cardIndicator} ${styles.bgEnviado}`} />
      </div>

      <div
        className={`${styles.card} ${styles.cardStatus}`}
        onClick={() => onCardClick('Recebido')}
      >
        <div className={styles.cardBody}>
          <span className={styles.cardLabel}>Recebidos</span>
          <span className={styles.cardValue} id="count-recebido">{resumo.recebido}</span>
        </div>
        <div className={`${styles.cardIndicator} ${styles.bgRecebido}`} />
      </div>

      <div
        className={`${styles.card} ${styles.cardStatus}`}
        onClick={() => onCardClick('Tratamento Manual')}
      >
        <div className={styles.cardBody}>
          <span className={styles.cardLabel}>Tratamento Manual</span>
          <span className={styles.cardValue} id="count-manual">{resumo.manual}</span>
        </div>
        <div className={`${styles.cardIndicator} ${styles.bgManual}`} />
      </div>
    </section>
  );
};
