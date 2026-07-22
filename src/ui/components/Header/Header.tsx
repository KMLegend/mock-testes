import React from 'react';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  return (
    <header className={styles.appHeader}>
      <div className={styles.headerContainer}>
        <div className={styles.logoWrapper}>
          <img
            src="public/brand/logos/CITY_SOLUCOES_UBARNAS_VERSAO_PREFERENCIAL_NEGATIVA.png"
            alt="City Soluções Urbanas"
            className={styles.cityLogo}
          />
        </div>
        <div className={styles.headerTitle}>
          <span>Gestão de PJ</span>
        </div>
      </div>
    </header>
  );
};
