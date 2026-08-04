import React from 'react';
import styles from './CargaDeCadastro.module.css';
import { ControleDaCarga } from '../../hooks/useCargaDeCadastro';

/** Botão de confirmar a carga — só habilita com relatório limpo (docs/frontend/21 §2). */
export const ConfirmacaoDaCarga: React.FC<{ controle: ControleDaCarga }> = ({ controle }) => {
  const aplicando = controle.estado === 'aplicando';
  return (
    <div className={styles.confirmar}>
      <button
        type="button"
        className={`${styles.botao} ${styles.botaoPrimario}`}
        onClick={controle.aplicar}
        disabled={!controle.podeAplicar || aplicando}
        id="btn-confirmar-carga"
      >
        {aplicando ? 'Aplicando...' : 'Confirmar carga'}
      </button>
      {!controle.podeAplicar && (
        <span className={styles.dicaConfirmar}>Corrija os erros para habilitar a carga.</span>
      )}
    </div>
  );
};
