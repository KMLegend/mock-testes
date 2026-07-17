// Lógica do frontend do Dashboard (Fase 1)
// Em conformidade com as regras de motor de status (docs/04) e identidade visual (docs/11)

import { listFornecedores, listChamados, listMensagens, resolverContrato } from './dataProvider.js';
import { mockChamados, mockFornecedores } from './mockData.js';

// --- DEDUÇÃO DE DATA CORRENTE (A-11) ---
const currentDate = new Date();
const currentYear = String(currentDate.getFullYear());
const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');

// --- ESTADO GLOBAL ---
let state = {
  selectedYear: currentYear,
  selectedMonth: currentMonth, // MM-AAAA será formado por select-mes + select-ano
  searchQuery: '',
  statusFilter: 'all',
  sortBy: 'nome',
  sortOrder: 'asc',
  
  // Cache de dados resolvidos para a renderização
  activeSuppliers: [],
  currentTickets: [],
  gridRows: [] // Linhas finais calculadas
};


// --- CONSTANTES E NORMALIZAÇÕES ---
const TOMTICKET_BASE_URL = "https://city.tomticket.com/chamado/";

// Normaliza e-mail
function normalizeEmail(email) {
  if (!email) return "";
  return email.trim().toLowerCase();
}

// Normaliza o Tipo de Lançamento (canônico com acento, tolerando variações)
function normalizeTipoLancamento(tipo) {
  if (!tipo) return "";
  const t = tipo.trim().toLowerCase();
  if (t === "contratual") return "Contratual";
  if (t === "reembolso plano de saude" || t === "reembolso plano de saúde") return "Reembolso plano de saúde";
  if (t === "ambas") return "Ambas";
  return tipo;
}

// Formata data ISO para DD/MM/AAAA HH:MM
function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr.replace(" ", "T")); // Trata fusos
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    return dateStr;
  }
}

// Formata data ISO curta DD/MM/AAAA
function formatDateShort(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

// --- MOTOR DE STATUS (LEFT JOIN CLIENT-SIDE) ---
async function computeStatusEngine() {
  const mesAnoReferencia = `${state.selectedMonth}-${state.selectedYear}`;
  
  // 1. Carrega dados do dataProvider
  const suppliers = await listFornecedores();
  const tickets = await listChamados(mesAnoReferencia);
  
  state.activeSuppliers = suppliers;
  state.currentTickets = tickets;

  // 2. Resolve os contratos de todos os chamados em paralelo
  const resolvedTickets = await Promise.all(tickets.map(async (t) => {
    const resolution = await resolverContrato(t);
    return {
      ...t,
      resolution
    };
  }));

  // 3. Monta o Left Join por email
  const rows = [];
  
  for (const pj of suppliers) {
    const pjEmailNormalized = normalizeEmail(pj.Email);
    // Encontra chamados deste fornecedor
    const pjTickets = resolvedTickets.filter(t => normalizeEmail(t.email) === pjEmailNormalized);

    if (pjTickets.length === 0) {
      // Cenário: Sem chamados -> PENDENTE
      rows.push({
        id: `pendente-${pj.Cod_Empresa}`,
        nome: pj.Empresa,
        apelido: pj.Apelido,
        funcionario: '-',
        email: pj.Email,
        cnpj: pj.CNPJ,
        status: 'Pendente',
        protocol: '-',
        dataAbertura: '-',
        dataFinalizacao: '-',
        tipoLancamento: '-',
        contratoCodigo: '-',
        contratoNome: '-',
        empresaResponsavel: '-',
        linkChamado: '',
        ticketId: null,
        manualReason: null
      });
    } else {
      // Cenário: Um ou mais chamados. Cada chamado gera exatamente 1 linha (inclusive "Ambas")
      for (const ticket of pjTickets) {
        let status = 'Enviado';
        let manualReason = null;

        if (ticket.end_date) {
          status = 'Recebido';
        }

        // Verifica se caiu em Tratamento Manual (CNPJ divergente ou ausente)
        if (ticket.resolution && ticket.resolution.status === 'manual_treatment') {
          status = 'Tratamento Manual';
          manualReason = ticket.resolution.reason;
        }

        const isResolved = ticket.resolution && ticket.resolution.status === 'resolved';
        const contrato = isResolved ? ticket.resolution.contrato : null;

        rows.push({
          id: ticket.id,
          nome: pj.Empresa,
          apelido: pj.Apelido,
          funcionario: ticket.name || '-',
          email: pj.Email,
          cnpj: pj.CNPJ,
          status: status,
          protocol: ticket.protocol,
          dataAbertura: ticket.creation_date,
          dataFinalizacao: ticket.end_date || null,
          tipoLancamento: normalizeTipoLancamento(ticket.tipo_de_lancamento),
          contratoCodigo: contrato ? contrato.Cod_Contrato : '-',
          contratoNome: contrato ? contrato.Nome_Contrato : '-',
          empresaResponsavel: contrato ? contrato.Nome_Empresa_Responsavel : '-',
          linkChamado: `${TOMTICKET_BASE_URL}${ticket.id}`,
          ticketId: ticket.id,
          manualReason: manualReason
        });
      }
    }
  }

  state.gridRows = rows;
  updateSummaryCounters();
  renderGrid();
  renderMensagens();
}

// --- ATUALIZAR CONTADORES DO TOPO (ROLLUP CONSOLIDADO) ---
function updateSummaryCounters() {
  const rows = state.gridRows;
  
  // Para os contadores, o rollup é por fornecedor (email)
  const rollup = {};

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!rollup[email]) {
      rollup[email] = [];
    }
    rollup[email].push(row.status);
  }

  let countTotal = Object.keys(rollup).length;
  let countPendente = 0;
  let countEnviado = 0;
  let countRecebido = 0;
  let countManual = 0;

  for (const [email, statuses] of Object.entries(rollup)) {
    if (statuses.includes('Tratamento Manual')) {
      countManual++;
    } else if (statuses.includes('Pendente')) {
      countPendente++;
    } else if (statuses.includes('Enviado')) {
      countEnviado++;
    } else if (statuses.every(s => s === 'Recebido')) {
      countRecebido++;
    } else {
      countEnviado++; // Default fallback
    }
  }

  document.getElementById('count-total').innerText = countTotal;
  document.getElementById('count-pendente').innerText = countPendente;
  document.getElementById('count-enviado').innerText = countEnviado;
  document.getElementById('count-recebido').innerText = countRecebido;
  document.getElementById('count-manual').innerText = countManual;
}

// --- RENDERIZAR GRID DE DADOS ---
function renderGrid() {
  const tbody = document.getElementById('table-body');
  const emptyState = document.getElementById('table-empty');
  tbody.innerHTML = '';

  // 1. Aplica filtros
  let filtered = state.gridRows.filter(row => {
    // Filtro de Status
    if (state.statusFilter !== 'all') {
      if (state.statusFilter === 'Tratamento Manual' && row.status !== 'Tratamento Manual') return false;
      if (state.statusFilter === 'Pendente' && row.status !== 'Pendente') return false;
      if (state.statusFilter === 'Enviado' && row.status !== 'Enviado') return false;
      if (state.statusFilter === 'Recebido' && row.status !== 'Recebido') return false;
    }

    // Filtro de Busca (Nome, CNPJ, Email ou Protocolo)
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchNome = row.nome.toLowerCase().includes(q);
      const matchCnpj = row.cnpj.includes(q);
      const matchEmail = row.email.toLowerCase().includes(q);
      const matchProtocol = row.protocol.includes(q);
      return matchNome || matchCnpj || matchEmail || matchProtocol;
    }

    return true;
  });

  // 2. Aplica ordenação
  filtered.sort((a, b) => {
    let valA = a[state.sortBy];
    let valB = b[state.sortBy];

    // Trata valores nulos ou vazios
    if (valA === '-' || valA === null) valA = '';
    if (valB === '-' || valB === null) valB = '';

    if (state.sortOrder === 'asc') {
      return valA.toString().localeCompare(valB.toString(), undefined, { numeric: true, sensitivity: 'base' });
    } else {
      return valB.toString().localeCompare(valA.toString(), undefined, { numeric: true, sensitivity: 'base' });
    }
  });

  // 3. Exibe estado vazio se necessário
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  // 4. Renderiza linhas
  filtered.forEach(row => {
    const tr = document.createElement('tr');
    
    // Define classe especial para linhas com status selecionados
    if (row.status === 'Tratamento Manual') {
      tr.classList.add('row-selected');
    }

    // Badge do status
    let badgeClass = 'badge-pendente';
    if (row.status === 'Enviado') badgeClass = 'badge-enviado';
    if (row.status === 'Recebido') badgeClass = 'badge-recebido';
    if (row.status === 'Tratamento Manual') badgeClass = 'badge-manual';

    const statusTitle = row.status === 'Tratamento Manual' && row.manualReason
      ? ` title="${row.manualReason.replace(/"/g, '&quot;')}"` : '';

    const linkHtml = row.linkChamado
      ? `<a href="${row.linkChamado}" target="_blank" class="link-tomticket">#${row.protocol}</a>`
      : '-';

    const esc = (v) => String(v ?? '').replace(/"/g, '&quot;');
    const cnpjFmt = row.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    tr.innerHTML = `
      <td class="font-bold" title="${esc(row.apelido)}">${row.apelido}</td>
      <td title="${esc(row.nome)}">${row.nome}</td>
      <td title="${esc(row.funcionario)}">${row.funcionario}</td>
      <td title="${esc(cnpjFmt)}">${cnpjFmt}</td>
      <td title="${esc(row.email)}">${row.email}</td>
      <td><span class="badge ${badgeClass}"${statusTitle}>${row.status}</span></td>
      <td>${row.protocol}</td>
      <td>${formatDateShort(row.dataAbertura)}</td>
      <td>${formatDateShort(row.dataFinalizacao)}</td>
      <td title="${esc(row.tipoLancamento)}">${row.tipoLancamento}</td>
      <td>${linkHtml}</td>
    `;

    tbody.appendChild(tr);
  });
}

// --- RENDERIZAR ABA DE MENSAGENS (histórico de alertas enviados) ---
async function renderMensagens() {
  const tbody = document.getElementById('mensagens-body');
  const emptyState = document.getElementById('mensagens-empty');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Busca via camada de dados (dataProvider) — trocável por API na Fase 2
  const alertas = await listMensagens();

  // Calcula o status consolidado de cada fornecedor para a competência atual (mesma regra de rollup)
  const providerStatus = {};
  const rollup = {};
  for (const row of state.gridRows) {
    const email = normalizeEmail(row.email);
    if (!rollup[email]) {
      rollup[email] = [];
    }
    rollup[email].push(row.status);
  }
  for (const [email, statuses] of Object.entries(rollup)) {
    if (statuses.includes('Tratamento Manual')) {
      providerStatus[email] = 'Tratamento Manual';
    } else if (statuses.includes('Pendente')) {
      providerStatus[email] = 'Pendente';
    } else if (statuses.includes('Enviado')) {
      providerStatus[email] = 'Enviado';
    } else if (statuses.every(s => s === 'Recebido')) {
      providerStatus[email] = 'Recebido';
    } else {
      providerStatus[email] = 'Enviado';
    }
  }

  // 1. Aplica filtros
  const filtered = alertas.filter(al => {
    // Filtro de Competência (Ano/Mês)
    const targetComp = `${state.selectedMonth}-${state.selectedYear}`;
    if (al.mes_ano_referencia !== targetComp) return false;

    // Filtro de Busca (Nome, CNPJ ou E-mail)
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchNome = al.nome.toLowerCase().includes(q);
      const matchCnpj = (al.cnpj || '').includes(q);
      const matchEmail = al.email.toLowerCase().includes(q);
      if (!matchNome && !matchCnpj && !matchEmail) return false;
    }

    // Filtro de Status (conforme o status do fornecedor na competência corrente)
    if (state.statusFilter !== 'all') {
      const emailNorm = normalizeEmail(al.email);
      const currentStatus = providerStatus[emailNorm] || 'Pendente';
      if (currentStatus !== state.statusFilter) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  filtered.forEach(al => {
    const tr = document.createElement('tr');
    const cnpjFmt = (al.cnpj || '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    tr.innerHTML = `
      <td class="font-bold">${al.nome}</td>
      <td>${al.email}</td>
      <td>${cnpjFmt}</td>
      <td><span class="badge ${al.regra === 'D+1' || al.regra === 'D+3' ? 'badge-manual' : 'badge-pendente'}">${al.regra}</span></td>
      <td>${formatDate(al.data_hora_envio)}</td>
      <td>${(al.mes_ano_referencia || '').replace('-', '/')}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- MÓDULO DE EXPORTAÇÃO (LADO DO CLIENTE) — somente Excel ---


// 2. Exportar para XLSX (Excel com Abas)
async function exportToXLSX() {
  if (typeof XLSX === 'undefined') {
    alert("Biblioteca SheetJS não carregou. Tente novamente em instantes.");
    return;
  }
  
  const filteredRows = getFilteredRowsForExport();
  const filteredAlerts = await getFilteredAlertsForExport();
  
  // Aba 1: Dados Gerais (mesmas colunas da tabela)
  const dataSheetRows = filteredRows.map(row => ({
    "Fornecedor / PJ": row.apelido,
    "Nome Empresa": row.nome,
    "Nome Funcionário": row.funcionario,
    "CNPJ": row.cnpj,
    "E-mail": row.email,
    "Status": row.status,
    "Nº Chamado": row.protocol === '-' ? '' : Number(row.protocol) || row.protocol,
    "Abertura": formatDateShort(row.dataAbertura),
    "Finalização": formatDateShort(row.dataFinalizacao),
    "Tipo de Lançamento": row.tipoLancamento,
    "Link": row.linkChamado || ""
  }));
  
  // Aba 2: Contratos (Apenas tipo de lançamento Contratual ou Ambas)
  // Filtrado conforme default D-07 (registros Contratual)
  const contractSheetRows = filteredRows
    .filter(row => row.tipoLancamento === 'Contratual' || row.tipoLancamento === 'Ambas')
    .map(row => ({
      "Nome Fornecedor": row.nome,
      "CNPJ": row.cnpj,
      "Código do Contrato": row.contratoCodigo,
      "Nome do Contrato": row.contratoNome,
      "Empresa Responsável (Tomador)": row.empresaResponsavel,
      "Status": row.status,
      "Nº Chamado": row.protocol
    }));

  // Aba 3: Mensagens Enviadas (Histórico de alertas)
  const alertsSheetRows = filteredAlerts.map(al => ({
    "Nome": al.nome,
    "E-mail": al.email,
    "CNPJ": (al.cnpj || '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
    "Regra": al.regra,
    "Data/Hora de Envio": formatDate(al.data_hora_envio),
    "Ano/Mês": (al.mes_ano_referencia || '').replace('-', '/')
  }));
    
  const wb = XLSX.utils.book_new();
  
  const wsData = XLSX.utils.json_to_sheet(dataSheetRows);
  const wsContracts = XLSX.utils.json_to_sheet(contractSheetRows);
  const wsAlerts = XLSX.utils.json_to_sheet(alertsSheetRows);
  
  XLSX.utils.book_append_sheet(wb, wsData, "Status Notas Fiscais");
  XLSX.utils.book_append_sheet(wb, wsContracts, "Contratos");
  XLSX.utils.book_append_sheet(wb, wsAlerts, "Mensagens Enviadas");
  
  XLSX.writeFile(wb, `status_notas_${state.selectedMonth}_${state.selectedYear}.xlsx`);
}


// Retorna as linhas do grid filtradas ativamente na UI
function getFilteredRowsForExport() {
  return state.gridRows.filter(row => {
    if (state.statusFilter !== 'all') {
      if (state.statusFilter === 'Tratamento Manual' && row.status !== 'Tratamento Manual') return false;
      if (state.statusFilter === 'Pendente' && row.status !== 'Pendente') return false;
      if (state.statusFilter === 'Enviado' && row.status !== 'Enviado') return false;
      if (state.statusFilter === 'Recebido' && row.status !== 'Recebido') return false;
    }
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchNome = row.nome.toLowerCase().includes(q);
      const matchCnpj = row.cnpj.includes(q);
      const matchEmail = row.email.toLowerCase().includes(q);
      const matchProtocol = row.protocol.includes(q);
      return matchNome || matchCnpj || matchEmail || matchProtocol;
    }
    return true;
  });
}

// Retorna os alertas filtrados ativamente na UI
async function getFilteredAlertsForExport() {
  const alertas = await listMensagens();

  const providerStatus = {};
  const rollup = {};
  for (const row of state.gridRows) {
    const email = normalizeEmail(row.email);
    if (!rollup[email]) {
      rollup[email] = [];
    }
    rollup[email].push(row.status);
  }
  for (const [email, statuses] of Object.entries(rollup)) {
    if (statuses.includes('Tratamento Manual')) {
      providerStatus[email] = 'Tratamento Manual';
    } else if (statuses.includes('Pendente')) {
      providerStatus[email] = 'Pendente';
    } else if (statuses.includes('Enviado')) {
      providerStatus[email] = 'Enviado';
    } else if (statuses.every(s => s === 'Recebido')) {
      providerStatus[email] = 'Recebido';
    } else {
      providerStatus[email] = 'Enviado';
    }
  }

  return alertas.filter(al => {
    const targetComp = `${state.selectedMonth}-${state.selectedYear}`;
    if (al.mes_ano_referencia !== targetComp) return false;

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchNome = al.nome.toLowerCase().includes(q);
      const matchCnpj = (al.cnpj || '').includes(q);
      const matchEmail = al.email.toLowerCase().includes(q);
      if (!matchNome && !matchCnpj && !matchEmail) return false;
    }

    if (state.statusFilter !== 'all') {
      const emailNorm = normalizeEmail(al.email);
      const currentStatus = providerStatus[emailNorm] || 'Pendente';
      if (currentStatus !== state.statusFilter) return false;
    }

    return true;
  });
}

function downloadFile(content, mimeType, fileName) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- EVENTOS E INICIALIZAÇÃO ---
function setupEventListeners() {
  // Ano/Mês
  document.getElementById('select-ano').addEventListener('change', (e) => {
    state.selectedYear = e.target.value;
    computeStatusEngine();
  });
  document.getElementById('select-mes').addEventListener('change', (e) => {
    state.selectedMonth = e.target.value;
    computeStatusEngine();
  });

  // Busca e Filtro de Status
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderGrid();
    renderMensagens();
  });
  document.getElementById('status-filter').addEventListener('change', (e) => {
    state.statusFilter = e.target.value;
    renderGrid();
    renderMensagens();
  });

  // Cliques nos Cards de Resumo para Filtro Rápido
  document.querySelectorAll('.card-status').forEach(card => {
    card.addEventListener('click', () => {
      const filterVal = card.getAttribute('data-filter');
      state.statusFilter = filterVal;
      document.getElementById('status-filter').value = filterVal;
      renderGrid();
      renderMensagens();
    });
  });

  // Ordenação da Tabela
  document.querySelectorAll('.datagrid-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (state.sortBy === col) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = col;
        state.sortOrder = 'asc';
      }
      
      // Atualiza ícones visuais nos headers
      document.querySelectorAll('.datagrid-table th .sort-icon').forEach(span => span.innerText = '↕');
      const icon = state.sortOrder === 'asc' ? '▲' : '▼';
      th.querySelector('.sort-icon').innerText = icon;

      renderGrid();
    });
  });

  // Navegação por abas (Status / Mensagens)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('tab-status').classList.toggle('hidden', tab !== 'status');
      document.getElementById('tab-mensagens').classList.toggle('hidden', tab !== 'mensagens');
      if (tab === 'mensagens') renderMensagens();
    });
  });

  // Exportação (somente Excel)
  document.getElementById('btn-export-xlsx').addEventListener('click', exportToXLSX);

  // Painel de Teste (QA Toggle)
  const testPanel = document.getElementById('test-panel');
  document.getElementById('btn-test-toggle').addEventListener('click', () => {
    testPanel.classList.toggle('collapsed');
  });
}

// --- PAINEL DE SIMULAÇÃO (QA) ---
function setupQAControls() {
  const cnpjSelect = document.getElementById('sim-cnpj-select');
  const chamadoSelect = document.getElementById('sim-chamado-select');
  
  // Popula select de chamados no painel de controle
  function repopulateChamadosSelect() {
    chamadoSelect.innerHTML = '';
    mockChamados.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.innerText = `#${c.protocol} - ${c.name} (${c.situation_description})`;
      chamadoSelect.appendChild(opt);
    });
  }

  // Popula select de e-mails para criação de chamado
  const newEmailSelect = document.getElementById('new-chamado-email');
  newEmailSelect.innerHTML = '';
  mockFornecedores.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.Email;
    opt.innerText = `${f.Apelido} (${f.Email})`;
    newEmailSelect.appendChild(opt);
  });

  repopulateChamadosSelect();

  // Ação 1: Mudar CNPJ do chamado 19166
  document.getElementById('btn-sim-update-cnpj').addEventListener('click', () => {
    const selectedCnpj = cnpjSelect.value;
    const cham19166 = mockChamados.find(c => c.protocol === "19166");
    if (cham19166) {
      if (selectedCnpj === "00000000000000") {
        cham19166.cnpj_anexo = "00000000000000"; // Inválido
      } else {
        cham19166.cnpj_anexo = selectedCnpj;
      }
      alert(`CNPJ extraído do chamado #19166 alterado para: ${selectedCnpj}\nO motor de status recalculou a desambiguação.`);
      computeStatusEngine();
    }
  });

  // Ação 2: Alternar Aberto/Finalizado
  document.getElementById('btn-sim-toggle-situation').addEventListener('click', () => {
    const ticketId = chamadoSelect.value;
    const ticket = mockChamados.find(c => c.id === ticketId);
    if (ticket) {
      if (ticket.situation_id === "5") {
        ticket.situation_id = "2";
        ticket.situation_description = "Em Andamento";
        ticket.end_date = null;
      } else {
        ticket.situation_id = "5";
        ticket.situation_description = "Finalizado";
        // Define data de finalização como agora
        const now = new Date();
        ticket.end_date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}-03:00`;
      }
      repopulateChamadosSelect();
      chamadoSelect.value = ticketId;
      computeStatusEngine();
    }
  });

  // Ação 3: Deletar chamado
  document.getElementById('btn-sim-delete-chamado').addEventListener('click', () => {
    const ticketId = chamadoSelect.value;
    const index = mockChamados.findIndex(c => c.id === ticketId);
    if (index !== -1) {
      if (confirm(`Tem certeza que deseja deletar o chamado #${mockChamados[index].protocol}?`)) {
        mockChamados.splice(index, 1);
        repopulateChamadosSelect();
        computeStatusEngine();
      }
    }
  });

  // Ação 4: Adicionar chamado
  document.getElementById('btn-sim-create-chamado').addEventListener('click', () => {
    const email = newEmailSelect.value;
    const tipo = document.getElementById('new-chamado-tipo').value;
    const ref = document.getElementById('new-chamado-referencia').value;
    
    const fornecedor = mockFornecedores.find(f => f.Email === email);
    const protocol = String(19170 + mockChamados.length);
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const now = new Date();
    const createdDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}-03:00`;

    const newTicket = {
      id: id,
      protocol: protocol,
      subject: `Envio de NF ${tipo} - Simulado`,
      creation_date: createdDate,
      end_date: null,
      name: fornecedor ? fornecedor.Apelido : "Simulado",
      email: email,
      situation_id: "2",
      situation_description: "Em Andamento",
      category_id: "8b9a123fcd09bd585714b53d5370f1a2",
      category_name: "Recebimento de Notas - PJ",
      tipo_de_lancamento: tipo,
      mes_referente: ref
    };

    mockChamados.push(newTicket);
    repopulateChamadosSelect();
    chamadoSelect.value = id;
    alert(`Chamado #${protocol} criado para ${email}.\nO grid e contadores foram recalculados.`);
    computeStatusEngine();
  });

  // Ação 5: Resetar
  document.getElementById('btn-sim-reset').addEventListener('click', () => {
    if (confirm("Resetar os chamados simulados para a base original?")) {
      window.location.reload();
    }
  });
}

// --- BOOTSTRAP ---
window.addEventListener('DOMContentLoaded', () => {
  // Ajusta os seletores da interface com a data corrente calculada (A-11)
  const selectAno = document.getElementById('select-ano');
  const selectMes = document.getElementById('select-mes');
  
  if (selectAno) selectAno.value = state.selectedYear;
  if (selectMes) selectMes.value = state.selectedMonth;

  setupEventListeners();
  setupQAControls();
  computeStatusEngine();
});

