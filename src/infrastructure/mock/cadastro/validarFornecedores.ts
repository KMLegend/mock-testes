import { Fornecedor } from '../../../domain/entities/Fornecedor';
import { Cnpj } from '../../../domain/value-objects/Cnpj';
import { Email } from '../../../domain/value-objects/Email';
import { ErroDeImportacao } from '../../../application/ports/CargaDeCadastro';
import { LinhaBruta, ABA_FORNECEDORES } from './lerPlanilha';
import { digitosCnpj, ehEmailValido, textoParaBooleano } from './validadores';

export interface ResultadoFornecedores {
  readonly validos: readonly Fornecedor[];
  readonly erros: readonly ErroDeImportacao[];
}

type Valores = Record<string, string>;

function texto(valores: Valores, chave: string): string {
  return valores[chave] ?? '';
}

function checagens(valores: Valores) {
  return [
    { campo: 'cod_empresa', invalido: texto(valores, 'cod_empresa') === '', motivo: 'obrigatório' },
    { campo: 'razao_social', invalido: texto(valores, 'razao_social') === '', motivo: 'obrigatório' },
    { campo: 'email', invalido: !ehEmailValido(texto(valores, 'email')), motivo: 'e-mail inválido' },
    { campo: 'cnpj', invalido: digitosCnpj(texto(valores, 'cnpj')).length !== 14, motivo: 'deve ter 14 dígitos' },
    { campo: 'ativo', invalido: textoParaBooleano(texto(valores, 'ativo')) === null, motivo: 'use Sim ou Não' }
  ];
}

function construir(valores: Valores): Fornecedor {
  const razaoSocial = texto(valores, 'razao_social');
  const responsavel = texto(valores, 'responsavel_legal');
  return new Fornecedor({
    codEmpresa: texto(valores, 'cod_empresa'),
    empresa: razaoSocial,
    apelido: texto(valores, 'nome_fantasia') || razaoSocial,
    email: Email.de(texto(valores, 'email')),
    tipoInscricao: texto(valores, 'tipo_inscricao'),
    cnpj: Cnpj.de(texto(valores, 'cnpj')),
    ativo: textoParaBooleano(texto(valores, 'ativo')) === true,
    ...(responsavel === '' ? {} : { responsavelLegal: responsavel })
  });
}

function avaliar(linha: LinhaBruta): { fornecedor: Fornecedor | null; erros: ErroDeImportacao[] } {
  const invalidas = checagens(linha.valores).filter((item) => item.invalido);
  const erros = invalidas.map((item) => ({
    aba: ABA_FORNECEDORES, linha: linha.linha, campo: item.campo, motivo: item.motivo
  }));
  return { fornecedor: invalidas.length === 0 ? construir(linha.valores) : null, erros };
}

export function validarFornecedores(linhas: readonly LinhaBruta[]): ResultadoFornecedores {
  const avaliadas = linhas.map(avaliar);
  return {
    validos: avaliadas.flatMap((item) => (item.fornecedor ? [item.fornecedor] : [])),
    erros: avaliadas.flatMap((item) => item.erros)
  };
}
