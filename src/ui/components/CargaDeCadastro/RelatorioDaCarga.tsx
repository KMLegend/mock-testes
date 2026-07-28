import React from 'react';
import styles from './CargaDeCadastro.module.css';
import { RelatorioDeImportacao } from '../../../application/ports/CargaDeCadastro';

export interface RelatorioDaCargaProps {
  readonly relatorio: RelatorioDeImportacao;
  readonly aplicado: boolean;
}

/** Contadores + tabela de erros. A tela nunca aplica em silêncio (docs/frontend/21 §2). */
export const RelatorioDaCarga: React.FC<RelatorioDaCargaProps> = ({ relatorio, aplicado }) => {
  const temErros = relatorio.erros.length > 0;

  return (
    <div className={styles.relatorio} id="relatorio-carga">
      <div className={styles.contadores}>
        <span className={styles.chip}>Fornecedores: <b>{relatorio.fornecedores.inseridos}</b> inseridos, <b>{relatorio.fornecedores.atualizados}</b> atualizados</span>
        <span className={styles.chip}>Contratos: <b>{relatorio.contratos.inseridos}</b> inseridos, <b>{relatorio.contratos.atualizados}</b> atualizados, <b>{relatorio.contratos.reativados ?? 0}</b> reativados, <b>{relatorio.contratos.desativados ?? 0}</b> desativados</span>
        <span className={styles.chip}><b>{relatorio.erros.length}</b> erros</span>
      </div>

      {temErros && (
        <>
          <p className={styles.mensagemAviso}>
            Nada foi gravado: corrija as linhas abaixo e envie a planilha de novo.
          </p>
          <div className={styles.responsivo}>
            <table className={styles.tabela} id="tabela-erros-carga">
              <thead>
                <tr>
                  <th>Aba</th>
                  <th>Linha</th>
                  <th>Campo</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.erros.map((erro, indice) => (
                  <tr key={`${erro.aba}-${erro.linha}-${erro.campo}-${indice}`}>
                    <td>{erro.aba}</td>
                    <td className={styles.mono}>{erro.linha}</td>
                    <td className={styles.mono}>{erro.campo}</td>
                    <td>{erro.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!temErros && aplicado && (
        <p className={styles.mensagemOk} id="carga-aplicada">
          Carga aplicada. A base de PJs foi atualizada nas telas de Notas Fiscais e Recesso.
        </p>
      )}

      {!temErros && !aplicado && (
        <p className={styles.mensagemOk}>
          Planilha válida. Confira os números e confirme a carga.
        </p>
      )}
    </div>
  );
};
