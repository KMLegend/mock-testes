import React from 'react';
import styles from './FiltrosDaBusca.module.css';
import { SeletorDeCompetencia } from './SeletorDeCompetencia';

export interface OpcaoDeStatus {
  readonly valor: string;
  readonly rotulo: string;
}

/** Opções de status do módulo de Notas Fiscais (padrão). */
export const STATUS_NOTAS_FISCAIS: readonly OpcaoDeStatus[] = [
  { valor: 'Pendente', rotulo: 'Pendente' },
  { valor: 'Enviado', rotulo: 'Enviado' },
  { valor: 'Recebido', rotulo: 'Recebido' },
  { valor: 'Tratamento Manual', rotulo: 'Tratamento Manual' }
];

/** Opções de status do módulo de Recesso — domínio DIFERENTE do de Notas Fiscais. */
export const STATUS_RECESSO: readonly OpcaoDeStatus[] = [
  { valor: 'Ativo', rotulo: 'Ativo' },
  { valor: 'Inativo', rotulo: 'Inativo' }
];

export interface FiltrosDaBuscaProps {
  readonly ano: string;
  readonly mes: string;
  readonly onAnoChange: (ano: string) => void;
  readonly onMesChange: (mes: string) => void;
  readonly searchQuery: string;
  readonly onSearchChange: (query: string) => void;
  readonly statusFilter: string;
  readonly onStatusFilterChange: (status: string) => void;
  readonly onExportar: () => void;
  /** Recesso não é apurado por competência: Ano e Mês não se aplicam. */
  readonly mostrarAno?: boolean;
  readonly mostrarMes?: boolean;
  /** No Recesso o status virou ícone na grade — o select some. */
  readonly mostrarStatus?: boolean;
  readonly opcoesStatus?: readonly OpcaoDeStatus[];
  readonly placeholderBusca?: string;
  readonly mostrarExportar?: boolean;
  /** Dispara a rotina de acúmulo mensal (só o Recesso tem). */
  readonly onAtualizar?: () => void;
  readonly atualizando?: boolean;
}

export const FiltrosDaBusca: React.FC<FiltrosDaBuscaProps> = ({
  ano,
  mes,
  onAnoChange,
  onMesChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onExportar,
  mostrarAno = true,
  mostrarMes = true,
  mostrarStatus = true,
  opcoesStatus = STATUS_NOTAS_FISCAIS,
  placeholderBusca = 'Buscar por Nome, CNPJ (com ou sem máscara), E-mail ou Nº do chamado...',
  mostrarExportar = true,
  onAtualizar,
  atualizando = false
}) => {
  return (
    <section className={styles.controlsPanel}>
      <SeletorDeCompetencia
        ano={ano}
        mes={mes}
        onAnoChange={onAnoChange}
        onMesChange={onMesChange}
        mostrarAno={mostrarAno}
        mostrarMes={mostrarMes}
      />

      <div className={styles.searchFilters}>
        <div className={`${styles.formGroup} ${styles.searchGroup}`}>
          <label htmlFor="search-input">Buscar fornecedor</label>
          <input
            type="text"
            id="search-input"
            className={styles.formControl}
            placeholder={placeholderBusca}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {mostrarStatus && (
        <div className={styles.formGroup}>
          <label htmlFor="status-filter">Filtrar por Status</label>
          <select
            id="status-filter"
            className={styles.formControl}
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="all">Todos os status</option>
            {opcoesStatus.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>
            ))}
          </select>
        </div>
        )}
      </div>

      <div className={styles.exportActions}>
        {onAtualizar && (
          <button
            id="btn-atualizar"
            onClick={onAtualizar}
            className={styles.btnSecondary}
            disabled={atualizando}
            title="Recalcula o acúmulo mensal de recesso de todos os contratos"
          >
            {atualizando ? 'ATUALIZANDO...' : '↻ ATUALIZAR'}
          </button>
        )}
        {mostrarExportar && (
          <button id="btn-export-xlsx" onClick={onExportar} className={styles.btnSecondary}>
            EXCEL
          </button>
        )}
      </div>
    </section>
  );
};
