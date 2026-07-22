---
titulo: SPFx — Plano de Migração
dominio: gestao
tags: [plano, migracao, spfx, etapas, checklist, deploy, riscos]
status: normativo-para-implementacao
---

# Plano de Migração para SPFx

> Estratégia: **portar a casca, preservar o núcleo**. `domain/` e `application/` não são reescritos.

## 1. Etapas

| # | Etapa | Entregável | Pronto quando |
|---|---|---|---|
| 0 | **Pré-requisitos + ambiente** | App Catalog, App Registration, **versão do SPFx decidida** (`06` §4) e toolchain configurado (`06` §2) | `05` S-01..S-03 respondidas; `gulp serve` sobe |
| 1 | **Scaffold** | Solução SPFx vazia + web part | `gulp serve` abre no **hosted workbench** |
| 2 | **Portar núcleo** | `domain/` + `application/` + `infrastructure/mock/` copiados | **Vitest verde sem alterar 1 linha** dessas camadas |
| 3 | **Portar UI** | Componentes + `.module.scss` + tokens de marca | Telas idênticas com o **mock** |
| 4 | **Casca + DI** | `NfPjsWebPart.ts` + Composition Root + `onDispose` | App roda no workbench com mock |
| 5 | **Adapters HTTP** | `ClienteHttpCityApi` + repositórios HTTP | Lê dados reais da CITY API com token de usuário |
| 6 | **Backend** | Validação RS256 + autorização (`03`) | Checklist de `03` §7 |
| 7 | **Deploy** | `.sppkg` no App Catalog + página | App na página real, permissão aprovada |
| 8 | **Descomissionar Vite** | Remover build antigo | Nenhuma referência órfã |

> Etapas 5 e 6 são **interdependentes** — combinar a ordem com quem mantém a CITY API. Até lá, o app
> roda **com mock** dentro do SharePoint, o que já valida casca, estilos e permissões.

## 2. Checklist de paridade (não pode regredir)

O checklist de `docs/16` §3 **continua valendo integralmente**. Reexecutar após a migração:

- [ ] **A** Competência (`MM-AAAA` sistêmico / `MM/AAAA` exibição; default mês atual)
- [ ] **B** CNPJ com e sem máscara → **resultado idêntico**; e-mail normalizado
- [ ] **C** Motor de status (Pendente/Enviado/Recebido; `Ambas` = 1 linha; inativo omitido)
- [ ] **D** Desambiguação de contrato (1 contrato direto; >1 via CNPJ; sem match → Tratamento Manual)
- [ ] **E** Rollup dos contadores
- [ ] **F** 12 colunas na ordem definida (A-23 rev.)
- [ ] **G** Aba Mensagens + modal por PJ (**inclusive PJ Pendente**)
- [ ] **H** Exportação **somente Excel**, refletindo os filtros da tela
- [ ] **I** Sem duplicação em concorrência (teste de regressão do loop — `docs/17` C-01)
- [ ] **J** Identidade visual City; **zero HEX hard-coded** (`docs/17` C-02)
- [ ] **K** Painel de simulação (QA)

**Novos, específicos do SPFx:**
- [ ] Web part monta e **desmonta** sem vazamento (`onDispose`)
- [ ] URL da API é **propriedade** configurável (sem rebuild para trocar ambiente)
- [ ] Token de usuário chega à API; `lancado_por` corresponde ao usuário logado
- [ ] Fontes e logos servidos **da solução**, não de CDN
- [ ] Estilos do SharePoint não quebram o layout (`01` §6)

## 3. Deploy

```bash
gulp bundle --ship
gulp package-solution --ship        # gera sharepoint/solution/*.sppkg
```
1. Upload do `.sppkg` no **App Catalog** do tenant.
2. Admin **aprova** a permissão em *SharePoint Admin Center → Advanced → API access* (`02` §3.3).
3. Adicionar o app ao site e a web part à página.
4. Configurar a **URL base da API** no painel de propriedades.

> Assets podem ser servidos do próprio pacote ou de uma CDN interna; **fontes da marca devem sair do
> domínio da solução** (`docs/11` §2) — nunca de CDN pública.

## 4. Riscos

| Risco | Mitigação |
|---|---|
| **Versão do SPFx incompatível com o código** | 🔴 **Maior risco do projeto.** SPFx 1.11 (TS 3.3) exigiria reescrever `?.`/`??` em 15 arquivos e **remover flags de `strict`**. Decidir S-01 **antes da etapa 1** — ver `06` §4 |
| Perder a suíte de testes na migração | Etapa 2 **só fecha** com Vitest verde; não adotar outro runner "de brinde" |
| Regra de negócio vazar para a casca | Manter `import/no-restricted-paths` no ESLint (`docs/15` §4) |
| Permissão de API não aprovada | Encaminhar S-03 em paralelo — bloqueia runtime, não build |
| **Token válido ≠ autorizado** (principal compartilhado do tenant) | Autorização no backend (`03` §4 / S-06) |
| Estilos do SharePoint conflitando | Escopo por CSS Modules + verificação visual (S-05) |
| Build antigo e novo divergindo | Descomissionar Vite (etapa 8) assim que a paridade fechar |

## 5. Definition of Done

1. [ ] Checklist §2 completo **com evidência**.
2. [ ] `domain/` e `application/` migrados **sem alteração** (verificar por diff).
3. [ ] Vitest, typecheck e lint limpos.
4. [ ] Web part publicada, permissão aprovada, rodando na página real.
5. [ ] `lancado_por` gravado a partir do **token validado** (não do payload) — testado.
6. [ ] Docs atualizados: `18` (P-11 resolvida), `09` (A-29), `modulo-recesso/06` (R-04).
