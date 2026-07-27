import { ErroDeImportacao } from '../../../application/ports/CargaDeCadastro';
import { BaseDeCadastro } from './BaseDeCadastroStore';
import { AbasBrutas } from './lerPlanilha';
import { validarFornecedores } from './validarFornecedores';
import { validarContratos } from './validarContratos';

export interface ResultadoValidacao {
  readonly base: BaseDeCadastro;
  readonly erros: readonly ErroDeImportacao[];
}

/** Espelha o LeitorDePlanilha + contrato do backend (docs/backend/19 §6.4). */
export function validar(abas: AbasBrutas): ResultadoValidacao {
  const fornecedores = validarFornecedores(abas.fornecedores);
  const cods = new Set(fornecedores.validos.map((fornecedor) => fornecedor.codEmpresa));
  const contratos = validarContratos(abas.contratos, cods);
  return {
    base: { fornecedores: fornecedores.validos, contratos: contratos.validos },
    erros: [...fornecedores.erros, ...contratos.erros]
  };
}
