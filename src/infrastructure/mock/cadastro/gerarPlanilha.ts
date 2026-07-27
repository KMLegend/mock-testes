import * as XLSX from 'xlsx';
import { BaseDeCadastroStore } from './BaseDeCadastroStore';
import { ABA_FORNECEDORES, ABA_CONTRATOS } from './lerPlanilha';
import {
  FornecedorSerializado,
  ContratoSerializado,
  serializarFornecedor,
  serializarContrato
} from './serializacao';

const COLUNAS_FORNECEDOR = [
  'cod_empresa', 'razao_social', 'nome_fantasia', 'responsavel_legal',
  'email', 'cnpj', 'tipo_inscricao', 'ativo'
];
const COLUNAS_CONTRATO = [
  'cod_empresa', 'cod_contrato', 'nome_contrato', 'data_inicio', 'data_fim',
  'valor_mensal', 'empresa_vinculada_codigo', 'empresa_vinculada_nome', 'proporcao_de_recesso'
];

function linhaFornecedor(dado: FornecedorSerializado): Record<string, string | number> {
  return {
    cod_empresa: dado.codEmpresa, razao_social: dado.empresa, nome_fantasia: dado.apelido,
    responsavel_legal: dado.responsavelLegal ?? '', email: dado.email, cnpj: dado.cnpj,
    tipo_inscricao: dado.tipoInscricao, ativo: dado.ativo ? 'Sim' : 'Não'
  };
}

function linhaContrato(dado: ContratoSerializado): Record<string, string | number> {
  return {
    cod_empresa: dado.codEmpresa, cod_contrato: dado.codContrato, nome_contrato: dado.nomeContrato,
    data_inicio: dado.dataInicio, data_fim: dado.dataFim, valor_mensal: dado.valorMensal,
    empresa_vinculada_codigo: dado.empresaResponsavel,
    empresa_vinculada_nome: dado.nomeEmpresaResponsavel,
    proporcao_de_recesso: dado.proporcaoDeRecesso ?? ''
  };
}

/** Planilha-modelo vazia: só os cabeçalhos das duas abas. */
export function gerarModelo(): void {
  const planilha = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(planilha, XLSX.utils.aoa_to_sheet([COLUNAS_FORNECEDOR]), ABA_FORNECEDORES);
  XLSX.utils.book_append_sheet(planilha, XLSX.utils.aoa_to_sheet([COLUNAS_CONTRATO]), ABA_CONTRATOS);
  XLSX.writeFile(planilha, 'modelo_base_pjs.xlsx');
}

/** Exporta a base atual (para editar em ciclo e reenviar). */
export function exportarBase(store: BaseDeCadastroStore): void {
  const planilha = XLSX.utils.book_new();
  const fornecedores = store.fornecedores().map((item) => linhaFornecedor(serializarFornecedor(item)));
  const contratos = store.contratos().map((item) => linhaContrato(serializarContrato(item)));
  XLSX.utils.book_append_sheet(
    planilha, XLSX.utils.json_to_sheet(fornecedores, { header: COLUNAS_FORNECEDOR }), ABA_FORNECEDORES
  );
  XLSX.utils.book_append_sheet(
    planilha, XLSX.utils.json_to_sheet(contratos, { header: COLUNAS_CONTRATO }), ABA_CONTRATOS
  );
  XLSX.writeFile(planilha, 'base_pjs_atual.xlsx');
}
