# App i18n Design

Date: 2026-05-27

## Goal

Add first-stage multilingual support to the app so the main frontend UI can switch between Simplified Chinese (`zh-CN`) and English (`en-US`).

This stage focuses on the app shell and core user workflows. It does not attempt to translate every long-form document, backend log line, or backend error string.

## Current State

- The frontend has no existing i18n framework or dictionary structure.
- `frontend/src/modules/settings/types.ts` already defines `AppSettings.language`, defaulting to `zh-CN`.
- `frontend/src/modules/settings/api.ts` persists settings to localStorage under `app_settings`.
- `frontend/src/modules/settings/SettingsPage.tsx` already renders a language select for `zh-CN` and `en-US`, but it does not drive app rendering.
- `frontend/src/config/project.config.ts` has `uiConfig.locale = 'zh-CN'` and hardcoded Chinese navigation labels.
- Backend config does not currently contain an app UI language field. Browser fingerprint language settings such as `--lang=ip` are separate and must not be mixed with app UI language.

## Approved Approach

Use a frontend-first i18n layer without adding a third-party dependency.

Add a small i18n module under `frontend/src/shared/i18n/`:

- Supported language definitions: `zh-CN` and `en-US`.
- A default language of `zh-CN`.
- Message dictionaries for both languages.
- `LanguageProvider` to own current language state and persistence.
- `useI18n()` to expose `language`, `setLanguage()`, supported languages, and `t(key)`.

This mirrors the existing local-provider style used by the theme system and keeps the first stage small enough to verify end to end.

## Scope

Translate high-frequency visible frontend UI:

- App shell, sidebar, topbar, navigation sections, and navigation items.
- Shared component defaults such as modal buttons, empty table state, loading state, and theme names.
- Settings page, including the existing language select.
- Browser core workflows, starting with pages and components users visit most often:
  - instance list
  - proxy pool
  - core management
  - common browser workflow labels, actions, table headers, empty states, and confirmations

Out of scope for this stage:

- Long documentation content under `frontend/src/modules/browser/pages/launchApiDocs/`.
- Backend logs.
- Full backend error localization.
- Browser fingerprint language behavior.
- Moving the language setting from localStorage to `config.yaml`.

## Data Flow

On app startup, `LanguageProvider` loads the existing `app_settings` object from localStorage and normalizes `language`.

If the stored language is missing or unsupported, it falls back to `zh-CN`.

When the user changes language in settings:

1. `SettingsPage` calls `setLanguage(nextLanguage)`.
2. The provider updates React state immediately.
3. The provider persists the normalized language back into `app_settings`.
4. Components using `t(key)` re-render in the selected language.

The existing settings API remains compatible. If future backend persistence is added, this provider becomes the single migration point.

## Message Keys

Dictionary keys should be stable semantic keys, not source-language strings. Example:

- `nav.dashboard`
- `settings.language.label`
- `browser.list.actions.launch`
- `common.confirm`

Both dictionaries must contain the same key set. Missing keys should fail a lightweight validation script.

## Error Handling

- Unsupported language values are normalized to `zh-CN`.
- Missing dictionary keys return the key itself in development-friendly form, so the UI remains usable and missing translations are visible.
- localStorage read/write failures should not crash the app; the provider falls back to in-memory `zh-CN`.

## Testing and Verification

Add a lightweight Node script, for example `frontend/scripts/test-i18n-messages.mjs`, to verify:

- `zh-CN` and `en-US` dictionaries expose the same key set.
- No dictionary value is accidentally missing or empty.

Run verification before completion:

- i18n dictionary validation script
- frontend build
- app runtime smoke check with the language selector switching visible UI between Chinese and English

## Implementation Plan Shape

Implementation should be split so subagents can work independently:

- i18n infrastructure and settings wiring.
- navigation, layout, and shared components.
- browser workflow pages and core visible strings.
- validation script, build verification, and runtime smoke check.

The main thread integrates subagent output, resolves conflicts, runs verification, and starts the app for user review.

## Self Review

- No placeholders remain.
- The scope is intentionally first-stage and excludes long docs/backend logs to keep the implementation verifiable.
- App UI language is explicitly separated from browser fingerprint language.
- Persistence is defined through the existing localStorage settings path, with a future backend migration point left clear.
