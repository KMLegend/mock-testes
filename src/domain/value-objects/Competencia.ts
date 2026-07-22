const MESES_EXTENSO: Record<string, string> = {
  janeiro: '01', fevereiro: '02', março: '03', abril: '04',
  maio: '05', junho: '06', julho: '07', agosto: '08',
  setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
};

export class Competencia {
  private constructor(private readonly mesAno: string) {}

  static de(mes: string, ano: string): Competencia {
    const mesPadded = String(mes).padStart(2, '0');
    return new Competencia(`${mesPadded}-${ano}`);
  }

  static deTextoLivre(texto?: string, dataCriacao?: string): Competencia {
    const parseado = Competencia.parseTexto(texto, dataCriacao);
    return new Competencia(parseado);
  }

  private static parseTexto(texto?: string, dataCriacao?: string): string {
    const limpo = String(texto ?? '').trim();
    
    const matchPadrao = Competencia.parsePadraoNumerico(limpo);
    if (matchPadrao) return matchPadrao;

    const textual = Competencia.parseTextual(limpo);
    if (textual) return textual;

    return Competencia.fallbackDataCriacao(dataCriacao);
  }

  private static parsePadraoNumerico(limpo: string): string | null {
    const matchSlashDash = limpo.match(/^(\d{2})[/-](\d{4})$/);
    if (matchSlashDash && matchSlashDash[1] && matchSlashDash[2]) {
      return `${matchSlashDash[1]}-${matchSlashDash[2]}`;
    }

    const matchYearFirst = limpo.match(/^(\d{4})-(\d{2})$/);
    if (matchYearFirst && matchYearFirst[1] && matchYearFirst[2]) {
      return `${matchYearFirst[2]}-${matchYearFirst[1]}`;
    }

    return null;
  }

  private static parseTextual(limpo: string): string | null {
    const minusculo = limpo.toLowerCase();
    const nomeMes = Object.keys(MESES_EXTENSO).find((nomeMes) => minusculo.includes(nomeMes));
    if (!nomeMes) return null;

    const numMes = MESES_EXTENSO[nomeMes];
    const anoMatch = minusculo.match(/\d{4}/);
    if (!anoMatch) return null;

    return `${numMes}-${anoMatch[0]}`;
  }

  private static fallbackDataCriacao(dataCriacao?: string): string {
    if (!dataCriacao) return '';
    const data = new Date(dataCriacao);
    if (isNaN(data.getTime())) return '';
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    return `${mm}-${data.getFullYear()}`;
  }

  obterMes(): string {
    return this.mesAno.split('-')[0] ?? '';
  }

  obterAno(): string {
    return this.mesAno.split('-')[1] ?? '';
  }

  paraExibicao(): string {
    return this.mesAno.replace('-', '/');
  }

  paraArmazenamento(): string {
    return this.mesAno;
  }

  equals(outra: Competencia): boolean {
    return this.mesAno === outra.mesAno;
  }
}
