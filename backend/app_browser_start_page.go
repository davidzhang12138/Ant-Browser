package backend

import (
	"bytes"
	"html/template"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

type browserStartPageModel struct {
	Title       string
	ProfileID   string
	ProfileName string
	Username    string
	GroupName   string
	Tags        string
	Proxy       string
	LaunchCode  string
	StartedAt   string
	Language    string
	UserAgent   string
	Timezone    string
}

func shouldUseBrowserStartPage(startURLs []string, defaultStartURLs []string, skipDefaultStartURLs bool, restoreLastSession bool) bool {
	return len(normalizeNonEmptyStrings(startURLs)) == 0 &&
		len(normalizeNonEmptyStrings(defaultStartURLs)) == 0 &&
		!skipDefaultStartURLs &&
		!restoreLastSession
}

func (a *App) browserDefaultLaunchTargets(input browserStartInput, profile *BrowserProfile, restoreLastSession bool, launchedAt time.Time) ([]string, error) {
	defaultStartURLs := a.browserDefaultStartURLs()
	if !shouldUseBrowserStartPage(input.StartURLs, defaultStartURLs, input.SkipDefaultStartURLs, restoreLastSession) {
		return defaultStartURLs, nil
	}

	startPageURL, err := a.browserStartPageURL(profile, launchedAt)
	if err != nil {
		return defaultStartURLs, err
	}
	return []string{startPageURL}, nil
}

func (a *App) browserStartPageURL(profile *BrowserProfile, launchedAt time.Time) (string, error) {
	if profile == nil {
		return "", os.ErrInvalid
	}

	dir := a.resolveAppPath(filepath.ToSlash(filepath.Join("data", "runtime", "start-pages")))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	pagePath := filepath.Join(dir, safeStartPageFileName(profile.ProfileId)+".html")
	html, err := renderBrowserStartPageHTML(a.browserStartPageModel(profile, launchedAt))
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(pagePath, []byte(html), 0o644); err != nil {
		return "", err
	}
	return fileURLFromPath(pagePath)
}

func (a *App) browserStartPageModel(profile *BrowserProfile, launchedAt time.Time) browserStartPageModel {
	profileName := strings.TrimSpace(profile.ProfileName)
	if profileName == "" {
		profileName = strings.TrimSpace(profile.ProfileId)
	}
	startedAt := launchedAt
	if startedAt.IsZero() {
		startedAt = time.Now()
	}

	return browserStartPageModel{
		Title:       strings.TrimSpace(profile.ProfileId + " " + profileName),
		ProfileID:   strings.TrimSpace(profile.ProfileId),
		ProfileName: profileName,
		Username:    profileName,
		GroupName:   a.browserStartPageGroupName(profile),
		Tags:        strings.Join(normalizeNonEmptyStrings(profile.Tags), ", "),
		Proxy:       browserStartPageProxy(profile),
		LaunchCode:  strings.TrimSpace(profile.LaunchCode),
		StartedAt:   startedAt.Format("2006-01-02 15:04:05"),
		Language:    browserStartPageArgValue(profile.FingerprintArgs, "--lang"),
		UserAgent:   browserStartPageArgValue(append(profile.FingerprintArgs, profile.LaunchArgs...), "--user-agent"),
		Timezone:    browserStartPageArgValue(profile.FingerprintArgs, "--timezone"),
	}
}

func (a *App) browserStartPageGroupName(profile *BrowserProfile) string {
	groupID := strings.TrimSpace(profile.GroupId)
	if groupID == "" {
		return ""
	}
	if a != nil && a.browserMgr != nil && a.browserMgr.GroupDAO != nil {
		if group, err := a.browserMgr.GroupDAO.GetById(groupID); err == nil && group != nil {
			if name := strings.TrimSpace(group.GroupName); name != "" {
				return name
			}
		}
	}
	return groupID
}

func browserStartPageProxy(profile *BrowserProfile) string {
	if profile == nil {
		return ""
	}
	if value := strings.TrimSpace(profile.ProxyConfig); value != "" {
		return value
	}
	if value := strings.TrimSpace(profile.ProxyBindName); value != "" {
		return value
	}
	return strings.TrimSpace(profile.ProxyId)
}

func browserStartPageArgValue(args []string, key string) string {
	prefix := key + "="
	for _, arg := range args {
		value := strings.TrimSpace(arg)
		if strings.HasPrefix(value, prefix) {
			return strings.TrimSpace(strings.TrimPrefix(value, prefix))
		}
	}
	return ""
}

func safeStartPageFileName(profileID string) string {
	value := strings.TrimSpace(profileID)
	if value == "" {
		return "profile"
	}
	var b strings.Builder
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '-', r == '_', r == '.':
			b.WriteRune(r)
		default:
			b.WriteByte('_')
		}
	}
	if b.Len() == 0 {
		return "profile"
	}
	return b.String()
}

func fileURLFromPath(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	slashPath := filepath.ToSlash(abs)
	if runtime.GOOS == "windows" && !strings.HasPrefix(slashPath, "/") {
		slashPath = "/" + slashPath
	}
	return (&url.URL{Scheme: "file", Path: slashPath}).String(), nil
}

func renderBrowserStartPageHTML(model browserStartPageModel) (string, error) {
	if strings.TrimSpace(model.Title) == "" {
		model.Title = "Ant Browser"
	}
	var buf bytes.Buffer
	if err := browserStartPageTemplate.Execute(&buf, model); err != nil {
		return "", err
	}
	return buf.String(), nil
}

var browserStartPageTemplate = template.Must(template.New("browser-start-page").Parse(`<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="icon" href="data:image/ico;base64,aWNv">
  <title>{{.Title}}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-size:9pt}
    body{font-family:Helvetica Neue,Helvetica,Microsoft YaHei,PingFang SC,Hiragino Sans GB,Arial,sans-serif;background:#f0f4fa;color:#585a6f}
    .open-info .box{width:720px;max-width:95%;margin:10px auto;background:#fff;box-shadow:0 0 10px rgba(0,0,0,.28)}
    .open-ip{position:relative;text-align:center;color:#fff;background:#8eb7c6}
    .open-ip .ip{min-height:98px;padding:36px 10px 20px;font-size:52px;font-weight:300;line-height:1.05;word-break:break-word}
    .open-ip .ip .ip-fail{font-size:14px}
    .ping{padding:5px 10px 10px;text-align:center}
    .ping a{display:inline-block;margin:0 3px;padding:0 2px;border-radius:2px;color:#fff;text-decoration:none}
    .ping a::before{display:inline-block;width:6px;height:6px;margin-right:2px;border-radius:50%;background:#bec5ff;content:"";vertical-align:middle}
    .ping a.success::before{background:#05ff05}.ping a.fail::before{background:#ff3f3f}
    .locales{padding:16px 10px 10px;border-top:1px solid hsla(0,0%,100%,.2);background:rgba(0,0,0,.2);box-shadow:0 -15px 15px hsla(0,0%,100%,.1)}
    .locales span{display:inline-block;margin:0 10px;color:#ccc}.locales i{color:#fff;font-style:normal;font-weight:600;font-size:14px}
    .content{padding:20px}
    .row-left{overflow:hidden;padding:10px;line-height:32px}
    .row-left .bd{float:left;width:95px;padding-right:10px;text-align:right;color:#999}
    .row-left .hd{min-height:32px;margin-left:110px;padding:4px 10px;border-bottom:1px solid #eee;font-size:14px;line-height:24px;word-break:break-word}
    .row-left .hd .no-re{color:#ccc;font-style:italic}
    .copy{display:inline-flex;margin-left:8px;padding:0 8px;border:1px solid #d8deea;border-radius:3px;background:#f7f9fd;color:#64748b;cursor:pointer}
    .version{text-align:center;color:#aaa;padding:8px}
    #toast-container{position:fixed;top:20px;right:20px;z-index:9999}
    .toast{min-width:250px;margin-bottom:10px;padding:15px;border:1px solid #e1f3d8;border-radius:4px;background:#f0f9eb;color:#67c23a;box-shadow:0 2px 10px rgba(0,0,0,.2);opacity:0;transform:translateX(100%);transition:all .3s ease}
    .toast.show{opacity:1;transform:translateX(0)}
    @media screen and (max-width:600px){.open-ip .ip{font-size:35px}.ping a span.all{display:none}.ping a span.first{display:inline}.row-left .bd{float:none;width:auto;text-align:left}.row-left .hd{margin-left:0}}
    @media screen and (min-width:601px){.ping a span.first{display:none}}
  </style>
</head>
<body>
<div class="open-info">
  <div class="box">
    <div class="open-ip">
      <div class="ip"><span id="ip-ip">----</span></div>
      <div class="ping">
        <a href="https://www.google.com/" target="_blank" rel="noopener noreferrer" id="ping_0"><span class="all">Google</span><span class="first">GG</span></a>
        <a href="https://www.wikipedia.org/" target="_blank" rel="noopener noreferrer" id="ping_1"><span class="all">Wikipedia</span><span class="first">Wiki</span></a>
        <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" id="ping_2"><span class="all">Facebook</span><span class="first">FB</span></a>
        <a href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer" id="ping_3"><span class="all">Tiktok</span><span class="first">Tiktok</span></a>
        <a href="https://www.amazon.com/" target="_blank" rel="noopener noreferrer" id="ping_4"><span class="all">Amazon</span><span class="first">Amz</span></a>
        <a href="https://whoer.net/" target="_blank" rel="noopener noreferrer" id="ping_5"><span class="all">Whoer</span><span class="first">Wh</span></a>
      </div>
      <div class="locales">
        <div>IP-API（仅供参考）:&nbsp;<span><i id="country"></i></span>&nbsp;/&nbsp;<span><i id="region"></i></span>&nbsp;/&nbsp;<span><i id="city"></i></span>&nbsp;/&nbsp;<span><i id="timezone"></i></span></div>
        <div style="margin-top:5px;">经纬度：<span><i id="lon">-</i></span>/<span><i id="lat">-</i></span>&nbsp;&nbsp;邮编：<span><i id="zip">-</i></span></div>
      </div>
    </div>
    <div class="content">
      <div class="row-left"><div class="bd">序号:</div><div class="hd">{{.ProfileID}}</div></div>
      <div class="row-left"><div class="bd">窗口名称:</div><div class="hd">{{.ProfileName}}</div></div>
      <div class="row-left"><div class="bd">用户名:</div><div class="hd">{{.Username}}<button class="copy" onclick="copyText({{printf "%q" .Username}})">复制</button></div></div>
      <div class="row-left"><div class="bd">2FA验证码:</div><div class="hd"><span class="no-re">未设置2FA密钥</span></div></div>
      <div class="row-left"><div class="bd">分组:</div><div class="hd">{{.GroupName}}</div></div>
      <div class="row-left"><div class="bd">标签:</div><div class="hd">{{.Tags}}</div></div>
      <div class="row-left"><div class="bd">备注:</div><div class="hd"></div></div>
      <div class="row-left"><div class="bd">启动时间:</div><div class="hd">{{.StartedAt}}</div></div>
      <div class="row-left"><div class="bd">快捷打开码:</div><div class="hd">{{.LaunchCode}}</div></div>
      <div class="row-left"><div class="bd">代理:</div><div class="hd">{{.Proxy}}</div></div>
      <div class="finger">
        <div class="row-left"><div class="bd">语言:</div><div class="hd">{{.Language}}</div></div>
        <div class="row-left"><div class="bd">User Agent:</div><div class="hd">{{.UserAgent}}</div></div>
        <div class="row-left"><div class="bd">时区:</div><div class="hd">{{.Timezone}}</div></div>
      </div>
    </div>
  </div>
  <div class="version">Ant Browser</div>
</div>
<script>
function setText(id,value){var el=document.getElementById(id);if(el)el.textContent=value||''}
function CheckIP(){
  fetch('https://ipwho.is/?fields=success,ip,country,region,city,timezone,latitude,longitude,postal', {cache:'no-store'})
    .then(function(res){return res.json()})
    .then(function(data){
      if(!data || data.success === false){setText('ip-ip','Check Error');return}
      setText('ip-ip', data.ip); setText('country', data.country); setText('region', data.region); setText('city', data.city);
      setText('timezone', data.timezone && data.timezone.id ? data.timezone.id : data.timezone);
      setText('lat', data.latitude); setText('lon', data.longitude); setText('zip', data.postal);
    }).catch(function(){setText('ip-ip','Check Error')})
}
function checkWebSite(){
  [
    ['ping_0','https://www.google.com/favicon.ico'],
    ['ping_1','https://en.wikipedia.org/favicon.ico'],
    ['ping_2','https://www.facebook.com/favicon.ico'],
    ['ping_3','https://www.tiktok.com/favicon.ico'],
    ['ping_4','https://www.amazon.com/favicon.ico'],
    ['ping_5','https://whoer.net/favicon.ico']
  ].forEach(function(item){
    var img = new Image(); var el = document.getElementById(item[0]);
    img.referrerPolicy = 'no-referrer';
    img.onload = function(){ if(el) el.className='success' };
    img.onerror = function(){ if(el) el.className='fail' };
    img.src = item[1] + '?v=' + Date.now();
  })
}
async function copyText(text){
  try{ await navigator.clipboard.writeText(text); showToast('已复制到剪贴板') }
  catch(e){ showToast('复制失败') }
}
function showToast(message, duration){
  var toast=document.createElement('div'); toast.className='toast'; toast.textContent=message;
  var container=document.getElementById('toast-container') || createToastContainer(); container.appendChild(toast);
  setTimeout(function(){toast.classList.add('show')},10);
  setTimeout(function(){toast.classList.remove('show');setTimeout(function(){toast.remove()},300)},duration||3000);
}
function createToastContainer(){var c=document.createElement('div');c.id='toast-container';document.body.appendChild(c);return c}
CheckIP(); checkWebSite();
</script>
</body>
</html>`))
