import React from 'react';
import styles from './HudDeModulos.module.css';

export type ModuloAtivo = 'notas-fiscais' | 'recesso';

export interface HudDeModulosProps {
  readonly moduloAtivo: ModuloAtivo;
  readonly onTrocarModulo: (modulo: ModuloAtivo) => void;
}

const MODULOS: readonly { readonly id: ModuloAtivo; readonly rotulo: string }[] = [
  { id: 'notas-fiscais', rotulo: 'Notas Fiscais' },
  { id: 'recesso', rotulo: 'Gestão de Recesso' }
];

/** HUD de seleção de módulo — hierarquicamente ACIMA das abas internas (docs/modulo-recesso/04 §1). */
export const HudDeModulos: React.FC<HudDeModulosProps> = ({ moduloAtivo, onTrocarModulo }) => {
  return (
    <nav className={styles.hud} id="hud-modulos" aria-label="Seleção de módulo">
      {MODULOS.map((modulo) => (
        <button
          key={modulo.id}
          type="button"
          className={`${styles.botao} ${moduloAtivo === modulo.id ? styles.ativo : ''}`}
          onClick={() => onTrocarModulo(modulo.id)}
          aria-current={moduloAtivo === modulo.id}
        >
          {modulo.rotulo}
        </button>
      ))}
    </nav>
  );
};
