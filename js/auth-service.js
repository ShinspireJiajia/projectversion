/**
 * auth-service.js
 * 純前端模擬登入狀態，不呼叫後端 API。示範帳號對齊 webAPI 的 SeedPlatformData.sql：
 * 帳號 adminuser、密碼 55688。
 */

const AuthService = (function () {
  const TOKEN_KEY = 'pt_admin_token';
  const USER_NAME_KEY = 'pt_admin_user_name';
  const DEMO_ACCOUNT = 'adminuser';
  const DEMO_PASSWORD = '55688';
  const DEMO_USER_NAME = '預設管理者';

  function login(account, password) {
    if (account === DEMO_ACCOUNT && password === DEMO_PASSWORD) {
      localStorage.setItem(TOKEN_KEY, 'mock-token-' + Date.now());
      localStorage.setItem(USER_NAME_KEY, DEMO_USER_NAME);
      return { StatusCode: 0, Message: '', Entries: { UserName: DEMO_USER_NAME } };
    }
    return { StatusCode: 1, Message: '登入失敗，請確認帳號密碼' };
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_NAME_KEY);
  }

  function isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  function getUserName() {
    return localStorage.getItem(USER_NAME_KEY) || '';
  }

  // 供各功能頁面（無論是否於 iframe 內）在載入時檢查登入狀態，未登入則導回登入頁
  // loginUrl 使用相對路徑，依呼叫端所在目錄層級傳入（shell.html 傳 'login.html'，pages/ 內頁面傳 '../login.html'）
  function requireLogin(currentWindow, loginUrl) {
    if (!isLoggedIn()) {
      const target = (currentWindow || window).top;
      target.location.href = loginUrl || 'login.html';
      return false;
    }
    return true;
  }

  return { login, logout, isLoggedIn, getUserName, requireLogin };
})();
