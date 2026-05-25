package browser

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func LocaleFromLaunchArgs(argGroups ...[]string) string {
	for _, args := range argGroups {
		for i := 0; i < len(args); i++ {
			arg := strings.TrimSpace(args[i])
			lower := strings.ToLower(arg)
			if strings.HasPrefix(lower, "--lang=") {
				if locale := normalizeChromeLocale(arg[len("--lang="):]); locale != "" {
					return locale
				}
			}
			if strings.EqualFold(arg, "--lang") && i+1 < len(args) {
				if locale := normalizeChromeLocale(args[i+1]); locale != "" {
					return locale
				}
			}
		}
	}
	return ""
}

func ChromeAcceptLanguages(locale string) string {
	locale = normalizeChromeLocale(locale)
	if locale == "" {
		return ""
	}
	base := locale
	if idx := strings.Index(locale, "-"); idx > 0 {
		base = locale[:idx]
	}
	if strings.EqualFold(base, locale) {
		return locale
	}
	return locale + "," + base
}

func EnsureChromeLocale(userDataDir string, locale string) error {
	locale = normalizeChromeLocale(locale)
	if locale == "" {
		return nil
	}
	acceptLanguages := ChromeAcceptLanguages(locale)
	country := chromeLocaleCountry(locale)

	localStatePath := filepath.Join(userDataDir, "Local State")
	localState, err := readChromeJSON(localStatePath)
	if err != nil {
		return err
	}
	localStateIntl := ensureMap(localState, "intl")
	localStateIntl["app_locale"] = locale
	localStateIntl["selected_languages"] = acceptLanguages
	if country != "" {
		localState["variations_country"] = country
	}
	if err := writeChromeJSON(localStatePath, localState); err != nil {
		return err
	}

	preferencesPath := filepath.Join(userDataDir, "Default", "Preferences")
	preferences, err := readChromeJSON(preferencesPath)
	if err != nil {
		return err
	}
	preferencesIntl := ensureMap(preferences, "intl")
	preferencesIntl["accept_languages"] = acceptLanguages
	preferencesIntl["selected_languages"] = acceptLanguages
	profile := ensureMap(preferences, "profile")
	if name, _ := profile["name"].(string); strings.TrimSpace(name) == "" || strings.Contains(name, "Chromium") || strings.Contains(name, "您的") {
		profile["name"] = "Chromium"
	}
	spellcheck := ensureMap(preferences, "spellcheck")
	spellcheck["dictionaries"] = []string{locale}
	return writeChromeJSON(preferencesPath, preferences)
}

func normalizeChromeLocale(locale string) string {
	locale = strings.TrimSpace(locale)
	if strings.EqualFold(locale, "ip") {
		return ""
	}
	return locale
}

func chromeLocaleCountry(locale string) string {
	parts := strings.Split(normalizeChromeLocale(locale), "-")
	if len(parts) < 2 {
		return ""
	}
	return strings.ToUpper(parts[len(parts)-1])
}

func readChromeJSON(path string) (map[string]any, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]any{}, nil
		}
		return nil, fmt.Errorf("读取 Chrome 配置失败 %s: %w", path, err)
	}
	if strings.TrimSpace(string(data)) == "" {
		return map[string]any{}, nil
	}
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		return map[string]any{}, nil
	}
	if out == nil {
		out = map[string]any{}
	}
	return out, nil
}

func writeChromeJSON(path string, value map[string]any) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("创建 Chrome 配置目录失败 %s: %w", filepath.Dir(path), err)
	}
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化 Chrome 配置失败 %s: %w", path, err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("写入 Chrome 配置失败 %s: %w", path, err)
	}
	return nil
}

func ensureMap(parent map[string]any, key string) map[string]any {
	if child, ok := parent[key].(map[string]any); ok {
		return child
	}
	child := map[string]any{}
	parent[key] = child
	return child
}
