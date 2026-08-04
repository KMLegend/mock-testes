import * as XLSX from 'xlsx';
import { BaseDeCadastroStore } from './BaseDeCadastroStore';
import { ABA_FORNECEDORES, ABA_CONTRATOS } from './lerPlanilha';
import {
  FornecedorSerializado,
  ContratoSerializado,
  serializarFornecedor,
  serializarContrato
} from './serializacao';

/** Espelha `SEM_PRAZO_DEFINIDO` de validarContratos.ts — na exportação vira célula vazia de novo. */
const SEM_PRAZO_DEFINIDO = '9999-12-31';

// `cod_empresa` não é coluna (A-37) — é gerado pelo sistema a partir do CNPJ. A aba Contratos
// vincula ao fornecedor por `cnpj`, não por código.
const COLUNAS_FORNECEDOR = [
  'razao_social', 'nome_fantasia', 'responsavel_legal', 'email', 'cnpj', 'tipo_inscricao', 'ativo'
];
const COLUNAS_CONTRATO = [
  'cnpj', 'cod_contrato', 'nome_contrato', 'data_inicio', 'data_fim',
  'valor_mensal', 'empresa_vinculada_codigo', 'empresa_vinculada_nome'
];

function linhaFornecedor(dado: FornecedorSerializado): Record<string, string | number> {
  return {
    razao_social: dado.empresa, nome_fantasia: dado.apelido,
    responsavel_legal: dado.responsavelLegal ?? '', email: dado.email, cnpj: dado.cnpj,
    tipo_inscricao: dado.tipoInscricao, ativo: dado.ativo ? 'Sim' : 'Não'
  };
}

function linhaContrato(dado: ContratoSerializado, cnpjPorCodEmpresa: ReadonlyMap<string, string>): Record<string, string | number> {
  return {
    cnpj: cnpjPorCodEmpresa.get(dado.codEmpresa) ?? '',
    cod_contrato: dado.codContrato, nome_contrato: dado.nomeContrato,
    data_inicio: dado.dataInicio, data_fim: dado.dataFim === SEM_PRAZO_DEFINIDO ? '' : dado.dataFim,
    valor_mensal: dado.valorMensal,
    empresa_vinculada_codigo: dado.empresaResponsavel,
    empresa_vinculada_nome: dado.nomeEmpresaResponsavel
  };
}

/** Planilha-modelo vazia: só os cabeçalhos das duas abas. */
export function gerarModelo(): void {
  const planilha = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(planilha, XLSX.utils.aoa_to_sheet([COLUNAS_FORNECEDOR]), ABA_FORNECEDORES);
  XLSX.utils.book_append_sheet(planilha, XLSX.utils.aoa_to_sheet([COLUNAS_CONTRATO]), ABA_CONTRATOS);
  XLSX.writeFile(planilha, 'modelo_base_pjs.xlsx');
}

/** Exporta a base atual (para editar em ciclo e reenviar) — mesmo formato que a importação espera. */
export function exportarBase(store: BaseDeCadastroStore): void {
  const planilha = XLSX.utils.book_new();
  const fornecedoresSerializados = store.fornecedores().map(serializarFornecedor);
  const cnpjPorCodEmpresa = new Map(fornecedoresSerializados.map((f) => [f.codEmpresa, f.cnpj]));

  const fornecedores = fornecedoresSerializados.map(linhaFornecedor);
  const contratos = store.contratos()
    .map((item) => linhaContrato(serializarContrato(item), cnpjPorCodEmpresa));

  XLSX.utils.book_append_sheet(
    planilha, XLSX.utils.json_to_sheet(fornecedores, { header: COLUNAS_FORNECEDOR }), ABA_FORNECEDORES
  );
  XLSX.utils.book_append_sheet(
    planilha, XLSX.utils.json_to_sheet(contratos, { header: COLUNAS_CONTRATO }), ABA_CONTRATOS
  );
  XLSX.writeFile(planilha, 'base_pjs_atual.xlsx');
}
