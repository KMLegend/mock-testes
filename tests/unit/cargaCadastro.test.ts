import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { lerAbas } from '../../src/infrastructure/mock/cadastro/lerPlanilha';
import { validar } from '../../src/infrastructure/mock/cadastro/validarPlanilha';
import { BaseDeCadastroStore } from '../../src/infrastructure/mock/cadastro/BaseDeCadastroStore';
import { CargaDeCadastroMock } from '../../src/infrastructure/mock/cadastro/CargaDeCadastroMock';

const CAB_FORN = ['cod_empresa', 'razao_social', 'nome_fantasia', 'responsavel_legal', 'email', 'cnpj', 'tipo_inscricao', 'ativo'];
const CAB_CONTR = ['cod_empresa', 'cod_contrato', 'nome_contrato', 'data_inicio', 'data_fim', 'valor_mensal', 'empresa_vinculada_codigo', 'empresa_vinculada_nome'];

const FORN_OK = ['012', 'KEVIN LTDA', 'Kevin', 'Kevin M', 'kevin@cityinc.com.br', '12345678901234', '1', 'Sim'];
function contrato(cod: string, num: string): string[] {
  return [cod, num, 'Contrato', '2023-03-15', '2026-12-31', '5000', '001', 'CITY INCORP'];
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
    const { base, erros } = validarPlanilha([FORN_OK], [contrato('012', 'C-1')]);
    expect(erros).toHaveLength(0);
    expect(base.fornecedores).toHaveLength(1);
    expect(base.contratos).toHaveLength(1);
    expect(base.fornecedores[0]!.cnpj.paraExibicao()).toBe('12.345.678/9012-34');
  });

  it('CNPJ com menos de 14 dígitos é reprovado com linha e campo', () => {
    const forn = ['012', 'KEVIN LTDA', '', '', 'kevin@cityinc.com.br', '123', '1', 'Sim'];
    const { erros } = validarPlanilha([forn], []);
    expect(erros).toContainEqual({ aba: 'Fornecedores', linha: 2, campo: 'cnpj', motivo: 'deve ter 14 dígitos' });
  });

  it('contrato apontando para PJ inexistente é reprovado', () => {
    const { erros } = validarPlanilha([FORN_OK], [contrato('999', 'C-1')]);
    expect(erros.some((erro) => erro.campo === 'cod_empresa' && erro.motivo === 'fornecedor não encontrado')).toBe(true);
  });

  it('o mesmo PJ pode ter mais de um contrato na planilha (sem proporção)', () => {
    const { base, erros } = validarPlanilha([FORN_OK], [contrato('012', 'C-1'), contrato('012', 'C-2')]);
    expect(erros).toHaveLength(0);
    expect(base.contratos).toHaveLength(2);
  });
});

describe('CargaDeCadastroMock — substituição total (A-32)', () => {
  beforeEach(() => localStorage.clear());

  const FORN_NOVO = ['777', 'NOVA LTDA', 'Nova', 'Resp', 'nova@cityinc.com.br', '99999999000199', '1', 'Sim'];

  it('previsualizar NÃO grava; aplicar importa o fornecedor novo', async () => {
    const store = new BaseDeCadastroStore();
    const carga = new CargaDeCadastroMock(store);
    const arquivo = arquivoXlsx(planilha([FORN_NOVO], [contrato('777', 'C-1')]));

    const previa = await carga.previsualizar(arquivo);
    expect(previa.erros).toHaveLength(0);
    expect(store.fornecedores().some((forn) => forn.codEmpresa === '777')).toBe(false); // não gravou ainda

    const aplicado = await carga.aplicar(arquivo);
    expect(aplicado.erros).toHaveLength(0);
    expect(aplicado.fornecedores.importados).toBe(1);
    expect(store.fornecedores().some((forn) => forn.codEmpresa === '777')).toBe(true);
  });

  it('fornecedor e contrato ausentes na planilha nova deixam de existir na base', async () => {
    const store = new BaseDeCadastroStore();
    const carga = new CargaDeCadastroMock(store);

    // 1ª carga: fornecedor 777 com contrato C-1
    await carga.aplicar(arquivoXlsx(planilha([FORN_NOVO], [contrato('777', 'C-1')])));
    expect(store.fornecedores().some((f) => f.codEmpresa === '777')).toBe(true);
    expect(store.contratos().some((c) => c.identificador() === '777-C-1')).toBe(true);

    // 2ª carga: só um fornecedor/contrato diferente — a base antiga inteira some
    const FORN_OUTRO = ['888', 'OUTRA LTDA', 'Outra', 'Resp', 'outra@cityinc.com.br', '11111111000111', '1', 'Sim'];
    const relatorio2 = await carga.aplicar(arquivoXlsx(planilha([FORN_OUTRO], [contrato('888', 'C-1')])));

    expect(relatorio2.fornecedores.removidosDaBaseAnterior).toBe(1);
    expect(relatorio2.contratos.removidosDaBaseAnterior).toBe(1);
    expect(store.fornecedores().some((f) => f.codEmpresa === '777')).toBe(false);
    expect(store.contratos().some((c) => c.identificador() === '777-C-1')).toBe(false);
    expect(store.fornecedores().some((f) => f.codEmpresa === '888')).toBe(true);
  });

  it('reenviar a mesma planilha 2 vezes é idempotente no resultado (mesma base, sem duplicar)', async () => {
    const store = new BaseDeCadastroStore();
    const carga = new CargaDeCadastroMock(store);
    const arquivo = () => arquivoXlsx(planilha([FORN_NOVO], [contrato('777', 'C-1')]));

    await carga.aplicar(arquivo());
    const relatorio2 = await carga.aplicar(arquivo());

    expect(relatorio2.fornecedores.importados).toBe(1);
    expect(relatorio2.fornecedores.removidosDaBaseAnterior).toBe(0);
    expect(store.fornecedores().filter((f) => f.codEmpresa === '777')).toHaveLength(1);
  });

  it('planilha com erro não altera a base', async () => {
    const store = new BaseDeCadastroStore();
    const carga = new CargaDeCadastroMock(store);
    const antes = store.fornecedores().map((forn) => forn.codEmpresa).sort();
    const forn = ['777', 'NOVA', '', '', 'email-invalido', '99999999000199', '1', 'Sim'];
    const arquivo = arquivoXlsx(planilha([forn], []));

    const relatorio = await carga.aplicar(arquivo);
    expect(relatorio.erros.length).toBeGreaterThan(0);
    expect(store.fornecedores().map((forn) => forn.codEmpresa).sort()).toEqual(antes); // inalterada
  });
});
