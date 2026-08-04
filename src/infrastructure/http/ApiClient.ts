export class ApiClient {
  private static readonly baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  private static readonly token = import.meta.env.VITE_API_TOKEN || '';

  static async get<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  }

  static async post<T>(path: string, body: any): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || `HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  }

  /**
   * Baixa um arquivo autenticado. Downloads via `window.open`/link direto não conseguem
   * anexar o header Authorization — por isso a única forma correta de autenticar é via
   * fetch (nunca `?token=` na URL: vaza para histórico do navegador e logs do servidor).
   */
  static async getBlob(path: string): Promise<{ blob: Blob; filename: string | null }> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || `HTTP error! status: ${response.status}`);
    }

    const disposicao = response.headers.get('Content-Disposition') || '';
    const nomeCasado = /filename="?([^";]+)"?/i.exec(disposicao);

    return { blob: await response.blob(), filename: nomeCasado?.[1] ?? null };
  }

  static async postMultipart<T>(path: string, file: File): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const formData = new FormData();
    formData.append('arquivo', file);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail?.erros ? JSON.stringify(errJson.detail.erros) : (errJson.detail || `HTTP error! status: ${response.status}`));
    }

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  }
}
