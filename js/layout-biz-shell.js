/* layout-biz-shell.js：建商租戶服務入口 masterpage 外框邏輯（登入檢查、側邊導覽切換、登出） */

(function () {
  if (!BizAuthService.requireLogin(window, 'biz-login.html')) {
    return;
  }

  const navLinks = Array.from(document.querySelectorAll('nav a[data-src]'));
  const frame = document.getElementById('content-frame');
  const brandNameEl = document.getElementById('brand-tenant-name');
  const versionTagEl = document.getElementById('version-tag');
  const userNameEl = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');

  const tenantId = BizAuthService.getTenantId();
  const tenantListRes = MockData.getTenantList();
  const tenant = (tenantListRes.Entries || []).find((t) => t.CID === tenantId);

  brandNameEl.textContent = tenant ? tenant.CName : '建商租戶';
  versionTagEl.textContent = tenant && tenant.CCurrentAppVersion ? `目前版本 v${tenant.CCurrentAppVersion}` : '目前版本 —';
  userNameEl.textContent = BizAuthService.getUserName();

  function setActiveGroup(group) {
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.group === group);
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      frame.src = link.dataset.src;
      setActiveGroup(link.dataset.group);
    });
  });

  logoutBtn.addEventListener('click', function () {
    BizAuthService.logout();
    window.location.href = 'biz-login.html';
  });

  // 功能頁面（iframe 內容）載入後會回報自己所屬的導覽群組，
  // 讓透過頁面內部連結（例如首頁的「查看全部」、留言板「返回列表」）切換頁面時側邊導覽仍能反白正確項目
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'biz-page-loaded' && event.data.group) {
      setActiveGroup(event.data.group);
    }
  });

  // 預設進入畫面：首頁
  const initial = navLinks[0];
  frame.src = initial.dataset.src;
  setActiveGroup(initial.dataset.group);
})();
