package proxy

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveRuntimeBinaryFindsRepoBinFromDevAppBundle(t *testing.T) {
	root := t.TempDir()
	appRoot := filepath.Join(root, "build", "bin", "Ant Browser.app", "Contents", "MacOS")
	binPath := filepath.Join(root, "bin", "darwin-arm64", "tool-test")
	if err := os.MkdirAll(filepath.Dir(binPath), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(appRoot, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(binPath, []byte("#!/bin/sh\n"), 0644); err != nil {
		t.Fatal(err)
	}

	got, err := resolveRuntimeBinary(runtimeBinarySpec{
		displayName: "tool-test",
		configName:  "ToolTestBinaryPath",
		envName:     "TOOL_TEST_BINARY_PATH",
		appRoot:     appRoot,
		goos:        "darwin",
		goarch:      "arm64",
		names:       []string{"tool-test"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !samePath(t, got, binPath) {
		t.Fatalf("resolved path = %q, want %q", got, binPath)
	}
}

func TestResolveRuntimeBinaryFindsRepoBinFromCurrentDirectory(t *testing.T) {
	root := t.TempDir()
	binPath := filepath.Join(root, "bin", "darwin-arm64", "tool-test-cwd")
	if err := os.MkdirAll(filepath.Dir(binPath), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(binPath, []byte("#!/bin/sh\n"), 0644); err != nil {
		t.Fatal(err)
	}

	oldwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(filepath.Join(root)); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = os.Chdir(oldwd)
	})

	got, err := resolveRuntimeBinary(runtimeBinarySpec{
		displayName: "tool-test-cwd",
		configName:  "ToolTestCwdBinaryPath",
		envName:     "TOOL_TEST_CWD_BINARY_PATH",
		goos:        "darwin",
		goarch:      "arm64",
		names:       []string{"tool-test-cwd"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !samePath(t, got, binPath) {
		t.Fatalf("resolved path = %q, want %q", got, binPath)
	}
}

func samePath(t *testing.T, a string, b string) bool {
	t.Helper()
	aReal, err := filepath.EvalSymlinks(a)
	if err != nil {
		t.Fatal(err)
	}
	bReal, err := filepath.EvalSymlinks(b)
	if err != nil {
		t.Fatal(err)
	}
	return aReal == bReal
}
