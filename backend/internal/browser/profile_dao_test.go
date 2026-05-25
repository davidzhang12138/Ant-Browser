package browser

import (
	"ant-chrome/backend/internal/database"
	"path/filepath"
	"testing"
)

func TestSQLiteProfileDAOPreservesRuntimeTimestamps(t *testing.T) {
	t.Parallel()

	db, err := database.NewDB(filepath.Join(t.TempDir(), "app.db"))
	if err != nil {
		t.Fatalf("NewDB() error = %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Migrate(); err != nil {
		t.Fatalf("Migrate() error = %v", err)
	}

	dao := NewSQLiteProfileDAO(db.GetConn())
	profile := &Profile{
		ProfileId:   "profile-runtime-time",
		ProfileName: "Runtime Time",
		UserDataDir: "runtime-time",
		LastStartAt: "2026-05-24T16:55:57+08:00",
		LastStopAt:  "2026-05-24T17:05:57+08:00",
	}
	if err := dao.Upsert(profile); err != nil {
		t.Fatalf("Upsert() error = %v", err)
	}

	got, err := dao.GetById(profile.ProfileId)
	if err != nil {
		t.Fatalf("GetById() error = %v", err)
	}
	if got.LastStartAt != profile.LastStartAt || got.LastStopAt != profile.LastStopAt {
		t.Fatalf("GetById() runtime timestamps = (%q, %q), want (%q, %q)", got.LastStartAt, got.LastStopAt, profile.LastStartAt, profile.LastStopAt)
	}
	if got.ID <= 0 {
		t.Fatalf("GetById() id = %d, want positive database id", got.ID)
	}

	list, err := dao.List()
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("List() length = %d, want 1", len(list))
	}
	if list[0].LastStartAt != profile.LastStartAt || list[0].LastStopAt != profile.LastStopAt {
		t.Fatalf("List() runtime timestamps = (%q, %q), want (%q, %q)", list[0].LastStartAt, list[0].LastStopAt, profile.LastStartAt, profile.LastStopAt)
	}
	if list[0].ID != got.ID {
		t.Fatalf("List() id = %d, want %d", list[0].ID, got.ID)
	}
}
