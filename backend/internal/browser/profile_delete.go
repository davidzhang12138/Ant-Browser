package browser

import (
	"ant-chrome/backend/internal/logger"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const trashRetention = 30 * 24 * time.Hour

// Delete 删除配置
func (m *Manager) Delete(profileId string) error {
	return m.DeleteWithOptions(profileId, false)
}

// DeleteWithOptions 删除配置。skipTrash=true 时彻底删除实例与用户数据目录。
func (m *Manager) DeleteWithOptions(profileId string, skipTrash bool) error {
	if skipTrash {
		return m.DeleteForever(profileId)
	}

	log := logger.New("Browser")
	m.InitData()
	m.Mutex.Lock()
	defer m.Mutex.Unlock()

	profile, exists := m.Profiles[profileId]
	if !exists {
		log.Error("浏览器配置不存在", logger.F("profile_id", profileId))
		return fmt.Errorf("profile not found")
	}
	nowTime := time.Now().UTC()
	now := nowTime.Format(time.RFC3339)
	deleteAfter := nowTime.Add(trashRetention).Format(time.RFC3339)

	delete(m.Profiles, profileId)
	profile.DeletedAt = now
	profile.DeleteAfterAt = deleteAfter
	log.Info("浏览器配置移入回收站", logger.F("profile_id", profileId), logger.F("delete_after_at", deleteAfter))

	if m.ProfileDAO != nil {
		if err := m.ProfileDAO.MarkDeleted(profileId, now, deleteAfter); err != nil {
			log.Error("数据库移入回收站失败", logger.F("profile_id", profileId), logger.F("error", err))
			m.Profiles[profileId] = profile
			return err
		}
	} else {
		if err := m.SaveProfiles(); err != nil {
			return err
		}
	}

	if m.CodeProvider != nil {
		_ = m.CodeProvider.Remove(profileId)
	}
	return nil
}

// TrashList 获取回收站列表
func (m *Manager) TrashList() []Profile {
	log := logger.New("Browser")
	if _, err := m.CleanupExpiredTrash(time.Now().UTC()); err != nil {
		log.Warn("清理过期回收站失败", logger.F("error", err))
	}
	if m.ProfileDAO == nil {
		return nil
	}
	profiles, err := m.ProfileDAO.ListTrash()
	if err != nil {
		log.Error("查询回收站失败", logger.F("error", err))
		return nil
	}
	list := make([]Profile, 0, len(profiles))
	for _, profile := range profiles {
		p := *profile
		p.Username = ResolveProfileUsername(p.Username, p.ProfileName)
		list = append(list, p)
	}
	return list
}

// Restore 从回收站恢复实例
func (m *Manager) Restore(profileId string) (*Profile, error) {
	log := logger.New("Browser")
	m.InitData()
	m.Mutex.Lock()
	defer m.Mutex.Unlock()

	if m.ProfileDAO == nil {
		return nil, fmt.Errorf("trash is not supported")
	}
	profile, err := m.ProfileDAO.GetAnyById(profileId)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(profile.DeletedAt) == "" {
		return nil, fmt.Errorf("profile is not in trash")
	}
	if err := m.ProfileDAO.Restore(profileId); err != nil {
		log.Error("恢复实例失败", logger.F("profile_id", profileId), logger.F("error", err))
		return nil, err
	}
	profile.DeletedAt = ""
	profile.DeleteAfterAt = ""
	m.Profiles[profileId] = profile
	return profile, nil
}

// DeleteForever 彻底删除实例配置、LaunchCode 和用户数据目录。
func (m *Manager) DeleteForever(profileId string) error {
	log := logger.New("Browser")
	m.InitData()
	m.Mutex.Lock()
	defer m.Mutex.Unlock()

	profile, exists := m.Profiles[profileId]
	if !exists && m.ProfileDAO != nil {
		if found, err := m.ProfileDAO.GetAnyById(profileId); err == nil {
			profile = found
			exists = true
		}
	}
	if !exists || profile == nil {
		log.Error("浏览器配置不存在", logger.F("profile_id", profileId))
		return fmt.Errorf("profile not found")
	}

	if err := m.removeProfileUserDataDir(profile); err != nil {
		log.Error("删除实例用户数据目录失败", logger.F("profile_id", profileId), logger.F("error", err))
		return err
	}

	delete(m.Profiles, profileId)
	if m.ProfileDAO != nil {
		if err := m.ProfileDAO.Delete(profileId); err != nil {
			log.Error("数据库彻底删除实例失败", logger.F("profile_id", profileId), logger.F("error", err))
			return err
		}
	} else {
		if err := m.SaveProfiles(); err != nil {
			return err
		}
	}

	if m.CodeProvider != nil {
		_ = m.CodeProvider.Remove(profileId)
	}
	log.Info("浏览器配置彻底删除", logger.F("profile_id", profileId))
	return nil
}

// CleanupExpiredTrash 清理达到保留期限的回收站实例。
func (m *Manager) CleanupExpiredTrash(now time.Time) (int, error) {
	if m.ProfileDAO == nil {
		return 0, nil
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	trash, err := m.ProfileDAO.ListTrash()
	if err != nil {
		return 0, err
	}
	removed := 0
	for _, profile := range trash {
		deleteAfter, err := time.Parse(time.RFC3339, strings.TrimSpace(profile.DeleteAfterAt))
		if err != nil || deleteAfter.After(now) {
			continue
		}
		if err := m.DeleteForever(profile.ProfileId); err != nil {
			return removed, err
		}
		removed++
	}
	return removed, nil
}

func (m *Manager) removeProfileUserDataDir(profile *Profile) error {
	dir := filepath.Clean(m.ResolveUserDataDir(profile))
	if err := m.validateUserDataDirForRemoval(profile, dir); err != nil {
		return err
	}
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return nil
	} else if err != nil {
		return err
	}
	return os.RemoveAll(dir)
}

func (m *Manager) validateUserDataDirForRemoval(profile *Profile, dir string) error {
	if profile == nil {
		return fmt.Errorf("profile is nil")
	}
	if strings.TrimSpace(dir) == "" || dir == "." || dir == string(filepath.Separator) {
		return fmt.Errorf("unsafe user data dir: %s", dir)
	}
	if appRoot := filepath.Clean(m.AppRoot); appRoot != "." && dir == appRoot {
		return fmt.Errorf("refuse to remove app root as user data dir: %s", dir)
	}
	root := strings.TrimSpace(m.Config.Browser.UserDataRoot)
	if root == "" {
		root = "data"
	}
	root = filepath.Clean(m.ResolveRelativePath(root))
	if dir == root {
		return fmt.Errorf("refuse to remove user data root: %s", dir)
	}
	return nil
}
