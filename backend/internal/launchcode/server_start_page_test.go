package launchcode

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLaunchServerServesStartPageFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "408.html"), []byte("<html>start</html>"), 0o644); err != nil {
		t.Fatalf("write start page fixture failed: %v", err)
	}

	server := NewLaunchServer(nil, nil, nil, 0)
	server.SetStartPageDir(dir)

	req := httptest.NewRequest(http.MethodGet, "/start-pages/408.html", nil)
	rec := httptest.NewRecorder()
	NewTestHandler(server).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if rec.Body.String() != "<html>start</html>" {
		t.Fatalf("body = %q", rec.Body.String())
	}
}

func TestLaunchServerRejectsStartPageTraversal(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	server := NewLaunchServer(nil, nil, nil, 0)
	server.SetStartPageDir(dir)

	req := httptest.NewRequest(http.MethodGet, "/start-pages/%2e%2e/config.yaml", nil)
	rec := httptest.NewRecorder()
	NewTestHandler(server).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestLaunchServerServesTwoFAToolPage(t *testing.T) {
	t.Parallel()

	server := NewLaunchServer(nil, nil, nil, 0)

	req := httptest.NewRequest(http.MethodGet, "/tools/2fa", nil)
	rec := httptest.NewRecorder()
	NewTestHandler(server).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if contentType := rec.Header().Get("Content-Type"); !strings.Contains(contentType, "text/html") {
		t.Fatalf("content type = %q, want text/html", contentType)
	}
	for _, want := range []string{
		`placeholder="otpauth://totp/`,
		`id="twofa-code"`,
		`id="token-meta"`,
		`navigator.clipboard.writeText`,
		`function parseOTPAuthSecret`,
		`function copyToken`,
	} {
		if !strings.Contains(rec.Body.String(), want) {
			t.Fatalf("2FA tool page missing %q\n%s", want, rec.Body.String())
		}
	}
}
