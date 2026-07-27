---
titulo: Carga da Base de PJs — Tela de upload/download (frontend)
dominio: frontend
fase: [1, 2]
tags: [frontend, react, upload, download, excel, xlsx, cadastro, planilha, ports-adapters, mock]
status: normativo-para-implementacao
---

# Carga da Base de PJs — Tela de upload/download

> **Por que existe.** Enquanto o HCM não expõe endpoint (P-06), **quem alimenta a base de PJs é o
> usuário**, subindo uma planilha pela própria ferramenta. Esta é a tela dessa carga. O contrato da
> planilha e o backend estão em [`backend/19` §6.4/§8.1](../backend/19-fonte-de-cadastro-modular.md);
> aqui é só a UI e como ela se liga (mock agora, API depois).

> **Exceção deliberada (A-30):** Excel de **entrada** é permitido **só** para esta carga de cadastro —
> não para o fluxo transacional de NF. O download (modelo/base atual) já era permitido.

---

## 1. O que a tela oferece

Uma área **"Base de PJs"** (perfil administrativo) com três ações:

| Ação | Botão | Resultado |
|---|---|---|
| Baixar modelo | **Baixar planilha-modelo** | `.xlsx` vazio com as 2 abas e os cabeçalhos exigidos |
| Baixar base atual | **Exportar base atual** | `.xlsx` com o cadastro de hoje (editar em ciclo / auditoria) |
| Subir planilha | **Enviar planilha** (arquivo ou arrastar) | valida, mostra **relatório**, e só então aplica |

O fluxo do usuário é um ciclo: **baixa o modelo → preenche → sobe → lê o relatório → corrige → sobe de novo**.

---

## 2. O relatório é o coração da tela

Carga manual = erro de digitação é regra. A tela **nunca** aplica em silêncio: após o upload, mostra

- **Contadores**: inseridos · atualizados · ignorados.
- **Tabela de erros** (quando houver): `aba · linha · campo · motivo` — ex.: `Contratos · 7 · cnpj · deve ter 14 dígitos`.
- **Regra tudo-ou-nada**: havendo **qualquer** erro, **nada** é gravado; a pessoa corrige a lista
  inteira e reenvia. Só com zero erros o botão **Confirmar carga** aplica.

> Mesma regra do backend (`19` §8.1) — a UI só **reflete** o relatório; a decisão de gravar é validada
> dos dois lados (o front não é confiável).

---

## 3. Arquitetura — a MESMA tela em mock e em API

A tela é **burra**: dispara um caso de uso atrás de uma porta e renderiza o relatório. Quem faz o
trabalho é o adaptador — e **só o adaptador muda** entre Fase 1 e Fase 2.

```
Tela (React)  →  ImportarCadastro (caso de uso)  →  porta CargaDeCadastro
                                                      ├── Fase 1: CargaMock  (parse no cliente → repos mock)
                                                      └── Fase 2: CargaHttp  (POST /v2/cadastro/importar)
```

### 3.1 Porta
```ts
// src/application/ports/CargaDeCadastro.ts
export interface RelatorioDeImportacao {
  readonly inseridos: number;
  readonly atualizados: number;
  readonly ignorados: number;
  readonly erros: ReadonlyArray<{ aba: string; linha: number; campo: string; motivo: string }>;
}
export interface CargaDeCadastro {
  importar(arquivo: File): Promise<RelatorioDeImportacao>;
  baixarModelo(): Promise<Blob>;
  exportarBaseAtual(): Promise<Blob>;
}
```

### 3.2 Fase 1 — `CargaMock` (funciona HOJE, sem backend)

O projeto **já tem a lib `xlsx`** (é a que o `ExportadorXlsx` usa). O parse acontece **no cliente**,
valida com os **mesmos Value Objects** do domínio (`Cnpj`, `Email`, `ProporcaoDeRecesso`, `DataHora`) e,
se limpo, grava nos repositórios mock (`FornecedorRepositoryEmMemoria`, `ContratoRepositoryEmMemoria`,
`localStorage`). Assim a carga é **usável na demo**, antes de qualquer endpoint.

```ts
// src/infrastructure/mock/CargaMock.ts (esboço)
export class CargaMock implements CargaDeCadastro {
  async importar(arquivo: File): Promise<RelatorioDeImportacao> {
    const abas = lerXlsx(await arquivo.arrayBuffer());     // xlsx (client-side)
    const { validos, erros } = validarComVOs(abas);        // reusa Cnpj/Email/Proporcao...
    if (erros.length === 0) this.repos.substituirPor(validos);
    return montarRelatorio(validos, erros);
  }
  // baixarModelo / exportarBaseAtual: gerados client-side com a MESMA lib xlsx
}
```

> O `validarComVOs` do front espelha o `LeitorDePlanilha` + contrato do back (`19` §6.4). Mesma planilha,
> mesmas colunas, mesmas regras — por design, não por coincidência.

### 3.3 Fase 2 — `CargaHttp`

Troca **só** o adaptador: `importar` faz `POST /v2/cadastro/importar` (multipart) e devolve o relatório
que a API montou; `baixarModelo`/`exportarBaseAtual` chamam `/template` e `/exportar`. A **tela não muda**.

```ts
// src/infrastructure/http/CargaHttp.ts (esboço)
export class CargaHttp implements CargaDeCadastro {
  async importar(arquivo: File): Promise<RelatorioDeImportacao> {
    const form = new FormData(); form.append("arquivo", arquivo);
    const resposta = await this.api.post("/v2/cadastro/importar", form);
    return resposta.data;                                  // relatório vindo do backend
  }
}
```

A escolha do adaptador vive **só** no Composition Root (`14` §8) — o mesmo ponto onde os outros mocks
viram HTTP na Fase 2.

---

## 4. Estados da tela (UX)

| Estado | O que mostra |
|---|---|
| Ocioso | Os 3 botões; dica do formato (2 abas, colunas). |
| Enviando | Spinner; botão desabilitado. |
| Relatório com erros | Contadores + tabela de erros; **sem** botão Confirmar aplicável; convite a corrigir. |
| Relatório limpo | Contadores; **Confirmar carga** habilitado. |
| Aplicado | Toast de sucesso; a grade (NF/Recesso) recarrega com a base nova. |

Acessibilidade: a tabela de erros é navegável por leitor de tela; o `input[type=file]` tem `label`
associado; a área de arrastar tem fallback de clique.

---

## 5. Identidade visual

Segue os tokens de `11-identidade-visual.md` (CSS Modules, zero HEX hardcoded). A tabela de erros usa a
mesma paleta de status já existente (vermelho de erro = `--color-danger-*`).

---

## 6. SOLID / Object Calisthenics

- **Tela burra**: sem regra de parse/validação no componente — só dispara o caso de uso e renderiza.
- **DIP**: a UI depende da porta `CargaDeCadastro`, não de `xlsx` nem de `fetch`.
- **OCP**: `CargaMock` → `CargaHttp` é troca de adaptador, tela intacta.
- **First-class collection**: `RelatorioDeImportacao` carrega os erros; a tela não recalcula nada.
- Value Objects reaproveitados (`Cnpj`, `Email`, `ProporcaoDeRecesso`) — a validação do front é **a mesma**
  do resto do app, não uma cópia paralela (a lição das 4 cópias do filtro).

---

## 7. Checklist (frontend)

- [ ] Porta `CargaDeCadastro` + `RelatorioDeImportacao` (§3.1).
- [ ] `CargaMock` (§3.2): parse `xlsx` client-side, validação com VOs, escrita nos repos mock/`localStorage`.
- [ ] `CargaHttp` (§3.3): `POST /v2/cadastro/importar`, `/template`, `/exportar`.
- [ ] Tela "Base de PJs": 3 ações, estados de §4, tabela de erros acessível.
- [ ] Geração client-side do **modelo** e do **export** com a lib `xlsx` (Fase 1).
- [ ] Recarregar a grade após carga aplicada.
- [ ] Composition Root escolhe `CargaMock` (Fase 1) / `CargaHttp` (Fase 2).
- [ ] Acesso restrito a perfil administrativo (quando a identidade existir — `geral/18`).
