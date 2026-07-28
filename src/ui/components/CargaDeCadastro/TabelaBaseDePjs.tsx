import React, { useState } from 'react';
import styles from './TabelaBaseDePjs.module.css';
import { ControleBaseDePjs, FiltroStatusPj } from '../../hooks/useBaseDePjs';
import { LinhaDePj } from './LinhaDePj';

export interface TabelaBaseDePjsProps {
  readonly controle: ControleBaseDePjs;
}

export const TabelaBaseDePjs: React.FC<TabelaBaseDePjsProps> = ({ controle }) => {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const hoje = new Date();

  const alternarExpansao = (codEmpresa: string): void => {
    setExpandidos((anteriores) => {
      const proximo = new Set(anteriores);
      if (proximo.has(codEmpresa)) proximo.delete(codEmpresa);
      else proximo.add(codEmpresa);
      return proximo;
    });
  };

  return (
    <div className={styles.container} id="secao-tabela-pjs">
      <div className={styles.cabecalho}>
        <div className={styles.tituloArea}>
          <h2 className={styles.titulo}>Base de PJs Cadastrados</h2>
          <span className={styles.subtitulo}>
            ({controle.itensFiltrados.length} de {controle.itens.length} registros)
          </span>
        </div>

        <div className={styles.contadores}>
          <span className={styles.chip}>Total: <b>{controle.itens.length}</b></span>
          <span className={`${styles.chip} ${styles.chipAtivos}`}>Ativos: <b>{controle.totalAtivos}</b></span>
          <span className={`${styles.chip} ${styles.chipInativos}`}>Inativos: <b>{controle.totalInativos}</b></span>
        </div>
      </div>

      <div className={styles.controles}>
        <div className={styles.buscaWrapper}>
          <span className={styles.iconeBusca}>🔍</span>
          <input
            type="text"
            id="busca-pjs"
            className={styles.inputBusca}
            placeholder="Buscar por Razão Social, Apelido, Responsável, CNPJ, E-mail..."
            value={controle.searchQuery}
            onChange={(evento) => controle.setSearchQuery(evento.target.value)}
          />
        </div>

        <div className={styles.filtroStatus}>
          <label htmlFor="filtro-status-pj" className={styles.filtroLabel}>Status:</label>
          <select
            id="filtro-status-pj"
            className={styles.selectStatus}
            value={controle.statusFilter}
            onChange={(evento) => controle.setStatusFilter(evento.target.value as FiltroStatusPj)}
          >
            <option value="Todos">Todos</option>
            <option value="Ativo">Ativos</option>
            <option value="Inativo">Inativos</option>
          </select>
        </div>
      </div>

      {controle.carregando && (
        <div className={styles.vazio}><p>Carregando base de PJs...</p></div>
      )}

      {!controle.carregando && controle.itensFiltrados.length === 0 && (
        <div className={styles.vazio} id="pjs-vazio">
          <p>Nenhum PJ encontrado para os filtros selecionados.</p>
        </div>
      )}

      {!controle.carregando && controle.itensFiltrados.length > 0 && (
        <div className={styles.tableResponsive}>
          <table className={styles.tabela} id="tabela-base-pjs">
            <thead>
              <tr>
                <th>Cód.</th>
                <th>Razão Social / Nome Fantasia</th>
                <th>Responsável Legal</th>
                <th>CNPJ</th>
                <th>E-mail</th>
                <th>Status</th>
                <th>Contratos</th>
              </tr>
            </thead>
            <tbody>
              {controle.itensFiltrados.map((item) => (
                <LinhaDePj
                  key={item.codEmpresa}
                  item={item}
                  hoje={hoje}
                  expandido={expandidos.has(item.codEmpresa)}
                  onAlternar={alternarExpansao}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
