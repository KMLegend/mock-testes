import React, { useState } from 'react';
import styles from './TabelaBaseDePjs.module.css';
import { ControleBaseDePjs, FiltroStatusPj } from '../../hooks/useBaseDePjs';
import { ItemBasePj } from '../../../application/read-models/ItemBasePj';

export interface TabelaBaseDePjsProps {
  readonly controle: ControleBaseDePjs;
}

export const TabelaBaseDePjs: React.FC<TabelaBaseDePjsProps> = ({ controle }) => {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const alternarExpansao = (codEmpresa: string) => {
    setExpandidos((anteriores) => {
      const proximo = new Set(anteriores);
      if (proximo.has(codEmpresa)) {
        proximo.delete(codEmpresa);
      } else {
        proximo.add(codEmpresa);
      }
      return proximo;
    });
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
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
          <span className={styles.chip}>
            Total: <b>{controle.itens.length}</b>
          </span>
          <span className={`${styles.chip} ${styles.chipAtivos}`}>
            Ativos: <b>{controle.totalAtivos}</b>
          </span>
          <span className={`${styles.chip} ${styles.chipInativos}`}>
            Inativos: <b>{controle.totalInativos}</b>
          </span>
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
            onChange={(e) => controle.setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filtroStatus}>
          <label htmlFor="filtro-status-pj" className={styles.filtroLabel}>
            Status:
          </label>
          <select
            id="filtro-status-pj"
            className={styles.selectStatus}
            value={controle.statusFilter}
            onChange={(e) => controle.setStatusFilter(e.target.value as FiltroStatusPj)}
          >
            <option value="Todos">Todos</option>
            <option value="Ativo">Ativos</option>
            <option value="Inativo">Inativos</option>
          </select>
        </div>
      </div>

      {controle.carregando ? (
        <div className={styles.vazio}>
          <p>Carregando base de PJs...</p>
        </div>
      ) : controle.itensFiltrados.length === 0 ? (
        <div className={styles.vazio} id="pjs-vazio">
          <p>Nenhum PJ encontrado para os filtros selecionados.</p>
        </div>
      ) : (
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
              {controle.itensFiltrados.map((item: ItemBasePj) => {
                const estaExpandido = expandidos.has(item.codEmpresa);
                return (
                  <React.Fragment key={item.codEmpresa}>
                    <tr className={!item.ativo ? styles.linhaInativo : ''}>
                      <td className={styles.mono}>{item.codEmpresa}</td>
                      <td>
                        <div className={styles.razaoSocial}>{item.razaoSocial}</div>
                        {item.nomeFantasia && item.nomeFantasia !== item.razaoSocial && (
                          <div className={styles.subtitulo}>{item.nomeFantasia}</div>
                        )}
                      </td>
                      <td>{item.responsavelLegal}</td>
                      <td className={styles.mono}>{item.cnpj}</td>
                      <td>{item.email}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            item.ativo ? styles.badgeAtivo : styles.badgeInativo
                          }`}
                        >
                          {item.statusTexto}
                        </span>
                      </td>
                      <td>
                        {item.totalContratos > 0 ? (
                          <button
                            type="button"
                            className={styles.botaoExpansao}
                            onClick={() => alternarExpansao(item.codEmpresa)}
                            title={`${estaExpandido ? 'Ocultar' : 'Ver'} ${item.totalContratos} contrato(s)`}
                          >
                            {estaExpandido ? '▲ Ocultar' : '▼'} ({item.totalContratos})
                          </button>
                        ) : (
                          <span className={styles.semContrato}>Sem contrato</span>
                        )}
                      </td>
                    </tr>

                    {estaExpandido && item.totalContratos > 0 && (
                      <tr className={styles.linhaDetalhes}>
                        <td colSpan={7}>
                          <div className={styles.detalhesContratos}>
                            <div className={styles.detalhesTitulo}>
                              Contratos vinculados a {item.razaoSocial}
                            </div>
                            <table className={styles.tabelaContratos}>
                              <thead>
                                <tr>
                                  <th>Nº Contrato</th>
                                  <th>Descrição / Nome</th>
                                  <th>Empresa Responsável</th>
                                  <th>Vigência</th>
                                  <th>Valor Mensal</th>
                                  <th>Proporção Recesso</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.contratos.map((contrato) => (
                                  <tr key={contrato.identificador()}>
                                    <td className={styles.mono}>{contrato.codContrato}</td>
                                    <td>{contrato.nomeContrato}</td>
                                    <td>{contrato.nomeEmpresaResponsavel}</td>
                                    <td>
                                      {contrato.dataInicio.paraFormatadoCurto()} até{' '}
                                      {contrato.dataFim.paraFormatadoCurto()}
                                    </td>
                                    <td>{formatarMoeda(contrato.valorMensal)}</td>
                                    <td>{contrato.proporcaoDeRecesso.paraExibicao()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
