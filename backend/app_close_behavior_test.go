package backend

import (
	"ant-chrome/backend/internal/browser"
	"ant-chrome/backend/internal/config"
	"context"
	goruntime "runtime"
	"testing"
)

func TestPlatformSupportsTrayCloseFlowForOS(t *testing.T) {
	if !platformSupportsTrayCloseFlowForOS("windows") {
		t.Fatal("expected Windows to keep tray close flow enabled")
	}
	if platformSupportsTrayCloseFlowForOS("linux") {
		t.Fatal("expected Linux to skip tray close flow")
	}
}

func TestShouldBlockClose_NonWindowsDoesNotIntercept(t *testing.T) {
	if goruntime.GOOS == "windows" {
		t.Skip("Windows keeps the tray-based close confirmation flow")
	}

	app := NewApp("")
	if ShouldBlockClose(app, context.Background()) {
		t.Fatal("expected non-Windows close to proceed without interception")
	}
}

func TestShouldBlockClose_BlocksWhenBrowserInstanceIsOpen(t *testing.T) {
	app := NewApp("")
	app.browserMgr = browser.NewManager(config.DefaultConfig(), "")
	app.browserMgr.Profiles = map[string]*BrowserProfile{
		"profile-1": {
			ProfileId: "profile-1",
			Running:   true,
		},
	}

	if !ShouldBlockClose(app, nil) {
		t.Fatal("expected close to be blocked while a browser instance is open")
	}
}

func TestQuitAppOnlyBlocksWhenBrowserInstanceIsOpen(t *testing.T) {
	app := NewApp("")
	app.browserMgr = browser.NewManager(config.DefaultConfig(), "")
	app.browserMgr.Profiles = map[string]*BrowserProfile{
		"profile-1": {
			ProfileId: "profile-1",
			Running:   true,
		},
	}
	app.browserMgr.BrowserProcesses["profile-1"] = nil

	if app.QuitAppOnly() {
		t.Fatal("expected app-only quit to be blocked while a browser instance is open")
	}

	if app.forceQuit {
		t.Fatal("expected blocked app-only quit not to set forceQuit")
	}
	if app.quitMode != quitModeNone {
		t.Fatalf("expected quitModeNone, got %v", app.quitMode)
	}
	if _, ok := app.browserMgr.BrowserProcesses["profile-1"]; !ok {
		t.Fatal("expected tracked browser to remain untouched before process shutdown")
	}
	if !app.browserMgr.Profiles["profile-1"].Running {
		t.Fatal("expected app-only quit to keep running profile state intact")
	}
}

func TestForceQuitStopsTrackedBrowsers(t *testing.T) {
	app := NewApp("")
	app.browserMgr = browser.NewManager(config.DefaultConfig(), "")
	app.browserMgr.Profiles = map[string]*BrowserProfile{
		"profile-1": {
			ProfileId: "profile-1",
			Running:   true,
		},
	}
	app.browserMgr.BrowserProcesses["profile-1"] = nil

	app.ForceQuit()

	if !app.forceQuit {
		t.Fatal("expected ForceQuit to set forceQuit")
	}
	if app.quitMode != quitModeFull {
		t.Fatalf("expected quitModeFull, got %v", app.quitMode)
	}
	if !app.shouldStopRuntimeServicesOnShutdown() {
		t.Fatal("expected full quit to stop runtime services")
	}
	if _, ok := app.browserMgr.BrowserProcesses["profile-1"]; ok {
		t.Fatal("expected ForceQuit to clear tracked browser processes")
	}
	if app.browserMgr.Profiles["profile-1"].Running {
		t.Fatal("expected ForceQuit to mark the profile as stopped")
	}
}
