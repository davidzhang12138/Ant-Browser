package proxy

import (
	goruntime "runtime"
	"strings"
)

func (m *XrayManager) resolveBinary() (string, error) {
	binaryNames := []string{"xray"}
	if goruntime.GOOS == "windows" {
		binaryNames = []string{"xray.exe", "xray"}
	}
	return resolveRuntimeBinary(runtimeBinarySpec{
		displayName: "xray",
		configPath:  strings.TrimSpace(m.Config.Browser.XrayBinaryPath),
		configName:  "XrayBinaryPath",
		envName:     "XRAY_BINARY_PATH",
		appRoot:     m.AppRoot,
		goos:        goruntime.GOOS,
		goarch:      goruntime.GOARCH,
		names:       binaryNames,
	})
}
