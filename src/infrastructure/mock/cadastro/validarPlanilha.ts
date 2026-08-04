import { ErroDeImportacao } from '../../../application/ports/CargaDeCadastro';
import { Fornecedor } from '../../../domain/entities/Fornecedor';
import { BaseDeCadastro } from './BaseDeCadastroStore';
import { AbasBrutas } from './lerPlanilha';
import { validarFornecedores } from './validarFornecedores';
import { validarContratos } from './validarContratos';

export interface ResultadoValidacao {
  readonly base: BaseDeCadastro;
  readonly erros: readonly ErroDeImportacao[];
}

/**
 * Espelha o LeitorDePlanilha + contrato do backend (docs/backend/19 §6.4, A-37).
 * `fornecedoresAtuais` é a base já existente, usada só para o dry-run de CNPJ (reaproveitar
 * codEmpresa de empresa já cadastrada) — vazio quando não há uma base conhecida (ex.: preview
 * client-side na Fase 2, que não consulta o backend antes de confirmar).
 */
export function validar(abas: AbasBrutas, fornecedoresAtuais: readonly Fornecedor[] = []): ResultadoValidacao {
  const fornecedores = validarFornecedores(abas.fornecedores, fornecedoresAtuais);
  const contratos = validarContratos(abas.contratos, fornecedores.cnpjParaCodEmpresa);
  return {
    base: { fornecedores: fornecedores.validos, contratos: contratos.validos },
    erros: [...fornecedores.erros, ...contratos.erros]
  };
}
