package backend

import (
	"ant-chrome/backend/internal/config"
	"ant-chrome/backend/internal/logger"
	"strings"
)

func (a *App) BrowserProxyCleanupUnused() (BrowserProxyCleanupResult, error) {
	log := logger.New("Browser")
	proxies := a.proxiesForCleanup()
	counts := a.proxyInstanceCounts()
	kept := make([]BrowserProxy, 0, len(proxies))
	deletedIDs := make([]string, 0)

	for _, item := range proxies {
		proxyID := strings.TrimSpace(item.ProxyId)
		if proxyID == "" || isBuiltinProxyID(proxyID) || counts[proxyID] > 0 {
			item.InstanceCount = counts[proxyID]
			kept = append(kept, item)
			continue
		}
		deletedIDs = append(deletedIDs, proxyID)
	}

	result := BrowserProxyCleanupResult{
		DeletedCount:    len(deletedIDs),
		DeletedProxyIds: deletedIDs,
		RemainingCount:  len(kept),
	}
	if len(deletedIDs) == 0 {
		return result, nil
	}

	if a.browserMgr != nil && a.browserMgr.ProxyDAO != nil {
		for _, proxyID := range deletedIDs {
			if err := a.browserMgr.ProxyDAO.Delete(proxyID); err != nil {
				log.Error("清理未使用代理失败", logger.F("proxy_id", proxyID), logger.F("error", err))
				return result, err
			}
		}
		if a.config != nil {
			a.config.Browser.Proxies = kept
		}
		log.Info("未使用代理已清理", logger.F("count", len(deletedIDs)))
		return result, nil
	}

	if a.config != nil {
		a.config.Browser.Proxies = kept
		if err := config.SaveProxies(a.resolveAppPath("proxies.yaml"), kept); err != nil {
			log.Error("清理未使用代理保存失败", logger.F("error", err))
			return result, err
		}
	}
	log.Info("未使用代理已清理", logger.F("count", len(deletedIDs)))
	return result, nil
}

func (a *App) proxiesForCleanup() []BrowserProxy {
	if a != nil && a.browserMgr != nil && a.browserMgr.ProxyDAO != nil {
		if list, err := a.browserMgr.ProxyDAO.List(); err == nil {
			return list
		}
	}
	if a != nil && a.config != nil {
		return append([]BrowserProxy{}, a.config.Browser.Proxies...)
	}
	return nil
}

func isBuiltinProxyID(proxyID string) bool {
	return strings.TrimSpace(proxyID) == "__direct__"
}
