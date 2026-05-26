package database

import (
	"path/filepath"
	"testing"
)

func TestMigrateAddsTwoFAToolBookmark(t *testing.T) {
	t.Parallel()

	db, err := NewDB(filepath.Join(t.TempDir(), "app.db"))
	if err != nil {
		t.Fatalf("NewDB() error = %v", err)
	}
	defer db.Close()

	if err := db.Migrate(); err != nil {
		t.Fatalf("Migrate() error = %v", err)
	}

	var count int
	row := db.conn.QueryRow(`SELECT COUNT(*) FROM browser_bookmarks WHERE url = ?`, "http://127.0.0.1:19876/tools/2fa")
	if err := row.Scan(&count); err != nil {
		t.Fatalf("query 2FA tool bookmark: %v", err)
	}
	if count != 1 {
		t.Fatalf("2FA tool bookmark count = %d, want 1", count)
	}
}
