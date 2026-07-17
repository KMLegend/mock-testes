---
titulo: Frontend — Dashboard
dominio: frontend
fase: 1
tags: [frontend, dashboard, datagrid, filtros, ano-mes, historico, exportacao, xlsx, mock]
status: normativo
---

# Frontend — Dashboard

> Documento **normativo** dos requisitos de UI. A tecnologia (React etc.) é suposição; os requisitos funcionais não.
> **Fase 1 (foco):** este dashboard é entregue **mockado e interativo** (status dos PJ) sobre a camada de dados por interface (`13`, `10` Fase 1). **Fase 2** apenas troca o mock pelos endpoints reais (`12` §3) — a UI **não muda**.
> **Identidade visual:** obrigatória a Marca City — ver `11-identidade-visual.md`. Cores, tipografia e logo vêm de `public/brand/brand.css`; badges de status usam os tokens `--color-status-pendente/enviado/recebido`. Nunca usar HEX hard-coded.

## 1. Tela principal (Tarefa 3.1)

### Filtros obrigatórios (Painel de Filtros HUD)
- O painel de filtros (HUD) contendo Ano, Mês, Busca Textual, Filtro por Status e botão Excel está posicionado no topo, **acima das abas**, aplicando-se **simultaneamente a ambas as abas existentes** (Status e Mensagens).
- Seletor de **Ano** (obrigatório).
- Seletor de **Mês** (obrigatório).
- A combinação compõe a competência: **exibição `MM/AAAA`**, **sistêmico `MM-AAAA`** (A-19). Chamada: `GET /v2/notas-fiscais/status?mesAnoReferencia=07-2026`, com **JWT M2M**. Ver `12` §3.
- **Default (A-11):** ao abrir, o Dashboard exibe os dados do **mês atual** (competência corrente) já selecionado.

### Listagem (DataGrid/Table)
Renderiza **todos os fornecedores ativos** e o **status calculado**. A granularidade é
**por `(e-mail, Tipo de Lançamento)`** — um PJ com dois chamados (Contratual + Reembolso) aparece em
**duas linhas**, cada uma com seu próprio chamado e status (A-05/A-14; ver `04` §2.1).

Colunas da tabela (A-23 — ordem definida):
| Coluna | Origem |
|---|---|
| **Fornecedor / PJ** | Apelido do fornecedor (Lista de PJ) |
| **Nome Empresa** | Razão social (Lista de PJ / Fato) |
| **Nome Funcionário** | `name` do chamado Tomticket (quem abriu) |
| CNPJ | Lista de PJ / Fato |
| E-mail | Lista de PJ / Fato |
| Status | Motor de status (`Pendente`/`Enviado`/`Recebido`) |
| Nº do Chamado | Fato (se houver) |
| Abertura | Fato |
| Finalização | Fato |
| Tipo de Lançamento | Fato |
| Link | Fato (abre o Tomticket) |

Recursos recomendados:
- **Indicação visual de status** (cores/badges): Pendente, Enviado, Recebido (+ Tratamento Manual, A-21).
- **Resumo/contadores** no topo (usar `GET /v2/notas-fiscais/status/resumo`).
- Ordenação e busca por nome/CNPJ/e-mail.
- Filtro por status.
- Link do chamado abre em nova aba.

## 2. Aba "Mensagens" (Audit Trail — Tarefa 3.2, A-24)

O histórico de comunicação é uma **aba própria** ("Mensagens"), **não** um botão "Auditar" por linha.
O Dashboard tem duas abas: **Status** (grid de fornecedores) e **Mensagens** (todos os alertas enviados).

- Lista **todos os alertas** disparados (não por linha): fonte = **Tabela de Alerta**
  (`GET /v2/notas-fiscais/comunicados`), independente de a Fato ter registro.
- **Colunas:** `Nome`, `E-mail`, `CNPJ`, `Regra` (D-3/D/D+1/D+3), `Data/Hora de Envio`, `Ano/Mês`.
- Ordenar do mais recente para o mais antigo.

## 3. Módulo de Exportação (Tarefa 3.3, A-25)

- Botão único **`EXCEL`** que respeita os **filtros atuais** do Dashboard.
- **Somente `.xlsx`** — **sem CSV nem PDF** (A-25). Chama
  `GET /v2/notas-fiscais/export?mesAnoReferencia=07-2026` (gerado no backend — `12` §3.4).

> A proibição de Excel vale para **entrada de dados** (nada de planilha como fonte — os dados vêm de
> **Tomticket** e **HCM**). O Excel é permitido **apenas como formato de exportação**.

### Colunas do arquivo (mesmas da tabela)
`Fornecedor / PJ`, `Nome Empresa`, `Nome Funcionário`, `CNPJ`, `E-mail`, `Status`, `Nº Chamado`, `Abertura`, `Finalização`, `Tipo de Lançamento`, `Link`.

### Abas (Sheets)
- **Status Notas Fiscais**: Aba principal contendo as notas fiscais dos fornecedores, filtradas pelos parâmetros ativos no painel.
- **Contratos**: Aba específica para os contratos (Tipo de Lançamento `Contratual` ou `Ambas`), filtrada em conformidade com os parâmetros ativos.
- **Mensagens Enviadas**: Aba com o histórico de alertas enviados aos fornecedoresPJ, filtrada pelos parâmetros do painel.

### Formatação
- Datas em formato legível (`DD/MM/AAAA`).
- `Link` como hyperlink clicável.
- Cabeçalhos na primeira linha; congelar cabeçalho (freeze panes) recomendado.

## 4. Estados de UI

- **Carregando** — enquanto busca status/histórico.
- **Vazio** — período sem PJ ativos (improvável) ou sem comunicados no histórico.
- **Erro** — falha na API; permitir retry.

> Não existe estado "sem seleção": o Dashboard abre no **mês atual** por padrão (A-11).

## 5. Acessibilidade e responsividade

- Tabela com rolagem horizontal em telas estreitas (não quebrar o layout).
- Contraste adequado nas cores de status (não depender só de cor — usar rótulo/badge textual).

## 6. Mapa de dados → componentes

> Todas as chamadas usam a base da **CITY API** (`/v2/notas-fiscais/...`) com **JWT M2M** no header `Authorization: Bearer <token>` e retornam o envelope padrão (`06` §5).

```
Aba Status → Filtros (Ano/Mês) ─► GET /v2/notas-fiscais/status?mesAnoReferencia ───► DataGrid
                     └───────────► GET /v2/notas-fiscais/status/resumo ───────────► Cards de resumo
Aba Mensagens ──────────────────► GET /v2/notas-fiscais/comunicados ──────────────► Tabela de Mensagens
Botão "EXCEL" ──────────────────► GET /v2/notas-fiscais/export?mesAnoReferencia ───► download .xlsx
```
