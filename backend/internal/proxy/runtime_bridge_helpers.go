package proxy

import (
	"ant-chrome/backend/internal/fsutil"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func computeNodeKey(src string) string {
	h := sha256.Sum256([]byte(strings.TrimSpace(src)))
	return hex.EncodeToString(h[:])
}

func normalizeNodeScheme(src string) string {
	s := strings.TrimSpace(src)
	if strings.HasPrefix(strings.ToLower(s), "hysteria://") {
		return "hysteria2://" + strings.TrimPrefix(s, "hysteria://")
	}
	return s
}

func resolveEnvPath(path string, appRoot string) string {
	path = fsutil.NormalizePathInput(path)
	if path == "" {
		return ""
	}
	if filepath.IsAbs(path) {
		return path
	}
	if appRoot != "" {
		candidate := filepath.Join(appRoot, path)
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	if exePath, err := os.Executable(); err == nil {
		candidate := filepath.Join(filepath.Dir(exePath), path)
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	if cwd, err := os.Getwd(); err == nil {
		candidate := filepath.Join(cwd, path)
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return path
}

type runtimeBinarySpec struct {
	displayName string
	configPath  string
	configName  string
	envName     string
	appRoot     string
	goos        string
	goarch      string
	names       []string
}

func resolveRuntimeBinary(spec runtimeBinarySpec) (string, error) {
	if strings.TrimSpace(spec.goos) == "" {
		spec.goos = "unknown"
	}
	if strings.TrimSpace(spec.goarch) == "" {
		spec.goarch = "unknown"
	}
	platformDir := fmt.Sprintf("%s-%s", spec.goos, spec.goarch)

	if configPath := strings.TrimSpace(spec.configPath); configPath != "" {
		resolved := resolveEnvPath(configPath, spec.appRoot)
		if resolved != "" {
			if found, err := executableFile(resolved, spec.displayName); found || err != nil {
				return resolved, err
			}
		}
	}
	if env := strings.TrimSpace(os.Getenv(spec.envName)); env != "" {
		if found, err := executableFile(env, spec.displayName); found || err != nil {
			return env, err
		}
	}

	for _, dir := range runtimeBinarySearchDirs(spec.appRoot, platformDir) {
		for _, name := range spec.names {
			candidate := filepath.Join(dir, name)
			if found, err := executableFile(candidate, spec.displayName); found || err != nil {
				return candidate, err
			}
		}
	}

	for _, name := range spec.names {
		if path, err := exec.LookPath(name); err == nil {
			if _, err := executableFile(path, spec.displayName); err != nil {
				return "", err
			}
			return path, nil
		}
	}

	return "", fmt.Errorf("未找到 %s 可执行文件。请将 %s 放到 bin/%s/ 或 bin/ 目录，或在配置中设置 %s", spec.displayName, spec.displayName, platformDir, spec.configName)
}

func executableFile(path string, displayName string) (bool, error) {
	if _, err := os.Stat(path); err == nil {
		if err := fsutil.EnsureExecutable(path); err != nil {
			return true, fmt.Errorf("%s 文件不可执行: %s: %w", displayName, path, err)
		}
		return true, nil
	}
	return false, nil
}

func runtimeBinarySearchDirs(appRoot string, platformDir string) []string {
	dirs := make([]string, 0, 24)
	appendDir := func(dir string) {
		dir = strings.TrimSpace(dir)
		if dir != "" {
			dirs = append(dirs, dir)
		}
	}
	appendRoot := func(root string) {
		root = strings.TrimSpace(root)
		if root == "" {
			return
		}
		appendDir(filepath.Join(root, "bin", platformDir))
		appendDir(filepath.Join(root, "bin"))
	}

	appendRoot(appRoot)
	if exePath, err := os.Executable(); err == nil {
		appendRoot(filepath.Dir(exePath))
	}
	if cwd, err := os.Getwd(); err == nil {
		appendRoot(cwd)
	}

	// wails dev on macOS can run from build/bin/*.app/Contents/MacOS while
	// the checked-in runtime binaries still live in the repository's bin/.
	for _, root := range []string{appRoot, executableDir(), currentDir()} {
		for _, parent := range ancestorDirs(root, 8) {
			appendRoot(parent)
		}
	}

	return dedupeStrings(dirs)
}

func executableDir() string {
	if exePath, err := os.Executable(); err == nil {
		return filepath.Dir(exePath)
	}
	return ""
}

func currentDir() string {
	if cwd, err := os.Getwd(); err == nil {
		return cwd
	}
	return ""
}

func ancestorDirs(root string, maxDepth int) []string {
	root = strings.TrimSpace(root)
	if root == "" || maxDepth <= 0 {
		return nil
	}
	if abs, err := filepath.Abs(root); err == nil {
		root = abs
	}
	out := make([]string, 0, maxDepth)
	seen := map[string]struct{}{}
	for i := 0; i < maxDepth; i++ {
		clean := filepath.Clean(root)
		if _, ok := seen[clean]; !ok {
			seen[clean] = struct{}{}
			out = append(out, clean)
		}
		parent := filepath.Dir(clean)
		if parent == clean {
			break
		}
		root = parent
	}
	return out
}

func dedupeStrings(values []string) []string {
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		clean := filepath.Clean(strings.TrimSpace(value))
		if clean == "." || clean == "" {
			continue
		}
		if _, ok := seen[clean]; ok {
			continue
		}
		seen[clean] = struct{}{}
		out = append(out, clean)
	}
	return out
}

func waitPortReady(host string, port int, timeout time.Duration) error {
	addr := net.JoinHostPort(host, strconv.Itoa(port))
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		conn, err := net.DialTimeout("tcp", addr, 200*time.Millisecond)
		if err == nil {
			conn.Close()
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("端口 %d 不可用", port)
}

// nextAvailablePort 分配一个可用端口。
// 采用二次验证策略：分配后立即再次绑定确认未被其他进程抢占，
// 并在 EnsureBridge 层面加重试，彻底消除 TOCTOU 竞争窗口。
func nextAvailablePort() (int, error) {
	return nextAvailablePortWithRetry(10)
}

func nextAvailablePortWithRetry(maxRetries int) (int, error) {
	for i := 0; i < maxRetries; i++ {
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			continue
		}
		port := listener.Addr().(*net.TCPAddr).Port
		listener.Close()
		time.Sleep(10 * time.Millisecond)
		verifyListener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
		if err != nil {
			continue
		}
		verifyListener.Close()
		return port, nil
	}
	return 0, fmt.Errorf("无法分配可用端口，已重试 %d 次", maxRetries)
}
