import React, { useState } from 'react';
import styles from './TabelaDeStatus.module.css';
import { LinhasDeStatus, PropsLinhaDeStatus } from '../../../domain/collections/LinhasDeStatus';

export interface TabelaDeStatusProps {
  readonly linhasGrid: LinhasDeStatus;
  readonly searchQuery: string;
  readonly statusFilter: string;
  readonly onAbrirModalPj: (email: string, nome: string, cnpj: string) => void;
}

export const TabelaDeStatus: React.FC<TabelaDeStatusProps> = ({
  linhasGrid,
  searchQuery,
  statusFilter,
  onAbrirModalPj
}) => {
  const [sortBy, setSortBy] = useState<string>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filtradas = linhasGrid.filtradasPor(statusFilter, searchQuery);
  const ordenadas = filtradas.ordenadasPor(sortBy, sortOrder);
  const itens = ordenadas.paraArray();

  const handleSort = (campo: string) => {
    if (sortBy === campo) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(campo);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (campo: string) => {
    if (sortBy !== campo) return '↕';
    return sortOrder === 'asc' ? '▲' : '▼';
  };

  const getBadgeClass = (statusStr: string) => {
    if (statusStr === 'Enviado') return styles.badgeEnviado;
    if (statusStr === 'Recebido') return styles.badgeRecebido;
    if (statusStr === 'Tratamento Manual') return styles.badgeManual;
    return styles.badgePendente;
  };

  return (
    <section className={styles.datagridSection}>
      <div className={styles.tableResponsive}>
        <table className={styles.datagridTable} id="fornecedores-table">
          <thead>
            <tr>
              <th title="Ver mensagens enviadas a este PJ">Msg</th>
              <th className={styles.sortable} onClick={() => handleSort('nome')}>
                Razão Social <span>{renderSortIcon('nome')}</span>
              </th>
              <th className={styles.sortable} onClick={() => handleSort('apelido')}>
                Nome Fantasia <span>{renderSortIcon('apelido')}</span>
              </th>
              <th className={styles.sortable} onClick={() => handleSort('funcionario')}>
                Responsável Legal <span>{renderSortIcon('funcionario')}</span>
              </th>
              <th className={styles.sortable} onClick={() => handleSort('cnpj')}>
                CNPJ <span>{renderSortIcon('cnpj')}</span>
              </th>
              <th>E-mail</th>
              <th className={styles.sortable} onClick={() => handleSort('status')}>
                Status <span>{renderSortIcon('status')}</span>
              </th>
              <th>Nº Chamado</th>
              <th>Abertura</th>
              <th>Finalização</th>
              <th>Tipo de Lançamento</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody id="table-body">
            {itens.map((row: PropsLinhaDeStatus) => (
              <tr
                key={row.id}
                className={row.status.ehTratamentoManual() ? styles.rowSelected : ''}
              >
                <td>
                  <button
                    className={styles.btnHistory}
                    title={`Ver mensagens enviadas a ${row.apelido}`}
                    onClick={() => onAbrirModalPj(row.email.paraExibicao(), row.apelido, row.cnpj.paraExibicao())}
                  >
                    ✉
                  </button>
                </td>
                <td style={{ fontWeight: 'bold' }}>{row.nome}</td>
                <td>{row.apelido}</td>
                <td>{row.funcionario}</td>
                <td>{row.cnpj.paraExibicao()}</td>
                <td>{row.email.paraExibicao()}</td>
                <td>
                  <span
                    className={`${styles.badge} ${getBadgeClass(row.status.paraExibicao())}`}
                    title={row.manualReason ?? undefined}
                  >
                    {row.status.paraExibicao()}
                  </span>
                </td>
                <td>{row.protocolo}</td>
                <td>{row.dataAbertura.paraFormatadoCurto()}</td>
                <td>{row.dataFinalizacao ? row.dataFinalizacao.paraFormatadoCurto() : '-'}</td>
                <td>{row.tipoLancamento.paraExibicao()}</td>
                <td>
                  {row.linkChamado ? (
                    <a
                      href={row.linkChamado}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkTomticket}
                    >
                      #{row.protocolo}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {itens.length === 0 && (
        <div className={styles.emptyState} id="table-empty">
          <p>Nenhum fornecedor encontrado para os filtros selecionados nesta competência.</p>
        </div>
      )}
    </section>
  );
};
