import { Contrato } from '../../../domain/entities/Contrato';
import { DataHora } from '../../../domain/value-objects/DataHora';
import { ErroDeImportacao } from '../../../application/ports/CargaDeCadastro';
import { LinhaBruta, ABA_CONTRATOS } from './lerPlanilha';
import { digitosCnpj, normalizarData, numeroOuNulo } from './validadores';

export interface ResultadoContratos {
  readonly validos: readonly Contrato[];
  readonly erros: readonly ErroDeImportacao[];
}

type Valores = Record<string, string>;

/** Sentinela de "sem prazo definido" (data_fim vazio) — `Contrato.dataFim` não é opcional no
 * domínio; uma data bem distante no futuro se comporta como indeterminado em `estaVigente()`. */
const SEM_PRAZO_DEFINIDO = '9999-12-31';

function texto(valores: Valores, chave: string): string {
  return valores[chave] ?? '';
}

function checagens(valores: Valores, cnpjParaCodEmpresa: ReadonlyMap<string, string>) {
  const cnpj = digitosCnpj(texto(valores, 'cnpj'));
  const dataInicio = normalizarData(texto(valores, 'data_inicio'));
  const dataFim = normalizarData(texto(valores, 'data_fim'));
  const valor = numeroOuNulo(texto(valores, 'valor_mensal'));
  return [
    { campo: 'cnpj', invalido: cnpj.length !== 14, motivo: 'deve ter 14 dígitos' },
    { campo: 'cnpj', invalido: cnpj.length === 14 && !cnpjParaCodEmpresa.has(cnpj), motivo: 'fornecedor não encontrado na aba Fornecedores' },
    { campo: 'cod_contrato', invalido: texto(valores, 'cod_contrato') === '', motivo: 'obrigatório' },
    { campo: 'data_inicio', invalido: dataInicio === undefined, motivo: 'formato de data não reconhecido' },
    { campo: 'data_inicio', invalido: dataInicio === null, motivo: 'obrigatório' },
    { campo: 'data_fim', invalido: dataFim === undefined, motivo: 'formato de data não reconhecido' },
    { campo: 'empresa_vinculada_codigo', invalido: texto(valores, 'empresa_vinculada_codigo') === '', motivo: 'obrigatório' },
    { campo: 'empresa_vinculada_nome', invalido: texto(valores, 'empresa_vinculada_nome') === '', motivo: 'obrigatório' },
    { campo: 'valor_mensal', invalido: valor === null, motivo: 'número inválido' }
  ];
}

function construir(valores: Valores, codEmpresa: string): Contrato {
  const valor = numeroOuNulo(texto(valores, 'valor_mensal'));
  const dataInicio = normalizarData(texto(valores, 'data_inicio')) as string;
  const dataFim = normalizarData(texto(valores, 'data_fim')) ?? SEM_PRAZO_DEFINIDO;
  return new Contrato({
    codEmpresa,
    codContrato: texto(valores, 'cod_contrato'),
    nomeContrato: texto(valores, 'nome_contrato'),
    dataInicio: DataHora.de(dataInicio),
    dataFim: DataHora.de(dataFim),
    valorMensal: typeof valor === 'number' ? valor : 0,
    empresaResponsavel: texto(valores, 'empresa_vinculada_codigo'),
    nomeEmpresaResponsavel: texto(valores, 'empresa_vinculada_nome')
  });
}

function avaliar(
  linha: LinhaBruta,
  cnpjParaCodEmpresa: ReadonlyMap<string, string>
): { contrato: Contrato | null; erros: ErroDeImportacao[] } {
  const invalidas = checagens(linha.valores, cnpjParaCodEmpresa).filter((item) => item.invalido);
  const erros = invalidas.map((item) => ({
    aba: ABA_CONTRATOS, linha: linha.linha, campo: item.campo, motivo: item.motivo
  }));
  if (erros.length > 0) return { contrato: null, erros };

  const cnpj = digitosCnpj(texto(linha.valores, 'cnpj'));
  const codEmpresa = cnpjParaCodEmpresa.get(cnpj) as string;
  return { contrato: construir(linha.valores, codEmpresa), erros: [] };
}

/** Referencia o fornecedor por `cnpj` (A-37), não mais por `cod_empresa` — resolve para o
 * codEmpresa que `validarFornecedores` já decidiu (existente ou recém-gerado). */
export function validarContratos(
  linhas: readonly LinhaBruta[],
  cnpjParaCodEmpresa: ReadonlyMap<string, string>
): ResultadoContratos {
  const avaliadas = linhas.map((linha) => avaliar(linha, cnpjParaCodEmpresa));
  return {
    validos: avaliadas.flatMap((item) => (item.contrato ? [item.contrato] : [])),
    erros: avaliadas.flatMap((item) => item.erros)
  };
}
