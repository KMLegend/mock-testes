---
titulo: Refatoração do Frontend — Arquitetura React + TypeScript
dominio: frontend
fase: 1
tags: [refatoracao, react, typescript, arquitetura, ports-adapters, hexagonal, value-objects, di, vite, vitest]
status: normativo
---

# Refatoração do Frontend — Arquitetura React + TypeScript

> **Decisão (A-26):** o frontend é implementado em **React + TypeScript**, mesmo na Fase 1 com dados
> mockados, seguindo **SOLID** e **Object Calisthenics** (`15-padroes-solid-e-object-calisthenics.md`).
> A implementação atual em **Vanilla JS** (`app.js`, `dataProvider.js`, `mockData.js`) será
> **substituída**. O plano de migração e o checklist de paridade estão em `16-plano-refatoracao-frontend.md`.

## 1. Motivação (o que deu errado na v1)

Não é preferência estética — a estrutura atual **produziu defeitos reais e repetidos**:

| Sintoma observado | Causa estrutural |
|---|---|
| Bug do **CNPJ mascarado** reapareceu **4 vezes** (grid, exportação, aba Mensagens, export de mensagens) | Lógica de filtro **copiada e colada**; nenhum tipo que representasse "CNPJ" |
| **Linhas duplicadas** na aba Mensagens | Render assíncrono manipulando o DOM direto, sem controle de concorrência |
| Rollup de status duplicado em 2 lugares | Regra de negócio **dentro da camada de renderização** |
| `app.js` com **797 linhas / 23 funções** | Sem separação de responsabilidades; um arquivo faz tudo |
| **Zero testes** | Regras acopladas ao DOM — impossível testar sem navegador |

**Princípio da refatoração:** regra de negócio **não pode viver na camada de UI**, e conceitos do
domínio (CNPJ, Competência, E-mail) **não podem ser `string` solta**.

## 2. Stack alvo

| Camada | Tecnologia |
|---|---|
| UI | **React 18** (function components + hooks) |
| Linguagem | **TypeScript** em modo `strict` |
| Build/Dev | **Vite** |
| Testes | **Vitest** + **@testing-library/react** |
| Qualidade | **ESLint** + regras de Object Calisthenics (`15` §4) |
| Planilha | SheetJS (`xlsx`) — **como dependência npm**, não CDN |
| Estilo | CSS Modules sobre os tokens de `public/brand/brand.css` (identidade City — `11`) |

> `xlsx` e `react` passam a ser dependências instaladas; nada de `<script>` de CDN no `index.html`.

## 3. Arquitetura — Ports & Adapters (hexagonal)

Escolhida porque **materializa a decisão A-22**: a Fase 2 troca o adapter de mock pelo de HTTP
**sem tocar em domínio nem em UI**.

```
┌──────────────────────── ui/ (React) ────────────────────────┐
│ Componentes puros de apresentação + hooks de orquestração    │
│ NÃO contém regra de negócio, NÃO conhece mock nem HTTP       │
└───────────────────────────▲─────────────────────────────────┘
                            │ usa casos de uso via Context (DI)
┌───────────────────────────┴─────────────────────────────────┐
│ application/  — casos de uso + PORTS (interfaces)            │
│ ObterStatusDaCompetencia · ListarMensagens · ExportarPlanilha│
└───────────────────────────▲─────────────────────────────────┘
                            │ depende de abstrações (DIP)
┌───────────────────────────┴─────────────────────────────────┐
│ domain/ — Value Objects, Entidades, Coleções, Regras puras   │
│ MotorDeStatus · ResolucaoDeContrato · RollupDeStatus         │
│ SEM React, SEM I/O, SEM DOM → 100% testável                  │
└─────────────────────────────────────────────────────────────┘
                            ▲ implementado por
┌───────────────────────────┴─────────────────────────────────┐
│ infrastructure/ — ADAPTERS                                   │
│ mock/ (Fase 1)   ·   http/ (Fase 2)   ·   xlsx/ (exportação) │
└─────────────────────────────────────────────────────────────┘
```

**Regra de dependência:** as setas apontam **sempre para dentro**. `domain` não importa nada de
`application`, `ui` ou `infrastructure`.

## 4. Estrutura de pastas

```
src/
├── domain/
│   ├── value-objects/     Cnpj.ts · Email.ts · Competencia.ts · Protocolo.ts
│   │                      TipoLancamento.ts · RegraAlerta.ts · StatusNf.ts
│   ├── entities/          Fornecedor.ts · Chamado.ts · Contrato.ts · Alerta.ts
│   ├── collections/       Fornecedores.ts · LinhasDeStatus.ts · Alertas.ts
│   └── services/          MotorDeStatus.ts · ResolucaoDeContrato.ts · RollupDeStatus.ts
├── application/
│   ├── ports/             FornecedorRepository.ts · ChamadoRepository.ts
│   │                      AlertaRepository.ts · ContratoRepository.ts
│   │                      ExtratorCnpjDaNota.ts · ExportadorDePlanilha.ts
│   └── use-cases/         ObterStatusDaCompetencia.ts · ListarMensagens.ts
│                          ListarMensagensDoFornecedor.ts · ExportarPlanilha.ts
├── infrastructure/
│   ├── mock/              dados/*.ts + repositórios in-memory (Fase 1)
│   ├── http/              (Fase 2 — implementa os mesmos ports via fetch)
│   └── xlsx/              ExportadorXlsx.ts
├── ui/
│   ├── App.tsx
│   ├── providers/         CompositionRoot.tsx (DI) · DependenciasContext.ts
│   ├── hooks/             useCompetencia · useFiltros · useStatusDaCompetencia
│   │                      useMensagens · useExportacao
│   ├── components/        Header · Abas · CardsDeResumo · FiltrosDaBusca
│   │                      TabelaDeStatus · TabelaDeMensagens · ModalDeMensagens
│   └── styles/            *.module.css (sobre os tokens de brand.css)
├── main.tsx
└── vite-env.d.ts
```

## 5. Value Objects — o coração da correção

Cada bug recorrente vira **impossível por construção**:

| Value Object | Encapsula | Bug que elimina |
|---|---|---|
| **`Cnpj`** | 14 dígitos; `equals()` e `contem()` comparam **só dígitos**; `paraExibicao()` aplica máscara | CNPJ mascarado × cru (o bug que voltou 4×) |
| **`Email`** | normalização `trim().toLowerCase()` no construtor; `equals()` | Casamento de e-mail divergente (falso "Pendente") |
| **`Competencia`** | `MM-AAAA` interno, `paraExibicao()` → `MM/AAAA`; `deTextoLivre()` faz o parse do "Mês Referente" | Confusão sistêmico × exibição; parser espalhado |
| **`TipoLancamento`** | normaliza `"Reembolso plano de saude"` → canônico com acento | Normalização repetida |
| **`RegraAlerta`** | `D-3 · D · D+1 · D+3`; sabe se é `preventivo` ou `cobranca` | Condicional `regra === 'D+1' \|\| ...` espalhada |
| **`StatusNf`** | `Pendente · Enviado · Recebido · TratamentoManual` | Comparações por string literal |

Exemplo (o VO que teria evitado o bug recorrente):

```ts
export class Cnpj {
  private constructor(private readonly digitos: string) {}

  static de(valor: string): Cnpj {
    return new Cnpj(String(valor ?? '').replace(/\D/g, ''));
  }

  contem(termo: string): boolean {
    const buscado = String(termo ?? '').replace(/\D/g, '');
    return buscado.length > 0 && this.digitos.includes(buscado);
  }

  paraExibicao(): string {
    return this.digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
}
```
> Com isso, **não existe** caminho em que a busca compare máscara com dígitos — em nenhuma das telas.

## 6. First-Class Collections — o fim das 4 cópias do filtro

O filtro deixa de ser função solta duplicada e passa a ser **comportamento da coleção**:

```ts
export class LinhasDeStatus {
  constructor(private readonly itens: readonly LinhaDeStatus[]) {}

  filtradasPor(criterio: CriterioDeBusca): LinhasDeStatus { /* ... */ }
  ordenadasPor(campo: CampoOrdenavel, direcao: Direcao): LinhasDeStatus { /* ... */ }
  resumo(): ResumoPorStatus { /* rollup — regra única */ }
  paraExportacao(): LinhaExportavel[] { /* ... */ }
}
```

Grid, exportação e mensagens consomem **o mesmo objeto**. A planilha refletir a tela deixa de ser
disciplina e passa a ser **consequência estrutural**.

## 7. Ports (interfaces) — Fase 1 e Fase 2 sem tocar na UI

```ts
export interface FornecedorRepository { ativos(): Promise<Fornecedor[]>; }
export interface ChamadoRepository { daCompetencia(c: Competencia): Promise<Chamado[]>; }
export interface AlertaRepository {
  todos(): Promise<Alerta[]>;
  doFornecedor(email: Email): Promise<Alerta[]>;
}
export interface ContratoRepository { doFornecedor(cod: CodigoEmpresa): Promise<Contrato[]>; }
export interface ExtratorCnpjDaNota { extrair(chamado: Chamado): Promise<Cnpj | null>; }
export interface ExportadorDePlanilha { exportar(planilha: Planilha): Promise<void>; }
```

| Port | Adapter Fase 1 | Adapter Fase 2 |
|---|---|---|
| `FornecedorRepository` | `FornecedorRepositoryEmMemoria` | `FornecedorRepositoryHttp` (`/v2/notas-fiscais/fornecedores`) |
| `ChamadoRepository` | `ChamadoRepositoryEmMemoria` | `ChamadoRepositoryHttp` (`/status`) |
| `AlertaRepository` | `AlertaRepositoryEmMemoria` | `AlertaRepositoryHttp` (`/comunicados`) |
| `ExtratorCnpjDaNota` | `ExtratorCnpjMock` (mapa fixo — A-21) | `ExtratorCnpjMarker` (P-09) |

> É a mesma ideia do `dataProvider.js` atual, agora **segregada por responsabilidade** (ISP) e **tipada**.

## 8. Injeção de dependências (Composition Root)

Um único ponto monta as dependências; o resto do app recebe abstrações.

```tsx
// ui/providers/CompositionRoot.tsx
const dependencias: Dependencias = {
  obterStatus: new ObterStatusDaCompetencia(fornecedores, chamados, resolucao),
  listarMensagens: new ListarMensagens(alertas),
  exportarPlanilha: new ExportarPlanilha(new ExportadorXlsx()),
};

<DependenciasContext.Provider value={dependencias}>{children}</DependenciasContext.Provider>
```

Trocar mock → HTTP na Fase 2 é **editar só este arquivo** (seleção por `import.meta.env`).

## 9. Estado e hooks

Sem biblioteca de estado global (escopo não justifica). Estado local + Context para DI.

| Hook | Responsabilidade |
|---|---|
| `useCompetencia()` | Ano/Mês selecionados; default = **mês atual** (A-11); expõe `Competencia` |
| `useFiltros()` | Busca textual + filtro de status |
| `useStatusDaCompetencia()` | Chama o caso de uso; **cancela respostas obsoletas** (ver §10) |
| `useMensagens()` | Lista de mensagens filtradas |
| `useMensagensDoFornecedor()` | Alimenta o modal por PJ |
| `useExportacao()` | Dispara a exportação Excel |

## 10. Concorrência — bug de duplicação resolvido por padrão

O React já elimina a classe do bug (render declarativo em vez de `innerHTML`), mas o hook de dados
deve **descartar respostas obsoletas** explicitamente:

```ts
useEffect(() => {
  let cancelado = false;
  obterStatus.executar(competencia).then((resultado) => {
    if (!cancelado) setLinhas(resultado);
  });
  return () => { cancelado = true; };
}, [obterStatus, competencia]);
```

## 11. Componentes

```
<App>
 └ <CompositionRoot>
    ├ <Header/>                      logo City negativo, área de proteção (11)
    ├ <FiltrosDaBusca/>              Ano · Mês · Busca · Status · botão EXCEL
    ├ <Abas>                         Status | Mensagens
    │  ├ <PainelDeStatus>
    │  │   ├ <CardsDeResumo/>        Pendente · Enviado · Recebido · Manual
    │  │   └ <TabelaDeStatus/>       12 colunas (A-23) + botão de mensagens (A-24)
    │  └ <PainelDeMensagens>
    │      └ <TabelaDeMensagens/>    Responsável Legal · E-mail · CNPJ · Regra · Dt/H · Ano-Mês
    └ <ModalDeMensagens/>            mensagens do PJ (A-24)
```

Componentes são **de apresentação**: recebem dados prontos e callbacks; não formatam CNPJ, não
calculam status, não filtram. Formatação vem dos Value Objects (`paraExibicao()`).

## 12. Mapeamento — arquivo atual → destino

| Hoje | Vai para |
|---|---|
| `app.js` → `normalizeEmail`, `onlyDigits`, `normalizeTipoLancamento` | `domain/value-objects/*` |
| `app.js` → `computeStatusEngine`, `computeProviderStatus` | `domain/services/MotorDeStatus.ts`, `RollupDeStatus.ts` |
| `app.js` → `matchesQuery`, `matchesSearch*`, `filterAlertas`, `matchesStatus` | `domain/collections/*` (métodos de coleção) |
| `app.js` → `formatDate`, `formatDateShort` | `domain/value-objects/DataHora.ts` |
| `app.js` → `renderGrid`, `renderMensagens`, `updateSummaryCounters`, modal | `ui/components/*` |
| `app.js` → `exportToXLSX`, `getFiltered*ForExport` | `application/use-cases/ExportarPlanilha.ts` + `infrastructure/xlsx/` |
| `app.js` → `setupEventListeners`, `setupQAControls` | `ui/hooks/*` + `ui/components/PainelDeSimulacao.tsx` |
| `dataProvider.js` | `application/ports/*` + `infrastructure/mock/*` |
| `mockData.js` | `infrastructure/mock/dados/*.ts` (tipados) |
| `index.html` (estrutura) | `ui/components/*` |
| `app.css` | `ui/styles/*.module.css` (mantendo tokens de `brand.css`) |

> `public/brand/` (logos, fontes, `brand.css`) **permanece intacto** — a identidade visual não muda.

## 13. O que NÃO muda

- Todas as **regras de negócio** validadas (status, casamento por e-mail, desambiguação, competência).
- A **identidade visual City** (`11`) e os ativos de marca.
- Os **contratos de dados** (`13`) e a fronteira que a Fase 2 vai implementar (`12`).
- O comportamento observável do app — ver **checklist de paridade** em `16` §3.
