package backend

import (
	"ant-chrome/backend/internal/browser"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

func TestShouldUseBrowserStartPage(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name                 string
		startURLs            []string
		defaultStartURLs     []string
		skipDefaultStartURLs bool
		restoreLastSession   bool
		want                 bool
	}{
		{
			name: "plain launch without targets",
			want: true,
		},
		{
			name:      "explicit start urls win",
			startURLs: []string{"https://example.com"},
			want:      false,
		},
		{
			name:             "configured default urls win",
			defaultStartURLs: []string{"https://example.com"},
			want:             false,
		},
		{
			name:                 "skip default urls keeps blank launch behavior",
			skipDefaultStartURLs: true,
			want:                 false,
		},
		{
			name:               "restore session keeps chrome session behavior",
			restoreLastSession: true,
			want:               false,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := shouldUseBrowserStartPage(tt.startURLs, tt.defaultStartURLs, tt.skipDefaultStartURLs, tt.restoreLastSession)
			if got != tt.want {
				t.Fatalf("shouldUseBrowserStartPage() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestBrowserStartPageURLWritesProfileInfoPage(t *testing.T) {
	t.Parallel()

	app := NewApp(t.TempDir())
	app.browserMgr = &browser.Manager{
		GroupDAO: &startPageGroupDAOStub{
			groups: map[string]*browser.Group{
				"group-gmail": {
					GroupId:   "group-gmail",
					GroupName: "Gmail_替补",
				},
			},
		},
	}

	profile := &BrowserProfile{
		ProfileId:   "408",
		ProfileName: "tanikajoe90@gmail.com",
		GroupId:     "group-gmail",
		Tags:        []string{"Gmail", "替补"},
		ProxyConfig: "http://127.0.0.1:2260",
		LaunchCode:  "CODE408",
		LastStartAt: "2026-05-24T16:55:57+08:00",
		FingerprintArgs: []string{
			"--lang=en,en-US;q=0.9",
			"--timezone=Asia/Tokyo",
			"--user-agent=Mozilla/5.0 Test",
		},
	}

	pageURL, err := app.browserStartPageURL(profile, time.Date(2026, 5, 24, 16, 55, 57, 0, time.FixedZone("CST", 8*60*60)))
	if err != nil {
		t.Fatalf("browserStartPageURL returned error: %v", err)
	}

	parsed, err := url.Parse(pageURL)
	if err != nil {
		t.Fatalf("invalid start page URL %q: %v", pageURL, err)
	}
	if parsed.Scheme != "file" {
		t.Fatalf("start page URL scheme = %q, want file", parsed.Scheme)
	}

	content, err := os.ReadFile(parsed.Path)
	if err != nil {
		t.Fatalf("expected start page file to be readable: %v", err)
	}
	html := string(content)
	for _, want := range []string{
		"<title>408 tanikajoe90@gmail.com</title>",
		"序号:",
		"408",
		"窗口名称:",
		"tanikajoe90@gmail.com",
		"用户名:",
		"未设置2FA密钥",
		"Gmail_替补",
		"Gmail, 替补",
		"http://127.0.0.1:2260",
		"2026-05-24 16:55:57",
		"en,en-US;q=0.9",
		"Asia/Tokyo",
		"Mozilla/5.0 Test",
	} {
		if !strings.Contains(html, want) {
			t.Fatalf("start page HTML missing %q\n%s", want, html)
		}
	}
}

func TestBrowserDefaultLaunchTargetsInjectsStartPageOnlyForPlainLaunch(t *testing.T) {
	t.Parallel()

	app := NewApp(t.TempDir())
	app.config = DefaultConfig()
	app.browserMgr = &browser.Manager{}

	profile := &BrowserProfile{
		ProfileId:   "profile-408",
		ProfileName: "plain-launch",
	}
	launchTime := time.Date(2026, 5, 24, 16, 55, 57, 0, time.UTC)

	targets, err := app.browserDefaultLaunchTargets(newBrowserStartInput(profile.ProfileId, nil, nil, false, false, false, "", ""), profile, false, launchTime)
	if err != nil {
		t.Fatalf("browserDefaultLaunchTargets returned error: %v", err)
	}
	if len(targets) != 1 || !strings.HasPrefix(targets[0], "file://") {
		t.Fatalf("plain launch should use generated start page target, got %v", targets)
	}

	explicitTargets, err := app.browserDefaultLaunchTargets(newBrowserStartInput(profile.ProfileId, nil, []string{"https://example.com"}, false, false, false, "", ""), profile, false, launchTime)
	if err != nil {
		t.Fatalf("browserDefaultLaunchTargets explicit returned error: %v", err)
	}
	if len(explicitTargets) != 0 {
		t.Fatalf("explicit start URL should not inject default start page, got %v", explicitTargets)
	}

	restoreTargets, err := app.browserDefaultLaunchTargets(newBrowserStartInput(profile.ProfileId, nil, nil, false, false, false, "", ""), profile, true, launchTime)
	if err != nil {
		t.Fatalf("browserDefaultLaunchTargets restore returned error: %v", err)
	}
	if len(restoreTargets) != 0 {
		t.Fatalf("session restore should not inject default start page, got %v", restoreTargets)
	}
}

type startPageGroupDAOStub struct {
	groups map[string]*browser.Group
}

func (s *startPageGroupDAOStub) List() ([]*browser.Group, error) {
	groups := make([]*browser.Group, 0, len(s.groups))
	for _, group := range s.groups {
		groups = append(groups, group)
	}
	return groups, nil
}

func (s *startPageGroupDAOStub) GetById(groupId string) (*browser.Group, error) {
	if group, ok := s.groups[groupId]; ok {
		return group, nil
	}
	return nil, os.ErrNotExist
}

func (s *startPageGroupDAOStub) Create(input browser.GroupInput) (*browser.Group, error) {
	return nil, os.ErrPermission
}

func (s *startPageGroupDAOStub) Update(groupId string, input browser.GroupInput) (*browser.Group, error) {
	return nil, os.ErrPermission
}

func (s *startPageGroupDAOStub) Delete(groupId string) error {
	return os.ErrPermission
}

func (s *startPageGroupDAOStub) GetChildren(parentId string) ([]*browser.Group, error) {
	return nil, nil
}

func (s *startPageGroupDAOStub) MoveChildren(fromGroupId, toGroupId string) error {
	return nil
}
