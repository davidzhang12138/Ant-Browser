package backend

import (
	"ant-chrome/backend/internal/browser"
	"ant-chrome/backend/internal/config"
	"ant-chrome/backend/internal/database"
	"ant-chrome/backend/internal/launchcode"
	"ant-chrome/backend/internal/logger"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestStartupCleanupExpiredTrashRemovesLaunchCodeAndUserDataDir(t *testing.T) {
	t.Parallel()

	appRoot := t.TempDir()
	cfg := config.DefaultConfig()
	cfg.Browser.UserDataRoot = "data/profiles"

	db, err := database.NewDB(filepath.Join(appRoot, "app.db"))
	if err != nil {
		t.Fatalf("NewDB() error = %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Migrate(); err != nil {
		t.Fatalf("Migrate() error = %v", err)
	}

	profileID := "expired-trash-startup"
	profileDAO := browser.NewSQLiteProfileDAO(db.GetConn())
	profile := &browser.Profile{
		ProfileId:       profileID,
		ProfileName:     "Expired Trash Startup",
		UserDataDir:     profileID,
		FingerprintArgs: []string{},
		LaunchArgs:      []string{},
		Tags:            []string{},
		Keywords:        []string{},
		CreatedAt:       time.Now().UTC().Format(time.RFC3339),
		UpdatedAt:       time.Now().UTC().Format(time.RFC3339),
	}
	if err := profileDAO.Upsert(profile); err != nil {
		t.Fatalf("Upsert(profile) error = %v", err)
	}
	now := time.Now().UTC()
	if err := profileDAO.MarkDeleted(profileID, now.Add(-31*24*time.Hour).Format(time.RFC3339), now.Add(-time.Hour).Format(time.RFC3339)); err != nil {
		t.Fatalf("MarkDeleted() error = %v", err)
	}

	dataDir := filepath.Join(appRoot, cfg.Browser.UserDataRoot, profileID)
	if err := os.MkdirAll(filepath.Join(dataDir, "Default"), 0o755); err != nil {
		t.Fatalf("MkdirAll(dataDir) error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(dataDir, "Default", "Preferences"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("WriteFile(Preferences) error = %v", err)
	}

	launchDAO := launchcode.NewSQLiteLaunchCodeDAO(db.GetConn())
	if err := launchDAO.Upsert(profileID, "TRASH01"); err != nil {
		t.Fatalf("Upsert(launch code) error = %v", err)
	}

	app := NewApp(appRoot)
	app.config = cfg
	app.db = db
	app.startupInitManagers(cfg, db)
	app.startupInitLaunchCode(logger.New("Test"))

	if _, err := profileDAO.GetAnyById(profileID); err == nil {
		t.Fatalf("expired trash profile still exists after startup cleanup")
	}
	if _, err := os.Stat(dataDir); !os.IsNotExist(err) {
		t.Fatalf("expired trash user data dir should be removed, stat err = %v", err)
	}
	if _, err := launchDAO.FindProfileId("TRASH01"); err == nil {
		t.Fatalf("expired trash launch code still exists after startup cleanup")
	}
}
