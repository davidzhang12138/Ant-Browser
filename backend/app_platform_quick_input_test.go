package backend

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestShouldInjectPlatformQuickInputRequiresPlatformURL(t *testing.T) {
	t.Parallel()

	if shouldInjectPlatformQuickInput(&BrowserProfile{Platform: "none", PlatformURL: "https://accounts.google.com/", Username: "user"}) {
		t.Fatal("无平台不应注入快捷输入")
	}
	if shouldInjectPlatformQuickInput(&BrowserProfile{Platform: "google", Username: "user"}) {
		t.Fatal("没有平台链接不应注入快捷输入")
	}
	if shouldInjectPlatformQuickInput(&BrowserProfile{Platform: "google", PlatformURL: "https://accounts.google.com/"}) {
		t.Fatal("没有账号、密码、2FA 内容不应注入快捷输入")
	}
	if !shouldInjectPlatformQuickInput(&BrowserProfile{Platform: "google", PlatformURL: "https://accounts.google.com/", Username: "alice@example.com"}) {
		t.Fatal("有平台链接和账号时应注入快捷输入")
	}
}

func TestPlatformQuickInputScriptIncludesCredentialActions(t *testing.T) {
	t.Parallel()

	script, err := renderPlatformQuickInputScript(&BrowserProfile{
		ProfileName:  "Alice Profile",
		Username:     "alice@example.com",
		Password:     "alice-pass",
		TwoFASecret:  "JBSWY3DPEHPK3PXP",
		Platform:     "google",
		PlatformName: "Google",
		PlatformURL:  "https://accounts.google.com/",
	})
	if err != nil {
		t.Fatalf("renderPlatformQuickInputScript() error = %v", err)
	}

	for _, want := range []string{
		`"username":"alice@example.com"`,
		`"password":"alice-pass"`,
		`"twoFaSecret":"JBSWY3DPEHPK3PXP"`,
		`账号`,
		`密码`,
		`2FA`,
		`fillCredential`,
		`one-time-code`,
		`input[type="password"]`,
		`"allowedHosts":["accounts.google.com","oauth.google.com","myaccount.google.com"]`,
		`hostAllowed(location.hostname)`,
	} {
		if !strings.Contains(script, want) {
			t.Fatalf("quick input script missing %q\n%s", want, script)
		}
	}
}

func TestPlatformQuickInputEventURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		raw  string
		want string
	}{
		{
			name: "frame navigated",
			raw:  `{"method":"Page.frameNavigated","params":{"frame":{"url":"https://oauth.google.com/signin/oauth/identifier"}}}`,
			want: "https://oauth.google.com/signin/oauth/identifier",
		},
		{
			name: "same document navigation",
			raw:  `{"method":"Page.navigatedWithinDocument","params":{"url":"https://accounts.google.com/v3/signin/challenge"}}`,
			want: "https://accounts.google.com/v3/signin/challenge",
		},
		{
			name: "unrelated event",
			raw:  `{"method":"Network.loadingFinished","params":{"requestId":"1"}}`,
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			var msg cdpResponse
			if err := json.Unmarshal([]byte(tt.raw), &msg); err != nil {
				t.Fatalf("unmarshal CDP event: %v", err)
			}
			if got := platformQuickInputEventURL(msg); got != tt.want {
				t.Fatalf("platformQuickInputEventURL() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestPlatformQuickInputMatchesPlatformTargetURL(t *testing.T) {
	t.Parallel()

	profile := &BrowserProfile{
		Platform:    "google",
		PlatformURL: "https://accounts.google.com/",
	}

	for _, targetURL := range []string{
		"https://accounts.google.com/v3/signin/identifier",
		"https://www.accounts.google.com/signin",
		"https://oauth.google.com/signin/oauth/identifier",
		"https://myaccount.google.com/security",
	} {
		if !platformQuickInputMatchesTargetURL(profile, targetURL) {
			t.Fatalf("platformQuickInputMatchesTargetURL(%q) = false, want true", targetURL)
		}
	}

	for _, targetURL := range []string{
		"chrome://password-manager/passwords",
		"http://127.0.0.1:19876/start-pages/376.html",
		"https://example.com/",
		"https://google.example.com/",
		"https://evil-google.com/",
		"https://mail.google.com/",
	} {
		if platformQuickInputMatchesTargetURL(profile, targetURL) {
			t.Fatalf("platformQuickInputMatchesTargetURL(%q) = true, want false", targetURL)
		}
	}
}
