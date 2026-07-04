(function() {
  'use strict';

  var TOKEN_KEY = 'grandkidsgo_token';
  var USER_KEY = 'grandkidsgo_user';
  var COOKIE_NAME = 'grandkidsgo_token';
  var COOKIE_DOMAIN = '.grandand.com';

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^| )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setCookie(name, value) {
    document.cookie = name + '=' + encodeURIComponent(value) +
      '; domain=' + COOKIE_DOMAIN + '; path=/; Secure; SameSite=Lax';
  }

  function getToken() {
    var t = sessionStorage.getItem(TOKEN_KEY);
    if (t) return t;
    var c = getCookie(COOKIE_NAME);
    if (c) {
      sessionStorage.setItem(TOKEN_KEY, c);
      return c;
    }
    return null;
  }

  var token = getToken();
  if (token) {
    // Ensure user data is synced to localStorage for this subdomain
    if (!sessionStorage.getItem('grandkidsgo_user')) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/auth/me', true);
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            var d = JSON.parse(xhr.responseText);
            if (d.code === 'OK') {
              sessionStorage.setItem('grandkidsgo_user', JSON.stringify(d.data));
            }
          } catch(e) {}
        }
      };
      xhr.send();
    }
    return;
  }

  // --- Build modal ---
  var alreadyShown = sessionStorage.getItem('grandkidsgo_auth_dismissed');
  if (alreadyShown) return;

  var style = document.createElement('style');
  style.textContent = '#grandkidsgo-auth-overlay{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans SC","PingFang SC",sans-serif}';
  style.textContent += '#grandkidsgo-auth-box{background:#fff;border-radius:16px;width:100%;max-width:672px;margin:0 16px;overflow:hidden;position:relative;animation:grandkidsgo-fadeInUp .25s ease;max-height:90vh;overflow-y:auto}';
  style.textContent += '@keyframes grandkidsgo-fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
  style.textContent += '#grandkidsgo-auth-close{position:absolute;top:16px;right:16px;z-index:10;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;border:none;cursor:pointer;color:#64748b;font-size:14px;transition:background .2s;line-height:1}';
  style.textContent += '#grandkidsgo-auth-close:hover{background:#e2e8f0}';
  style.textContent += '.grandkidsgo-auth-body{display:flex;flex-direction:column}@media(min-width:768px){.grandkidsgo-auth-body{flex-direction:row}}';
  style.textContent += '.grandkidsgo-auth-left{background:linear-gradient(135deg,#3b82f6,#6366f1);padding:40px 32px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff}@media(min-width:768px){.grandkidsgo-auth-left{width:50%}}';
  style.textContent += '.grandkidsgo-auth-left h2{font-size:20px;font-weight:700;margin-bottom:24px}';
  style.textContent += '.grandkidsgo-auth-right{padding:32px;display:flex;flex-direction:column;justify-content:center}@media(min-width:768px){.grandkidsgo-auth-right{width:50%}}';
  style.textContent += '.grandkidsgo-auth-right h2{font-size:20px;font-weight:700;color:#0f172a;margin-bottom:4px}';
  style.textContent += '.grandkidsgo-auth-sub{font-size:14px;color:#64748b;margin-bottom:24px}';
  style.textContent += '.grandkidsgo-auth-field{margin-bottom:16px}';
  style.textContent += '.grandkidsgo-auth-field label{display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:4px}';
  style.textContent += '.grandkidsgo-auth-field input{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;transition:border-color .2s}';
  style.textContent += '.grandkidsgo-auth-field input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.1)}';
  style.textContent += '.grandkidsgo-auth-code{display:flex;gap:8px}';
  style.textContent += '.grandkidsgo-auth-code input{flex:1}';
  style.textContent += '.grandkidsgo-auth-code button{padding:10px 16px;background:#f1f5f9;color:#374151;border:none;border-radius:8px;font-size:14px;cursor:pointer;white-space:nowrap;transition:background .2s}';
  style.textContent += '.grandkidsgo-auth-code button:hover:not(:disabled){background:#e2e8f0}';
  style.textContent += '.grandkidsgo-auth-code button:disabled{opacity:0.5;cursor:not-allowed}';
  style.textContent += '.grandkidsgo-auth-btn{width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:500;cursor:pointer;transition:background .2s;margin-top:8px}';
  style.textContent += '.grandkidsgo-auth-btn:hover:not(:disabled){background:#1d4ed8}';
  style.textContent += '.grandkidsgo-auth-btn:disabled{opacity:0.5;cursor:not-allowed}';
  style.textContent += '.grandkidsgo-auth-error{margin-bottom:16px;padding:12px;background:#fef2f2;color:#dc2626;font-size:14px;border-radius:8px}';
  style.textContent += '.grandkidsgo-auth-terms{margin-top:16px;font-size:12px;color:#9ca3af;text-align:center}';
  style.textContent += '.grandkidsgo-auth-terms a{color:#2563eb;text-decoration:none}';
  style.textContent += '.grandkidsgo-auth-guest{display:block;margin-top:12px;padding:10px;background:transparent;color:#64748b;border:1px solid #d1d5db;border-radius:12px;font-size:14px;cursor:pointer;width:100%;transition:background .2s}';
  style.textContent += '.grandkidsgo-auth-guest:hover{background:#f9fafb}';
  // Mobile responsive
  style.textContent += '@media(max-width:767px){#grandkidsgo-auth-box{max-width:100%;margin:0 8px;border-radius:12px}}';
  style.textContent += '@media(max-width:767px){.grandkidsgo-auth-left{padding:24px 16px}}';
  style.textContent += '@media(max-width:767px){.grandkidsgo-auth-right{padding:24px 16px}}';
  style.textContent += '@media(max-width:767px){.grandkidsgo-auth-left h2{font-size:17px;margin-bottom:16px}}';
  style.textContent += '@media(max-width:767px){.grandkidsgo-auth-field{margin-bottom:12px}}';
  style.textContent += '@media(max-width:767px){.grandkidsgo-auth-sub{margin-bottom:16px;font-size:13px}}';
  // Mobile tabs
  style.textContent += '.grandkidsgo-auth-mobile-tabs{display:none}';
  style.textContent += '@media(max-width:767px){.grandkidsgo-auth-mobile-tabs{display:flex;border-bottom:1px solid #e2e8f0}}';
  style.textContent += '.grandkidsgo-mtab{flex:1;padding:12px 8px;background:transparent;border:none;color:#94a3b8;font-size:14px;cursor:pointer;transition:all .2s}';
  style.textContent += '.grandkidsgo-mtab-active{color:#2563eb;border-bottom:2px solid #2563eb;font-weight:500}';
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.id = 'grandkidsgo-auth-overlay';

  var phone = '', code = '', countdown = 0, loading = false, error = '', timer = null, mobileTab = 'phone';

  function render() {
    overlay.innerHTML = '';
    var box = document.createElement('div');
    box.id = 'grandkidsgo-auth-box';
    box.innerHTML = '' +
      '<button id="grandkidsgo-auth-close">✕</button>' +
      '<div class="grandkidsgo-auth-mobile-tabs" id="grandkidsgo-auth-mobile-tabs">' +
        '<button class="grandkidsgo-mtab' + (mobileTab === 'phone' ? ' grandkidsgo-mtab-active' : '') + '" data-tab="phone">手机号登录</button>' +
        '<button class="grandkidsgo-mtab' + (mobileTab === 'qrcode' ? ' grandkidsgo-mtab-active' : '') + '" data-tab="qrcode">扫码登录</button>' +
      '</div>' +
      '<div class="grandkidsgo-auth-body">' +
        '<div class="grandkidsgo-auth-left" id="grandkidsgo-auth-left"' + (window.innerWidth < 768 && mobileTab === 'phone' ? ' style="display:none"' : '') + '>' +
          '<h2>扫码登录</h2>' +
          '<div style="width:192px;height:192px;background:#fff;border-radius:12px;padding:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:center">' +
            '<div style="width:100%;height:100%;border:2px dashed #d1d5db;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
              '<div style="font-size:40px;margin-bottom:4px">📷</div>' +
              '<p style="font-size:12px;color:#9ca3af">扫码登录</p>' +
            '</div>' +
          '</div>' +
          '<p style="font-size:14px;opacity:0.8;margin-bottom:24px">打开 App 或微信扫一扫</p>' +
          '<div style="width:100%">' +
            ['📱童慧行 App', '🧳走天下 App', '💬微信'].map(function(s) {
              var chars = Array.from(s);
              var icon = chars[0];
              var text = chars.slice(1).join('');
              return '<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.1);border-radius:8px;padding:10px 16px;margin-bottom:8px">' +
                '<span style="font-size:20px">' + icon + '</span>' +
                '<div><p style="font-size:14px;font-weight:500">' + text + '</p><p style="font-size:12px;opacity:0.6">打开' + text + '扫一扫</p></div></div>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="grandkidsgo-auth-right"' + (window.innerWidth < 768 && mobileTab === 'qrcode' ? ' style="display:none"' : '') + '>' +
          '<h2>手机号登录</h2>' +
          '<p class="grandkidsgo-auth-sub">输入手机号，验证后自动注册/登录</p>' +
          (error ? '<div class="grandkidsgo-auth-error">' + error + '</div>' : '') +
          '<div class="grandkidsgo-auth-field">' +
            '<label>手机号</label>' +
            '<input id="grandkidsgo-auth-phone" type="tel" maxlength="11" placeholder="请输入手机号" value="' + phone + '" />' +
          '</div>' +
          '<div class="grandkidsgo-auth-field">' +
            '<label>验证码</label>' +
            '<div class="grandkidsgo-auth-code">' +
              '<input id="grandkidsgo-auth-code" type="text" maxlength="6" placeholder="请输入验证码" value="' + code + '" />' +
              '<button id="grandkidsgo-send-code"' + (loading || countdown > 0 ? ' disabled' : '') + '>' +
                (countdown > 0 ? countdown + 's' : loading ? '发送中...' : '获取验证码') +
              '</button>' +
            '</div>' +
          '</div>' +
          '<button id="grandkidsgo-login-btn" class="grandkidsgo-auth-btn"' + (loading ? ' disabled' : '') + '>' +
            (loading ? '处理中...' : '登录 / 注册') +
          '</button>' +
          '<button class="grandkidsgo-auth-guest" id="grandkidsgo-guest-btn">先逛逛</button>' +
          '<p class="grandkidsgo-auth-terms">登录即代表同意 <a href="/legal/terms" target="_blank">《服务条款》</a></p>' +
        '</div>' +
      '</div>';

    overlay.appendChild(box);

    document.getElementById('grandkidsgo-auth-close').onclick = dismiss;
    document.getElementById('grandkidsgo-guest-btn').onclick = dismiss;

    var phoneInput = document.getElementById('grandkidsgo-auth-phone');
    phoneInput.oninput = function() {
      phone = this.value.replace(/\D/g, '').slice(0, 11);
      this.value = phone;
    };

    var codeInput = document.getElementById('grandkidsgo-auth-code');
    codeInput.oninput = function() {
      code = this.value.replace(/\D/g, '').slice(0, 6);
      this.value = code;
    };

    // Mobile tab switching
    var tabs = document.getElementById('grandkidsgo-auth-mobile-tabs');
    if (tabs) {
      Array.from(tabs.querySelectorAll('[data-tab]')).forEach(function(btn) {
        btn.onclick = function() {
          mobileTab = this.getAttribute('data-tab');
          render();
        };
      });
    }

    document.getElementById('grandkidsgo-send-code').onclick = function() {
      if (loading || countdown > 0) return;
      if (!phone || phone.length < 11) {
        error = '请输入正确的手机号';
        render();
        return;
      }
      error = '';
      loading = true;
      render();
      fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, purpose: 'login' }),
      }).then(function(r) { return r.json(); }).then(function(d) {
        loading = false;
        if (d.code === 'OK') {
          countdown = 60;
          if (timer) clearInterval(timer);
          timer = setInterval(function() {
            countdown--;
            if (countdown <= 0) { clearInterval(timer); timer = null; }
            render();
          }, 1000);
        } else {
          error = d.message || '发送失败';
        }
        render();
      }).catch(function() {
        loading = false;
        error = '网络错误';
        render();
      });
    };

    document.getElementById('grandkidsgo-login-btn').onclick = function() {
      if (loading) return;
      if (!phone || !code) {
        error = '请填写手机号和验证码';
        render();
        return;
      }
      error = '';
      loading = true;
      render();
      fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, code: code }),
      }).then(function(r) { return r.json(); }).then(function(d) {
        loading = false;
        if (d.code === 'OK') {
          var tok = d.data.accessToken;
          sessionStorage.setItem(TOKEN_KEY, tok);
          setCookie(COOKIE_NAME, tok);
          if (d.data.user) sessionStorage.setItem(USER_KEY, JSON.stringify(d.data.user));
          if (d.data.isNewUser) localStorage.setItem('grandkidsgo_isNewUser', 'true');
          overlay.remove();
          style.remove();
          if (timer) clearInterval(timer);
          // Reload to let app use the token
          location.reload();
        } else {
          error = d.message || '登录失败';
          render();
        }
      }).catch(function() {
        loading = false;
        error = '网络错误';
        render();
      });
    };
  }

  function dismiss() {
    if (timer) clearInterval(timer);
    overlay.remove();
    style.remove();
    sessionStorage.setItem('grandkidsgo_auth_dismissed', '1');
  }

  function showOverlay() {
    document.body.appendChild(overlay);
    render();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showOverlay);
  } else {
    showOverlay();
  }
})();
