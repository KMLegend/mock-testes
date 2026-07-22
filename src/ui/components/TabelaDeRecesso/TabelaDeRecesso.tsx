import React from 'react';
import styles from './TabelaDeRecesso.module.css';
import { LinhaDeRecesso } from '../../../application/read-models/LinhaDeRecesso';
import { IconeExtrato, IconeInformacao, IconeInativo } from '../Icones/Icones';

export interface TabelaDeRecessoProps {
  readonly linhas: readonly LinhaDeRecesso[];
  readonly onAbrirExtrato: (linha: LinhaDeRecesso) => void;
  readonly onAbrirInformacao: (linha: LinhaDeRecesso) => void;
}

/** Uma linha por CONTRATO. Status só aparece quando há algo a sinalizar (inativo). */
export const TabelaDeRecesso: React.FC<TabelaDeRecessoProps> = ({
  linhas,
  onAbrirExtrato,
  onAbrirInformacao
}) => {
  if (linhas.length === 0) {
    return (
      <div className={styles.vazio} id="recesso-vazio">
        <p>Nenhum contrato encontrado para os filtros selecionados.</p>
      </div>
    );
  }

  return (
    <section className={styles.secao}>
      <div className={styles.responsivo}>
        <table className={styles.tabela} id="tabela-recesso">
          <thead>
            <tr>
              <th>Razão Social</th>
              <th>Nº do Contrato</th>
              <th>Empresa Vinculada</th>
              {/* Sem rótulo visível, mas anunciada por leitor de tela. */}
              <th className={styles.colunaAcao} aria-label="Status" />
              <th className={styles.colunaAcoes}>Informações</th>
            </tr>
          </thead>
          <tbody id="tabela-recesso-body">
            {linhas.map((linha) => (
              <tr key={linha.chave()} className={linha.estaInativo() ? styles.inativo : ''}>
                <td>
                  <span className={styles.razaoSocial}>{linha.fornecedor.empresa}</span>
                  <span className={styles.legenda}>{linha.fornecedor.apelido}</span>
                </td>
                <td className={styles.mono}>{linha.contrato.codContrato}</td>
                <td>
                  <span>{linha.contrato.nomeEmpresaResponsavel}</span>
                  <span className={`${styles.legenda} ${styles.mono}`}>
                    {linha.contrato.empresaResponsavel}
                  </span>
                </td>
                <td className={styles.acao}>
                  {linha.estaInativo() && (
                    <span
                      className={styles.iconeInativo}
                      title={linha.motivoDaInatividade()}
                      role="img"
                      aria-label={linha.motivoDaInatividade()}
                    >
                      <IconeInativo />
                    </span>
                  )}
                </td>
                <td className={styles.acao}>
                  <div className={styles.grupoDeAcoes}>
                    <button
                      type="button"
                      className={styles.botaoIcone}
                      title={`Extrato de recesso do contrato ${linha.contrato.codContrato}`}
                      aria-label={`Extrato de recesso do contrato ${linha.contrato.codContrato}`}
                      onClick={() => onAbrirExtrato(linha)}
                    >
                      <IconeExtrato />
                    </button>
                    <button
                      type="button"
                      className={styles.botaoIcone}
                      title={`Informações do contrato ${linha.contrato.codContrato}`}
                      aria-label={`Informações do contrato ${linha.contrato.codContrato}`}
                      onClick={() => onAbrirInformacao(linha)}
                    >
                      <IconeInformacao />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
