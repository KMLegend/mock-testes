import { AlertaRepository } from '../../application/ports/AlertaRepository';
import { Alerta } from '../../domain/entities/Alerta';
import { Email } from '../../domain/value-objects/Email';
import { Cnpj } from '../../domain/value-objects/Cnpj';
import { DataHora } from '../../domain/value-objects/DataHora';
import { Competencia } from '../../domain/value-objects/Competencia';
import { RegraAlerta } from '../../domain/value-objects/RegraAlerta';
import { ApiClient } from './ApiClient';

export class AlertaRepositoryHttp implements AlertaRepository {
  async todos(): Promise<Alerta[]> {
    return [];
  }

  async doFornecedor(email: Email): Promise<Alerta[]> {
    const list = await ApiClient.get<any[]>('/v2/notas-fiscais/comunicados?email=' + encodeURIComponent(email.paraExibicao()));
    return list.map(item => new Alerta({
      email: Email.de(item.email),
      responsavelLegal: item.nome || item.responsavel_legal || 'Responsável',
      cnpj: Cnpj.de(item.cnpj),
      regra: RegraAlerta.de(item.regra || 'D'),
      dataHoraEnvio: DataHora.de(item.data_hora_envio),
      mesAnoReferencia: Competencia.deTextoLivre(item.mes_ano_referencia)
    }));
  }
}
