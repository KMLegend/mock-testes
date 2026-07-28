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
    const termo = busca.trim().toLowerCase();
    if (termo === '') return true;
    return this.bateFornecedor(termo) || this.bateContratos(termo);
  }

  private bateFornecedor(termo: string): boolean {
    const textos = [this.razaoSocial, this.nomeFantasia, this.responsavelLegal, this.codEmpresa];
    if (textos.some((texto) => texto.toLowerCase().includes(termo))) return true;
    return this.fornecedor.email.paraExibicao().toLowerCase().includes(termo)
      || this.fornecedor.cnpj.contem(termo);
  }

  private bateContratos(termo: string): boolean {
    return this.contratos.some((contrato) =>
      [contrato.codContrato, contrato.nomeContrato, contrato.nomeEmpresaResponsavel]
        .some((texto) => texto.toLowerCase().includes(termo))
    );
  }
}
