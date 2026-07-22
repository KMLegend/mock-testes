import React from 'react';
import styles from './Abas.module.css';

export type AbaAtiva = 'status' | 'mensagens';

export interface AbasProps {
  readonly abaAtiva: AbaAtiva;
  readonly onTrocarAba: (aba: AbaAtiva) => void;
}

export const Abas: React.FC<AbasProps> = ({ abaAtiva, onTrocarAba }) => {
  return (
    <nav className={styles.tabsNav} id="tabs-nav">
      <button
        className={`${styles.tabBtn} ${abaAtiva === 'status' ? styles.active : ''}`}
        onClick={() => onTrocarAba('status')}
      >
        Status
      </button>
      <button
        className={`${styles.tabBtn} ${abaAtiva === 'mensagens' ? styles.active : ''}`}
        onClick={() => onTrocarAba('mensagens')}
      >
        Mensagens
      </button>
    </nav>
  );
};
