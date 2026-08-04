import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { lerAbas } from '../../src/infrastructure/mock/cadastro/lerPlanilha';
import { validar } from '../../src/infrastructure/mock/cadastro/validarPlanilha';
import { BaseDeCadastroStore } from '../../src/infrastructure/mock/cadastro/BaseDeCadastroStore';
import { CargaDeCadastroMock } from '../../src/infrastructure/mock/cadastro/CargaDeCadastroMock';

// A-37: cod_empresa não é mais coluna (gerado pelo sistema a partir do CNPJ). Contratos vincula
// ao fornecedor por `cnpj`, não por `cod_empresa`.
const CAB_FORN = ['razao_social', 'nome_fantasia', 'responsavel_legal', 'email', 'cnpj', 'tipo_inscricao', 'ativo'];
const CAB_CONTR = ['cnpj', 'cod_contrato', 'nome_contrato', 'data_inicio', 'data_fim', 'valor_mensal', 'empresa_vinculada_codigo', 'empresa_vinculada_nome'];

const CNPJ_OK = '12345678901234';
const FORN_OK = ['KEVIN LTDA', 'Kevin', 'Kevin M', 'kevin@cityinc.com.br', CNPJ_OK, '1', 'Sim'];
function contrato(cnpj: string, num: string): string[] {
  return [cnpj, num, 'Contrato', '2023-03-15', '2026-12-31', '5000', '001', 'CITY INCORP'];
}

function planilha(fornecedores: string[][], contratos: string[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([CAB_FORN, ...fornecedores]), 'Fornecedores');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([CAB_CONTR, ...contratos]), 'Contratos');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

function validarPlanilha(fornecedores: string[][], contratos: string[][]) {
  return validar(lerAbas(planilha(fornecedores, contratos)));
}

// jsdom não implementa File.arrayBuffer(); no browser real existe. File-like basta ao adapter.
function arquivoXlsx(buffer: ArrayBuffer): File {
  return { name: 'base.xlsx', arrayBuffer: async () => buffer } as unknown as File;
}

describe('Carga de cadastro — validação da planilha', () => {
  it('planilha correta não gera erros e monta a base', () => {
    const { base, erros } = validarPlanilha([FORN_OK], [contrato(CNPJ_OK, 'C-1')]);
    expect(erros).toHaveLength(0);
    expect(base.fornecedores).toHaveLength(1);
    expect(base.contratos).toHaveLength(1);
    expect(base.fornecedores[0]!.cnpj.paraExibicao()).toBe('12.345.678/9012-34');
  });

  it('cod_empresa é gerado automaticamente, nunca lido da planilha (A-37)', () => {
    const { base } = validarPlanilha([FORN_OK], [contrato(CNPJ_OK, 'C-1')]);
    expect(base.fornecedores[0]!.codEmpresa).toBe('1'); // base vazia → primeira empresa = "1"
    expect(base.contratos[0]!.codEmpresa).toBe('1'); // contrato resolvido pro mesmo código, via CNPJ
  });

  it('CNPJ com menos de 14 dígitos é reprovado com linha e campo', () => {
    const forn = ['KEVIN LTDA', '', '', 'kevin@cityinc.com.br', '123', '1', 'Sim'];
    const { erros } = validarPlanilha([forn], []);
    expect(erros).toContainEqual({ aba: 'Fornecedores', linha: 2, campo: 'cnpj', motivo: 'deve ter 14 dígitos' });
  });

  it('contrato apontando para CNPJ inexistente na aba Fornecedores é reprovado', () => {
    const { erros } = validarPlanilha([FORN_OK], [contrato('99999999000199', 'C-1')]);
    expect(erros.some((erro) => erro.campo === 'cnpj' && erro.motivo === 'fornecedor não encontrado na aba Fornecedores')).toBe(true);
  });

  it('o mesmo PJ pode ter mais de um contrato na planilha (sem proporção)', () => {
    const { base, erros } = validarPlanilha([FORN_OK], [contrato(CNPJ_OK, 'C-1'), contrato(CNPJ_OK, 'C-2')]);
    expect(erros).toHaveLength(0);
    expect(base.contratos).toHaveLength(2);
  });

  it('data_inicio/data_fim aceitam formato BR (dd/mm/aaaa), não só ISO', () => {
    const contratoBr = [CNPJ_OK, 'C-1', 'Contrato', '15/03/2023', '31/12/2026', '5000', '001', 'CITY'];
    const { base, erros } = validarPlanilha([FORN_OK], [contratoBr]);
    expect(erros).toHaveLength(0);
    expect(base.contratos[0]!.dataInicio.raw()).toBe('2023-03-15');
  });

  it('data_fim vazia é aceita (sem prazo definido), não gera erro', () => {
    const contratoSemFim = [CNPJ_OK, 'C-1', 'Contrato', '2023-03-15', '', '5000', '001', 'CITY'];
    const { erros } = validarPlanilha([FORN_OK], [contratoSemFim]);
    expect(erros).toHaveLength(0);
  });

  it('data em formato não reconhecido gera erro específico (não "obrigatório")', () => {
    const contratoDataRuim = [CNPJ_OK, 'C-1', 'Contrato', '15 de março de 2023', '', '5000', '001', 'CITY'];
    const { erros } = validarPlanilha([FORN_OK], [contratoDataRuim]);
    expect(erros).toContainEqual({ aba: 'Contratos', linha: 2, campo: 'data_inicio', motivo: 'formato de data não reconhecido' });
  });
});

describe('CargaDeCadastroMock — substituição total (A-32) e cod_empresa automático (A-37)', () => {
  beforeEach(() => localStorage.clear());

  const CNPJ_NOVO = '99999999000199';
  const FORN_NOVO = ['NOVA LTDA', 'Nova', 'Resp', 'nova@cityinc.com.br', CNPJ_NOVO, '1', 'Sim'];

  it('previsualizar NÃO grava; aplicar importa o fornecedor novo', async () => {
    const store = new BaseDeCadastroStore();
    const carga = new CargaDeCadastroMock(store);
    const arquivo = arquivoXlsx(planilha([FORN_NOVO], [contrato(CNPJ_NOVO, 'C-1')]));

    const previa = await carga.previsualizar(arquivo);
    expect(previa.erros).toHaveLength(0);
    expect(store.fornecedores().some((forn) => forn.cnpj.obterDigitos() === CNPJ_NOVO)).toBe(false); // não gravou ainda

    const aplicado = await carga.aplicar(arquivo);
    expect(aplicado.erros).toHaveLength(0);
    expect(aplicado.fornecedores.importados).toBe(1);
    expect(store.fornecedores().some((forn) => forn.cnpj.obterDigitos() === CNPJ_NOVO)).toBe(true);
  });

  it('fornecedor e contrato ausentes na planilha nova deixam de existir na base', async () => {
    const store = new BaseDeCadastroStore();
    const carga = new CargaDeCadastroMock(store);

    // 1ª carga: fornecedor novo com contrato C-1
    await carga.aplicar(arquivoXlsx(planilha([FORN_NOVO], [contrato(CNPJ_NOVO, 'C-1')])));
    expect(store.fornecedores().some((f) => f.cnpj.obterDigitos() === CNPJ_NOVO)).toBe(true);
    expect(store.contratos().some((c) => c.codContrato === 'C-1')).toBe(true);

    // 2ª carga: só um fornecedor/contrato diferente — a base antiga inteira some
    const CNPJ_OUTRO = '11111111000111';
    const FORN_OUTRO = ['OUTRA LTDA', 'Outra', 'Resp', 'outra@cityinc.com.br', CNPJ_OUTRO, '1', 'Sim'];
    const relatorio2 = await carga.aplicar(arquivoXlsx(planilha([FORN_OUTRO], [contrato(CNPJ_OUTRO, 'C-1')])));

    expect(relatorio2.fornecedores.removidosDaBaseAnterior).toBe(1);
    expect(relatorio2.contratos.removidosDaBaseAnterior).toBe(1);
    expect(store.fornecedores().some((f) => f.cnpj.obterDigitos() === CNPJ_NOVO)).toBe(false);
    expect(store.fornecedores().some((f) => f.cnpj.obterDigitos() === CNPJ_OUTRO)).toBe(true);
  });

  it('reenviar a mesma planilha 2 vezes é idempotente no resultado e reaproveita o cod_empresa', async () => {
    const store = new BaseDeCadastroStore();
    const carga = new CargaDeCadastroMock(store);
    const arquivo = () => arquivoXlsx(planilha([FORN_NOVO], [contrato(CNPJ_NOVO, 'C-1')]));

    await carga.aplicar(arquivo());
    const codEmpresaAposPrimeira = store.fornecedores().find((f) => f.cnpj.obterDigitos() === CNPJ_NOVO)!.codEmpresa;

    const relatorio2 = await carga.aplicar(arquivo());

    expect(relatorio2.fornecedores.importados).toBe(1);
    expect(relatorio2.fornecedores.removidosDaBaseAnterior).toBe(0);
    const fornecedoresComCnpj = store.fornecedores().filter((f) => f.cnpj.obterDigitos() === CNPJ_NOVO);
    expect(fornecedoresComCnpj).toHaveLength(1);
    expect(fornecedoresComCnpj[0]!.codEmpresa).toBe(codEmpresaAposPrimeira); // reaproveitado, não gerou outro (A-37)
  });

  it('planilha com erro não altera a base', async () => {
    const store = new BaseDeCadastroStore();
    const carga = new CargaDeCadastroMock(store);
    const antes = store.fornecedores().map((forn) => forn.cnpj.obterDigitos()).sort();
    const forn = ['NOVA', '', '', 'email-invalido', CNPJ_NOVO, '1', 'Sim'];
    const arquivo = arquivoXlsx(planilha([forn], []));

    const relatorio = await carga.aplicar(arquivo);
    expect(relatorio.erros.length).toBeGreaterThan(0);
    expect(store.fornecedores().map((forn) => forn.cnpj.obterDigitos()).sort()).toEqual(antes); // inalterada
  });
});
