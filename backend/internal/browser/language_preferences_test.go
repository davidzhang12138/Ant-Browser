package browser

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestChromeAcceptLanguagesAddsBaseLanguage(t *testing.T) {
	t.Parallel()

	if got := ChromeAcceptLanguages("en-US"); got != "en-US,en" {
		t.Fatalf("ChromeAcceptLanguages(en-US) = %q, want %q", got, "en-US,en")
	}
	if got := ChromeAcceptLanguages("ja-JP"); got != "ja-JP,ja" {
		t.Fatalf("ChromeAcceptLanguages(ja-JP) = %q, want %q", got, "ja-JP,ja")
	}
}

func TestIPBasedLanguageDoesNotWriteChromeLocale(t *testing.T) {
	t.Parallel()

	if got := LocaleFromLaunchArgs([]string{"--lang=ip"}); got != "" {
		t.Fatalf("LocaleFromLaunchArgs(--lang=ip) = %q, want empty locale", got)
	}
	if got := ChromeAcceptLanguages("ip"); got != "" {
		t.Fatalf("ChromeAcceptLanguages(ip) = %q, want empty accept languages", got)
	}
}

func TestEnsureChromeLocaleWritesLocalStateAndPreferences(t *testing.T) {
	t.Parallel()

	userDataDir := t.TempDir()
	if err := EnsureChromeLocale(userDataDir, "en-US"); err != nil {
		t.Fatalf("EnsureChromeLocale() error = %v", err)
	}

	localState := readJSONFile(t, filepath.Join(userDataDir, "Local State"))
	intl := localState["intl"].(map[string]any)
	if intl["app_locale"] != "en-US" || intl["selected_languages"] != "en-US,en" {
		t.Fatalf("Local State intl = %#v, want en-US locale/languages", intl)
	}
	if localState["variations_country"] != "US" {
		t.Fatalf("Local State variations_country = %#v, want US", localState["variations_country"])
	}

	preferences := readJSONFile(t, filepath.Join(userDataDir, "Default", "Preferences"))
	prefIntl := preferences["intl"].(map[string]any)
	if prefIntl["accept_languages"] != "en-US,en" || prefIntl["selected_languages"] != "en-US,en" {
		t.Fatalf("Preferences intl = %#v, want en-US accept/selected languages", prefIntl)
	}
	spellcheck := preferences["spellcheck"].(map[string]any)
	dictionaries := spellcheck["dictionaries"].([]any)
	if len(dictionaries) != 1 || dictionaries[0] != "en-US" {
		t.Fatalf("spellcheck dictionaries = %#v, want [en-US]", dictionaries)
	}
}

func readJSONFile(t *testing.T, path string) map[string]any {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%s) error = %v", path, err)
	}
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatalf("Unmarshal(%s) error = %v", path, err)
	}
	return out
}
