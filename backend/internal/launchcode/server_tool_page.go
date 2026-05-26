package launchcode

import "net/http"

func (s *LaunchServer) handleTwoFAToolPage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{
			"ok":    false,
			"error": "method not allowed",
		})
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	if r.Method == http.MethodHead {
		return
	}
	_, _ = w.Write([]byte(twoFAToolPageHTML))
}

const twoFAToolPageHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <title>2FA Token</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f0f4fa;color:#4f5870;font-family:Helvetica Neue,Helvetica,Microsoft YaHei,PingFang SC,Hiragino Sans GB,Arial,sans-serif}
    .box{width:720px;max-width:94vw;background:#fff;box-shadow:0 0 10px rgba(0,0,0,.22)}
    .head{padding:26px 28px;background:#8eb7c6;color:#fff;text-align:center}
    .head h1{font-size:30px;font-weight:300;line-height:1.2}
    .head p{margin-top:8px;font-size:13px;color:rgba(255,255,255,.82)}
    .content{padding:28px}
    label{display:block;margin-bottom:8px;color:#999;font-size:13px}
    input{width:100%;height:42px;padding:0 12px;border:1px solid #d8deea;border-radius:3px;background:#f7f9fd;color:#334155;font-size:13px;outline:none}
    input:focus{border-color:#8eb7c6;box-shadow:0 0 0 3px rgba(142,183,198,.18)}
    .meta{min-height:24px;margin-top:10px;color:#9aa3b5;font-size:12px;word-break:break-all}
    .meta.copyable{cursor:pointer;color:#64748b}
    .meta.copyable:hover{color:#4f5870;text-decoration:underline}
    .code-wrap{margin-top:24px;padding:24px 16px;border-top:1px solid #eef2f7;text-align:center}
    #twofa-code{display:inline-block;min-width:190px;padding:10px 18px;border:1px solid #d8deea;border-radius:4px;background:#f7f9fd;color:#4f5870;font-size:46px;font-weight:700;letter-spacing:5px;line-height:1;cursor:pointer;user-select:none}
    #twofa-code.empty{color:#cbd5e1;font-size:18px;font-weight:400;letter-spacing:0}
    .timer{margin-top:12px;color:#a3a8b5;font-size:13px}
    .error{margin-top:12px;color:#c2410c;font-size:13px;text-align:center}
    #toast-container{position:fixed;top:20px;right:20px;z-index:9999}
    .toast{min-width:220px;margin-bottom:10px;padding:13px 15px;border:1px solid #e1f3d8;border-radius:4px;background:#f0f9eb;color:#67c23a;box-shadow:0 2px 10px rgba(0,0,0,.2);opacity:0;transform:translateX(100%);transition:all .3s ease}
    .toast.show{opacity:1;transform:translateX(0)}
    @media screen and (max-width:560px){.content{padding:18px}.head h1{font-size:24px}#twofa-code{min-width:160px;font-size:36px;letter-spacing:3px}}
  </style>
</head>
<body>
  <main class="box">
    <div class="head">
      <h1>2FA Token</h1>
      <p>粘贴 otpauth:// 链接，点击验证码复制</p>
    </div>
    <div class="content">
      <label for="otpauth-input">otpauth:// 链接</label>
      <input id="otpauth-input" autocomplete="off" spellcheck="false" placeholder="otpauth://totp/example?secret=JBSWY3DPEHPK3PXP&issuer=Ant">
      <div id="token-meta" class="meta">等待输入</div>
      <div class="code-wrap">
        <div id="twofa-code" class="empty" title="点击复制">请输入链接</div>
        <div id="twofa-timer" class="timer"></div>
        <div id="twofa-error" class="error"></div>
      </div>
    </div>
  </main>
  <div id="toast-container"></div>
<script>
var input = document.getElementById('otpauth-input');
var codeEl = document.getElementById('twofa-code');
var timerEl = document.getElementById('twofa-timer');
var errorEl = document.getElementById('twofa-error');
var metaEl = document.getElementById('token-meta');
var currentCode = '';
var currentToken = '';

function parseOTPAuthSecret(value){
  var raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.toLowerCase().indexOf('otpauth://') === 0) {
    try {
      var parsed = new URL(raw);
      raw = parsed.searchParams.get('secret') || '';
    } catch (e) {
      return '';
    }
  }
  return raw.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/g, '');
}

function base32ToBytes(secret){
  var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  var bits = '';
  var bytes = [];
  for (var i = 0; i < secret.length; i++) {
    var value = alphabet.indexOf(secret[i]);
    if (value < 0) throw new Error('token 不是有效的 Base32');
    bits += value.toString(2).padStart(5, '0');
  }
  for (var j = 0; j + 8 <= bits.length; j += 8) {
    bytes.push(parseInt(bits.slice(j, j + 8), 2));
  }
  return new Uint8Array(bytes);
}

async function generateTOTP(secret){
  var keyData = base32ToBytes(secret);
  if (!keyData.length) throw new Error('未提取到 token');
  var counter = Math.floor(Date.now() / 1000 / 30);
  var msg = new ArrayBuffer(8);
  var view = new DataView(msg);
  view.setUint32(4, counter, false);
  var key = await crypto.subtle.importKey('raw', keyData, {name:'HMAC', hash:'SHA-1'}, false, ['sign']);
  var hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  var offset = hash[hash.length - 1] & 15;
  var value = ((hash[offset] & 127) << 24) | ((hash[offset + 1] & 255) << 16) | ((hash[offset + 2] & 255) << 8) | (hash[offset + 3] & 255);
  return String(value % 1000000).padStart(6, '0');
}

function showToast(message){
  var box = document.getElementById('toast-container');
  var item = document.createElement('div');
  item.className = 'toast';
  item.textContent = message;
  box.appendChild(item);
  setTimeout(function(){ item.classList.add('show'); }, 10);
  setTimeout(function(){ item.classList.remove('show'); setTimeout(function(){ item.remove(); }, 300); }, 1800);
}

async function copyCode(){
  if (!currentCode) return;
  await navigator.clipboard.writeText(currentCode);
  showToast('2FA 已复制');
}

async function copyToken(){
  if (!currentToken) return;
  await navigator.clipboard.writeText(currentToken);
  showToast('Token 已复制');
}

async function refresh(){
  var secret = parseOTPAuthSecret(input.value);
  currentCode = '';
  currentToken = secret;
  errorEl.textContent = '';
  if (!secret) {
    codeEl.textContent = '请输入链接';
    codeEl.className = 'empty';
    timerEl.textContent = '';
    metaEl.textContent = '等待输入';
    metaEl.className = 'meta';
    metaEl.title = '';
    return;
  }
  metaEl.textContent = 'Token: ' + secret;
  metaEl.className = 'meta copyable';
  metaEl.title = '点击复制 token';
  try {
    currentCode = await generateTOTP(secret);
    codeEl.textContent = currentCode;
    codeEl.className = '';
    timerEl.textContent = '剩余 ' + (30 - Math.floor(Date.now() / 1000) % 30) + ' 秒';
  } catch (e) {
    codeEl.textContent = '无效 token';
    codeEl.className = 'empty';
    timerEl.textContent = '';
    errorEl.textContent = e && e.message ? e.message : '2FA 生成失败';
  }
}

input.addEventListener('input', refresh);
codeEl.addEventListener('click', function(){ copyCode().catch(function(){ showToast('复制失败'); }); });
metaEl.addEventListener('click', function(){ copyToken().catch(function(){ showToast('复制失败'); }); });
setInterval(refresh, 1000);
refresh();
</script>
</body>
</html>`
