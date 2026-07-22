import { describe, it, expect } from 'vitest';
import { LinhasDeStatus, PropsLinhaDeStatus } from '../../src/domain/collections/LinhasDeStatus';
import { Cnpj } from '../../src/domain/value-objects/Cnpj';
import { Email } from '../../src/domain/value-objects/Email';
import { StatusNf } from '../../src/domain/value-objects/StatusNf';
import { DataHora } from '../../src/domain/value-objects/DataHora';
import { TipoLancamento } from '../../src/domain/value-objects/TipoLancamento';

describe('LinhasDeStatus Collection', () => {
  const item1: PropsLinhaDeStatus = {
    id: '1',
    nome: 'Empresa A LTDA',
    apelido: 'Empresa A',
    funcionario: 'João',
    email: Email.de('joao@empresa.com'),
    cnpj: Cnpj.de('12345678901234'),
    status: StatusNf.enviado(),
    protocolo: '1001',
    dataAbertura: DataHora.de('2026-07-20 09:00:00'),
    dataFinalizacao: null,
    tipoLancamento: TipoLancamento.de('Contratual'),
    contratoCodigo: 'C1',
    contratoNome: 'Contrato 1',
    empresaResponsavel: '001',
    linkChamado: 'http://link',
    ticketId: 't1',
    manualReason: null
  };

  const item2: PropsLinhaDeStatus = {
    id: '2',
    nome: 'Empresa B LTDA',
    apelido: 'Empresa B',
    funcionario: 'Maria',
    email: Email.de('maria@empresa.com'),
    cnpj: Cnpj.de('98765432101234'),
    status: StatusNf.recebido(),
    protocolo: '1002',
    dataAbertura: DataHora.de('2026-07-21 09:00:00'),
    dataFinalizacao: DataHora.de('2026-07-21 10:00:00'),
    tipoLancamento: TipoLancamento.de('Reembolso plano de saúde'),
    contratoCodigo: 'C2',
    contratoNome: 'Contrato 2',
    empresaResponsavel: '001',
    linkChamado: 'http://link2',
    ticketId: 't2',
    manualReason: null
  };

  it('deve filtrar por status e busca por CNPJ mascarado e cru', () => {
    const colecao = new LinhasDeStatus([item1, item2]);
    const filtradoStatus = colecao.filtradasPor('Recebido', '');
    expect(filtradoStatus.paraArray()).toHaveLength(1);
    expect(filtradoStatus.paraArray()[0]?.apelido).toBe('Empresa B');

    const filtradoCnpjMascarado = colecao.filtradasPor('all', '12.345.678/9012-34');
    expect(filtradoCnpjMascarado.paraArray()).toHaveLength(1);
    expect(filtradoCnpjMascarado.paraArray()[0]?.apelido).toBe('Empresa A');
  });

  it('deve calcular rollup consolidado de resumo', () => {
    const colecao = new LinhasDeStatus([item1, item2]);
    const resumo = colecao.resumoRollup();
    expect(resumo.total).toBe(2);
    expect(resumo.enviado).toBe(1);
    expect(resumo.recebido).toBe(1);
  });
});
