package backend

import (
	"ant-chrome/backend/internal/browser"
	"ant-chrome/backend/internal/config"
	"os"
	"path/filepath"
	"testing"
)

func TestBuildStorageCleanupOverviewReportsCurrentAndLegacyRoots(t *testing.T) {
	root := t.TempDir()
	cacheBase := filepath.Join(root, "cache")
	appRoot := filepath.Join(root, "app")
	stateRoot := filepath.Join(root, "state")
	currentData := filepath.Join(stateRoot, "data")
	legacyRoot := filepath.Join(cacheBase, "ant-browser")

	mustWriteFile(t, filepath.Join(currentData, "profile-a", "Default", "Cookies"), "cookies")
	mustWriteFile(t, filepath.Join(legacyRoot, "data", "old-profile", "Default", "Cache", "blob"), "legacy-cache")

	cfg := config.DefaultConfig()
	cfg.Browser.UserDataRoot = currentData

	overview, err := buildStorageCleanupOverview(storageCleanupOptions{
		appRoot:       appRoot,
		stateRoot:     stateRoot,
		cacheBaseRoot: cacheBase,
		config:        cfg,
	})
	if err != nil {
		t.Fatalf("buildStorageCleanupOverview() error = %v", err)
	}

	if !overview.CurrentDataRoot.Exists {
		t.Fatal("current data root should exist")
	}
	if overview.CurrentDataRoot.Path != currentData {
		t.Fatalf("current data root path = %q, want %q", overview.CurrentDataRoot.Path, currentData)
	}
	if overview.LegacyCacheRoot.Path != legacyRoot {
		t.Fatalf("legacy cache root path = %q, want %q", overview.LegacyCacheRoot.Path, legacyRoot)
	}
	if !overview.LegacyCacheRoot.Exists || !overview.LegacyCacheRoot.Cleanable {
		t.Fatalf("legacy cache root should exist and be cleanable: %+v", overview.LegacyCacheRoot)
	}
	if overview.LegacyCacheRoot.SizeBytes == 0 {
		t.Fatal("legacy cache root size should be reported")
	}
}

func TestClearCurrentBrowserCachesPreservesCookiesAndLocalStorage(t *testing.T) {
	root := t.TempDir()
	userDataRoot := filepath.Join(root, "data")
	profileDir := filepath.Join(userDataRoot, "profile-a")

	mustWriteFile(t, filepath.Join(profileDir, "Default", "Cache", "blob"), "cache")
	mustWriteFile(t, filepath.Join(profileDir, "Default", "Code Cache", "js", "blob"), "code-cache")
	mustWriteFile(t, filepath.Join(profileDir, "Default", "Cookies"), "cookies")
	mustWriteFile(t, filepath.Join(profileDir, "Default", "Local Storage", "leveldb", "data"), "local-storage")
	mustWriteFile(t, filepath.Join(profileDir, "ShaderCache", "shader"), "shader")

	app := NewApp(root)
	app.config = config.DefaultConfig()
	app.config.Browser.UserDataRoot = userDataRoot
	app.browserMgr = browser.NewManager(app.config, root)
	app.browserMgr.Profiles["profile-a"] = &browser.Profile{
		ProfileId:   "profile-a",
		ProfileName: "Profile A",
		UserDataDir: "profile-a",
	}

	result, err := app.ClearCurrentBrowserCaches()
	if err != nil {
		t.Fatalf("ClearCurrentBrowserCaches() error = %v", err)
	}
	if result.RemovedBytes == 0 || result.RemovedPaths == 0 {
		t.Fatalf("expected cache data to be removed, got %+v", result)
	}
	if _, err := os.Stat(filepath.Join(profileDir, "Default", "Cache")); !os.IsNotExist(err) {
		t.Fatalf("Default/Cache should be removed, stat err = %v", err)
	}
	if _, err := os.Stat(filepath.Join(profileDir, "ShaderCache")); !os.IsNotExist(err) {
		t.Fatalf("ShaderCache should be removed, stat err = %v", err)
	}
	if _, err := os.Stat(filepath.Join(profileDir, "Default", "Cookies")); err != nil {
		t.Fatalf("Cookies should be preserved: %v", err)
	}
	if _, err := os.Stat(filepath.Join(profileDir, "Default", "Local Storage", "leveldb", "data")); err != nil {
		t.Fatalf("Local Storage should be preserved: %v", err)
	}
}

func TestClearLegacyCacheRootRefusesCurrentDataRoot(t *testing.T) {
	root := t.TempDir()
	currentData := filepath.Join(root, "cache", "ant-browser")
	mustWriteFile(t, filepath.Join(currentData, "profile-a", "Default", "Cookies"), "cookies")

	app := NewApp(root)
	app.config = config.DefaultConfig()
	app.config.Browser.UserDataRoot = currentData

	_, err := app.clearLegacyCacheRoot(filepath.Dir(currentData))
	if err == nil {
		t.Fatal("clearLegacyCacheRoot() should refuse to delete the current data root")
	}
	if _, statErr := os.Stat(filepath.Join(currentData, "profile-a", "Default", "Cookies")); statErr != nil {
		t.Fatalf("current data root should remain intact: %v", statErr)
	}
}

func TestClearLegacyCacheRootRefusesParentOfCurrentDataRoot(t *testing.T) {
	root := t.TempDir()
	legacyRoot := filepath.Join(root, "cache", "ant-browser")
	currentData := filepath.Join(legacyRoot, "data")
	mustWriteFile(t, filepath.Join(currentData, "profile-a", "Default", "Cookies"), "cookies")

	app := NewApp(root)
	app.config = config.DefaultConfig()
	app.config.Browser.UserDataRoot = currentData

	_, err := app.clearLegacyCacheRoot(filepath.Dir(legacyRoot))
	if err == nil {
		t.Fatal("clearLegacyCacheRoot() should refuse to delete a parent of current data root")
	}
	if _, statErr := os.Stat(filepath.Join(currentData, "profile-a", "Default", "Cookies")); statErr != nil {
		t.Fatalf("current data root should remain intact: %v", statErr)
	}
}

func TestBuildStorageCleanupOverviewMarksLegacyParentOfCurrentDataRootUnsafe(t *testing.T) {
	root := t.TempDir()
	cacheBase := filepath.Join(root, "cache")
	legacyRoot := filepath.Join(cacheBase, "ant-browser")
	currentData := filepath.Join(legacyRoot, "data")
	mustWriteFile(t, filepath.Join(currentData, "profile-a", "Default", "Cookies"), "cookies")

	cfg := config.DefaultConfig()
	cfg.Browser.UserDataRoot = currentData

	overview, err := buildStorageCleanupOverview(storageCleanupOptions{
		appRoot:       filepath.Join(root, "app"),
		stateRoot:     filepath.Join(root, "state"),
		cacheBaseRoot: cacheBase,
		config:        cfg,
	})
	if err != nil {
		t.Fatalf("buildStorageCleanupOverview() error = %v", err)
	}
	if overview.LegacyCacheRoot.Cleanable {
		t.Fatalf("legacy root should be marked unsafe when it contains current data root: %+v", overview.LegacyCacheRoot)
	}
	if overview.LegacyCacheRoot.Warning == "" {
		t.Fatalf("legacy root should explain why it cannot be cleaned: %+v", overview.LegacyCacheRoot)
	}
}

func mustWriteFile(t *testing.T, path string, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("MkdirAll(%q) error = %v", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("WriteFile(%q) error = %v", path, err)
	}
}
