import React, { useEffect } from 'react';
import styles from './ModalRlt.module.css';
import { LinhaDeRecesso } from '../../../application/read-models/LinhaDeRecesso';
import { DadosDoFormulario, FormularioDeOcorrencia } from './FormularioDeOcorrencia';

export interface ModalRltProps {
  readonly linha: LinhaDeRecesso | null;
  readonly onFechar: () => void;
  readonly onLancar: (dados: DadosDoFormulario) => Promise<void>;
}

/** Extrato de recesso do CONTRATO + Saldo Atual FORA da grade (docs/modulo-recesso/04 §4). */
export const ModalRlt: React.FC<ModalRltProps> = ({ linha, onFechar, onLancar }) => {
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  if (!linha) return null;

  const { contrato, fornecedor, extrato } = linha;
  // Mais recente primeiro — mesmo saldo de comSaldoCorrente(), só a ordem de exibição muda.
  const linhas = extrato.comSaldoCorrenteParaExibicao();

  return (
    <div
      className={styles.overlay}
      id="modal-rlt"
      onClick={(evento) => { if (evento.target === evento.currentTarget) onFechar(); }}
    >
      <div className={styles.card} role="dialog" aria-modal="true">
        <header className={styles.cabecalho}>
          <h2>Extrato de Recesso</h2>
          <button className={styles.fechar} onClick={onFechar} aria-label="Fechar">&times;</button>
        </header>

        {/* Bloco fixo — fora da área de rolagem do extrato, sempre visível junto ao cabeçalho. */}
        <div className={styles.fixoTopo}>
          <div className={styles.identificacao}>
            <p><strong>Razão Social:</strong> {fornecedor.empresa}</p>
            <p><strong>Contrato:</strong> {contrato.codContrato}</p>
            <p><strong>Empresa Vinculada:</strong> {contrato.nomeEmpresaResponsavel}</p>
          </div>

          <div className={styles.saldoAtual} id="saldo-atual">
            <span className={styles.saldoRotulo}>Saldo Atual</span>
            <span className={styles.saldoValor}>{extrato.saldoAtual().paraExibicao()}</span>
            <span className={styles.saldoBase} id="dia-mes-base">
              <span className={styles.saldoRotulo}>base</span>
              <span className={styles.saldoValor}>{contrato.diaEMesBase()}</span>
            </span>
          </div>
        </div>

        <div className={styles.corpo}>
          <div className={styles.responsivo}>
            <table className={styles.tabela} id="tabela-extrato">
              <thead>
                <tr>
                  <th>ID da Ocorrência</th>
                  <th>Cálculo</th>
                  <th>Competência</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Qtd</th>
                  <th>Quem Lançou</th>
                </tr>
              </thead>
              <tbody id="tabela-extrato-body">
                {linhas.map(({ ocorrencia }) => (
                  <tr
                    key={ocorrencia.id}
                    className={ocorrencia.autor.ehSistema() ? styles.automatico : ''}
                  >
                    <td className={styles.mono}>{ocorrencia.id}</td>
                    <td>{ocorrencia.dataDoCalculoFormatada()}</td>
                    <td>{ocorrencia.competencia.paraExibicao()}</td>
                    <td className={styles.descricao}>{ocorrencia.descricao}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${ocorrencia.tipo.ehCredito() ? styles.badgeCredito : styles.badgeDebito}`}
                      >
                        {ocorrencia.tipo.paraExibicao()}
                      </span>
                    </td>
                    <td className={styles.negrito}>{ocorrencia.quantidade.paraExibicao()}</td>
                    <td>{ocorrencia.autor.paraExibicao()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {extrato.vazio() && (
            <p className={styles.vazio}>Nenhuma ocorrência registrada para este contrato.</p>
          )}
        </div>

        {/* Footer fixo — fora da área de rolagem do extrato, sempre visível (docs/1-frontend-mockado/recesso/04 §5). */}
        <footer className={styles.rodape}>
          <h3 className={styles.tituloFormulario}>Nova Ocorrência</h3>
          <FormularioDeOcorrencia
            desabilitado={linha.estaInativo()}
            motivo={linha.motivoDaInatividade()}
            onLancar={onLancar}
          />
        </footer>
      </div>
    </div>
  );
};
