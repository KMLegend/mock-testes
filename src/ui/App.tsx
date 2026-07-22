import React, { useState, useMemo } from 'react';
import styles from './App.module.css';
import { Header } from './components/Header/Header';
import { FiltrosDaBusca } from './components/FiltrosDaBusca/FiltrosDaBusca';
import { HudDeModulos, ModuloAtivo } from './components/HudDeModulos/HudDeModulos';
import { ModuloRecesso } from './ModuloRecesso';
import { useRecesso } from './hooks/useRecesso';
import { TEXTOS_POR_MODULO } from './textosPorModulo';
import { Abas, AbaAtiva } from './components/Abas/Abas';
import { CardsDeResumo } from './components/CardsDeResumo/CardsDeResumo';
import { TabelaDeStatus } from './components/TabelaDeStatus/TabelaDeStatus';
import { TabelaDeMensagens } from './components/TabelaDeMensagens/TabelaDeMensagens';
import { ModalDeMensagens } from './components/ModalDeMensagens/ModalDeMensagens';
import { PainelDeSimulacao } from './components/PainelDeSimulacao/PainelDeSimulacao';
import { useCompetencia } from './hooks/useCompetencia';
import { useFiltros } from './hooks/useFiltros';
import { useStatusDaCompetencia } from './hooks/useStatusDaCompetencia';
import { useMensagens } from './hooks/useMensagens';
import { useDependencias } from './providers/DependenciasContext';
import { StatusNf } from '../domain/value-objects/StatusNf';

export const App: React.FC = () => {
  const { exportarPlanilha, exportarRecesso } = useDependencias();
  const { ano, mes, setAno, setMes, competencia } = useCompetencia();
  const { searchQuery, setSearchQuery, statusFilter, setStatusFilter } = useFiltros();
  const { linhasGrid, recarregar } = useStatusDaCompetencia(competencia);

  const mapaStatusRollup = useMemo(() => {
    const mapa = new Map<string, StatusNf>();
    for (const [emailKey, lista] of linhasGrid.agruparStatusPorEmail().entries()) {
      mapa.set(emailKey, lista[0]!);
    }
    return mapa;
  }, [linhasGrid]);

  const criterio = useMemo(
    () => ({ competencia, searchQuery, statusFilter, mapaStatusFornecedor: mapaStatusRollup }),
    [competencia, searchQuery, statusFilter, mapaStatusRollup]
  );

  const { alertas } = useMensagens(criterio);

  const [moduloAtivo, setModuloAtivo] = useState<ModuloAtivo>('notas-fiscais');
  const ehModuloNotasFiscais = moduloAtivo === 'notas-fiscais';
  const textos = TEXTOS_POR_MODULO[moduloAtivo];

  const recesso = useRecesso();
  const linhasRecesso = useMemo(
    () => recesso.linhas.filter(
      (linha) => linha.correspondeAoStatus(statusFilter) && linha.correspondeA(searchQuery)
    ),
    [recesso.linhas, statusFilter, searchQuery]
  );

  // Cada módulo tem seu domínio de status (Pendente/Enviado × Ativo/Inativo):
  // trocar de módulo aplica o status padrão do destino.
  const handleTrocarModulo = (modulo: ModuloAtivo): void => {
    setModuloAtivo(modulo);
    setStatusFilter(TEXTOS_POR_MODULO[modulo].statusPadrao);
  };

  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('status');
  const [modalState, setModalState] = useState<{
    aberto: boolean;
    email: string;
    nome: string;
    cnpj: string;
  }>({
    aberto: false,
    email: '',
    nome: '',
    cnpj: ''
  });

  const handleAbrirModalPj = (email: string, nome: string, cnpj: string) => {
    setModalState({
      aberto: true,
      email,
      nome,
      cnpj
    });
  };

  const handleFecharModal = () => {
    setModalState((prev) => ({ ...prev, aberto: false }));
  };

  const handleExportar = () => {
    if (!ehModuloNotasFiscais) {
      void exportarRecesso.executar(linhasRecesso);
      return;
    }
    const gridFiltrado = linhasGrid.filtradasPor(statusFilter, searchQuery);
    void exportarPlanilha.executar(gridFiltrado, alertas, competencia);
  };

  return (
    <>
      <Header />
      <main className={styles.appContent}>
        <section className={styles.pageTitleSection}>
          <h1 id="main-title">{textos.titulo}</h1>
          <p className={styles.subtitle}>{textos.subtitulo}</p>
        </section>

        <HudDeModulos moduloAtivo={moduloAtivo} onTrocarModulo={handleTrocarModulo} />

        <FiltrosDaBusca
          ano={ano}
          mes={mes}
          onAnoChange={setAno}
          onMesChange={setMes}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onExportar={handleExportar}
          mostrarAno={ehModuloNotasFiscais}
          mostrarMes={ehModuloNotasFiscais}
          opcoesStatus={textos.opcoesStatus}
          placeholderBusca={textos.placeholderBusca}
          {...(ehModuloNotasFiscais ? {} : {
            onAtualizar: recesso.atualizar,
            atualizando: recesso.atualizando
          })}
        />

        {!ehModuloNotasFiscais && (
          <ModuloRecesso controle={recesso} linhas={linhasRecesso} />
        )}

        {ehModuloNotasFiscais && (
        <>
        <Abas abaAtiva={abaAtiva} onTrocarAba={setAbaAtiva} />

        {abaAtiva === 'status' && (
          <div id="tab-status">
            <CardsDeResumo
              resumo={linhasGrid.resumoRollup()}
              onCardClick={setStatusFilter}
            />
            <TabelaDeStatus
              linhasGrid={linhasGrid}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              onAbrirModalPj={handleAbrirModalPj}
            />
          </div>
        )}

        {abaAtiva === 'mensagens' && (
          <div id="tab-mensagens">
            <TabelaDeMensagens alertas={alertas} />
          </div>
        )}

        <ModalDeMensagens
          aberto={modalState.aberto}
          emailPj={modalState.email}
          nomePj={modalState.nome}
          cnpjPj={modalState.cnpj}
          onFechar={handleFecharModal}
        />

        <PainelDeSimulacao onDataChange={recarregar} />
        </>
        )}
      </main>
    </>
  );
};
