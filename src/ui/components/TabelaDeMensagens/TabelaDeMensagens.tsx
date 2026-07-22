import React from 'react';
import styles from './TabelaDeMensagens.module.css';
import { Alertas } from '../../../domain/collections/Alertas';
import { Alerta } from '../../../domain/entities/Alerta';

export interface TabelaDeMensagensProps {
  readonly alertas: Alertas;
}

export const TabelaDeMensagens: React.FC<TabelaDeMensagensProps> = ({ alertas }) => {
  const ordenados = alertas.ordenadosPorDataDecrescente();
  const itens = ordenados.paraArray();

  return (
    <section className={styles.datagridSection}>
      <div className={styles.messagesHeader}>
        <h2>Mensagens Enviadas</h2>
        <p className={styles.subtitle}>
          Histórico de alertas disparados aos fornecedores (regras D-3, D, D+1, D+3).
        </p>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.datagridTable} id="mensagens-table">
          <thead>
            <tr>
              <th>Responsável Legal</th>
              <th>E-mail</th>
              <th>CNPJ</th>
              <th>Regra</th>
              <th>Data/Hora de Envio</th>
              <th>Ano/Mês</th>
            </tr>
          </thead>
          <tbody id="mensagens-body">
            {itens.map((al: Alerta, index: number) => (
              <tr key={`${al.email.paraExibicao()}-${al.regra.paraExibicao()}-${index}`}>
                <td style={{ fontWeight: 'bold' }}>{al.responsavelLegal}</td>
                <td>{al.email.paraExibicao()}</td>
                <td>{al.cnpj.paraExibicao()}</td>
                <td>
                  <span
                    className={`${styles.badge} ${
                      al.regra.ehCobranca() ? styles.badgeManual : styles.badgePendente
                    }`}
                  >
                    {al.regra.paraExibicao()}
                  </span>
                </td>
                <td>{al.dataHoraEnvio.paraFormatadoCompleto()}</td>
                <td>{al.mesAnoReferencia.paraExibicao()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {itens.length === 0 && (
        <div className={styles.emptyState} id="mensagens-empty">
          <p>Nenhuma mensagem enviada.</p>
        </div>
      )}
    </section>
  );
};
