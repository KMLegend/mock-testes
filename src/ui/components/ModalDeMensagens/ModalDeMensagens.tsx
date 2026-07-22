import React, { useEffect, useState } from 'react';
import styles from './ModalDeMensagens.module.css';
import { Alerta } from '../../../domain/entities/Alerta';
import { Email } from '../../../domain/value-objects/Email';
import { useDependencias } from '../../providers/DependenciasContext';

export interface ModalDeMensagensProps {
  readonly aberto: boolean;
  readonly emailPj: string;
  readonly nomePj: string;
  readonly cnpjPj: string;
  readonly onFechar: () => void;
}

export const ModalDeMensagens: React.FC<ModalDeMensagensProps> = ({
  aberto,
  emailPj,
  nomePj,
  cnpjPj,
  onFechar
}) => {
  const { listarMensagensDoFornecedor } = useDependencias();
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    if (!aberto || !emailPj) return;

    listarMensagensDoFornecedor.executar(Email.de(emailPj)).then((res) => {
      setAlertas(res);
    });
  }, [aberto, emailPj, listarMensagensDoFornecedor]);

  useEffect(() => {
    if (!aberto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className={styles.modalOverlay}
      id="audit-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <h2>Mensagens enviadas ao PJ</h2>
          <button
            className={styles.btnClose}
            id="btn-close-modal"
            aria-label="Fechar"
            onClick={onFechar}
          >
            &times;
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalSupplierInfo}>
            <p>
              <strong>Fornecedor:</strong> {nomePj || '-'}
            </p>
            <p>
              <strong>CNPJ:</strong> {cnpjPj || '-'}
            </p>
            <p>
              <strong>E-mail:</strong> {emailPj || '-'}
            </p>
          </div>

          {alertas.length > 0 ? (
            <div className="table-responsive">
              <table className={styles.modalTable}>
                <thead>
                  <tr>
                    <th>Regra</th>
                    <th>Data/Hora de Envio</th>
                    <th>Ano/Mês</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody id="modal-table-body">
                  {alertas.map((al, index) => (
                    <tr key={`${al.regra.paraExibicao()}-${index}`}>
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
                      <td>{al.regra.ehCobranca() ? 'Cobrança' : 'Preventivo'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.modalEmpty} id="modal-empty-state">
              <p>Nenhuma mensagem enviada para este fornecedor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
