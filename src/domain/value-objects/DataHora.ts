export class DataHora {
  private constructor(private readonly isoStr: string) {}

  static de(isoDateString?: string | null): DataHora {
    return new DataHora(String(isoDateString ?? '').trim());
  }

  paraFormatadoCompleto(): string {
    if (!this.isoStr) return '-';
    return DataHora.formatar(this.isoStr, true);
  }

  paraFormatadoCurto(): string {
    if (!this.isoStr) return '-';
    return DataHora.formatar(this.isoStr, false);
  }

  /**
   * O JS parseia "2023-01-01" como UTC: em UTC-3 isso vira 31/12/2022 local, o que
   * desloca período aquisitivo e exibição em um ano. Data sem hora é sempre lida
   * no fuso local; string com hora mantém o parse padrão.
   */
  paraDataLocal(): Date {
    const [ano, mes, dia] = this.isoStr.slice(0, 10).split('-').map(Number);
    if (ano === undefined || mes === undefined || dia === undefined) return new Date(NaN);
    if (!Number.isFinite(ano) || !Number.isFinite(mes) || !Number.isFinite(dia)) return new Date(NaN);
    return new Date(ano, mes - 1, dia);
  }

  private static ehSomenteData(isoStr: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(isoStr);
  }

  private static formatar(isoStr: string, completo: boolean): string {
    if (DataHora.ehSomenteData(isoStr)) {
      return DataHora.formatarDataValida(DataHora.de(isoStr).paraDataLocal(), completo);
    }
    const timestamp = Date.parse(isoStr.replace(' ', 'T'));
    if (isNaN(timestamp)) return isoStr;
    const date = new Date(timestamp);
    return DataHora.formatarDataValida(date, completo);
  }

  private static formatarDataValida(date: Date, completo: boolean): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dataFormatada = `${day}/${month}/${year}`;
    if (!completo) return dataFormatada;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dataFormatada} ${hours}:${minutes}`;
  }

  raw(): string {
    return this.isoStr;
  }
}
