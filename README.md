# Naruto D20 — Kaihou Campaign Content

> **PT-BR primeiro / English below**

## Português (Brasil)

Módulo de conteúdo dedicado à campanha **Kaihou — Silk, Steel and Seal** (Naruto D20 em PF1e).

Este módulo é uma extensão privada do módulo público [`ezioaalves/naruto-d20`](https://github.com/ezioaalves/naruto-d20). Ele adiciona o conteúdo de identidade específico da campanha Kaihou: as 6 classes base (Strong, Fast, Tough, Smart, Dedicated, Charismatic Ninja). Conteúdo futuro: raças por vila, flaws, escolas, ocupações, bloodlines, classes avançadas (ver roadmap D2.2–D2.8).

**Requer:** Foundry VTT v11+ (testado em v13), sistema `pf1` ≥ 11.11, módulo `naruto-d20` ≥ 1.0.8.

### Instalação (repositório privado)

O módulo é privado. Para instalar pelo manifest URL no Foundry, use um token GitHub (PAT) na URL:

```
https://<GITHUB_PAT>@github.com/ezioaalves/naruto-d20-kaihou/releases/latest/download/module.json
```

Alternativa: baixe o ZIP da release manualmente e instale via "Install Module from File" (se sua versão do Foundry permitir).

## English

Dedicated content module for the **Kaihou — Silk, Steel and Seal** campaign (Naruto D20 in PF1e).

This module is a private extension of the public [`ezioaalves/naruto-d20`](https://github.com/ezioaalves/naruto-d20) module. It adds Kaihou-specific identity content: the 6 base classes (Strong, Fast, Tough, Smart, Dedicated, Charismatic Ninja). Future content: village races, flaws, schools, occupations, bloodlines, advanced classes (see D2.2–D2.8 roadmap).

**Requires:** Foundry VTT v11+ (verified on v13), `pf1` system ≥ 11.11, `naruto-d20` module ≥ 1.0.8.

### Install (private repo)

The module is private. To install via Foundry manifest URL, use a GitHub PAT in the URL:

```
https://<GITHUB_PAT>@github.com/ezioaalves/naruto-d20-kaihou/releases/latest/download/module.json
```

Alternative: download the release ZIP manually and install via "Install Module from File".

### Development

```bash
git clone https://github.com/ezioaalves/naruto-d20-kaihou.git
cd naruto-d20-kaihou
npm install
npm run generate-classes   # regenerate packs/_source/classes-basic/ from vault YAML
npm run validate-output    # JSON schema check
npm test                   # pytest suite
npm run lint               # ESLint + Prettier + Stylelint
npm run pack               # build LevelDB at packs/classes-basic/
```

The generator reads vault YAML from `$KAIHOU_VAULT_PATH` (defaults to `../Kaihou (Naruto D20)` relative to the script).

See RELEASE.md (Task 18) for the release procedure.
