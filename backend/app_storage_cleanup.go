package backend

import (
	"ant-chrome/backend/internal/apppath"
	"ant-chrome/backend/internal/config"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type StoragePathUsage struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Path        string `json:"path"`
	Exists      bool   `json:"exists"`
	SizeBytes   int64  `json:"sizeBytes"`
	Cleanable   bool   `json:"cleanable"`
	Description string `json:"description"`
	Warning     string `json:"warning"`
}

type StorageCleanupOverview struct {
	CurrentDataRoot        StoragePathUsage `json:"currentDataRoot"`
	LegacyCacheRoot        StoragePathUsage `json:"legacyCacheRoot"`
	CurrentCacheBytes      int64            `json:"currentCacheBytes"`
	CurrentProfileCount    int              `json:"currentProfileCount"`
	SkippedRunningProfiles int              `json:"skippedRunningProfiles"`
}

type StorageCleanupResult struct {
	RemovedBytes int64  `json:"removedBytes"`
	RemovedPaths int    `json:"removedPaths"`
	Message      string `json:"message"`
}

type storageCleanupOptions struct {
	appRoot       string
	stateRoot     string
	cacheBaseRoot string
	config        *config.Config
}

var browserCacheRelativePaths = []string{
	"ShaderCache",
	"GrShaderCache",
	"GraphiteDawnCache",
	"DawnCache",
	"GPUCache",
	filepath.ToSlash(filepath.Join("Default", "Cache")),
	filepath.ToSlash(filepath.Join("Default", "Code Cache")),
	filepath.ToSlash(filepath.Join("Default", "GPUCache")),
	filepath.ToSlash(filepath.Join("Default", "DawnCache")),
	filepath.ToSlash(filepath.Join("Default", "Service Worker", "CacheStorage")),
}

func (a *App) GetStorageCleanupOverview() (StorageCleanupOverview, error) {
	cacheBase, err := os.UserCacheDir()
	if err != nil {
		cacheBase = ""
	}
	return buildStorageCleanupOverview(storageCleanupOptions{
		appRoot:       a.appRoot,
		stateRoot:     apppath.StateRoot(a.appRoot),
		cacheBaseRoot: cacheBase,
		config:        a.config,
	})
}

func (a *App) ClearLegacyCacheRoot() (StorageCleanupResult, error) {
	cacheBase, err := os.UserCacheDir()
	if err != nil {
		return StorageCleanupResult{}, err
	}
	return a.clearLegacyCacheRoot(cacheBase)
}

func (a *App) ClearCurrentBrowserCaches() (StorageCleanupResult, error) {
	userDataRoot := a.currentUserDataRoot()
	if strings.TrimSpace(userDataRoot) == "" {
		return StorageCleanupResult{}, errors.New("用户数据根目录为空")
	}
	if err := ensureSafeExistingDir(userDataRoot); err != nil {
		return StorageCleanupResult{}, err
	}

	running := a.runningUserDataDirNames()
	entries, err := os.ReadDir(userDataRoot)
	if err != nil {
		return StorageCleanupResult{}, err
	}

	var result StorageCleanupResult
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		profileDirName := entry.Name()
		if running[profileDirName] {
			continue
		}
		profileDir := filepath.Join(userDataRoot, profileDirName)
		for _, rel := range browserCacheRelativePaths {
			target := filepath.Join(profileDir, filepath.FromSlash(rel))
			removedBytes, removedPaths, err := removePathIfExists(target)
			if err != nil {
				return result, err
			}
			result.RemovedBytes += removedBytes
			result.RemovedPaths += removedPaths
		}
	}

	result.Message = fmt.Sprintf("已清理 %d 个缓存路径，释放 %s", result.RemovedPaths, formatBytes(result.RemovedBytes))
	return result, nil
}

func (a *App) clearLegacyCacheRoot(cacheBase string) (StorageCleanupResult, error) {
	legacyRoot := filepath.Join(strings.TrimSpace(cacheBase), "ant-browser")
	if err := ensureSafeLegacyCacheRoot(legacyRoot, a.currentUserDataRoot(), apppath.StateRoot(a.appRoot)); err != nil {
		return StorageCleanupResult{}, err
	}
	removedBytes, removedPaths, err := removePathIfExists(legacyRoot)
	if err != nil {
		return StorageCleanupResult{}, err
	}
	return StorageCleanupResult{
		RemovedBytes: removedBytes,
		RemovedPaths: removedPaths,
		Message:      fmt.Sprintf("已清理旧缓存目录，释放 %s", formatBytes(removedBytes)),
	}, nil
}

func buildStorageCleanupOverview(opts storageCleanupOptions) (StorageCleanupOverview, error) {
	cfg := opts.config
	if cfg == nil {
		cfg = config.DefaultConfig()
	}

	currentDataRoot := resolveConfiguredPath(opts.appRoot, cfg.Browser.UserDataRoot)
	legacyRoot := ""
	if strings.TrimSpace(opts.cacheBaseRoot) != "" {
		legacyRoot = filepath.Join(opts.cacheBaseRoot, "ant-browser")
	}

	currentUsage, err := buildPathUsage("current-data", "当前实例数据", currentDataRoot, false, "保存实例配置、登录态、Cookies、密码库和浏览器状态。")
	if err != nil {
		return StorageCleanupOverview{}, err
	}
	legacyUsage, err := buildPathUsage("legacy-cache", "旧缓存目录", legacyRoot, true, "旧版本或旧运行方式遗留的 ant-browser 缓存目录。")
	if err != nil {
		return StorageCleanupOverview{}, err
	}
	if legacyUsage.Exists && samePath(legacyRoot, currentDataRoot) {
		legacyUsage.Cleanable = false
		legacyUsage.Warning = "该目录正在作为当前实例数据目录使用，不能作为旧缓存清理。"
	}
	if legacyUsage.Exists && containsPath(legacyRoot, currentDataRoot) {
		legacyUsage.Cleanable = false
		legacyUsage.Warning = "该目录包含当前实例数据目录，不能作为旧缓存清理。"
	}
	if legacyUsage.Exists && samePath(legacyRoot, opts.stateRoot) {
		legacyUsage.Cleanable = false
		legacyUsage.Warning = "该目录是当前应用状态目录，不能作为旧缓存清理。"
	}
	if legacyUsage.Exists && containsPath(legacyRoot, opts.stateRoot) {
		legacyUsage.Cleanable = false
		legacyUsage.Warning = "该目录包含当前应用状态目录，不能作为旧缓存清理。"
	}

	cacheBytes, profileCount, err := estimateCurrentBrowserCacheBytes(currentDataRoot)
	if err != nil {
		return StorageCleanupOverview{}, err
	}
	return StorageCleanupOverview{
		CurrentDataRoot:     currentUsage,
		LegacyCacheRoot:     legacyUsage,
		CurrentCacheBytes:   cacheBytes,
		CurrentProfileCount: profileCount,
	}, nil
}

func buildPathUsage(key, label, path string, cleanable bool, description string) (StoragePathUsage, error) {
	usage := StoragePathUsage{
		Key:         key,
		Label:       label,
		Path:        filepath.Clean(strings.TrimSpace(path)),
		Cleanable:   cleanable,
		Description: description,
	}
	if usage.Path == "." || usage.Path == "" {
		usage.Path = ""
		usage.Cleanable = false
		return usage, nil
	}
	info, err := os.Stat(usage.Path)
	if err != nil {
		if os.IsNotExist(err) {
			return usage, nil
		}
		return usage, err
	}
	usage.Exists = true
	if !info.IsDir() {
		usage.Cleanable = false
		usage.Warning = "该路径不是目录，已禁止清理。"
	}
	size, err := dirSize(usage.Path)
	if err != nil {
		return usage, err
	}
	usage.SizeBytes = size
	return usage, nil
}

func estimateCurrentBrowserCacheBytes(userDataRoot string) (int64, int, error) {
	if err := ensureSafeExistingDir(userDataRoot); err != nil {
		if os.IsNotExist(err) {
			return 0, 0, nil
		}
		return 0, 0, err
	}
	entries, err := os.ReadDir(userDataRoot)
	if err != nil {
		return 0, 0, err
	}
	var total int64
	profileCount := 0
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		profileCount++
		profileDir := filepath.Join(userDataRoot, entry.Name())
		for _, rel := range browserCacheRelativePaths {
			size, err := dirSize(filepath.Join(profileDir, filepath.FromSlash(rel)))
			if err != nil {
				if os.IsNotExist(err) {
					continue
				}
				return 0, 0, err
			}
			total += size
		}
	}
	return total, profileCount, nil
}

func (a *App) currentUserDataRoot() string {
	cfg := a.config
	if cfg == nil {
		cfg = config.DefaultConfig()
	}
	return resolveConfiguredPath(a.appRoot, cfg.Browser.UserDataRoot)
}

func resolveConfiguredPath(appRoot, raw string) string {
	path := strings.TrimSpace(raw)
	if path == "" {
		path = "data"
	}
	return apppath.Resolve(appRoot, path)
}

func (a *App) runningUserDataDirNames() map[string]bool {
	running := make(map[string]bool)
	if a.browserMgr == nil {
		return running
	}
	for _, profile := range a.browserMgr.List() {
		if !profile.Running {
			continue
		}
		name := strings.TrimSpace(profile.UserDataDir)
		if name == "" {
			name = profile.ProfileId
		}
		if name != "" && !filepath.IsAbs(name) {
			running[name] = true
		}
	}
	return running
}

func ensureSafeExistingDir(path string) error {
	clean := filepath.Clean(strings.TrimSpace(path))
	if clean == "" || clean == "." || clean == string(filepath.Separator) {
		return fmt.Errorf("unsafe directory: %s", path)
	}
	info, err := os.Stat(clean)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("path is not a directory: %s", clean)
	}
	return nil
}

func ensureSafeLegacyCacheRoot(legacyRoot, currentDataRoot, stateRoot string) error {
	clean := filepath.Clean(strings.TrimSpace(legacyRoot))
	if clean == "" || clean == "." || clean == string(filepath.Separator) {
		return fmt.Errorf("unsafe legacy cache directory: %s", legacyRoot)
	}
	if !strings.EqualFold(filepath.Base(clean), "ant-browser") {
		return fmt.Errorf("refuse to clear non ant-browser cache directory: %s", clean)
	}
	if samePath(clean, currentDataRoot) {
		return fmt.Errorf("refuse to clear current data root: %s", clean)
	}
	if containsPath(clean, currentDataRoot) {
		return fmt.Errorf("refuse to clear parent of current data root: %s", clean)
	}
	if samePath(clean, stateRoot) {
		return fmt.Errorf("refuse to clear current state root: %s", clean)
	}
	if containsPath(clean, stateRoot) {
		return fmt.Errorf("refuse to clear parent of current state root: %s", clean)
	}
	return nil
}

func removePathIfExists(path string) (int64, int, error) {
	clean := filepath.Clean(strings.TrimSpace(path))
	if clean == "" || clean == "." || clean == string(filepath.Separator) {
		return 0, 0, fmt.Errorf("unsafe removal path: %s", path)
	}
	if _, err := os.Stat(clean); err != nil {
		if os.IsNotExist(err) {
			return 0, 0, nil
		}
		return 0, 0, err
	}
	size, err := dirSize(clean)
	if err != nil {
		return 0, 0, err
	}
	if err := os.RemoveAll(clean); err != nil {
		return 0, 0, err
	}
	return size, 1, nil
}

func dirSize(root string) (int64, error) {
	clean := filepath.Clean(strings.TrimSpace(root))
	var total int64
	err := filepath.WalkDir(clean, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		info, infoErr := d.Info()
		if infoErr != nil {
			return infoErr
		}
		total += info.Size()
		return nil
	})
	if err != nil {
		return 0, err
	}
	return total, nil
}

func samePath(a, b string) bool {
	left := filepath.Clean(strings.TrimSpace(a))
	right := filepath.Clean(strings.TrimSpace(b))
	if left == "" || right == "" {
		return false
	}
	if rel, err := filepath.Rel(left, right); err == nil && rel == "." {
		return true
	}
	return strings.EqualFold(left, right)
}

func containsPath(parent, child string) bool {
	left := filepath.Clean(strings.TrimSpace(parent))
	right := filepath.Clean(strings.TrimSpace(child))
	if left == "" || right == "" || samePath(left, right) {
		return false
	}
	if rel, err := filepath.Rel(left, right); err == nil {
		return rel != "." && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
	}
	left = strings.TrimRight(strings.ToLower(left), string(filepath.Separator)) + string(filepath.Separator)
	right = strings.TrimRight(strings.ToLower(right), string(filepath.Separator)) + string(filepath.Separator)
	return strings.HasPrefix(right, left)
}

func formatBytes(bytes int64) string {
	if bytes < 1024 {
		return fmt.Sprintf("%d B", bytes)
	}
	units := []string{"KB", "MB", "GB", "TB"}
	value := float64(bytes)
	for _, unit := range units {
		value /= 1024
		if value < 1024 {
			return fmt.Sprintf("%.2f %s", value, unit)
		}
	}
	return fmt.Sprintf("%.2f PB", value/1024)
}
