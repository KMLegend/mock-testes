import { ErroDeImportacao } from '../../../application/ports/CargaDeCadastro';
import { Fornecedor } from '../../../domain/entities/Fornecedor';
import { Contrato } from '../../../domain/entities/Contrato';
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
 * `fornecedoresAtuais`/`contratosAtuais` são a base já existente, usados só para o dry-run:
 * reaproveitar codEmpresa de empresa já cadastrada e não gerar um codContrato que já existiu —
 * vazios quando não há base conhecida (ex.: preview client-side na Fase 2, que não consulta o
 * backend antes de confirmar).
 */
export function validar(
  abas: AbasBrutas,
  fornecedoresAtuais: readonly Fornecedor[] = [],
  contratosAtuais: readonly Contrato[] = []
): ResultadoValidacao {
  const fornecedores = validarFornecedores(abas.fornecedores, fornecedoresAtuais);
  const contratos = validarContratos(abas.contratos, fornecedores.cnpjParaCodEmpresa, contratosAtuais);
  return {
    base: { fornecedores: fornecedores.validos, contratos: contratos.validos },
    erros: [...fornecedores.erros, ...contratos.erros]
  };
}
