# Release Process

This document explains how to create and publish a release for the `naruto-d20-kaihou` module.

## Overview

Releases are automated via GitHub Actions. When you push a tag (e.g., `v1.0.0`), the release workflow:

1. Validates that all preconditions are met (manifest integrity, JSON schema, linting)
2. Stamps the version and download URL into `module.json`
3. Recompiles the LevelDB compendia from source JSON
4. Builds `module.zip` (runtime artifacts only — no dev files)
5. Extracts release notes from `CHANGELOG.md`
6. Creates a GitHub Release with the assets

The module can then be installed in Foundry via the manifest URL.

## Prerequisites

Before releasing, verify:

1. **All tests pass:**
   ```bash
   npm test
   ```

2. **Linting is clean:**
   ```bash
   npm run lint
   ```

3. **Version is bumped** in both files:
   - `package.json`: `"version": "1.0.0"`
   - `module.json`: `"version": "1.0.0"`

4. **CHANGELOG.md is updated** with a new section:
   ```markdown
   ## [1.0.0] - YYYY-MM-DD
   
   ### Added
   - Feature description
   ```
   
   The section must exist and have content — the release workflow extracts this as release notes. If empty or missing, the workflow will fail.

5. **Generator and packs are up to date:**
   ```bash
   npm run generate-classes
   npm run validate-output
   npm run pack:all
   git status  # Verify no untracked changes in packs/
   ```

## Manual GitHub Setup (One-Time)

This setup is required once per repository. Verify it is complete:

1. **Log in to GitHub** at https://github.com/ezioaalves/naruto-d20-kaihou

2. **Go to Settings → Secrets and variables → Actions**
   - URL: https://github.com/ezioaalves/naruto-d20-kaihou/settings/secrets/actions

3. **Verify the `FOUNDRY_MODULE_RELEASE_TOKEN` secret exists**
   - This is a GitHub Personal Access Token (PAT) with `public_repo` scope
   - It allows the release workflow to create releases and upload assets
   - **Value is secret and not shown here**
   - If it does not exist, create it with at least `public_repo` scope

## Creating a Release

### Step 1: Prepare and commit

Ensure all prerequisites above are met and committed:

```bash
# Bump version in package.json and module.json
# Update CHANGELOG.md with new section
# Commit changes
git add package.json module.json CHANGELOG.md
git commit -m "chore: version 1.0.0"
```

### Step 2: Tag and push

```bash
# Create an annotated tag (recommended)
git tag -a v1.0.0 -m "Release v1.0.0 — Base Classes"

# Push the tag to GitHub (this triggers the workflow)
git push origin v1.0.0
```

Or use `git push --tags` if you've created multiple tags locally.

### Step 3: Monitor the workflow

1. **Go to Actions tab:**
   https://github.com/ezioaalves/naruto-d20-kaihou/actions

2. **Watch the `release` workflow execute**
   - Look for the workflow run named after your tag (e.g., `v1.0.0`)
   - Expected duration: 30–60 seconds

3. **Expected steps:**
   - ✓ Checkout
   - ✓ Setup Node
   - ✓ Install dependencies
   - ✓ Derive version from tag
   - ✓ Stamp version and download URL into module.json
   - ✓ Validate module manifest
   - ✓ Validate compendium source JSON
   - ✓ Lint CSS
   - ✓ Recompile compendia from source
   - ✓ Build module.zip (runtime artifacts only)
   - ✓ Extract release notes from CHANGELOG.md
   - ✓ Create GitHub Release

### Step 4: Verify the release

1. **Go to Releases page:**
   https://github.com/ezioaalves/naruto-d20-kaihou/releases

2. **Verify the new release is published:**
   - Tag name: `v1.0.0`
   - Release name: `v1.0.0` (or custom title you provided)
   - Release notes: Extracted from CHANGELOG.md
   - Assets:
     - `module.json` (manifest)
     - `module.zip` (packaged module)

3. **Copy the manifest URL** for installation in Foundry:
   ```
   https://github.com/ezioaalves/naruto-d20-kaihou/releases/latest/download/module.json
   ```

## Testing the Release in Foundry

### Local testing (with private access token)

1. **In Foundry setup wizard** (or Game Settings → Modules):
   - Click "Install Module"
   - Enter the manifest URL with your GitHub PAT:
     ```
     https://<YOUR_GITHUB_PAT>@github.com/ezioaalves/naruto-d20-kaihou/releases/latest/download/module.json
     ```

2. **Verify the module installs:**
   - Module appears in the list and is enabled
   - Refresh the page (F5)
   - Log in and create a new character

3. **Verify all 6 classes are present:**
   - Character creation dialog → Class dropdown
   - Look for: Strong Ninja, Fast Ninja, Tough Ninja, Smart Ninja, Dedicated Ninja, Charismatic Ninja
   - Each class should have correct BAB, saves, defense, reputation, HD, and class skills

### Production testing

If releasing to a production Foundry instance, perform the same steps using the production instance's configuration.

## Rollback (if needed)

If a release has issues and needs to be withdrawn:

### Step 1: Delete the GitHub release

1. Go to https://github.com/ezioaalves/naruto-d20-kaihou/releases
2. Find the problematic release
3. Click the **⋯** menu → **Delete**

### Step 2: Delete the tag

```bash
# Delete locally
git tag -d v1.0.0

# Delete from GitHub
git push origin --delete v1.0.0
```

### Step 3: Fix and retry

```bash
# Make your fixes (e.g., update CHANGELOG, fix code)
# Commit the changes
git add ...
git commit -m "fix: ..."

# Re-create the tag (or bump to a new version)
git tag -a v1.0.0 -m "Release v1.0.0 (retried)"
git push origin v1.0.0
```

## Common Issues

### Workflow failed to create release

**Symptom:** The workflow fails with "Failed to create release" or "401 Unauthorized".

**Solution:**
- Check that `FOUNDRY_MODULE_RELEASE_TOKEN` is set in GitHub Secrets
- Verify the token has `public_repo` scope
- Generate a new token if the current one is expired

### Missing CHANGELOG entry for version

**Symptom:** Workflow fails with "Empty CHANGELOG entry for v1.0.0".

**Solution:**
- Add a new `## [1.0.0] - YYYY-MM-DD` section to `CHANGELOG.md`
- Ensure it has content (at least one bullet under `### Added`, `### Fixed`, etc.)
- See the format in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

### Module won't install in Foundry

**Symptom:** Manifest URL returns 404 or "Not Found".

**Solution:**
- Verify the tag was pushed: `git push origin v1.0.0`
- Verify the workflow succeeded (check Actions tab)
- Verify the release was created (check Releases page)
- Use the correct URL (with GitHub PAT if private): `https://<PAT>@github.com/ezioaalves/naruto-d20-kaihou/releases/latest/download/module.json`

### Classes not showing in Foundry after install

**Symptom:** Module installs but classes are missing or incomplete.

**Solution:**
- Ensure the `naruto-d20` module is installed and enabled (hard dependency ≥ 1.0.8)
- Check the browser console for errors (F12 → Console)
- Verify the packs compiled correctly:
  ```bash
  npm run pack
  ```
- Check that the `.json` files in `packs/_source/classes-basic/` were generated and include all class definitions
- If using test environment, ensure you're testing in the correct world

### JSON schema validation fails

**Symptom:** Workflow fails at "Validate compendium source JSON".

**Solution:**
- Run validation locally:
  ```bash
  npm run validate-output
  ```
- Fix any schema errors (missing fields, wrong types, etc.)
- Ensure all class YAML files are syntactically correct:
  ```bash
  npm run generate-classes --dry-run
  ```
- Commit the fixes and re-push the tag (or delete and retry)

## Advanced: Local release testing

To test the release workflow locally without pushing to GitHub:

```bash
npm run release:local
```

This builds `module.zip` and validates everything, but does not create a GitHub Release. Useful for checking that all preconditions are met.

## Related files

- `CHANGELOG.md` — Release notes source
- `package.json` — Version field
- `module.json` — Version and manifest metadata
- `.github/workflows/release.yml` — Release automation
- `scripts/README.md` — Generator script documentation
- `README.md` — Installation and usage

## See also

- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) — Changelog format guide
- [Semantic Versioning](https://semver.org/) — Version numbering scheme
- [Foundry VTT Module Development](https://foundryvtt.com/article/manifest/) — Module manifest spec
