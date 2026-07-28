import { Contrato } from '../../../domain/entities/Contrato';
import { DataHora } from '../../../domain/value-objects/DataHora';
import { ErroDeImportacao } from '../../../application/ports/CargaDeCadastro';
import { LinhaBruta, ABA_CONTRATOS } from './lerPlanilha';
import { ehDataIso, numeroOuNulo } from './validadores';

export interface ResultadoContratos {
  readonly validos: readonly Contrato[];
  readonly erros: readonly ErroDeImportacao[];
}

type Valores = Record<string, string>;

function texto(valores: Valores, chave: string): string {
  return valores[chave] ?? '';
}

function checagens(valores: Valores, cods: ReadonlySet<string>) {
  const codEmpresa = texto(valores, 'cod_empresa');
  const valor = numeroOuNulo(texto(valores, 'valor_mensal'));
  return [
    { campo: 'cod_empresa', invalido: codEmpresa === '', motivo: 'obrigatório' },
    { campo: 'cod_empresa', invalido: codEmpresa !== '' && !cods.has(codEmpresa), motivo: 'fornecedor não encontrado' },
    { campo: 'cod_contrato', invalido: texto(valores, 'cod_contrato') === '', motivo: 'obrigatório' },
    { campo: 'data_inicio', invalido: !ehDataIso(texto(valores, 'data_inicio')), motivo: 'data inválida (AAAA-MM-DD)' },
    { campo: 'data_fim', invalido: !ehDataIso(texto(valores, 'data_fim')), motivo: 'data inválida (AAAA-MM-DD)' },
    { campo: 'empresa_vinculada_codigo', invalido: texto(valores, 'empresa_vinculada_codigo') === '', motivo: 'obrigatório' },
    { campo: 'empresa_vinculada_nome', invalido: texto(valores, 'empresa_vinculada_nome') === '', motivo: 'obrigatório' },
    { campo: 'valor_mensal', invalido: valor === null, motivo: 'número inválido' }
  ];
}

function construir(valores: Valores): Contrato {
  const valor = numeroOuNulo(texto(valores, 'valor_mensal'));
  return new Contrato({
    codEmpresa: texto(valores, 'cod_empresa'),
    codContrato: texto(valores, 'cod_contrato'),
    nomeContrato: texto(valores, 'nome_contrato'),
    dataInicio: DataHora.de(texto(valores, 'data_inicio')),
    dataFim: DataHora.de(texto(valores, 'data_fim')),
    valorMensal: typeof valor === 'number' ? valor : 0,
    empresaResponsavel: texto(valores, 'empresa_vinculada_codigo'),
    nomeEmpresaResponsavel: texto(valores, 'empresa_vinculada_nome')
  });
}

function avaliar(linha: LinhaBruta, cods: ReadonlySet<string>): { contrato: Contrato | null; erros: ErroDeImportacao[] } {
  const invalidas = checagens(linha.valores, cods).filter((item) => item.invalido);
  const erros = invalidas.map((item) => ({
    aba: ABA_CONTRATOS, linha: linha.linha, campo: item.campo, motivo: item.motivo
  }));
  return { contrato: invalidas.length === 0 ? construir(linha.valores) : null, erros };
}

export function validarContratos(linhas: readonly LinhaBruta[], cods: ReadonlySet<string>): ResultadoContratos {
  const avaliadas = linhas.map((linha) => avaliar(linha, cods));
  return {
    validos: avaliadas.flatMap((item) => (item.contrato ? [item.contrato] : [])),
    erros: avaliadas.flatMap((item) => item.erros)
  };
}
