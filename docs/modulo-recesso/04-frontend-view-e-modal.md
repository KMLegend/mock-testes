---
titulo: Módulo Recesso — Frontend (View, HUD, Tabela, Modal RLT)
dominio: recesso
tags: [frontend, react, view, hud, tabela, modal, rlt, formulario, ux]
status: normativo
---

# Frontend — View de Gestão de Recesso

> Arquitetura e padrões: `docs/14` (React + TS, Ports & Adapters) e `docs/15` (SOLID + Object
> Calisthenics). Identidade visual: `docs/11` — **tokens de `brand.css`, nunca HEX hard-coded**.

## 1. Navegação — HUD de seleção de módulo

O app passa a ter **dois módulos**. Introduzir um **HUD de seleção** no topo:

```
┌───────────────────────────────────────────────────────────┐
│  Header City (logo negativa, fundo --color-header-bg)      │
├───────────────────────────────────────────────────────────┤
│  HUD de módulo:   [ Notas Fiscais ]   [ Gestão de Recesso ]│
├───────────────────────────────────────────────────────────┤
│  HUD de filtros (Ano · Mês · Busca · Status · EXCEL)       │
├───────────────────────────────────────────────────────────┤
│  Conteúdo do módulo selecionado                            │
└───────────────────────────────────────────────────────────┘
```

- O HUD de **módulo** é hierarquicamente **acima** das abas internas (Status/Mensagens) do módulo de NF.
- Não confundir: **HUD de módulo** ≠ **abas** do módulo de NF (`docs/07` §2).

## 2. HUD de filtros — reaproveitado, com ressalva

Reutilizar o **mesmo componente** de filtros (requisito do usuário). Porém **nem todo filtro se aplica**:

| Filtro | Módulo NF | **Módulo Recesso** |
|---|---|---|
| **Ano** | aplica (competência) | **aplica** (ver R-13) |
| **Mês** | aplica | **não se aplica** — recesso é anual (R-13) |
| **Busca textual** | aplica | **aplica** (Razão Social, Nome Fantasia, Responsável Legal, CNPJ, E-mail) |
| **Status** | Pendente/Enviado/Recebido/Manual | **Ativo/Inativo** — domínio **diferente** (R-14) |
| **EXCEL** | exporta 3 abas | **R-15** (se exporta, o quê) |

> ⚠️ Dois filtros **mudam de significado** entre os módulos (Mês e Status). Reaproveitar o
> componente **não pode** significar reaproveitar as opções: o HUD deve receber por props **quais
> filtros exibir** e **quais opções de status** usar. Caso contrário o usuário verá "Pendente/Enviado"
> numa tela de recesso.
> Manter a busca (CNPJ com e sem máscara) usando o mesmo `Cnpj.contem()` — **não duplicar filtro**.

## 3. Tabela de PJs — colunas

| # | Coluna | Conteúdo |
|---|---|---|
| 1 | **RLT** | **Botão** que abre o modal do extrato daquele PJ (§4) |
| 2 | **Razão Social** | `Fornecedor.nome` |
| 3 | **Nome Fantasia** | `Fornecedor.apelido` |
| 4 | **Responsável Legal** | Responsável legal do PJ (**ver R-16** — hoje o HCM não fornece) |
| 5 | **CNPJ** | `Cnpj.paraExibicao()` (máscara) |
| 6 | **E-mail** | `Email.paraExibicao()` |
| 7 | **Status** | **`Ativo` / `Inativo`** (do cadastro do PJ) |

**Diferença relevante em relação ao módulo de NF:** aqui a lista mostra **todos os PJs, inclusive os
inativos** (por isso existe a coluna Status). No módulo de NF, inativos são **excluídos**
(`docs/04` §4). O repositório de fornecedores do recesso **não pode** reutilizar o método que já
filtra `ativo = 1` — precisa de um método próprio (`todos()`), senão inativo nunca aparece.

- **Uma linha por PJ** (não por contrato) — coerente com R-03 (`02` §2.4).
- Ordenação e busca conforme o HUD.

## 4. Modal RLT — extrato de recesso

Aberto pelo botão da coluna **RLT**.

### 4.1 Cabeçalho
Identificação do PJ: **Razão Social**, **CNPJ**, **Responsável Legal**.

### 4.2 Grade de ocorrências

| Coluna | Origem |
|---|---|
| **Data da Ocorrência** | `dataDaOcorrencia` (`DD/MM/AAAA`) |
| **ID da Ocorrência** | `id` |
| **Descrição** | `descricao` |
| **Tipo** | `Crédito` / `Débito` — badge com token de status |
| **Qtd** | `quantidade` (dias) |
| **Saldo** | **saldo corrente após a linha** (`02` §3.2) |
| **Quem Lançou** | `autor` (usuário ou `SISTEMA`) |
| **Competência** | `periodoAquisitivo.paraExibicao()` |

- Ordenação **cronológica ascendente** — o saldo corrente só faz sentido nessa ordem.
  Se houver ordenação por outras colunas, a coluna **Saldo deve ser ocultada ou congelada**, pois
  "saldo acumulado" fora da ordem cronológica é um número sem significado (**R-17**).
- Créditos automáticos devem ser **visualmente distinguíveis** (autor `SISTEMA`).

### 4.3 Saldo Atual — fora da grade
Exibir com destaque (fora da tabela), ex. no topo/rodapé do modal:

```
Saldo Atual:  80 dias
```
Deve ser **idêntico** ao saldo da última linha (invariante de `02` §5).

### 4.4 Ações
- **Nova Ocorrência** (§5).
- Fechar no **X**, **clique fora** e **ESC** (mesmo padrão do modal de mensagens, `docs/07` §2.2).

## 5. Formulário de nova ocorrência

| Campo | Tipo | Regra |
|---|---|---|
| **Data da Ocorrência** | date | Obrigatória. Futura: **R-10** (default bloquear) |
| **Descrição** | text | Obrigatória, não vazia |
| **Tipo** | select | `Crédito` \| `Débito` |
| **Quantidade (dias)** | number | Inteiro **> 0** |
| ~~Quem lançou~~ | — | **NÃO é campo do formulário** — vem do usuário autenticado (R-04) |
| ~~Competência~~ | — | **NÃO é campo** — derivada da data (`02` §4.5) |

### 5.1 Validações antes de salvar
1. Todos os obrigatórios preenchidos.
2. Quantidade inteira e positiva.
3. Débito que deixaria saldo negativo → **bloquear** com mensagem clara (default de **R-05**).
4. Feedback de erro **no campo**, não `alert()`.

### 5.2 Após salvar
- Extrato e **Saldo Atual** recalculam **imediatamente**.
- Sem recarregar a página; sem duplicar a linha (usar o padrão de cancelamento de `docs/14` §10).
- Erro de gravação: **manter o formulário preenchido** e mostrar o erro — nunca descartar o que o
  usuário digitou.

## 6. Estrutura de arquivos (aderente a `docs/14` §4)

```
src/
├── domain/
│   ├── value-objects/   PeriodoAquisitivo.ts · TipoOcorrencia.ts · QuantidadeDeDias.ts
│   │                    SaldoDeDias.ts · AutorDoLancamento.ts · OrigemDaOcorrencia.ts
│   ├── entities/        OcorrenciaDeRecesso.ts
│   ├── collections/     ExtratoDeRecesso.ts
│   └── services/        MotorDeCreditoAutomatico.ts · CalculadoraDeSaldo.ts
├── application/
│   ├── ports/           OcorrenciaDeRecessoRepository.ts (inclui `salvar`) · UsuarioAtual.ts
│   └── use-cases/       ObterExtratoDeRecesso.ts · LancarOcorrenciaDeRecesso.ts
│                        ListarPjsParaRecesso.ts
├── infrastructure/
│   ├── mock/            OcorrenciaDeRecessoRepositoryEmMemoria.ts (+ localStorage — R-12)
│   └── http/            (Fase 2 — mesmos ports via fetch)
└── ui/
    ├── components/      HudDeModulos · TabelaDeRecesso · ModalRlt
    │                    FormularioDeOcorrencia · SaldoAtual
    └── hooks/           usePjsParaRecesso · useExtratoDeRecesso · useLancarOcorrencia
```

**Fronteiras (`docs/15` §4):** o motor de crédito e o cálculo de saldo ficam em `domain/` — **jamais**
dentro de componente. A regra do lint `import/no-restricted-paths` já barra isso mecanicamente.
