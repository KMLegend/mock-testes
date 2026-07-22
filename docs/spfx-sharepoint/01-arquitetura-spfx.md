---
titulo: SPFx — Arquitetura da Solução
dominio: frontend
tags: [spfx, sharepoint, arquitetura, migracao, react, typescript, gulp, vitest, scss]
status: normativo
---

# Arquitetura da Solução SPFx

> Preserva a arquitetura de `docs/14` (Ports & Adapters) e os padrões de `docs/15`
> (SOLID + Object Calisthenics). O SPFx entra como **casca de hospedagem**, não como arquitetura.

## 1. Princípio da migração

```
┌──────────────────────────────────────────────────────────┐
│  SPFx Web Part  (casca — novo)                            │
│  · recebe o SharePoint context (usuário, tenant)          │
│  · monta o Composition Root e renderiza <App/>            │
└───────────────────────────▲──────────────────────────────┘
                            │ injeta dependências
┌───────────────────────────┴──────────────────────────────┐
│  ui/ · application/ · domain/   (PRESERVADOS)             │
│  Mesmos componentes, casos de uso, VOs e regras           │
└───────────────────────────▲──────────────────────────────┘
                            │ implementado por
┌───────────────────────────┴──────────────────────────────┐
│  infrastructure/                                          │
│  mock/ (dev e testes)   ·   http/ (AadHttpClient → CITY API)│
└──────────────────────────────────────────────────────────┘
```

A web part é **fina**: obtém o contexto, monta as dependências e renderiza. **Nenhuma regra de
negócio** nela.

## 2. Estrutura da solução

```
nf-pjs-spfx/
├── config/
│   ├── package-solution.json      ← webApiPermissionRequests (02 §3)
│   ├── config.json
│   └── serve.json                 ← hosted workbench
├── src/
│   ├── webparts/
│   │   └── nfPjs/
│   │       ├── NfPjsWebPart.ts    ← casca: context → Composition Root → render
│   │       └── loc/               ← strings localizáveis
│   ├── domain/                    ← MIGRADO SEM ALTERAÇÃO
│   ├── application/               ← MIGRADO SEM ALTERAÇÃO
│   ├── infrastructure/
│   │   ├── mock/                  ← MIGRADO SEM ALTERAÇÃO
│   │   ├── http/                  ← NOVO: adapters via AadHttpClient
│   │   └── spfx/                  ← NOVO: UsuarioAtualSpfx
│   └── ui/                        ← componentes preservados (.module.scss)
├── tests/                         ← Vitest sobre domain/ + application/
├── gulpfile.js
└── package.json
```

## 3. A casca (web part)

```ts
export default class NfPjsWebPart extends BaseClientSideWebPart<INfPjsWebPartProps> {
  public render(): void {
    const dependencias = criarDependencias({
      aadHttpClientFactory: this.context.aadHttpClientFactory,
      usuario: this.context.pageContext.user,
      baseUrlApi: this.properties.baseUrlApi
    });

    ReactDom.render(
      React.createElement(RaizDaAplicacao, { dependencias }),
      this.domElement
    );
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }
}
```

- `criarDependencias(...)` é o **Composition Root** (equivalente ao `CompositionRoot.tsx` atual).
- **`onDispose` é obrigatório**: a página do SharePoint monta/desmonta web parts dinamicamente;
  sem desmontar o React, sobram listeners e timers (vazamento).
- A **URL base da API** deve ser **propriedade da web part** (configurável no painel), não constante
  no código — permite apontar para homolog/produção sem rebuild.

## 4. Uma web part ou duas?

O app já tem **HUD de seleção de módulo** (NF × Recesso — `modulo-recesso/04` §1).

> **Recomendado: uma única web part**, com o HUD interno decidindo o módulo.
> Menos pacote, menos deploy, menos permissão a aprovar — e o HUD já existe.

Duas web parts só se o negócio exigir colocá-las em **páginas diferentes** com permissões distintas
do SharePoint (**S-04**).

## 5. Testes — preservar o que já existe

`domain/` e `application/` são **TypeScript puro, sem React e sem SPFx**. Logo:

- **Manter o Vitest** rodando sobre essas camadas — testes rápidos, sem toolchain do SharePoint.
- Isso preserva os testes de VOs, motor de status, rollup, coleções e o **teste de regressão do loop**
  (`docs/17` C-01), que são o ativo mais valioso da suíte.
- Testes de **componente** (RTL) podem continuar no Vitest desde que não dependam de APIs do SPFx.
- Só o que tocar `context`/`AadHttpClient` precisa de mock do SPFx.

> **Não** descartar a suíte atual para adotar o test runner do scaffold. Perder os testes de domínio
> na migração seria trocar segurança por conveniência de ferramenta.

## 6. Estilos

- SPFx suporta **`.module.scss`** nativamente. CSS válido é SCSS válido → a conversão é
  majoritariamente **renomear** `.module.css` → `.module.scss`.
- **`public/brand/` continua intacto.** Os tokens de `brand.css` e as fontes Halyard/IvyPresto devem
  ser servidos **junto da solução** (assets do pacote), **nunca de CDN** (`docs/11` §2).
- A regra de **zero HEX hard-coded** (`docs/17` C-02) permanece válida — a guarda de cor deve
  continuar rodando no CI.
- Atenção: o SharePoint aplica estilos próprios à página. Verificar se algum token/reset da app
  conflita com o tema do site (**S-05**).

## 7. Versões (verificar antes de começar)

| Item | Situação a confirmar |
|---|---|
| **Versão do SPFx** disponível no tenant | Define tudo abaixo |
| **React** | O app é **18**; versões recentes do SPFx ainda fixam **17** → provável ajuste (**S-01**) |
| **Node** | O SPFx fixa a versão suportada; alinhar com o ambiente de build/CI |
| **TypeScript** | O SPFx traz sua própria versão; confirmar que aceita `strict` e os flags de `docs/15` §4 |

> Se o downgrade React 18 → 17 for necessário, o impacto é pequeno **neste código** (não usa
> `useId`, `useSyncExternalStore`, Suspense para dados nem `createRoot` fora da casca) — mas
> **precisa ser verificado**, não presumido.

## 8. O que continua valendo (não renegociar na migração)

- Fronteiras de dependência via `import/no-restricted-paths` (`docs/15` §4) — **manter no ESLint**.
- Limites de tamanho/complexidade (`docs/15` §2, Regra 7).
- Value Objects como única forma de comparar CNPJ/e-mail/competência (`docs/14` §5).
- Filtro e saldo **só** como método de coleção — nunca duplicados na UI.
- Identidade visual City (`docs/11`).
