---
titulo: Visão Geral e Glossário
dominio: geral
fase: todas
tags: [visao-geral, glossario, atores, escopo, terminologia]
status: normativo
---

# Visão Geral e Glossário

## 1. Objetivo do sistema

Aplicação para **controle e automação da recepção de Notas Fiscais (NF)** de fornecedores Pessoa Jurídica (PJ), integrada ao **Tomticket**. O sistema:

- Mantém a lista de fornecedores ativos (**Lista de PJ**).
- Lê e atualiza chamados no Tomticket referentes ao lançamento de NF.
- Calcula, por competência (**Ano/Mês**), o status de cada fornecedor: **Pendente**, **Enviado** ou **Recebido**.
- Dispara alertas preventivos e de cobrança conforme regras de tempo (**D-3, D, D+1, D+3**).
- Registra todo o histórico de comunicação (**Tabela de Alerta**).
- Oferece um **Dashboard** com filtros por Ano/Mês, histórico por PJ e exportação para Excel.

## 2. Contexto de negócio

Existem dois tipos principais de NF tratados:
- **Contratual**
- **Reembolso plano de saúde**

No Tomticket há um campo customizado **"Tipo de Lançamento"** com os valores: `Ambas`, `Contratual`, `Reembolso plano de saúde`. Um mesmo chamado pode exigir **tratativas diferentes** por tipo de lançamento — por isso o modelo permite **duplicidade de registro** do mesmo número de chamado na Tabela Fato (ver `02-dicionario-de-dados.md`).

## 3. Atores

| Ator | Descrição | Interação principal |
|---|---|---|
| **Fornecedor / PJ** | Emite a NF e responde ao chamado no Tomticket | Recebe alertas por e-mail; abre/responde chamado |
| **Equipe Financeiro/HCM** | Opera o Dashboard, acompanha status e cobranças | Consulta Dashboard, exporta Excel |
| **Worker de alertas (Python + Scheduler)** | Automação de disparos | Calcula elegibilidade, envia e-mail (O365), grava na Tabela de Alerta |
| **Tomticket** | Ferramenta externa de chamados | Fonte dos chamados de lançamento de NF |

## 4. Fluxo de alto nível

1. **Base**: Lista de PJ (do HCM) define os fornecedores ativos do período.
2. **Integração de leitura**: sincroniza chamados da categoria "Recebimento de Notas - PJ"; casa por **e-mail**.
3. **Integração de atualização**: verifica se o chamado foi encerrado para evoluir o ciclo de vida da NF.
4. **Motor de status**: cruza Lista de PJ × Tabela Fato por competência e classifica cada PJ (Pendente/Enviado/Recebido).
5. **Automação de alertas (worker Python)**: calcula elegíveis (excluindo quem já consta na Fato e quem já foi alertado) e dispara e-mails via Office 365 nas regras de tempo.
6. **Registro**: cada disparo bem-sucedido é gravado na Tabela de Alerta.
7. **Consumo**: Dashboard exibe status por Ano/Mês, aba de mensagens e exportação **somente Excel** (A-25).

```
HCM ──> Lista de PJ ──┐
                      ├─(Left Join por competência, por email)──> Motor de Status ──> Dashboard
Tomticket ────────────┘            │                                       │
   (chamados)                 Tabela Fato                      Worker (Scheduler) ──> e-mail O365 ──> Tabela de Alerta
```

## 5. Glossário canônico

> Estes termos são **normativos**. Usar exatamente esta grafia em código, tabelas e documentação.

- **Lista de PJ** — Fonte da verdade dos fornecedores PJ ativos (origem **HCM**). Base para o Left Join de status. Casamento com chamados por **e-mail** (A-14).
- **Tabela Fato (Main)** — Tabela transacional que registra cada NF/chamado. Campos-chave: `id_tomticket` (GUID único), Número do Chamado, Nome, E-mail, Data de Abertura/Finalização, Status, Link, Tipo de Lançamento, Competência.
- **Tabela de Alerta** — **Log de alertas enviados** (Nome, E-mail, CNPJ, Regra, Data/Hora, Competência). Unifica o "Comunicado" do plano (A-18); é a fonte do histórico no Dashboard. A "fila" de elegíveis é calculada sob demanda, não é tabela.
- **Tipo de Lançamento** — Campo `tipo_de_lancamento` do Tomticket. Valores: `Ambas`, `Contratual`, `Reembolso plano de saude` (normalizado para `…saúde`).
- **Competência / Ano/Mês** — Período de referência da NF. `mes_ano_referencia` — **sistêmico `MM-AAAA`** (`07-2026`); **exibição `MM/AAAA`** (`07/2026`) (A-19). Deriva do "Mês Referente" do Tomticket (`03` §6).
- **Status** — Situação calculada do fornecedor no período:
  - **Pendente** — sem registro na Tabela Fato para a competência (`NULL` no Left Join).
  - **Enviado** — há registro na Tabela Fato com chamado **aberto**.
  - **Recebido** — há registro na Tabela Fato com chamado **finalizado**.
- **Regras de tempo (D-x/D+x)** — **`D` definido por variável `.env`** (≈ dia 1 do mês seguinte à competência); offsets em **dias corridos**, **sem** validação de dia útil (A-20). Ex.: competência `07-2026` → D = 01/08/2026, D-3 = 29/07, D+1 = 02/08, D+3 = 04/08. (A regra "1º dia útil" do plano foi **removida** — A-15.)
- **Worker de alertas** — Serviço **Python** com biblioteca de **Scheduler** que executa a automação (2x/dia UTC-3, envio via **Office 365**, gravação na Tabela de Alerta). **Não** usa n8n (A-13).
- **Marker** — Biblioteca open-source de extração de PDF usada para obter o **CNPJ** do anexo da NF e desambiguar o contrato quando a pessoa tem >1 contrato (A-14, `03` §3.1).
- **Chamado** — Ticket no Tomticket (categoria "Recebimento de Notas - PJ") associado ao lançamento de NF.
- **Categoria (Tomticket)** — Categoria do chamado que identifica "lançamento de NF" (ID/nome a confirmar — ver `09-pendencias-e-decisoes.md`).

## 6. Escopo e não-escopo

**No escopo:** leitura/atualização de chamados de NF, cálculo de status por competência, automação de alertas, histórico de comunicação, dashboard com filtros e exportação Excel.

**Fora de escopo (salvo decisão posterior):** emissão fiscal, validação de conteúdo/valores da NF, portal de upload próprio para o fornecedor (o canal é o Tomticket), pagamento/financeiro.

Ver detalhamento de fases em `10-roadmap-fases-tarefas.md`.
