---
titulo: Identidade Visual — Marca City
description: Paleta oficial, tipografia institucional e regras de uso do logo conforme o Manual de Marca City 2024, aplicadas ao App de Gestão de Notas Fiscais
tags: [marca, identidade-visual, cores, tipografia, logo, design-tokens, city, nf-pjs]
dominio: frontend
fase: 1
status: normativo
---

# Identidade Visual — City Inc (Manual de Marca 2024)

> Fonte oficial: **Manual de Marca City 2024** (`B:\Inovação e Sistemas\XX-PADRÕES DIGITAIS\MANUAL DE MARCA E LOGO INST\Manual de Marca City 2024.pdf`, atualizado abr/2024).
> Os ativos (logos e fontes) já estão versionados neste projeto em **`public/brand/`**, com os tokens
> prontos em **`public/brand/brand.css`** (reaproveitados do projeto `prevision-web-medicoes`).
> Esta página resume o que o front-end (Dashboard — `07-frontend-dashboard.md`) deve obedecer —
> em caso de conflito com outros documentos, **esta prevalece para cores, fontes e logos**.

## 1. Paleta de cores oficial (manual p.47)

O laranja é a cor principal da marca, presente em todos os pontos de contato, acompanhado de
chumbo, preto e branco. Usar os valores **HEX/RGB para digital** (CMYK/Pantone são para impressos).

| Cor | Pantone | HEX | RGB | Token CSS | Uso na aplicação |
|---|---|---|---|---|---|
| **Laranja (principal)** | 151 C | `#FF8700` | 255,135,0 | `--city-laranja` | Botões primários, aba ativa, badge "Pendente", destaques |
| Laranja claro | 804 C | `#FDAD53` | 253,173,83 | `--city-laranja-claro` | Borda de destaque do header, apoios gráficos |
| Laranja suave | 7507 C | `#F8D0A3` | 252,212,167 | `--city-laranja-suave` | Fundos suaves derivados (seleção de linha) |
| **Preto** | Black 3 C | `#020202` | 2,2,2 | `--city-preto` | Header, fundos escuros |
| **Grafite** | Black 7 C | `#383838` | 56,56,56 | `--city-grafite` | **Texto corrido sobre fundo claro** (p.49) |
| Chumbo | 7540 C | `#454848` | 69,72,72 | `--city-chumbo` | Superfícies escuras secundárias |
| Cinza | 424 C | `#696D6D` | 104,109,109 | `--city-cinza` | Texto secundário/muted, labels |
| **Branco institucional** | 9345 C | `#FAFAFA` | 250,250,250 | `--city-branco` | Fundo de página |

**Cores funcionais** (verde de sucesso `#16A34A`, vermelho de erro `#DC2626`, azul informativo
`#2563EB`) **não pertencem à paleta da marca** — usar somente em semáforos de status/feedback,
nunca em elementos de identidade.

### Combinações de texto × fundo permitidas (manual p.49)

| Fundo | Título/destaque | Texto corrido |
|---|---|---|
| Branco / claro | Laranja ou Preto | **Grafite** (`#383838`) |
| Preto / Grafite / Chumbo | Branco ou Laranja | Branco |
| Laranja | Branco ou Preto | Branco |

> Atenção a contraste: laranja `#FF8700` sobre branco **não** deve ser usado em texto pequeno
> (corrido) — apenas em títulos/destaques e elementos gráficos, conforme o esquema acima.

## 2. Tipografia institucional (manual p.48)

| Papel | Fonte | Token CSS | Arquivos no projeto |
|---|---|---|---|
| **Títulos & destaque** | **Halyard Micro** (Book/Medium/SemiBold) | `--font-title` | `public/brand/fonts/halyard/Halyard Micro *.ttf` |
| Títulos editoriais (alternativa serifada de destaque) | **IvyPresto Display** (Regular/SemiBold/Bold) | `--font-title-serif` | `public/brand/fonts/ivypresto/IvyPrestoDisplay-*.otf` |
| Headings grandes / números | Halyard Display (Medium/SemiBold) | `--font-display` | `public/brand/fonts/halyard/Halyard Display *.ttf` |
| **Textos corridos, legendas e observações** | **Halyard Text Book** | `--font-text` | `public/brand/fonts/halyard/Halyard Text *.ttf` |
| **Fallback obrigatório** | Arial Bold (títulos) / Arial Regular (corridos) | — | Fonte de sistema |

Regras:

1. `@font-face` já declarados em `public/brand/brand.css` — importar esse CSS no bootstrap da
   aplicação (ex.: `<link rel="stylesheet" href="/brand/brand.css">`).
2. Pesos mapeados: Book = 350, Regular = 400, Medium = 500, SemiBold = 600, Bold = 700.
3. Corpo de texto padrão da aplicação: `Halyard Text`, peso 400. Títulos de card/tabela:
   `Halyard Micro` SemiBold. Reservar `IvyPresto Display` para destaques editoriais
   (não usar em labels/tabela). Números grandes (contadores de resumo do Dashboard): `Halyard Display`.
4. As fontes são licenciadas para uso corporativo City — **não publicar em CDN externo**;
   servir sempre do próprio domínio da aplicação.

## 3. Logotipo (manual p.32–43)

Marca: **city — Soluções Urbanas** (logotipo cinza-grafite com detalhe triangular laranja no "i").
Arquivos oficiais em `public/brand/logos/`:

| Arquivo | Versão | Quando usar |
|---|---|---|
| `CITY_SOLUCOES_UBARNAS_VERSAO_PREFERENCIAL_POSITIVA.png` | **Preferencial positiva** | Sobre fundos claros (padrão) |
| `CITY_SOLUCOES_UBARNAS_VERSAO_PREFERENCIAL_NEGATIVA.png` | **Preferencial negativa** | Sobre fundos escuros — **é a versão do header preto da aplicação** |
| `CITY_SOLUCOES_UBARNAS_VERSAO_MONOCROMATICA_POSITIVA.png` | Monocromática positiva | Uso restrito: apenas quando tecnicamente impossível usar a principal |
| `CITY_SOLUCOES_UBARNAS_VERSAO_MONOCROMATICA_NEGATIVA.png` | Monocromática negativa | Uso restrito, fundos escuros |
| `CITY_SOLUCOES_UBARNAS_VERSAO_MONOCROMATICA_SOBRE_FUNDO_LARANJA.png` | Monocromática sobre laranja | Uso restrito, fundo laranja |
| `PIN.png` | Ícone de marca (triângulo laranja do "i") | Favicon, ícone de app, marcador — quando o logotipo completo não couber |

### Regras de aplicação (invioláveis)

1. **Sempre usar os originais eletrônicos** (os PNGs acima) — nunca redesenhar, redigitar ou
   recolorir o logo.
2. Escolher **sempre a versão com melhor contraste** com o fundo (p.32/42). Fundos de baixo
   contraste são proibidos.
3. **Área de proteção**: margem livre ao redor do logo equivalente à **altura e largura do "C"**
   maiúsculo do logotipo (p.43). Nenhum texto ou elemento gráfico pode invadi-la.
4. **Redução máxima (valores oficiais, p.43)**: tamanho mínimo para preservar a leitura —
   **85 px** (30 mm) para a versão com "Soluções Urbanas" e **80 px** (30 mm) para a versão
   reduzida. Abaixo desses limites, **não** usar o logotipo completo — usar o `PIN.png`.
5. Não distorcer, rotacionar, aplicar sombras/efeitos, nem alterar as proporções.
6. Versões monocromáticas são **de uso restrito** — só quando houver limitação técnica.

### Uso no front-end deste projeto

- **Header** (fundo `--city-preto`): logo **preferencial negativa**, altura ~32–36px, alinhada à
  esquerda, com área de proteção respeitada dentro dos 64px do header.
- **Favicon / ícone PWA**: `PIN.png`.
- Telas de login/vazio podem usar a preferencial positiva sobre fundo branco.

## 4. Cores de status do sistema (semáforo funcional — específico do nf-pjs)

Este projeto tem **três status** por competência (ver `04-regras-de-negocio-status.md`). As cores
abaixo são **funcionais** (semáforo), não fazem parte da identidade e servem só para diferenciar
estados no Dashboard e nos badges. Tokens já disponíveis em `brand.css`:

| Status | Significado | Token CSS | Cor | Fundo suave (badge) |
|---|---|---|---|---|
| **Pendente** | Sem chamado no período | `--color-status-pendente` | `#FF8700` (laranja da marca) | `--color-status-pendente-soft` |
| **Enviado** | Chamado aberto | `--color-status-enviado` | `#2563EB` (azul informativo, funcional) | `--color-status-enviado-soft` |
| **Recebido** | Chamado finalizado | `--color-status-recebido` | `#16A34A` (verde de sucesso, funcional) | `--color-status-recebido-soft` |

Regras:
- Nunca depender **apenas** de cor: badge sempre com **rótulo textual** (acessibilidade — ver
  `07-frontend-dashboard.md` §5).
- O laranja em "Pendente" é o único que coincide com a marca; ainda assim, no badge use o laranja
  como cor de destaque com texto legível (branco/preto), não laranja sobre branco em texto pequeno.
- Cobrança/atraso (D+1/D+3) pode reforçar com `--color-danger` em ícones de alerta, sem virar
  elemento de identidade.

## 5. Como consumir no código

```html
<!-- index.html -->
<link rel="stylesheet" href="/brand/brand.css" />
<link rel="icon" href="/brand/logos/PIN.png" />
```

```tsx
// Header.tsx
<header className="app-header"> {/* background: var(--color-header-bg) */}
  <img
    src="/brand/logos/CITY_SOLUCOES_UBARNAS_VERSAO_PREFERENCIAL_NEGATIVA.png"
    alt="City Soluções Urbanas"
    height={36}
  />
  ...
</header>
```

```tsx
// StatusBadge.tsx — mapeia o status calculado para os tokens funcionais
const STATUS_STYLE = {
  Pendente: { color: "var(--color-status-pendente)", bg: "var(--color-status-pendente-soft)" },
  Enviado:  { color: "var(--color-status-enviado)",  bg: "var(--color-status-enviado-soft)"  },
  Recebido: { color: "var(--color-status-recebido)", bg: "var(--color-status-recebido-soft)" },
} as const;
```

Todos os componentes devem referenciar **exclusivamente os tokens semânticos**
(`--color-accent`, `--color-text`, `--font-title`, `--color-status-*`…) — nunca HEX hard-coded —
para que qualquer ajuste de marca seja feito em um único lugar (`brand.css`).

## 6. Origem dos ativos e verificação

Ativos e tokens reaproveitados de `web/prevision-web-medicoes/public/brand/` (mesmo Manual de Marca
City 2024). A única extensão feita para o nf-pjs foi a adição dos tokens `--color-status-pendente`,
`--color-status-enviado` e `--color-status-recebido` no `brand.css`, para cobrir os três status
deste sistema. A paleta institucional, a tipografia e as regras de logo permanecem idênticas.

**Verificado contra o manual oficial** (`Manual de Marca City 2024.pdf`, 71 páginas, atualizado
abr/2024) em jul/2026:
- **Paleta (p.47):** todos os 8 valores HEX/RGB/Pantone conferidos — incluindo o RGB do laranja
  suave (`252,212,167`), antes ausente.
- **Tipografia (p.48):** confirmado Halyard Micro + IvyPresto Display para títulos/destaque,
  Halyard Text Book para corridos, fallback Arial Bold/Regular.
- **Cores em texto × fundo (p.49):** o esquema da tabela §1 corresponde ao manual.
- **Logo — área de proteção e redução máxima (p.43):** corrigidos para os valores oficiais
  (área = altura e largura do "C"; mínimos 85 px / 80 px a 30 mm).
- **Diretrizes de logo (p.32–43)** e **uso sobre fundos (p.42):** conferidas.

Fontes disponíveis também em `…\MANUAL DE MARCA E LOGO INST\TIPOGRAFIAS\` (Halyard, Ivy Presto
Complete, `Fontes City.zip`) e logos em `…\LOGOS PARA USO\` — já versionados em `public/brand/`.
