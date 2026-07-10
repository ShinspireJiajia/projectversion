/**
 * auth-service.js
 * 純前端模擬登入狀態，不呼叫後端 API。帳號密碼驗證委由 MockData.verifyAdminLogin 對「管理者人員」
 * 帳號清單做核對（見 mock-data.js 的 adminAccounts），而非只認單一硬編碼帳號；
 * 種子資料仍對齊 webAPI 的 SeedPlatformData.sql：帳號 adminuser、密碼 55688。
 */

const AuthService = (function () {
  const TOKEN_KEY = 'pt_admin_token';
  const USER_NAME_KEY = 'pt_admin_user_name';
  const ACCOUNT_KEY = 'pt_admin_account';

  function login(account, password) {
    if (!account || !account.trim()) {
      return { StatusCode: 1, Message: '請輸入帳號' };
    }
    if (!password) {
      return { StatusCode: 1, Message: '請輸入密碼' };
    }
    const res = MockData.verifyAdminLogin({ account: account.trim(), password: password });
    if (res.StatusCode !== MockData.EnumStatusCode.Success) {
      return { StatusCode: 1, Message: res.Message || '登入失敗，請確認帳號密碼' };
    }
    localStorage.setItem(TOKEN_KEY, 'mock-token-' + Date.now());
    localStorage.setItem(USER_NAME_KEY, res.Entries.CDisplayName);
    localStorage.setItem(ACCOUNT_KEY, account.trim());
    return { StatusCode: 0, Message: '', Entries: { UserName: res.Entries.CDisplayName } };
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
  }

  function isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  function getUserName() {
    return localStorage.getItem(USER_NAME_KEY) || '';
  }

  // 供「變更密碼」頁核對目前登入者是哪一組管理者帳號（帳號代碼，非顯示姓名）
  function getAccount() {
    return localStorage.getItem(ACCOUNT_KEY) || '';
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

  return { login, logout, isLoggedIn, getUserName, getAccount, requireLogin };
})();
