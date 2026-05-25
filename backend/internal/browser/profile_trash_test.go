package browser

import (
	"ant-chrome/backend/internal/config"
	"ant-chrome/backend/internal/database"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func newProfileTrashTestManager(t *testing.T) (*Manager, *SQLiteProfileDAO) {
	t.Helper()

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

	dao := NewSQLiteProfileDAO(db.GetConn())
	mgr := NewManager(cfg, appRoot)
	mgr.ProfileDAO = dao
	return mgr, dao
}

func createProfileWithDataDir(t *testing.T, mgr *Manager, profileId string) *Profile {
	t.Helper()

	profile := &Profile{
		ProfileId:   profileId,
		ProfileName: "Profile " + profileId,
		UserDataDir: profileId,
		CreatedAt:   time.Now().Format(time.RFC3339),
		UpdatedAt:   time.Now().Format(time.RFC3339),
		LaunchArgs:  []string{},
		Tags:        []string{},
		Keywords:    []string{},
		IconColor:   "#2563EB",
		FingerprintArgs: []string{
			"--user-agent=Mozilla/5.0 Test",
		},
	}
	if err := mgr.ProfileDAO.Upsert(profile); err != nil {
		t.Fatalf("Upsert() error = %v", err)
	}
	dataDir := mgr.ResolveUserDataDir(profile)
	if err := os.MkdirAll(filepath.Join(dataDir, "Default"), 0o755); err != nil {
		t.Fatalf("MkdirAll(%q) error = %v", dataDir, err)
	}
	if err := os.WriteFile(filepath.Join(dataDir, "Default", "Preferences"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	return profile
}

func TestProfileDeleteMovesToTrashAndKeepsUserDataDir(t *testing.T) {
	t.Parallel()

	mgr, dao := newProfileTrashTestManager(t)
	profile := createProfileWithDataDir(t, mgr, "trash-default")
	dataDir := mgr.ResolveUserDataDir(profile)

	if err := mgr.Delete(profile.ProfileId); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}

	if _, err := os.Stat(filepath.Join(dataDir, "Default", "Preferences")); err != nil {
		t.Fatalf("default delete should keep user data dir: %v", err)
	}
	if got := mgr.List(); len(got) != 0 {
		t.Fatalf("List() length = %d, want 0 active profiles", len(got))
	}
	trash, err := dao.ListTrash()
	if err != nil {
		t.Fatalf("ListTrash() error = %v", err)
	}
	if len(trash) != 1 {
		t.Fatalf("ListTrash() length = %d, want 1", len(trash))
	}
	if trash[0].DeletedAt == "" || trash[0].DeleteAfterAt == "" {
		t.Fatalf("trash timestamps missing: deletedAt=%q deleteAfterAt=%q", trash[0].DeletedAt, trash[0].DeleteAfterAt)
	}
	deletedAt, err := time.Parse(time.RFC3339, trash[0].DeletedAt)
	if err != nil {
		t.Fatalf("DeletedAt parse error = %v", err)
	}
	deleteAfterAt, err := time.Parse(time.RFC3339, trash[0].DeleteAfterAt)
	if err != nil {
		t.Fatalf("DeleteAfterAt parse error = %v", err)
	}
	if got := deleteAfterAt.Sub(deletedAt); got != 30*24*time.Hour {
		t.Fatalf("trash retention = %v, want 720h", got)
	}
}

func TestProfileRestoreReturnsTrashProfileToActiveList(t *testing.T) {
	t.Parallel()

	mgr, dao := newProfileTrashTestManager(t)
	profile := createProfileWithDataDir(t, mgr, "trash-restore")

	if err := mgr.Delete(profile.ProfileId); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	restored, err := mgr.Restore(profile.ProfileId)
	if err != nil {
		t.Fatalf("Restore() error = %v", err)
	}
	if restored.ProfileId != profile.ProfileId {
		t.Fatalf("Restore() profileId = %q, want %q", restored.ProfileId, profile.ProfileId)
	}
	if got := mgr.List(); len(got) != 1 || got[0].ProfileId != profile.ProfileId {
		t.Fatalf("List() after restore = %#v, want restored profile", got)
	}
	trash, err := dao.ListTrash()
	if err != nil {
		t.Fatalf("ListTrash() error = %v", err)
	}
	if len(trash) != 0 {
		t.Fatalf("ListTrash() length = %d, want 0", len(trash))
	}
}

func TestProfileTrashListDoesNotRecreateRemovedLaunchCode(t *testing.T) {
	t.Parallel()

	mgr, _ := newProfileTrashTestManager(t)
	codeProvider := &trashCodeProvider{codes: map[string]string{"trash-no-code": "CODE1"}}
	mgr.CodeProvider = codeProvider
	profile := createProfileWithDataDir(t, mgr, "trash-no-code")

	if err := mgr.Delete(profile.ProfileId); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if !codeProvider.removed[profile.ProfileId] {
		t.Fatalf("Delete() did not remove launch code for %q", profile.ProfileId)
	}

	trash := mgr.TrashList()
	if len(trash) != 1 {
		t.Fatalf("TrashList() length = %d, want 1", len(trash))
	}
	if trash[0].LaunchCode != "" {
		t.Fatalf("TrashList() launchCode = %q, want empty", trash[0].LaunchCode)
	}
	if codeProvider.codes[profile.ProfileId] != "" {
		t.Fatalf("TrashList() recreated launch code %q for trashed profile", codeProvider.codes[profile.ProfileId])
	}
}

func TestProfileDeleteForeverRemovesRecordLaunchCodeAndUserDataDir(t *testing.T) {
	t.Parallel()

	mgr, dao := newProfileTrashTestManager(t)
	codeProvider := &trashCodeProvider{codes: map[string]string{"trash-forever": "CODE1"}}
	mgr.CodeProvider = codeProvider
	profile := createProfileWithDataDir(t, mgr, "trash-forever")
	dataDir := mgr.ResolveUserDataDir(profile)

	if err := mgr.DeleteForever(profile.ProfileId); err != nil {
		t.Fatalf("DeleteForever() error = %v", err)
	}

	if _, err := os.Stat(dataDir); !os.IsNotExist(err) {
		t.Fatalf("user data dir should be removed, stat err = %v", err)
	}
	if _, err := dao.GetById(profile.ProfileId); err == nil {
		t.Fatalf("GetById() after DeleteForever succeeded, want missing profile")
	}
	if !codeProvider.removed[profile.ProfileId] {
		t.Fatalf("launch code was not removed for %q", profile.ProfileId)
	}
}

func TestProfileCleanupExpiredTrashDeletesOnlyExpiredDataDirs(t *testing.T) {
	t.Parallel()

	mgr, dao := newProfileTrashTestManager(t)
	expired := createProfileWithDataDir(t, mgr, "trash-expired")
	kept := createProfileWithDataDir(t, mgr, "trash-kept")
	expiredDir := mgr.ResolveUserDataDir(expired)
	keptDir := mgr.ResolveUserDataDir(kept)

	now := time.Date(2026, 5, 25, 12, 0, 0, 0, time.UTC)
	if err := dao.MarkDeleted(expired.ProfileId, now.Add(-31*24*time.Hour).Format(time.RFC3339), now.Add(-time.Hour).Format(time.RFC3339)); err != nil {
		t.Fatalf("MarkDeleted(expired) error = %v", err)
	}
	if err := dao.MarkDeleted(kept.ProfileId, now.Add(-24*time.Hour).Format(time.RFC3339), now.Add(29*24*time.Hour).Format(time.RFC3339)); err != nil {
		t.Fatalf("MarkDeleted(kept) error = %v", err)
	}

	removed, err := mgr.CleanupExpiredTrash(now)
	if err != nil {
		t.Fatalf("CleanupExpiredTrash() error = %v", err)
	}
	if removed != 1 {
		t.Fatalf("CleanupExpiredTrash() removed = %d, want 1", removed)
	}
	if _, err := os.Stat(expiredDir); !os.IsNotExist(err) {
		t.Fatalf("expired user data dir should be removed, stat err = %v", err)
	}
	if _, err := os.Stat(keptDir); err != nil {
		t.Fatalf("unexpired user data dir should be kept: %v", err)
	}
	trash, err := dao.ListTrash()
	if err != nil {
		t.Fatalf("ListTrash() error = %v", err)
	}
	if len(trash) != 1 || trash[0].ProfileId != kept.ProfileId {
		t.Fatalf("ListTrash() = %#v, want only %q", trash, kept.ProfileId)
	}
}

type trashCodeProvider struct {
	codes   map[string]string
	removed map[string]bool
}

func (p *trashCodeProvider) EnsureCode(profileId string) (string, error) {
	if p.codes == nil {
		p.codes = map[string]string{}
	}
	if code := p.codes[profileId]; code != "" {
		return code, nil
	}
	p.codes[profileId] = profileId + "-code"
	return p.codes[profileId], nil
}

func (p *trashCodeProvider) Remove(profileId string) error {
	if p.removed == nil {
		p.removed = map[string]bool{}
	}
	p.removed[profileId] = true
	delete(p.codes, profileId)
	return nil
}
