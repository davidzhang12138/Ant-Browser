package backend

import (
	"ant-chrome/backend/internal/browser"
	"ant-chrome/backend/internal/config"
	"testing"
)

type proxyUsageProxyDAOStub struct {
	list    []browser.Proxy
	deleted []string
}

func (d *proxyUsageProxyDAOStub) List() ([]browser.Proxy, error) {
	return append([]browser.Proxy{}, d.list...), nil
}

func (d *proxyUsageProxyDAOStub) ListByGroup(groupName string) ([]browser.Proxy, error) {
	var result []browser.Proxy
	for _, item := range d.list {
		if item.GroupName == groupName {
			result = append(result, item)
		}
	}
	return result, nil
}

func (d *proxyUsageProxyDAOStub) ListGroups() ([]string, error) {
	return nil, nil
}

func (d *proxyUsageProxyDAOStub) Upsert(proxy browser.Proxy) error {
	d.list = append(d.list, proxy)
	return nil
}

func (d *proxyUsageProxyDAOStub) Delete(proxyId string) error {
	d.deleted = append(d.deleted, proxyId)
	next := d.list[:0]
	for _, item := range d.list {
		if item.ProxyId != proxyId {
			next = append(next, item)
		}
	}
	d.list = next
	return nil
}

func (d *proxyUsageProxyDAOStub) DeleteAll() error {
	d.list = nil
	return nil
}

func (d *proxyUsageProxyDAOStub) UpdateSpeedResult(proxyId string, ok bool, latencyMs int64, testedAt string) error {
	return nil
}

func (d *proxyUsageProxyDAOStub) UpdateIPHealthResult(proxyId string, healthJSON string) error {
	return nil
}

type proxyUsageProfileDAOStub struct {
	list []*browser.Profile
}

func (d *proxyUsageProfileDAOStub) List() ([]*browser.Profile, error) {
	return append([]*browser.Profile{}, d.list...), nil
}

func (d *proxyUsageProfileDAOStub) ListTrash() ([]*browser.Profile, error) {
	return nil, nil
}

func (d *proxyUsageProfileDAOStub) GetById(profileId string) (*browser.Profile, error) {
	return nil, nil
}

func (d *proxyUsageProfileDAOStub) GetAnyById(profileId string) (*browser.Profile, error) {
	return nil, nil
}

func (d *proxyUsageProfileDAOStub) Upsert(profile *browser.Profile) error {
	d.list = append(d.list, profile)
	return nil
}

func (d *proxyUsageProfileDAOStub) MarkDeleted(profileId string, deletedAt string, deleteAfterAt string) error {
	return nil
}

func (d *proxyUsageProfileDAOStub) Restore(profileId string) error {
	return nil
}

func (d *proxyUsageProfileDAOStub) Delete(profileId string) error {
	return nil
}

func newProxyUsageTestApp(proxyDAO *proxyUsageProxyDAOStub, profileDAO *proxyUsageProfileDAOStub) *App {
	cfg := config.DefaultConfig()
	app := NewApp("")
	app.config = cfg
	app.browserMgr = browser.NewManager(cfg, "")
	app.browserMgr.ProxyDAO = proxyDAO
	app.browserMgr.ProfileDAO = profileDAO
	return app
}

func TestBrowserProxyListIncludesActiveInstanceCount(t *testing.T) {
	app := newProxyUsageTestApp(
		&proxyUsageProxyDAOStub{list: []browser.Proxy{
			{ProxyId: "__direct__", ProxyName: "直连（不走代理）", ProxyConfig: "direct://"},
			{ProxyId: "proxy-a", ProxyName: "Proxy A", ProxyConfig: "http://127.0.0.1:18080"},
			{ProxyId: "proxy-b", ProxyName: "Proxy B", ProxyConfig: "socks5://127.0.0.1:1080"},
		}},
		&proxyUsageProfileDAOStub{list: []*browser.Profile{
			{ProfileId: "profile-1", ProxyId: "proxy-a"},
			{ProfileId: "profile-2", ProxyId: "proxy-a"},
			{ProfileId: "profile-3", ProxyId: "__direct__"},
		}},
	)

	proxies := app.BrowserProxyList()
	counts := map[string]int{}
	for _, item := range proxies {
		counts[item.ProxyId] = item.InstanceCount
	}

	if counts["proxy-a"] != 2 {
		t.Fatalf("proxy-a instance count = %d, want 2", counts["proxy-a"])
	}
	if counts["proxy-b"] != 0 {
		t.Fatalf("proxy-b instance count = %d, want 0", counts["proxy-b"])
	}
	if counts["__direct__"] != 1 {
		t.Fatalf("direct instance count = %d, want 1", counts["__direct__"])
	}
}

func TestBrowserProxyCleanupUnusedDeletesOnlyUnusedNonBuiltinProxies(t *testing.T) {
	proxyDAO := &proxyUsageProxyDAOStub{list: []browser.Proxy{
		{ProxyId: "__direct__", ProxyName: "直连（不走代理）", ProxyConfig: "direct://"},
		{ProxyId: "proxy-used", ProxyName: "Used", ProxyConfig: "http://127.0.0.1:18080"},
		{ProxyId: "proxy-unused", ProxyName: "Unused", ProxyConfig: "socks5://127.0.0.1:1080"},
	}}
	app := newProxyUsageTestApp(
		proxyDAO,
		&proxyUsageProfileDAOStub{list: []*browser.Profile{
			{ProfileId: "profile-1", ProxyId: "proxy-used"},
		}},
	)

	result, err := app.BrowserProxyCleanupUnused()
	if err != nil {
		t.Fatalf("BrowserProxyCleanupUnused() error = %v", err)
	}
	if result.DeletedCount != 1 {
		t.Fatalf("deleted count = %d, want 1", result.DeletedCount)
	}
	if len(result.DeletedProxyIds) != 1 || result.DeletedProxyIds[0] != "proxy-unused" {
		t.Fatalf("deleted proxy ids = %+v, want [proxy-unused]", result.DeletedProxyIds)
	}
	if len(proxyDAO.deleted) != 1 || proxyDAO.deleted[0] != "proxy-unused" {
		t.Fatalf("dao deleted = %+v, want [proxy-unused]", proxyDAO.deleted)
	}
	remaining := map[string]bool{}
	for _, item := range proxyDAO.list {
		remaining[item.ProxyId] = true
	}
	if !remaining["__direct__"] || !remaining["proxy-used"] || remaining["proxy-unused"] {
		t.Fatalf("remaining proxies = %+v", remaining)
	}
}
