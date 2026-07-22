import { AlertaRepository } from '../../application/ports/AlertaRepository';
import { Alerta } from '../../domain/entities/Alerta';
import { Email } from '../../domain/value-objects/Email';
import { mockAlertasData } from './dados/mockData';

export class AlertaRepositoryEmMemoria implements AlertaRepository {
  private readonly alertas: Alerta[] = [...mockAlertasData];

  async todos(): Promise<Alerta[]> {
    return [...this.alertas].sort((a, b) => {
      const timeA = new Date(a.dataHoraEnvio.raw().replace(' ', 'T')).getTime();
      const timeB = new Date(b.dataHoraEnvio.raw().replace(' ', 'T')).getTime();
      return timeB - timeA;
    });
  }

  async doFornecedor(email: Email): Promise<Alerta[]> {
    return this.alertas
      .filter((a) => a.email.equals(email))
      .sort((a, b) => {
        const timeA = new Date(a.dataHoraEnvio.raw().replace(' ', 'T')).getTime();
        const timeB = new Date(b.dataHoraEnvio.raw().replace(' ', 'T')).getTime();
        return timeB - timeA;
      });
  }
}
