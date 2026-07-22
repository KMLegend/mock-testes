import { Fornecedor } from '../../../domain/entities/Fornecedor';
import { Contrato } from '../../../domain/entities/Contrato';
import { Chamado } from '../../../domain/entities/Chamado';
import { Alerta } from '../../../domain/entities/Alerta';
import { Cnpj } from '../../../domain/value-objects/Cnpj';
import { Email } from '../../../domain/value-objects/Email';
import { DataHora } from '../../../domain/value-objects/DataHora';
import { TipoLancamento } from '../../../domain/value-objects/TipoLancamento';
import { Competencia } from '../../../domain/value-objects/Competencia';
import { RegraAlerta } from '../../../domain/value-objects/RegraAlerta';
import { ProporcaoDeRecesso } from '../../../domain/value-objects/ProporcaoDeRecesso';

export const CNPJ_TOMADORES = new Map<string, string>([
  ['001', '14489313000160'], // CITY INCORPORADORA LTDA
  ['002', '17928511000170']  // SPE RESIDENCIAL PRAÇA DO SOL
]);

export const mockFornecedoresData: Fornecedor[] = [
  new Fornecedor({
    codEmpresa: '012',
    empresa: 'KEVIN MAYKEL AGOSTINHO GOMES LTDA',
    apelido: 'KEVIN MAYKEL',
    responsavelLegal: 'Kevin Maykel',
    email: Email.de('kevin.maykel@cityinc.com.br'),
    tipoInscricao: '1',
    cnpj: Cnpj.de('12345678901234'),
    ativo: true
  }),
  new Fornecedor({
    codEmpresa: '013',
    empresa: 'JOÃO SILVA SERVIÇOS LTDA',
    apelido: 'João Silva',
    responsavelLegal: 'João Silva',
    email: Email.de('joao.silva@cityinc.com.br'),
    tipoInscricao: '1',
    cnpj: Cnpj.de('98765432101234'),
    ativo: true
  }),
  new Fornecedor({
    codEmpresa: '014',
    empresa: 'MARIA SOUZA CONSULTORIA LTDA',
    apelido: 'Maria Souza',
    responsavelLegal: 'Maria Souza',
    email: Email.de('maria.souza@cityinc.com.br'),
    tipoInscricao: '1',
    cnpj: Cnpj.de('87654321098765'),
    ativo: true
  }),
  new Fornecedor({
    codEmpresa: '015',
    empresa: 'CARLOS SANTOS SERVICOS LTDA',
    apelido: 'CARLOS SANTOS',
    responsavelLegal: 'Carlos Santos',
    email: Email.de('carlos.santos@cityinc.com.br'),
    tipoInscricao: '1',
    cnpj: Cnpj.de('33333333000133'),
    ativo: true
  }),
  new Fornecedor({
    codEmpresa: '016',
    empresa: 'PEDRO PEDROSA ENGENHARIA LTDA',
    apelido: 'Pedro Pedrosa',
    responsavelLegal: 'Pedro Pedrosa',
    email: Email.de('pedro.pedrosa@cityinc.com.br'),
    tipoInscricao: '1',
    cnpj: Cnpj.de('11112222333344'),
    ativo: true
  }),
  new Fornecedor({
    codEmpresa: '017',
    empresa: 'FORNECEDOR INATIVO LTDA',
    apelido: 'Inativo',
    responsavelLegal: 'Fornecedor Inativo',
    email: Email.de('inativo@cityinc.com.br'),
    tipoInscricao: '1',
    cnpj: Cnpj.de('99999999999999'),
    ativo: false
  })
];

/**
 * Datas de início espalhadas ao longo do ano DE PROPÓSITO (não em 01/01): o período
 * aquisitivo é ancorado no início do contrato, e datas todas em 01/01 escondiam erros
 * de ancoragem e de fuso horário. Ver docs/modulo-recesso/07 §5.1.
 *
 * Valores fixos, não sorteados em runtime — o saldo esperado de cada PJ precisa ser
 * reproduzível entre recargas e entre testes.
 *
 * Cenários cobertos (o acúmulo é mensal: 2,5 dias × proporção do contrato):
 *   012  15/03/2023  100%  → dia base 15
 *   013  01/06/2023  100%  → dia base 01
 *   014  23/09/2021  100%  → contrato mais antigo, maior saldo
 *   015  29/02/2024   40%  → bissexto: competência cai em 28/02 nos meses curtos
 *   015  05/11/2024   60%  → mesmo PJ, segundo contrato: 40% + 60% = 100%
 *   016  18/08/2025  100%  → contrato recente, saldo baixo
 */
export const mockContratosData: Contrato[] = [
  new Contrato({
    codEmpresa: '012',
    codContrato: 'CONTRATO-012-A',
    nomeContrato: 'CONTRATO KEVIN - ADMIN',
    dataInicio: DataHora.de('2023-03-15'),
    dataFim: DataHora.de('2026-12-31'),
    valorMensal: 5000,
    empresaResponsavel: '001',
    nomeEmpresaResponsavel: 'CITY INCORPORADORA LTDA'
  }),
  new Contrato({
    codEmpresa: '013',
    codContrato: 'CONTRATO-013-A',
    nomeContrato: 'CONTRATO JOAO - TI',
    dataInicio: DataHora.de('2023-06-01'),
    dataFim: DataHora.de('2026-12-31'),
    valorMensal: 4500,
    empresaResponsavel: '001',
    nomeEmpresaResponsavel: 'CITY INCORPORADORA LTDA'
  }),
  new Contrato({
    codEmpresa: '014',
    codContrato: 'CONTRATO-014-A',
    nomeContrato: 'CONTRATO MARIA - MKT',
    dataInicio: DataHora.de('2021-09-23'),
    dataFim: DataHora.de('2026-12-31'),
    valorMensal: 6000,
    empresaResponsavel: '001',
    nomeEmpresaResponsavel: 'CITY INCORPORADORA LTDA'
  }),
  new Contrato({
    codEmpresa: '015',
    codContrato: '101',
    nomeContrato: 'SERVIÇOS - CITY INCORP',
    // 29/02 de ano bissexto: a competência mensal precisa cair em 28/02 nos meses curtos
    dataInicio: DataHora.de('2024-02-29'),
    dataFim: DataHora.de('2026-12-31'),
    valorMensal: 10000,
    empresaResponsavel: '001',
    nomeEmpresaResponsavel: 'CITY INCORPORADORA LTDA',
    // P-09: PJ em dois contratos — o direito é repartido, não duplicado (40% + 60% = 100%)
    proporcaoDeRecesso: ProporcaoDeRecesso.de(40)
  }),
  new Contrato({
    codEmpresa: '015',
    codContrato: '102',
    nomeContrato: 'SERVIÇOS - SPE PRAÇA DO SOL',
    dataInicio: DataHora.de('2024-11-05'),
    dataFim: DataHora.de('2026-12-31'),
    valorMensal: 15000,
    empresaResponsavel: '002',
    nomeEmpresaResponsavel: 'SPE RESIDENCIAL PRAÇA DO SOL EMPREENDIMENTOS LTDA',
    proporcaoDeRecesso: ProporcaoDeRecesso.de(60)
  }),
  new Contrato({
    codEmpresa: '016',
    codContrato: 'CONTRATO-016-A',
    nomeContrato: 'CONTRATO PEDRO - OBRAS',
    dataInicio: DataHora.de('2025-08-18'),
    dataFim: DataHora.de('2027-12-31'),
    valorMensal: 8000,
    empresaResponsavel: '001',
    nomeEmpresaResponsavel: 'CITY INCORPORADORA LTDA'
  }),
  // PJ inativo no cadastro: a grade mostra o contrato com o ícone de status e
  // bloqueia lançamentos, mas o histórico continua consultável.
  new Contrato({
    codEmpresa: '017',
    codContrato: 'CONTRATO-017-A',
    nomeContrato: 'CONTRATO ENCERRADO - APOIO',
    dataInicio: DataHora.de('2022-05-10'),
    dataFim: DataHora.de('2026-12-31'),
    valorMensal: 3000,
    empresaResponsavel: '002',
    nomeEmpresaResponsavel: 'SPE RESIDENCIAL PRAÇA DO SOL EMPREENDIMENTOS LTDA'
  })
];

export function obterMockChamadosIniciais(): Chamado[] {
  return [
    new Chamado({
      id: '8a9f8362abaaf5f90a1884d501cd6176',
      protocolo: '19164',
      assunto: 'Envio de Nota Fiscal - Julho 2026',
      dataCriacao: DataHora.de('2026-07-20 09:15:00-03:00'),
      dataFinalizacao: DataHora.de('2026-07-20 10:30:00-03:00'),
      nomeSolicitante: 'João Silva',
      email: Email.de('joao.silva@cityinc.com.br'),
      situacaoId: '5',
      situacaoDescricao: 'Finalizado',
      categoriaId: '8b9a123fcd09bd585714b53d5370f1a2',
      categoriaNome: 'Recebimento de Notas - PJ',
      tipoLancamento: TipoLancamento.de('Contratual'),
      mesReferente: Competencia.deTextoLivre('07-2026')
    }),
    new Chamado({
      id: '238d061bed2cff0a763dce00a0c8b586',
      protocolo: '19165',
      assunto: 'NF Reembolso Convênio Médico - Julho 2026',
      dataCriacao: DataHora.de('2026-07-21 11:20:15-03:00'),
      dataFinalizacao: DataHora.de('2026-07-21 14:05:22-03:00'),
      nomeSolicitante: 'Maria Souza',
      email: Email.de('maria.souza@cityinc.com.br'),
      situacaoId: '5',
      situacaoDescricao: 'Finalizado',
      categoriaId: '8b9a123fcd09bd585714b53d5370f1a2',
      categoriaNome: 'Recebimento de Notas - PJ',
      tipoLancamento: TipoLancamento.de('Reembolso plano de saude'),
      mesReferente: Competencia.deTextoLivre('07-2026')
    }),
    new Chamado({
      id: 'c73a8362abaaf5f90a1884d501cd9912',
      protocolo: '19166',
      assunto: 'Nota Fiscal Julho - Serviços e Plano de Saúde',
      dataCriacao: DataHora.de('2026-07-22 14:10:30-03:00'),
      dataFinalizacao: null,
      nomeSolicitante: 'Carlos Santos',
      email: Email.de('carlos.santos@cityinc.com.br'),
      situacaoId: '2',
      situacaoDescricao: 'Em Andamento',
      categoriaId: '8b9a123fcd09bd585714b53d5370f1a2',
      categoriaNome: 'Recebimento de Notas - PJ',
      tipoLancamento: TipoLancamento.de('Ambas'),
      mesReferente: Competencia.deTextoLivre('07-2026'),
      cnpjAnexo: Cnpj.de('17928511000170')
    }),
    new Chamado({
      id: '65d9a0d8c0b11ff31a884d501cd99451',
      protocolo: '19167',
      assunto: 'Nota Fiscal Julho - Kevin Maykel',
      dataCriacao: DataHora.de('2026-07-23 10:00:00-03:00'),
      dataFinalizacao: null,
      nomeSolicitante: 'Kevin Maykel',
      email: Email.de('  Kevin.Maykel@cityinc.com.br  '),
      situacaoId: '2',
      situacaoDescricao: 'Em Andamento',
      categoriaId: '8b9a123fcd09bd585714b53d5370f1a2',
      categoriaNome: 'Recebimento de Notas - PJ',
      tipoLancamento: TipoLancamento.de('Contratual'),
      mesReferente: Competencia.deTextoLivre('Julho/2026')
    }),
    new Chamado({
      id: 'd27a123ebbcff32901cd84d501cc2219',
      protocolo: '19168',
      assunto: 'Nota Fiscal de Contrato Carlos Santos',
      dataCriacao: DataHora.de('2026-07-24 16:30:00-03:00'),
      dataFinalizacao: null,
      nomeSolicitante: 'Carlos Santos',
      email: Email.de('carlos.santos@cityinc.com.br'),
      situacaoId: '2',
      situacaoDescricao: 'Em Andamento',
      categoriaId: '8b9a123fcd09bd585714b53d5370f1a2',
      categoriaNome: 'Recebimento de Notas - PJ',
      tipoLancamento: TipoLancamento.de('Contratual'),
      mesReferente: Competencia.deTextoLivre('07-2026'),
      cnpjAnexo: Cnpj.de('00000000000000')
    }),
    new Chamado({
      id: '8f889988abaaf5f90a1884d501cd7777',
      protocolo: '19169',
      assunto: 'NF Reembolso Convênio Médico - Junho 2026',
      dataCriacao: DataHora.de('2026-06-20 11:20:15-03:00'),
      dataFinalizacao: DataHora.de('2026-06-20 14:05:22-03:00'),
      nomeSolicitante: 'Maria Souza',
      email: Email.de('maria.souza@cityinc.com.br'),
      situacaoId: '5',
      situacaoDescricao: 'Finalizado',
      categoriaId: '8b9a123fcd09bd585714b53d5370f1a2',
      categoriaNome: 'Recebimento de Notas - PJ',
      tipoLancamento: TipoLancamento.de('Reembolso plano de saude'),
      mesReferente: Competencia.deTextoLivre('06-2026')
    })
  ];
}

export const mockAlertasData: Alerta[] = [
  new Alerta({
    email: Email.de('kevin.maykel@cityinc.com.br'),
    responsavelLegal: 'Kevin Maykel',
    cnpj: Cnpj.de('12345678901234'),
    regra: RegraAlerta.de('D-3'),
    dataHoraEnvio: DataHora.de('2026-07-29 09:00:00'),
    mesAnoReferencia: Competencia.deTextoLivre('07-2026')
  }),
  new Alerta({
    email: Email.de('kevin.maykel@cityinc.com.br'),
    responsavelLegal: 'Kevin Maykel',
    cnpj: Cnpj.de('12345678901234'),
    regra: RegraAlerta.de('D'),
    dataHoraEnvio: DataHora.de('2026-08-01 09:00:00'),
    mesAnoReferencia: Competencia.deTextoLivre('07-2026')
  }),
  new Alerta({
    email: Email.de('joao.silva@cityinc.com.br'),
    responsavelLegal: 'João Silva',
    cnpj: Cnpj.de('98765432101234'),
    regra: RegraAlerta.de('D-3'),
    dataHoraEnvio: DataHora.de('2026-07-29 09:02:15'),
    mesAnoReferencia: Competencia.deTextoLivre('07-2026')
  }),
  new Alerta({
    email: Email.de('maria.souza@cityinc.com.br'),
    responsavelLegal: 'Maria Souza',
    cnpj: Cnpj.de('87654321098765'),
    regra: RegraAlerta.de('D-3'),
    dataHoraEnvio: DataHora.de('2026-07-29 09:05:40'),
    mesAnoReferencia: Competencia.deTextoLivre('07-2026')
  }),
  new Alerta({
    email: Email.de('carlos.santos@cityinc.com.br'),
    responsavelLegal: 'Carlos Santos',
    cnpj: Cnpj.de('33333333000133'),
    regra: RegraAlerta.de('D-3'),
    dataHoraEnvio: DataHora.de('2026-07-29 09:10:12'),
    mesAnoReferencia: Competencia.deTextoLivre('07-2026')
  }),
  new Alerta({
    email: Email.de('carlos.santos@cityinc.com.br'),
    responsavelLegal: 'Carlos Santos',
    cnpj: Cnpj.de('33333333000133'),
    regra: RegraAlerta.de('D'),
    dataHoraEnvio: DataHora.de('2026-08-01 09:12:00'),
    mesAnoReferencia: Competencia.deTextoLivre('07-2026')
  }),
  new Alerta({
    email: Email.de('carlos.santos@cityinc.com.br'),
    responsavelLegal: 'Carlos Santos',
    cnpj: Cnpj.de('33333333000133'),
    regra: RegraAlerta.de('D+1'),
    dataHoraEnvio: DataHora.de('2026-08-02 10:15:30'),
    mesAnoReferencia: Competencia.deTextoLivre('07-2026')
  }),
  new Alerta({
    email: Email.de('pedro.pedrosa@cityinc.com.br'),
    responsavelLegal: 'Pedro Pedrosa',
    cnpj: Cnpj.de('11112222333344'),
    regra: RegraAlerta.de('D-3'),
    dataHoraEnvio: DataHora.de('2026-07-29 09:15:00'),
    mesAnoReferencia: Competencia.deTextoLivre('07-2026')
  }),
  new Alerta({
    email: Email.de('pedro.pedrosa@cityinc.com.br'),
    responsavelLegal: 'Pedro Pedrosa',
    cnpj: Cnpj.de('11112222333344'),
    regra: RegraAlerta.de('D'),
    dataHoraEnvio: DataHora.de('2026-08-01 09:20:00'),
    mesAnoReferencia: Competencia.deTextoLivre('07-2026')
  }),
  new Alerta({
    email: Email.de('pedro.pedrosa@cityinc.com.br'),
    responsavelLegal: 'Pedro Pedrosa',
    cnpj: Cnpj.de('11112222333344'),
    regra: RegraAlerta.de('D+1'),
    dataHoraEnvio: DataHora.de('2026-08-02 09:00:00'),
    mesAnoReferencia: Competencia.deTextoLivre('07-2026')
  }),
  new Alerta({
    email: Email.de('pedro.pedrosa@cityinc.com.br'),
    responsavelLegal: 'Pedro Pedrosa',
    cnpj: Cnpj.de('11112222333344'),
    regra: RegraAlerta.de('D+3'),
    dataHoraEnvio: DataHora.de('2026-08-04 09:30:00'),
    mesAnoReferencia: Competencia.deTextoLivre('07-2026')
  })
];
