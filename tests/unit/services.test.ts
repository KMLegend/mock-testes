import { describe, it, expect } from 'vitest';
import { MotorDeStatus } from '../../src/domain/services/MotorDeStatus';
import { ResolucaoDeContrato } from '../../src/domain/services/ResolucaoDeContrato';
import { RollupDeStatus } from '../../src/domain/services/RollupDeStatus';
import { Fornecedor } from '../../src/domain/entities/Fornecedor';
import { Chamado } from '../../src/domain/entities/Chamado';
import { Contrato } from '../../src/domain/entities/Contrato';
import { Cnpj } from '../../src/domain/value-objects/Cnpj';
import { Email } from '../../src/domain/value-objects/Email';
import { Competencia } from '../../src/domain/value-objects/Competencia';
import { TipoLancamento } from '../../src/domain/value-objects/TipoLancamento';
import { DataHora } from '../../src/domain/value-objects/DataHora';
import { StatusNf } from '../../src/domain/value-objects/StatusNf';

describe('Domain Services', () => {
  const cnpjTomadores = new Map<string, string>([
    ['001', '14489313000160'],
    ['002', '17928511000170']
  ]);

  const fornecedorPendente = new Fornecedor({
    codEmpresa: '012',
    empresa: 'KEVIN MAYKEL AGOSTINHO GOMES LTDA',
    apelido: 'KEVIN MAYKEL',
    email: Email.de('kevin.maykel@cityinc.com.br'),
    tipoInscricao: '1',
    cnpj: Cnpj.de('12345678901234'),
    ativo: true
  });

  const fornecedorCarlos = new Fornecedor({
    codEmpresa: '015',
    empresa: 'CARLOS SANTOS SERVICOS LTDA',
    apelido: 'CARLOS SANTOS',
    email: Email.de('carlos.santos@cityinc.com.br'),
    tipoInscricao: '1',
    cnpj: Cnpj.de('33333333000133'),
    ativo: true
  });

  const fornecedorInativo = new Fornecedor({
    codEmpresa: '017',
    empresa: 'FORNECEDOR INATIVO LTDA',
    apelido: 'Inativo',
    email: Email.de('inativo@cityinc.com.br'),
    tipoInscricao: '1',
    cnpj: Cnpj.de('99999999999999'),
    ativo: false
  });

  const contrato101 = new Contrato({
    codEmpresa: '015',
    codContrato: '101',
    nomeContrato: 'SERVIÇOS - CITY INCORP',
    dataInicio: DataHora.de('2024-01-01'),
    dataFim: DataHora.de('2026-12-31'),
    valorMensal: 10000,
    empresaResponsavel: '001',
    nomeEmpresaResponsavel: 'CITY INCORPORADORA LTDA'
  });

  const contrato102 = new Contrato({
    codEmpresa: '015',
    codContrato: '102',
    nomeContrato: 'SERVIÇOS - SPE PRAÇA DO SOL',
    dataInicio: DataHora.de('2024-01-01'),
    dataFim: DataHora.de('2026-12-31'),
    valorMensal: 15000,
    empresaResponsavel: '002',
    nomeEmpresaResponsavel: 'SPE RESIDENCIAL PRAÇA DO SOL EMPREENDIMENTOS LTDA'
  });

  describe('ResolucaoDeContrato', () => {
    it('deve desambiguar contrato com sucesso quando houver múltiplos contratos pelo CNPJ extraído do anexo', () => {
      const chamado19166 = new Chamado({
        id: 'c73a8362',
        protocolo: '19166',
        assunto: 'Nota Fiscal Julho',
        dataCriacao: DataHora.de('2026-07-22 14:10:30'),
        dataFinalizacao: null,
        nomeSolicitante: 'Carlos Santos',
        email: Email.de('carlos.santos@cityinc.com.br'),
        situacaoId: '2',
        situacaoDescricao: 'Em Andamento',
        categoriaId: 'cat1',
        categoriaNome: 'Recebimento',
        tipoLancamento: TipoLancamento.de('Ambas'),
        mesReferente: Competencia.de('07', '2026'),
        cnpjAnexo: Cnpj.de('17928511000170')
      });

      const res = ResolucaoDeContrato.resolver({
        fornecedor: fornecedorCarlos,
        contratos: [contrato101, contrato102],
        chamado: chamado19166,
        cnpjTomadores
      });
      expect(res.status).toBe('resolved');
      if (res.status === 'resolved') {
        expect(res.contrato.codContrato).toBe('102');
      }
    });

    it('deve direcionar para Tratamento Manual quando o CNPJ extraído não bate com nenhum contrato', () => {
      const chamadoComCnpjInvalido = new Chamado({
        id: 'd27a123e',
        protocolo: '19168',
        assunto: 'Nota Fiscal Carlos',
        dataCriacao: DataHora.de('2026-07-24 16:30:00'),
        dataFinalizacao: null,
        nomeSolicitante: 'Carlos Santos',
        email: Email.de('carlos.santos@cityinc.com.br'),
        situacaoId: '2',
        situacaoDescricao: 'Em Andamento',
        categoriaId: 'cat1',
        categoriaNome: 'Recebimento',
        tipoLancamento: TipoLancamento.de('Contratual'),
        mesReferente: Competencia.de('07', '2026'),
        cnpjAnexo: Cnpj.de('00000000000000')
      });

      const res = ResolucaoDeContrato.resolver({
        fornecedor: fornecedorCarlos,
        contratos: [contrato101, contrato102],
        chamado: chamadoComCnpjInvalido,
        cnpjTomadores
      });
      expect(res.status).toBe('manual_treatment');
    });
  });

  describe('MotorDeStatus', () => {
    it('deve definir status Pendente para fornecedor ativo sem chamado', () => {
      const resultado = MotorDeStatus.processar({
        fornecedores: [fornecedorPendente],
        chamados: [],
        contratos: [],
        cnpjTomadores
      });
      const lista = resultado.paraArray();
      expect(lista).toHaveLength(1);
      expect(lista[0]?.status.paraExibicao()).toBe('Pendente');
    });

    it('não deve incluir fornecedores inativos', () => {
      const resultado = MotorDeStatus.processar({
        fornecedores: [fornecedorInativo],
        chamados: [],
        contratos: [],
        cnpjTomadores
      });
      expect(resultado.paraArray()).toHaveLength(0);
    });
  });

  describe('RollupDeStatus', () => {
    it('deve dar precedência a Tratamento Manual > Pendente > Enviado > Recebido', () => {
      expect(RollupDeStatus.calcularStatusFornecedor([StatusNf.recebido(), StatusNf.tratamentoManual()]).paraExibicao()).toBe('Tratamento Manual');
      expect(RollupDeStatus.calcularStatusFornecedor([StatusNf.recebido(), StatusNf.pendente()]).paraExibicao()).toBe('Pendente');
      expect(RollupDeStatus.calcularStatusFornecedor([StatusNf.recebido(), StatusNf.enviado()]).paraExibicao()).toBe('Enviado');
      expect(RollupDeStatus.calcularStatusFornecedor([StatusNf.recebido(), StatusNf.recebido()]).paraExibicao()).toBe('Recebido');
    });
  });

  describe('ExtratorCnpjMock', () => {
    it('deve extrair o CNPJ do anexo do chamado assincronamente', async () => {
      const { ExtratorCnpjMock } = await import('../../src/infrastructure/mock/ExtratorCnpjMock');
      const extrator = new ExtratorCnpjMock();
      const chamado = new Chamado({
        id: 'c73a8362',
        protocolo: '19166',
        assunto: 'Nota Fiscal Julho',
        dataCriacao: DataHora.de('2026-07-22 14:10:30'),
        dataFinalizacao: null,
        nomeSolicitante: 'Carlos Santos',
        email: Email.de('carlos.santos@cityinc.com.br'),
        situacaoId: '2',
        situacaoDescricao: 'Em Andamento',
        categoriaId: 'cat1',
        categoriaNome: 'Recebimento',
        tipoLancamento: TipoLancamento.de('Ambas'),
        mesReferente: Competencia.de('07', '2026'),
        cnpjAnexo: Cnpj.de('17928511000170')
      });

      const cnpj = await extrator.extrair(chamado);
      expect(cnpj?.obterDigitos()).toBe('17928511000170');
    });
  });
});
