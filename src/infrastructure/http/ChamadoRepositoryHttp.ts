import { ChamadoRepository } from '../../application/ports/ChamadoRepository';
import { Chamado } from '../../domain/entities/Chamado';
import { Competencia } from '../../domain/value-objects/Competencia';
import { Email } from '../../domain/value-objects/Email';
import { Cnpj } from '../../domain/value-objects/Cnpj';
import { DataHora } from '../../domain/value-objects/DataHora';
import { TipoLancamento } from '../../domain/value-objects/TipoLancamento';
import { ApiClient } from './ApiClient';

export class ChamadoRepositoryHttp implements ChamadoRepository {
  async daCompetencia(competencia: Competencia): Promise<Chamado[]> {
    const rawList = await ApiClient.get<any[]>('/v2/notas-fiscais/status?mesAnoReferencia=' + competencia.paraArmazenamento());
    const validCalls = rawList.filter(item => item.id_tomticket !== null && item.id_tomticket !== undefined);
    return validCalls.map(item => new Chamado({
      id: item.id_tomticket,
      protocolo: item.numero_chamado,
      assunto: item.assunto || 'Nota Fiscal',
      dataCriacao: DataHora.de(item.data_abertura || new Date().toISOString()),
      dataFinalizacao: item.data_finalizacao ? DataHora.de(item.data_finalizacao) : null,
      nomeSolicitante: item.nome,
      email: Email.de(item.email),
      situacaoId: item.status === 'Recebido' ? '5' : '1',
      situacaoDescricao: item.status === 'Recebido' ? 'Finalizado' : 'Em Andamento',
      categoriaId: '',
      categoriaNome: '',
      tipoLancamento: TipoLancamento.de(item.tipo_lancamento || 'Contratual'),
      mesReferente: competencia,
      cnpjAnexo: item.cnpj ? Cnpj.de(item.cnpj) : null
    }));
  }

  async todos(): Promise<Chamado[]> {
    return [];
  }

  async salvar(_chamado: Chamado): Promise<void> {}
  async remover(_id: string): Promise<void> {}
  async atualizar(_chamado: Chamado): Promise<void> {}
  async resetar(): Promise<void> {}
}
