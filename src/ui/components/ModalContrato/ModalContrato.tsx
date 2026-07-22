import React, { useEffect } from 'react';
import styles from './ModalContrato.module.css';
import { LinhaDeRecesso } from '../../../application/read-models/LinhaDeRecesso';
import { FormularioDeEncerramento } from './FormularioDeEncerramento';

export interface ModalContratoProps {
  readonly linha: LinhaDeRecesso | null;
  readonly onFechar: () => void;
  readonly onEncerrar: (dataDaRescisao: string) => Promise<void>;
}

/** Informações do contrato (docs/modulo-recesso/04): dados cadastrais + encerramento. */
export const ModalContrato: React.FC<ModalContratoProps> = ({ linha, onFechar, onEncerrar }) => {
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  if (!linha) return null;

  const { contrato, fornecedor } = linha;
  const encerrado = linha.encerradoEm;

  return (
    <div
      className={styles.overlay}
      id="modal-contrato"
      onClick={(evento) => { if (evento.target === evento.currentTarget) onFechar(); }}
    >
      <div className={styles.card} role="dialog" aria-modal="true" aria-labelledby="titulo-contrato">
        <header className={styles.cabecalho}>
          <h2 id="titulo-contrato">Informações do Contrato</h2>
          <button className={styles.fechar} onClick={onFechar} aria-label="Fechar">&times;</button>
        </header>

        <div className={styles.corpo}>
          <dl className={styles.dados} id="dados-contrato">
            <div className={styles.item}>
              <dt>ID do Contrato</dt>
              <dd className={styles.mono}>{contrato.codContrato}</dd>
            </div>
            <div className={styles.item}>
              <dt>Razão Social</dt>
              <dd>{fornecedor.empresa}</dd>
            </div>
            <div className={styles.item}>
              <dt>CNPJ</dt>
              <dd className={styles.mono}>{fornecedor.cnpj.paraExibicao()}</dd>
            </div>
            <div className={styles.item}>
              <dt>Responsável Legal</dt>
              <dd>{fornecedor.responsavelLegal}</dd>
            </div>
            <div className={styles.item}>
              <dt>Empresa Vinculada</dt>
              <dd>{contrato.nomeEmpresaResponsavel}</dd>
            </div>
            <div className={styles.item}>
              <dt>Início do Contrato</dt>
              <dd>{contrato.dataInicio.paraFormatadoCurto()}</dd>
            </div>
            <div className={styles.item}>
              <dt>Fim do Contrato</dt>
              <dd>{contrato.dataFim.paraFormatadoCurto()}</dd>
            </div>
            <div className={styles.item}>
              <dt>Proporção do Recesso</dt>
              <dd>{contrato.proporcaoDeRecesso.paraExibicao()}</dd>
            </div>
          </dl>

          <section className={styles.encerramento}>
            <h3>Encerramento de Contrato</h3>
            {encerrado ? (
              <p className={styles.jaEncerrado} id="aviso-encerrado">
                Contrato encerrado em {encerrado.toLocaleDateString('pt-BR')}. O saldo foi zerado e
                novos lançamentos estão bloqueados.
              </p>
            ) : (
              <FormularioDeEncerramento
                nomeDoContrato={`${contrato.codContrato} — ${fornecedor.empresa}`}
                onEncerrar={onEncerrar}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
