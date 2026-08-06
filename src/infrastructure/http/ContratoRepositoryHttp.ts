import { ContratoRepository } from '../../application/ports/ContratoRepository';
import { Contrato } from '../../domain/entities/Contrato';
import { DataHora } from '../../domain/value-objects/DataHora';
import { ApiClient } from './ApiClient';

export class ContratoRepositoryHttp implements ContratoRepository {
  async todos(): Promise<Contrato[]> {
    const list = await ApiClient.get<any[]>('/v2/recesso/contratos');
    return list.map(item => new Contrato({
      codEmpresa: item.cod_empresa,
      codContrato: item.cod_contrato,
      nomeContrato: item.nome_contrato || '',
      dataInicio: DataHora.de(item.data_inicio),
      dataFim: DataHora.de(item.data_fim || '9999-12-31'),
      valorMensal: item.valor_mensal || 0,
      // Empresa VINCULADA (tomadora do serviço) — não confundir com o próprio prestador
      // (item.cod_empresa/item.nome_fornecedor identificam o PJ dono do contrato, não a
      // empresa pra qual ele presta serviço).
      empresaResponsavel: item.empresa_vinculada_codigo || '',
      nomeEmpresaResponsavel: item.empresa_vinculada_nome || '',
      isDeletedAt: item.is_delete ? new Date().toISOString() : null
    }));
  }
}
