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
| 1 | **Razão Social** | `Fornecedor.empresa` + apelido na legenda |
| 2 | **Nº do Contrato** | `Contrato.codContrato` |
| 3 | **Empresa Vinculada** | `Contrato.nomeEmpresaResponsavel` + código na legenda |
| 4 | **Status** | Ícone e indicador se o contrato estiver **Inativo** (fora da vigência) |
| 5 | **Informações** | **Grupo de 3 botões de ação**: `📄 Extrato` (modal RLT), `ⓘ Informações` (modal do contrato), `🔄 Atualizar` (sincroniza/atualiza o fornecedor a partir da Base de PJs) |

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
| **ID da Ocorrência** | `id` |
| **Cálculo** | `dataDoCalculoFormatada()` (`DD/MM/AAAA`) |
| **Competência** | `competencia.paraExibicao()` |
| **Descrição** | `descricao` |
| **Tipo** | `Crédito` / `Débito` — badge com token de status |
| **Qtd** | `quantidade` (dias, aceita fração) |
| **Quem Lançou** | `autor` (usuário ou `SISTEMA`) |

> **Coluna Saldo removida da grade.** O saldo corrente por linha existe internamente
> (`ExtratoDeRecesso.comSaldoCorrente()`, `02` §3.2) mas não é mais renderizado como coluna — só o
> **Saldo Atual** (§4.3) é exibido, fora da grade.

### 4.2.1 Ordenação de exibição — mais recente primeiro

A grade é exibida **do lançamento mais recente para o mais antigo** (ordem decrescente por data de
cálculo). Isso é **só de exibição**: o cálculo do saldo corrente continua obrigatoriamente
**cronológico ascendente** (`02` §3.2) — inverter a ordem de cálculo quebraria o running balance.

> **Implementação:** `ExtratoDeRecesso.comSaldoCorrenteParaExibicao()` calcula o saldo em ordem
> ascendente (mesmo algoritmo de `comSaldoCorrente()`) e só depois reverte a lista para exibição.
> **Nunca** recalcular saldo sobre uma lista já invertida — o saldo de uma linha é sempre "o
> acumulado até ali", que só faz sentido andando do mais antigo para o mais novo.

- Créditos automáticos devem ser **visualmente distinguíveis** (autor `SISTEMA`).

### 4.3 Saldo Atual — fora da grade, em bloco fixo

Exibir com destaque (fora da tabela), no **bloco fixo do topo** (ver §4.4/§5.0), nunca dentro da
área que rola:

```
SALDO ATUAL   30 dias   |   base 22/07
```

Deve ser **idêntico** ao saldo da última linha (invariante de `02` §5).

- **"base" e a data (`22/07`) usam os MESMOS estilos de "SALDO ATUAL" e "30 dias"** — o rótulo
  (`base`) no tamanho/peso do rótulo do saldo, e o dia/mês (`22/07`) no tamanho/peso do valor do
  saldo. Não é um detalhe secundário em fonte pequena ao lado: é um segundo par
  rótulo+valor, visualmente no mesmo nível de importância que o Saldo Atual, só separado por uma
  borda vertical.
- Implementação: os `<span>` de "base" e do dia/mês reutilizam as **mesmas classes CSS**
  (`.saldoRotulo`, `.saldoValor`) que "SALDO ATUAL"/"30 dias" — não classes novas com valores
  redigitados. Isso evita que os dois pares divirjam de tamanho numa alteração futura de tema.

### 4.4 Ações
- **Nova Ocorrência** (§5) — **footer fixo**, fora da área de rolagem da grade (ver §5.0).
- Fechar no **X**, **clique fora** e **ESC** (mesmo padrão do modal de mensagens, `docs/07` §2.2).

## 5. Formulário de nova ocorrência

### 5.0 Layout do modal — três zonas, só a grade rola

O modal tem **três blocos fixos** e **uma única área rolável** (a grade de ocorrências). Nem a
identificação/saldo nem o formulário de lançamento rolam — só a tabela de ocorrências no meio:

```
┌─────────────────────────────────────────┐
│ Extrato de Recesso                    × │  ← cabeçalho FIXO (.cabecalho)
├─────────────────────────────────────────┤
│ Razão Social · Contrato · Empresa        │
│ SALDO ATUAL  30 dias  |  base 22/07      │  ← bloco FIXO (.fixoTopo)
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐   │
│ │ grade de ocorrências (scroll)      │   │  ← única área ROLÁVEL (.corpo)
│ └───────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ Nova Ocorrência                          │  ← footer FIXO (.rodape)
│ [Data] [Descrição] [Tipo] [Qtd] [Lançar] │
└─────────────────────────────────────────┘
```

- **`.fixoTopo`** (identificação do PJ/contrato + Saldo Atual) fica **entre** o cabeçalho e a área
  rolável, congelado igual ao cabeçalho — não é mais parte do `.corpo` que rola.
- **`.corpo`** agora contém **só** a tabela de ocorrências; é o único elemento com `overflow-y: auto`.
- **`.rodape`** (`Nova Ocorrência` + formulário) continua fixo na base, como já documentado.
- Motivo da mudança: com a grade extensa (dezenas de créditos mensais desde 2025), rolar a tabela
  escondia o Saldo Atual — que é justamente o número que a pessoa quer comparar enquanto navega
  pelo histórico. Congelado, ele fica sempre visível junto com o formulário de lançamento.
- Motivo: com dezenas de créditos mensais acumulados (o motor gera um por mês desde 2025), o
  formulário ficava fora da tela sem rolar até o fim; como footer fixo, está sempre à mão.

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
