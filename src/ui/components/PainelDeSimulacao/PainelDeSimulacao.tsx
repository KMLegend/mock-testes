import React, { useState, useEffect } from 'react';
import styles from './PainelDeSimulacao.module.css';
import { useDependencias } from '../../providers/DependenciasContext';
import { Chamado } from '../../../domain/entities/Chamado';
import { Fornecedor } from '../../../domain/entities/Fornecedor';
import { Cnpj } from '../../../domain/value-objects/Cnpj';
import { Email } from '../../../domain/value-objects/Email';
import { DataHora } from '../../../domain/value-objects/DataHora';
import { TipoLancamento } from '../../../domain/value-objects/TipoLancamento';
import { Competencia } from '../../../domain/value-objects/Competencia';

export interface PainelDeSimulacaoProps {
  readonly onDataChange: () => void;
}

export const PainelDeSimulacao: React.FC<PainelDeSimulacaoProps> = ({ onDataChange }) => {
  const { chamadoRepo, fornecedorRepo } = useDependencias();
  const [colapsado, setColapsado] = useState<boolean>(true);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const [cnpjExtraido19166, setCnpjExtraido19166] = useState<string>('17928511000170');
  const [chamadoSelecionadoId, setChamadoSelecionadoId] = useState<string>('');

  const [novoEmail, setNovoEmail] = useState<string>('');
  const [novoTipo, setNovoTipo] = useState<string>('Contratual');
  const [novaReferencia, setNovaReferencia] = useState<string>('07-2026');

  const carregarDados = React.useCallback(() => {
    chamadoRepo.todos().then((chams) => {
      setChamados(chams);
      if (chams.length > 0 && !chamadoSelecionadoId && chams[0]) {
        setChamadoSelecionadoId(chams[0].id);
      }
    });

    fornecedorRepo.todos().then((forns) => {
      setFornecedores(forns);
      if (forns.length > 0 && !novoEmail && forns[0]) {
        setNovoEmail(forns[0].email.paraExibicao());
      }
    });
  }, [chamadoRepo, fornecedorRepo, chamadoSelecionadoId, novoEmail]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleMudarCnpj = async () => {
    const cham19166 = chamados.find((c) => c.protocolo === '19166');
    if (cham19166) {
      const novoChamado = new Chamado({
        ...cham19166,
        id: cham19166.id,
        protocolo: cham19166.protocolo,
        assunto: cham19166.assunto,
        dataCriacao: cham19166.dataCriacao,
        dataFinalizacao: cham19166.dataFinalizacao,
        nomeSolicitante: cham19166.nomeSolicitante,
        email: cham19166.email,
        situacaoId: cham19166.situacaoId,
        situacaoDescricao: cham19166.situacaoDescricao,
        categoriaId: cham19166.categoriaId,
        categoriaNome: cham19166.categoriaNome,
        tipoLancamento: cham19166.tipoLancamento,
        mesReferente: cham19166.mesReferente,
        cnpjAnexo: Cnpj.de(cnpjExtraido19166)
      });

      await chamadoRepo.atualizar(novoChamado);
      alert(`CNPJ do chamado #19166 alterado para: ${cnpjExtraido19166}`);
      carregarDados();
      onDataChange();
    }
  };

  const handleAlternarSituacao = async () => {
    const ticket = chamados.find((c) => c.id === chamadoSelecionadoId);
    if (!ticket) return;

    const estaFinalizado = ticket.ehFinalizado();
    const novaSituacaoId = estaFinalizado ? '2' : '5';
    const novaSituacaoDesc = estaFinalizado ? 'Em Andamento' : 'Finalizado';
    const dataFim = estaFinalizado ? null : DataHora.de(new Date().toISOString());

    const novoChamado = new Chamado({
      ...ticket,
      id: ticket.id,
      protocolo: ticket.protocolo,
      assunto: ticket.assunto,
      dataCriacao: ticket.dataCriacao,
      dataFinalizacao: dataFim,
      nomeSolicitante: ticket.nomeSolicitante,
      email: ticket.email,
      situacaoId: novaSituacaoId,
      situacaoDescricao: novaSituacaoDesc,
      categoriaId: ticket.categoriaId,
      categoriaNome: ticket.categoriaNome,
      tipoLancamento: ticket.tipoLancamento,
      mesReferente: ticket.mesReferente,
      cnpjAnexo: ticket.cnpjAnexo ?? null
    });

    await chamadoRepo.atualizar(novoChamado);
    carregarDados();
    onDataChange();
  };

  const handleDeletarChamado = async () => {
    if (!chamadoSelecionadoId) return;
    await chamadoRepo.remover(chamadoSelecionadoId);
    carregarDados();
    onDataChange();
  };

  const handleCriarChamado = async () => {
    const fornecedor = fornecedores.find((f) => f.email.paraExibicao() === novoEmail);
    const protocolo = String(19170 + chamados.length);
    const id = Math.random().toString(36).substring(2, 15);

    const novoTicket = new Chamado({
      id,
      protocolo,
      assunto: `Envio de NF ${novoTipo} - Simulado`,
      dataCriacao: DataHora.de(new Date().toISOString()),
      dataFinalizacao: null,
      nomeSolicitante: fornecedor ? fornecedor.apelido : 'Simulado',
      email: Email.de(novoEmail),
      situacaoId: '2',
      situacaoDescricao: 'Em Andamento',
      categoriaId: 'cat1',
      categoriaNome: 'Recebimento de Notas - PJ',
      tipoLancamento: TipoLancamento.de(novoTipo),
      mesReferente: Competencia.deTextoLivre(novaReferencia)
    });

    await chamadoRepo.salvar(novoTicket);
    alert(`Chamado #${protocolo} criado para ${novoEmail}`);
    carregarDados();
    onDataChange();
  };

  const handleResetar = async () => {
    if (window.confirm('Resetar a base de chamados simulados para a original?')) {
      await chamadoRepo.resetar();
      carregarDados();
      onDataChange();
    }
  };

  return (
    <div
      className={`${styles.testPanel} ${colapsado ? styles.collapsed : ''}`}
      id="test-panel"
    >
      <button
        className={styles.testPanelToggle}
        id="btn-test-toggle"
        onClick={() => setColapsado(!colapsado)}
      >
        <span>⚙️</span>
        <span>Painel de Simulação (QA)</span>
      </button>

      <div className={styles.testPanelContent}>
        <h3>Simulação de Eventos em Tempo Real</h3>
        <p className={styles.panelDesc}>
          Simule ações dos fornecedores e da integração Tomticket para ver o recálculo imediato na UI.
        </p>

        <div className={styles.simGroup}>
          <h4>1. Desambiguação (Carlos Santos)</h4>
          <label htmlFor="sim-cnpj-select">CNPJ extraído do chamado #19166:</label>
          <select
            id="sim-cnpj-select"
            className={styles.formControl}
            value={cnpjExtraido19166}
            onChange={(e) => setCnpjExtraido19166(e.target.value)}
          >
            <option value="17928511000170">SPE Praça do Sol (Contrato 102)</option>
            <option value="14489313000160">CITY INCORPORADORA (Contrato 101)</option>
            <option value="00000000000000">CNPJ Inválido (Cair em Manual)</option>
          </select>
          <button
            id="btn-sim-update-cnpj"
            className={`${styles.btnSm} ${styles.btnPrimary}`}
            onClick={handleMudarCnpj}
          >
            Mudar CNPJ
          </button>
        </div>

        <div className={styles.simGroup}>
          <h4>2. Ações do Tomticket</h4>
          <label htmlFor="sim-chamado-select">Selecionar chamado:</label>
          <select
            id="sim-chamado-select"
            className={styles.formControl}
            value={chamadoSelecionadoId}
            onChange={(e) => setChamadoSelecionadoId(e.target.value)}
          >
            {chamados.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.protocolo} - {c.nomeSolicitante} ({c.situacaoDescricao})
              </option>
            ))}
          </select>
          <div className={styles.simButtonRow}>
            <button
              id="btn-sim-toggle-situation"
              className={`${styles.btnSm} ${styles.btnSecondary}`}
              onClick={handleAlternarSituacao}
            >
              Alternar Status
            </button>
            <button
              id="btn-sim-delete-chamado"
              className={`${styles.btnSm} ${styles.btnDanger}`}
              onClick={handleDeletarChamado}
            >
              Deletar
            </button>
          </div>
        </div>

        <div className={styles.simGroup}>
          <h4>3. Criar Novo Chamado</h4>
          <div>
            <label htmlFor="new-chamado-email">E-mail do Fornecedor:</label>
            <select
              id="new-chamado-email"
              className={styles.formControl}
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
            >
              {fornecedores.map((f) => (
                <option key={f.codEmpresa} value={f.email.paraExibicao()}>
                  {f.apelido} ({f.email.paraExibicao()})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-chamado-tipo">Tipo de Lançamento:</label>
            <select
              id="new-chamado-tipo"
              className={styles.formControl}
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value)}
            >
              <option value="Contratual">Contratual</option>
              <option value="Reembolso plano de saude">Reembolso plano de saude (não normalizado)</option>
              <option value="Ambas">Ambas</option>
            </select>
          </div>
          <div>
            <label htmlFor="new-chamado-referencia">Mês Referente:</label>
            <input
              type="text"
              id="new-chamado-referencia"
              className={styles.formControl}
              value={novaReferencia}
              onChange={(e) => setNovaReferencia(e.target.value)}
            />
          </div>
          <button
            id="btn-sim-create-chamado"
            className={`${styles.btnSm} ${styles.btnPrimary} ${styles.btnBlock}`}
            onClick={handleCriarChamado}
          >
            Adicionar Chamado
          </button>
        </div>

        <button
          id="btn-sim-reset"
          className={`${styles.btnSm} ${styles.btnOutlineDanger} ${styles.btnBlock}`}
          onClick={handleResetar}
        >
          Resetar Base
        </button>
      </div>
    </div>
  );
};
