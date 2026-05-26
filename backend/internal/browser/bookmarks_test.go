package browser

import (
	"ant-chrome/backend/internal/config"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEnsureDefaultBookmarksOnlyAppendsMissingItems(t *testing.T) {
	t.Parallel()

	userDataDir := t.TempDir()
	profileDir := filepath.Join(userDataDir, "Default")
	if err := os.MkdirAll(profileDir, 0o755); err != nil {
		t.Fatalf("create profile dir: %v", err)
	}

	root := newEmptyBookmarkRoot("0")
	roots := root["roots"].(map[string]interface{})
	bar := roots["bookmark_bar"].(map[string]interface{})
	bar["children"] = []interface{}{
		map[string]interface{}{
			"id":   "4",
			"name": "用户自己的书签",
			"type": "url",
			"url":  "https://user.example/",
		},
	}
	other := roots["other"].(map[string]interface{})
	other["children"] = []interface{}{
		map[string]interface{}{
			"id":   "5",
			"name": "其他文件夹已有默认书签",
			"type": "url",
			"url":  "https://existing.example/",
		},
	}
	writeBookmarkRoot(t, profileDir, root)

	err := EnsureDefaultBookmarks(userDataDir, []config.BrowserBookmark{
		{Name: "已存在默认书签", URL: "https://existing.example/"},
		{Name: "新增默认书签", URL: "https://new.example/"},
		{Name: "", URL: "https://ignored-name.example/"},
		{Name: "忽略空 URL", URL: ""},
	})
	if err != nil {
		t.Fatalf("EnsureDefaultBookmarks returned error: %v", err)
	}

	updated := readBookmarkRoot(t, profileDir)
	if got := countBookmarkTargetURL(updated, "https://user.example/"); got != 1 {
		t.Fatalf("用户自己的书签目标地址不应被改动: count=%d", got)
	}
	if got := countBookmarkTargetURL(updated, "https://existing.example/"); got != 1 {
		t.Fatalf("已存在 URL 不应跨文件夹重复添加: count=%d", got)
	}
	if got := countBookmarkTargetURL(updated, "https://new.example/"); got != 1 {
		t.Fatalf("新增默认书签应追加一次: count=%d", got)
	}
	if got := countBookmarkURL(updated, "https://ignored-name.example/"); got != 0 {
		t.Fatalf("空名称书签不应写入: count=%d", got)
	}
	if !bookmarkBarHasTargetURL(updated, "https://user.example/") {
		t.Fatalf("用户自己的书签应保留在书签栏")
	}
	if !bookmarkBarHasTargetURL(updated, "https://new.example/") {
		t.Fatalf("新增默认书签应追加到书签栏")
	}
}

func TestEnsureDefaultBookmarksWritesNewTabBookmarklets(t *testing.T) {
	t.Parallel()

	userDataDir := t.TempDir()

	err := EnsureDefaultBookmarks(userDataDir, []config.BrowserBookmark{
		{Name: "新标签页打开", URL: "https://newtab.example/path?q=1"},
	})
	if err != nil {
		t.Fatalf("EnsureDefaultBookmarks returned error: %v", err)
	}

	root := readBookmarkRoot(t, filepath.Join(userDataDir, "Default"))
	rawURL := firstBookmarkRawURL(root, "新标签页打开")
	if rawURL == "https://newtab.example/path?q=1" {
		t.Fatalf("default bookmark should not overwrite the current tab with raw URL")
	}
	if !strings.HasPrefix(rawURL, "javascript:") {
		t.Fatalf("default bookmark should be a new-tab bookmarklet, got %q", rawURL)
	}
	if !strings.Contains(rawURL, "window.open") || !strings.Contains(rawURL, "https://newtab.example/path?q=1") || !strings.Contains(rawURL, "_blank") {
		t.Fatalf("bookmarklet should open the configured URL in a new tab, got %q", rawURL)
	}
}

func TestEnsureDefaultBookmarksMigratesExistingRawDefaultBookmarkToNewTab(t *testing.T) {
	t.Parallel()

	userDataDir := t.TempDir()
	profileDir := filepath.Join(userDataDir, "Default")
	if err := os.MkdirAll(profileDir, 0o755); err != nil {
		t.Fatalf("create profile dir: %v", err)
	}

	root := newEmptyBookmarkRoot("0")
	roots := root["roots"].(map[string]interface{})
	bar := roots["bookmark_bar"].(map[string]interface{})
	bar["children"] = []interface{}{
		map[string]interface{}{
			"id":   "4",
			"name": "已有默认书签",
			"type": "url",
			"url":  "https://existing.example/",
		},
	}
	writeBookmarkRoot(t, profileDir, root)

	err := EnsureDefaultBookmarks(userDataDir, []config.BrowserBookmark{
		{Name: "已有默认书签", URL: "https://existing.example/"},
	})
	if err != nil {
		t.Fatalf("EnsureDefaultBookmarks returned error: %v", err)
	}

	updated := readBookmarkRoot(t, profileDir)
	if got := countBookmarkURL(updated, "https://existing.example/"); got != 0 {
		t.Fatalf("raw default bookmark should be migrated away from current-tab opening, count=%d", got)
	}
	rawURL := firstBookmarkRawURL(updated, "已有默认书签")
	if !strings.HasPrefix(rawURL, "javascript:") || !strings.Contains(rawURL, "window.open") {
		t.Fatalf("existing default bookmark should open in a new tab, got %q", rawURL)
	}
}

func TestEnsureDefaultBookmarksMigratesExistingUserBookmarksToNewTab(t *testing.T) {
	t.Parallel()

	userDataDir := t.TempDir()
	profileDir := filepath.Join(userDataDir, "Default")
	if err := os.MkdirAll(profileDir, 0o755); err != nil {
		t.Fatalf("create profile dir: %v", err)
	}

	root := newEmptyBookmarkRoot("0")
	roots := root["roots"].(map[string]interface{})
	bar := roots["bookmark_bar"].(map[string]interface{})
	bar["children"] = []interface{}{
		map[string]interface{}{
			"id":   "4",
			"name": "用户自己的书签",
			"type": "url",
			"url":  "https://user.example/",
		},
	}
	writeBookmarkRoot(t, profileDir, root)

	err := EnsureDefaultBookmarks(userDataDir, []config.BrowserBookmark{
		{Name: "默认书签", URL: "https://default.example/"},
	})
	if err != nil {
		t.Fatalf("EnsureDefaultBookmarks returned error: %v", err)
	}

	updated := readBookmarkRoot(t, profileDir)
	rawURL := firstBookmarkRawURL(updated, "用户自己的书签")
	if rawURL == "https://user.example/" {
		t.Fatalf("existing user bookmark should not keep current-tab raw URL")
	}
	if !strings.HasPrefix(rawURL, "javascript:") || !strings.Contains(rawURL, "window.open") {
		t.Fatalf("existing user bookmark should open in a new tab, got %q", rawURL)
	}
	if got := countBookmarkTargetURL(updated, "https://user.example/"); got != 1 {
		t.Fatalf("existing user bookmark target should remain once, count=%d", got)
	}
}

func TestEnsureDefaultBookmarksDoesNotRewriteWhenNothingMissing(t *testing.T) {
	t.Parallel()

	userDataDir := t.TempDir()
	profileDir := filepath.Join(userDataDir, "Default")
	if err := os.MkdirAll(profileDir, 0o755); err != nil {
		t.Fatalf("create profile dir: %v", err)
	}

	root := newEmptyBookmarkRoot("0")
	roots := root["roots"].(map[string]interface{})
	bar := roots["bookmark_bar"].(map[string]interface{})
	bar["date_modified"] = "unchanged"
	bar["children"] = []interface{}{
		map[string]interface{}{
			"id":   "4",
			"name": "已有默认书签",
			"type": "url",
			"url":  bookmarkNewTabURL("https://existing.example/"),
		},
	}
	writeBookmarkRoot(t, profileDir, root)
	before, err := os.ReadFile(filepath.Join(profileDir, "Bookmarks"))
	if err != nil {
		t.Fatalf("read before: %v", err)
	}

	err = EnsureDefaultBookmarks(userDataDir, []config.BrowserBookmark{
		{Name: "已有默认书签", URL: "https://existing.example/"},
	})
	if err != nil {
		t.Fatalf("EnsureDefaultBookmarks returned error: %v", err)
	}
	after, err := os.ReadFile(filepath.Join(profileDir, "Bookmarks"))
	if err != nil {
		t.Fatalf("read after: %v", err)
	}
	if string(after) != string(before) {
		t.Fatalf("没有新增项时不应重写用户书签文件")
	}
}

func writeBookmarkRoot(t *testing.T, profileDir string, root map[string]interface{}) {
	t.Helper()
	data, err := json.MarshalIndent(root, "", "   ")
	if err != nil {
		t.Fatalf("marshal bookmarks: %v", err)
	}
	if err := os.WriteFile(filepath.Join(profileDir, "Bookmarks"), data, 0o644); err != nil {
		t.Fatalf("write bookmarks: %v", err)
	}
}

func readBookmarkRoot(t *testing.T, profileDir string) map[string]interface{} {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(profileDir, "Bookmarks"))
	if err != nil {
		t.Fatalf("read bookmarks: %v", err)
	}
	var root map[string]interface{}
	if err := json.Unmarshal(data, &root); err != nil {
		t.Fatalf("unmarshal bookmarks: %v", err)
	}
	return root
}

func countBookmarkURL(root map[string]interface{}, url string) int {
	count := 0
	roots, ok := root["roots"].(map[string]interface{})
	if !ok {
		return count
	}
	for _, item := range roots {
		folder, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		if children, ok := folder["children"].([]interface{}); ok {
			count += countURLInNodes(children, url)
		}
	}
	return count
}

func countBookmarkTargetURL(root map[string]interface{}, url string) int {
	count := 0
	roots, ok := root["roots"].(map[string]interface{})
	if !ok {
		return count
	}
	for _, item := range roots {
		folder, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		if children, ok := folder["children"].([]interface{}); ok {
			count += countTargetURLInNodes(children, url)
		}
	}
	return count
}

func countURLInNodes(nodes []interface{}, url string) int {
	count := 0
	for _, item := range nodes {
		node, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		if node["type"] == "url" && node["url"] == url {
			count++
		}
		if children, ok := node["children"].([]interface{}); ok {
			count += countURLInNodes(children, url)
		}
	}
	return count
}

func countTargetURLInNodes(nodes []interface{}, url string) int {
	count := 0
	for _, item := range nodes {
		node, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		if node["type"] == "url" {
			if rawURL, ok := node["url"].(string); ok && bookmarkTargetURL(rawURL) == url {
				count++
			}
		}
		if children, ok := node["children"].([]interface{}); ok {
			count += countTargetURLInNodes(children, url)
		}
	}
	return count
}

func bookmarkBarHasURL(root map[string]interface{}, url string) bool {
	roots, ok := root["roots"].(map[string]interface{})
	if !ok {
		return false
	}
	bar, ok := roots["bookmark_bar"].(map[string]interface{})
	if !ok {
		return false
	}
	children, ok := bar["children"].([]interface{})
	return ok && countURLInNodes(children, url) > 0
}

func bookmarkBarHasTargetURL(root map[string]interface{}, url string) bool {
	roots, ok := root["roots"].(map[string]interface{})
	if !ok {
		return false
	}
	bar, ok := roots["bookmark_bar"].(map[string]interface{})
	if !ok {
		return false
	}
	children, ok := bar["children"].([]interface{})
	return ok && countTargetURLInNodes(children, url) > 0
}

func firstBookmarkRawURL(root map[string]interface{}, name string) string {
	roots, ok := root["roots"].(map[string]interface{})
	if !ok {
		return ""
	}
	for _, item := range roots {
		folder, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		if children, ok := folder["children"].([]interface{}); ok {
			if value := firstRawURLInNodes(children, name); value != "" {
				return value
			}
		}
	}
	return ""
}

func firstRawURLInNodes(nodes []interface{}, name string) string {
	for _, item := range nodes {
		node, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		if node["type"] == "url" && node["name"] == name {
			if url, ok := node["url"].(string); ok {
				return url
			}
		}
		if children, ok := node["children"].([]interface{}); ok {
			if value := firstRawURLInNodes(children, name); value != "" {
				return value
			}
		}
	}
	return ""
}
