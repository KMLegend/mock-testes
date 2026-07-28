import { describe, it, expect } from 'vitest';
import { Fornecedor } from '../../src/domain/entities/Fornecedor';
import { Contrato } from '../../src/domain/entities/Contrato';
import { ItemBasePj } from '../../src/application/read-models/ItemBasePj';
import { Cnpj } from '../../src/domain/value-objects/Cnpj';
import { Email } from '../../src/domain/value-objects/Email';
import { DataHora } from '../../src/domain/value-objects/DataHora';
import { mockFornecedoresData, mockContratosData } from '../../src/infrastructure/mock/dados/mockData';

describe('ItemBasePj (Read Model da Tabela Base de PJs)', () => {
  const fornecedorAtivo = new Fornecedor({
    codEmpresa: '012',
    empresa: 'KEVIN MAYKEL AGOSTINHO GOMES LTDA',
    apelido: 'KEVIN MAYKEL',
    responsavelLegal: 'Kevin Maykel',
    email: Email.de('kevin.maykel@cityinc.com.br'),
    tipoInscricao: '1',
    cnpj: Cnpj.de('12345678901234'),
    ativo: true
  });

  const contrato1 = new Contrato({
    codEmpresa: '012',
    codContrato: 'CONTRATO-012-A',
    nomeContrato: 'CONTRATO KEVIN - ADMIN',
    dataInicio: DataHora.de('2023-03-15'),
    dataFim: DataHora.de('2026-12-31'),
    valorMensal: 5000,
    empresaResponsavel: '001',
    nomeEmpresaResponsavel: 'CITY INCORPORADORA LTDA'
  });

  it('formata campos do Fornecedor corretamente', () => {
    const item = new ItemBasePj(fornecedorAtivo, [contrato1]);

    expect(item.codEmpresa).toBe('012');
    expect(item.razaoSocial).toBe('KEVIN MAYKEL AGOSTINHO GOMES LTDA');
    expect(item.nomeFantasia).toBe('KEVIN MAYKEL');
    expect(item.responsavelLegal).toBe('Kevin Maykel');
    expect(item.email).toBe('kevin.maykel@cityinc.com.br');
    expect(item.cnpj).toBe('12.345.678/9012-34');
    expect(item.ativo).toBe(true);
    expect(item.statusTexto).toBe('Ativo');
    expect(item.totalContratos).toBe(1);
  });

  it('pesquisa por texto (correspondeA) em múltiplos atributos', () => {
    const item = new ItemBasePj(fornecedorAtivo, [contrato1]);

    expect(item.correspondeA('')).toBe(true);
    expect(item.correspondeA('KEVIN')).toBe(true);
    expect(item.correspondeA('12.345.678/9012-34')).toBe(true);
    expect(item.correspondeA('12345678901234')).toBe(true);
    expect(item.correspondeA('kevin.maykel@cityinc.com.br')).toBe(true);
    expect(item.correspondeA('012')).toBe(true);
    expect(item.correspondeA('CONTRATO-012-A')).toBe(true);
    expect(item.correspondeA('INEXISTENTE')).toBe(false);
  });

  it('constrói itens a partir dos dados mockados do sistema', () => {
    const itens = mockFornecedoresData.map((f) => {
      const contratos = mockContratosData.filter((c) => c.ehDoFornecedor(f.codEmpresa));
      return new ItemBasePj(f, contratos);
    });

    expect(itens.length).toBeGreaterThan(0);
    const kevin = itens.find((i) => i.codEmpresa === '012');
    expect(kevin).toBeDefined();
    expect(kevin?.totalContratos).toBe(1);

    const inativo = itens.find((i) => !i.ativo);
    expect(inativo).toBeDefined();
    expect(inativo?.statusTexto).toBe('Inativo');
  });

  it('permite formatar e acessar dados dos contratos vinculados sem erro', () => {
    const item = new ItemBasePj(fornecedorAtivo, [contrato1]);
    const c = item.contratos[0]!;

    expect(c.codContrato).toBe('CONTRATO-012-A');
    expect(c.dataInicio.paraFormatadoCurto()).toBe('15/03/2023');
    expect(c.dataFim.paraFormatadoCurto()).toBe('31/12/2026');
    // Status vem da vigência: dentro de [início, fim] = Ativo; depois do fim = Inativo.
    expect(c.statusParaExibicao(new Date(2026, 6, 27))).toBe('Ativo');
    expect(c.statusParaExibicao(new Date(2027, 0, 1))).toBe('Inativo');
  });
});
