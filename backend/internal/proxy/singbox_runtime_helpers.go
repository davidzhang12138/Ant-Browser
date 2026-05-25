package proxy

import (
	"ant-chrome/backend/internal/apppath"
	"encoding/json"
	"os"
	"path/filepath"
	goruntime "runtime"
	"strings"
)

func (m *SingBoxManager) resolveBinary() (string, error) {
	binaryNames := []string{"sing-box"}
	if goruntime.GOOS == "windows" {
		binaryNames = []string{"sing-box.exe", "sing-box"}
	}
	return resolveRuntimeBinary(runtimeBinarySpec{
		displayName: "sing-box",
		configPath:  strings.TrimSpace(m.Config.Browser.SingBoxBinaryPath),
		configName:  "SingBoxBinaryPath",
		envName:     "SINGBOX_BINARY_PATH",
		appRoot:     m.AppRoot,
		goos:        goruntime.GOOS,
		goarch:      goruntime.GOARCH,
		names:       binaryNames,
	})
}

func (m *SingBoxManager) buildConfig(key string, outbound map[string]interface{}, port int) (string, error) {
	baseDir := m.resolveWorkdir(key)
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return "", err
	}

	cfg := map[string]interface{}{
		"log": map[string]interface{}{
			"level":     "info",
			"output":    filepath.Join(baseDir, "singbox.log"),
			"timestamp": true,
		},
		"inbounds": []interface{}{
			map[string]interface{}{
				"type":        "socks",
				"tag":         "socks-in",
				"listen":      "127.0.0.1",
				"listen_port": port,
			},
		},
		"outbounds": []interface{}{
			outbound,
			map[string]interface{}{
				"type": "direct",
				"tag":  "direct",
			},
		},
		"route": map[string]interface{}{
			"rules": []interface{}{
				map[string]interface{}{
					"inbound":  []string{"socks-in"},
					"outbound": "proxy-out",
				},
			},
		},
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return "", err
	}

	cfgPath := filepath.Join(baseDir, "singbox-config.json")
	if err := os.WriteFile(cfgPath, data, 0644); err != nil {
		return "", err
	}
	return cfgPath, nil
}

func (m *SingBoxManager) resolveWorkdir(key string) string {
	root := strings.TrimSpace(m.Config.Browser.UserDataRoot)
	if root == "" {
		root = "data"
	}
	if !filepath.IsAbs(root) {
		root = apppath.Resolve(m.AppRoot, root)
	}
	return filepath.Join(root, "_singbox", key)
}
