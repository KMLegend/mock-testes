import { OcorrenciaDeRecessoRepository } from '../../application/ports/OcorrenciaDeRecessoRepository';
import { OcorrenciaDeRecesso } from '../../domain/entities/OcorrenciaDeRecesso';
import { AutorDoLancamento } from '../../domain/value-objects/AutorDoLancamento';
import { CompetenciaDeRecesso } from '../../domain/value-objects/CompetenciaDeRecesso';
import { OrigemDaOcorrencia } from '../../domain/value-objects/OrigemDaOcorrencia';
import { QuantidadeDeDias } from '../../domain/value-objects/QuantidadeDeDias';
import { TipoOcorrencia } from '../../domain/value-objects/TipoOcorrencia';
import { ApiClient } from './ApiClient';

export class OcorrenciaDeRecessoRepositoryHttp implements OcorrenciaDeRecessoRepository {
  async todas(): Promise<OcorrenciaDeRecesso[]> {
    try {
      const res = await ApiClient.get<{ occurrences: any[] }>('/v2/recesso/ocorrencias');
      return this.reconstruirLista(res.occurrences || []);
    } catch {
      // Fallback: se o endpoint não suportar a listagem completa,
      // retorna vazio e o motor regenera os créditos localmente.
      return [];
    }
  }

  async doContrato(codContrato: string): Promise<OcorrenciaDeRecesso[]> {
    const res = await ApiClient.get<{ occurrences: any[] }>('/v2/recesso/ocorrencias?contratoId=' + encodeURIComponent(codContrato));
    return this.reconstruirLista(res.occurrences || [], codContrato);
  }

  async salvar(ocorrencia: OcorrenciaDeRecesso): Promise<void> {
    await ApiClient.post('/v2/recesso/ocorrencias', {
      contratoId: ocorrencia.codContrato,
      dataDaOcorrencia: ocorrencia.dataDoCalculo.toISOString().split('T')[0],
      descricao: ocorrencia.descricao,
      tipo: ocorrencia.tipo.paraArmazenamento(),
      quantidade: ocorrencia.quantidade.obterValor()
    });
  }

  async salvarVarias(_ocorrencias: readonly OcorrenciaDeRecesso[]): Promise<void> {
    // Para salvar várias automáticas, chamamos o processador automático do backend
    await ApiClient.post('/v2/recesso/creditos-automaticos/processar', {});
  }

  private reconstruirLista(items: any[], codContratoFixo?: string): OcorrenciaDeRecesso[] {
    return items.map(item => new OcorrenciaDeRecesso({
      id: String(item.id),
      codContrato: codContratoFixo ?? item.contratoId ?? item.codContrato ?? '',
      dataDoCalculo: new Date(item.dataDoCalculo),
      competencia: CompetenciaDeRecesso.apartirDe(new Date(item.competencia)),
      descricao: item.descricao,
      tipo: TipoOcorrencia.de(item.tipo),
      quantidade: item.quantidade <= 0 ? QuantidadeDeDias.nenhuma() : QuantidadeDeDias.de(item.quantidade),
      autor: AutorDoLancamento.usuario(item.lancadoPor),
      origem: OrigemDaOcorrencia.de(item.origem),
      criadoEm: new Date(item.dataDoCalculo)
    }));
  }
}
