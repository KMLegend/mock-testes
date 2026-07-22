import { STATUS_NOTAS_FISCAIS, STATUS_RECESSO } from './components/FiltrosDaBusca/FiltrosDaBusca';

/**
 * Textos, opções e status inicial de cada módulo. Mapa em vez de ternários encadeados
 * na App (Object Calisthenics — evitar condicionais espalhadas por conhecimento de módulo).
 */
export const TEXTOS_POR_MODULO = {
  'notas-fiscais': {
    titulo: 'Status de Recebimento por Competência',
    subtitulo: 'Acompanhe a entrega de Notas Fiscais dos fornecedores integrados via Tomticket.',
    placeholderBusca: 'Buscar por Nome, CNPJ (com ou sem máscara), E-mail ou Nº do chamado...',
    opcoesStatus: STATUS_NOTAS_FISCAIS,
    statusPadrao: 'all'
  },
  recesso: {
    titulo: 'Gestão de Recesso',
    subtitulo:
      'Saldo de recesso por contrato, acumulado mensalmente conforme a proporção de cada um.',
    placeholderBusca:
      'Buscar por Razão Social, Nome Fantasia, Responsável Legal, CNPJ, Nº do contrato ou empresa vinculada...',
    opcoesStatus: STATUS_RECESSO,
    // Contratos encerrados e PJs inativos ficam fora da visão do dia a dia.
    statusPadrao: 'Ativo'
  }
} as const;
