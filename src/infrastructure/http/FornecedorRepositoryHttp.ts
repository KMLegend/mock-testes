import { FornecedorRepository } from '../../application/ports/FornecedorRepository';
import { Fornecedor } from '../../domain/entities/Fornecedor';
import { Cnpj } from '../../domain/value-objects/Cnpj';
import { Email } from '../../domain/value-objects/Email';
import { ApiClient } from './ApiClient';

export class FornecedorRepositoryHttp implements FornecedorRepository {
  async ativos(): Promise<Fornecedor[]> {
    const todos = await this.todos();
    return todos.filter(f => f.ativo);
  }

  async todos(): Promise<Fornecedor[]> {
    const list = await ApiClient.get<any[]>('/v2/notas-fiscais/fornecedores');
    return list.map(item => new Fornecedor({
      codEmpresa: item.cod_empresa,
      empresa: item.nome,
      apelido: item.apelido || item.nome,
      email: Email.de(item.email),
      tipoInscricao: item.tipo_inscricao || 'CNPJ',
      cnpj: Cnpj.de(item.cnpj),
      ativo: !item.is_delete,
      responsavelLegal: item.responsavel_legal
    }));
  }
}
