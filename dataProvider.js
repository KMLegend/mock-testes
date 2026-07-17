// Camada de dados por interface (Fase 1)
// Abstrai o acesso aos dados para que a Fase 2 possa substituir por chamadas HTTP fetch() sem alterar a UI

import { mockFornecedores, mockContratos, mockChamados, mockAlertas } from './mockData.js';

// Mapa de CNPJs das Empresas Responsáveis (UAU / tomadores)
const CNPJ_TOMADORES = {
  "001": "14489313000160", // CITY INCORPORADORA LTDA
  "002": "17928511000170"  // SPE RESIDENCIAL PRAÇA DO SOL EMPREENDIMENTOS LTDA
};

// Lista de fornecedores ativos (origem HCM)
export function listFornecedores() {
  return new Promise((resolve) => {
    // Retorna apenas fornecedores ativos (ativo === 1)
    const ativos = mockFornecedores.filter(f => f.ativo === 1);
    resolve(ativos);
  });
}

// Lista de chamados por competência (origem Tomticket)
export function listChamados(mesAnoReferencia) {
  return new Promise((resolve) => {
    // mesAnoReferencia vem no formato de armazenamento "MM-AAAA" (ex: "07-2026")
    const chamados = mockChamados.filter(c => {
      // Normaliza o mês de referência do chamado
      const ref = parseMesReferencia(c.mes_referente, c.creation_date);
      return ref === mesAnoReferencia;
    });
    resolve(chamados);
  });
}

// Todas as mensagens/alertas enviados (origem Tabela de Alerta) — para a aba Mensagens
export function listMensagens() {
  return new Promise((resolve) => {
    const sorted = [...mockAlertas].sort(
      (a, b) => new Date(b.data_hora_envio) - new Date(a.data_hora_envio)
    );
    resolve(sorted);
  });
}

// Histórico de alertas por e-mail (origem Tabela de Alerta)
export function listAlertas(email) {
  return new Promise((resolve) => {
    if (!email) return resolve([]);
    const normalizedEmail = email.trim().toLowerCase();
    const alertas = mockAlertas.filter(a => a.email.trim().toLowerCase() === normalizedEmail);
    // Ordenar do mais recente para o mais antigo
    const sorted = [...alertas].sort((a, b) => new Date(b.data_hora_envio) - new Date(a.data_hora_envio));
    resolve(sorted);
  });
}

// Desambiguação de contrato (INotaCnpjExtractor)
// Caso 1: Se o PJ tem apenas 1 contrato, atribui diretamente.
// Caso 2: Se o PJ tem >1 contrato, busca pelo CNPJ do tomador extraído do anexo do chamado.
// Caso de borda: Se não houver match do CNPJ com os contratos do PJ, indica "Tratamento Manual".
export function resolverContrato(chamado) {
  return new Promise((resolve) => {
    const normalizedEmail = chamado.email.trim().toLowerCase();
    
    // 1. Encontra o fornecedor associado
    const fornecedor = mockFornecedores.find(f => f.Email.trim().toLowerCase() === normalizedEmail);
    if (!fornecedor) {
      resolve({ status: 'manual_treatment', reason: 'Fornecedor não cadastrado no HCM' });
      return;
    }

    // 2. Encontra os contratos daquele fornecedor
    const contratos = mockContratos.filter(c => c.Cod_empresa === fornecedor.Cod_Empresa);

    if (contratos.length === 0) {
      resolve({ status: 'manual_treatment', reason: 'Nenhum contrato ativo encontrado no HCM' });
      return;
    }

    // Caso 1: Apenas 1 contrato cadastrado -> Atribui diretamente
    if (contratos.length === 1) {
      resolve({ status: 'resolved', contrato: contratos[0] });
      return;
    }

    // Caso 2: Múltiplos contratos -> Dispara a desambiguação por CNPJ do anexo (simulado)
    const cnpjAnexo = chamado.cnpj_anexo;
    if (!cnpjAnexo) {
      resolve({ status: 'manual_treatment', reason: 'Múltiplos contratos ativos e nenhum CNPJ extraído do anexo' });
      return;
    }

    // Procura qual contrato corresponde ao CNPJ da Empresa Responsável (Tomador)
    const contratoMatch = contratos.find(c => {
      const cnpjTomador = CNPJ_TOMADORES[c.Empresa_Responsavel];
      return cnpjTomador === cnpjAnexo;
    });

    if (contratoMatch) {
      resolve({ status: 'resolved', contrato: contratoMatch });
    } else {
      resolve({ 
        status: 'manual_treatment', 
        reason: `CNPJ extraído (${cnpjAnexo}) não corresponde a nenhum dos contratos do fornecedor (${contratos.map(c => c.Cod_Contrato).join(', ')})`
      });
    }
  });
}

// Helper para tratar/normalizar o Mês Referente vindo do chamado
function parseMesReferencia(mesReferente, creationDate) {
  if (!mesReferente) {
    // fallback para o mês de criação
    if (!creationDate) return "";
    const date = new Date(creationDate);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const aaaa = date.getFullYear();
    return `${mm}-${aaaa}`;
  }

  // Exemplos suportados:
  // "07/2026" -> "07-2026"
  // "07-2026" -> "07-2026"
  // "2026-07" -> "07-2026"
  // "Julho/2026" -> "07-2026"
  const clean = mesReferente.trim();

  // Caso: MM-AAAA ou MM/AAAA
  const matchSlashOrDash = clean.match(/^(\d{2})[\/\-](\d{4})$/);
  if (matchSlashOrDash) {
    return `${matchSlashOrDash[1]}-${matchSlashOrDash[2]}`;
  }

  // Caso: AAAA-MM
  const matchYearFirst = clean.match(/^(\d{4})-(\d{2})$/);
  if (matchYearFirst) {
    return `${matchYearFirst[2]}-${matchYearFirst[1]}`;
  }

  // Caso textual: Julho/2026 ou Junho 2026
  const mesesExtenso = {
    "janeiro": "01", "fevereiro": "02", "março": "03", "abril": "04",
    "maio": "05", "junho": "06", "julho": "07", "agosto": "08",
    "setembro": "09", "outubro": "10", "novembro": "11", "dezembro": "12"
  };

  const cleanLower = clean.toLowerCase();
  for (const [nomeMes, numMes] of Object.entries(mesesExtenso)) {
    if (cleanLower.includes(nomeMes)) {
      const matchYear = cleanLower.match(/\d{4}/);
      if (matchYear) {
        return `${numMes}-${matchYear[0]}`;
      }
    }
  }

  // Caso não bata em nenhum formato, extrai o ano e tenta usar o mês de creationDate
  const matchYear = clean.match(/\d{4}/);
  if (matchYear && creationDate) {
    const date = new Date(creationDate);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${mm}-${matchYear[0]}`;
  }

  // Fallback final
  return "";
}
