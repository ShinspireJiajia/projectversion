/* layout-shell.js：masterpage 外框邏輯（登入檢查、側邊導覽切換、登出） */

(function () {
  if (!AuthService.requireLogin(window, 'login.html')) {
    return;
  }

  const navLinks = Array.from(document.querySelectorAll('nav a[data-src]'));
  const frame = document.getElementById('content-frame');
  const userNameEl = document.getElementById('user-name');
  const changePasswordLink = document.getElementById('change-password-link');
  const logoutBtn = document.getElementById('logout-btn');

  userNameEl.textContent = AuthService.getUserName();

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

  // 變更密碼為帳號自身操作，非主選單項目，切到該頁時取消主選單反白
  changePasswordLink.addEventListener('click', function (event) {
    event.preventDefault();
    frame.src = changePasswordLink.dataset.src;
    setActiveGroup(null);
  });

  logoutBtn.addEventListener('click', function () {
    AuthService.logout();
    window.location.href = 'login.html';
  });

  // 功能頁面（iframe 內容）載入後會回報自己所屬的導覽群組，
  // 讓透過頁面內部連結（例如「編輯」「返回列表」）切換頁面時側邊導覽仍能反白正確項目
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'pt-page-loaded' && event.data.group) {
      setActiveGroup(event.data.group);
    }
  });

  // 預設進入畫面：建商租戶列表
  const initial = navLinks[0];
  frame.src = initial.dataset.src;
  setActiveGroup(initial.dataset.group);
})();
