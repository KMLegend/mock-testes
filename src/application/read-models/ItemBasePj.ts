import { Fornecedor } from '../../domain/entities/Fornecedor';
import { Contrato } from '../../domain/entities/Contrato';

export class ItemBasePj {
  constructor(
    public readonly fornecedor: Fornecedor,
    public readonly contratos: readonly Contrato[]
  ) {}

  get codEmpresa(): string {
    return this.fornecedor.codEmpresa;
  }

  get razaoSocial(): string {
    return this.fornecedor.empresa;
  }

  get nomeFantasia(): string {
    return this.fornecedor.apelido;
  }

  get responsavelLegal(): string {
    return this.fornecedor.responsavelLegal;
  }

  get email(): string {
    return this.fornecedor.email.paraExibicao();
  }

  get cnpj(): string {
    return this.fornecedor.cnpj.paraExibicao();
  }

  get ativo(): boolean {
    return this.fornecedor.ativo;
  }

  get statusTexto(): string {
    return this.fornecedor.statusParaExibicao();
  }

  get totalContratos(): number {
    return this.contratos.length;
  }

  correspondeA(busca: string): boolean {
    if (!busca || busca.trim() === '') return true;
    const termo = busca.trim().toLowerCase();

    const bateCamposFornecedor =
      this.razaoSocial.toLowerCase().includes(termo) ||
      this.nomeFantasia.toLowerCase().includes(termo) ||
      this.responsavelLegal.toLowerCase().includes(termo) ||
      this.fornecedor.email.paraExibicao().toLowerCase().includes(termo) ||
      this.fornecedor.cnpj.contem(termo) ||
      this.codEmpresa.toLowerCase().includes(termo);

    if (bateCamposFornecedor) return true;

    // Também pesquisa nos contratos associados
    return this.contratos.some((c) =>
      c.codContrato.toLowerCase().includes(termo) ||
      c.nomeContrato.toLowerCase().includes(termo) ||
      c.nomeEmpresaResponsavel.toLowerCase().includes(termo)
    );
  }
}
