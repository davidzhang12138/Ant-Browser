package browser

import (
	"ant-chrome/backend/internal/config"
	"ant-chrome/backend/internal/database"
	"path/filepath"
	"testing"
)

func TestManagerCreateHydratesDatabaseID(t *testing.T) {
	t.Parallel()

	db, err := database.NewDB(filepath.Join(t.TempDir(), "app.db"))
	if err != nil {
		t.Fatalf("NewDB() error = %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Migrate(); err != nil {
		t.Fatalf("Migrate() error = %v", err)
	}

	manager := NewManager(&config.Config{}, t.TempDir())
	manager.ProfileDAO = NewSQLiteProfileDAO(db.GetConn())

	first, err := manager.Create(ProfileInput{ProfileName: "first", UserDataDir: "first"})
	if err != nil {
		t.Fatalf("Create(first) error = %v", err)
	}
	second, err := manager.Create(ProfileInput{ProfileName: "second", UserDataDir: "second"})
	if err != nil {
		t.Fatalf("Create(second) error = %v", err)
	}

	if first.ID <= 0 || second.ID <= 0 {
		t.Fatalf("created profile IDs = (%d, %d), want positive database IDs", first.ID, second.ID)
	}
	if second.ID <= first.ID {
		t.Fatalf("created profile IDs = (%d, %d), want increasing database IDs", first.ID, second.ID)
	}

	list := manager.List()
	ids := map[string]int64{}
	for _, profile := range list {
		ids[profile.ProfileName] = profile.ID
	}
	if ids["first"] != first.ID || ids["second"] != second.ID {
		t.Fatalf("List IDs = %+v, want first=%d second=%d", ids, first.ID, second.ID)
	}
}
