/**
 * biz-auth-service.js
 * 建商租戶服務入口的登入狀態模擬，獨立於 auth-service.js（大平台端 AdminUser）之外，
 * 對齊產品方向決策：平台管理者帳號與租戶帳號是兩套不同的帳號系統，不應混用同一套登入狀態。
 * 登入方式對齊已確認的登入流程規格：統一編號先解析出租戶 → 帳號密碼再對該租戶底下的使用者驗證
 * （帳號僅在租戶內唯一，不同租戶可各自使用相同帳號代碼）。
 */

const BizAuthService = (function () {
  const TENANT_ID_KEY = 'pt_biz_tenant_id';
  const USER_NAME_KEY = 'pt_biz_user_name';

  function login(taxId, account, password) {
    if (!taxId || !taxId.trim()) {
      return { StatusCode: 1, Message: '請輸入統一編號' };
    }
    if (!account || !account.trim()) {
      return { StatusCode: 1, Message: '請輸入帳號' };
    }
    if (!password) {
      return { StatusCode: 1, Message: '請輸入密碼' };
    }
    // 統編解析租戶、帳號密碼驗證使用者的邏輯集中在 MockData（比照後端會做的事），這裡只負責存讀登入狀態
    const res = MockData.verifyTenantUserLogin({ taxId: taxId.trim(), account: account.trim(), password: password });
    if (res.StatusCode !== MockData.EnumStatusCode.Success) {
      return { StatusCode: 1, Message: res.Message };
    }
    const { CTenantId, CTenantName, CDisplayName } = res.Entries;
    localStorage.setItem(TENANT_ID_KEY, CTenantId);
    localStorage.setItem(USER_NAME_KEY, CDisplayName);
    return { StatusCode: 0, Message: '', Entries: { TenantId: CTenantId, TenantName: CTenantName, UserName: CDisplayName } };
  }

  function logout() {
    localStorage.removeItem(TENANT_ID_KEY);
    localStorage.removeItem(USER_NAME_KEY);
  }

  function isLoggedIn() {
    return !!localStorage.getItem(TENANT_ID_KEY);
  }

  function getTenantId() {
    return localStorage.getItem(TENANT_ID_KEY) || '';
  }

  function getUserName() {
    return localStorage.getItem(USER_NAME_KEY) || '';
  }

  // 供各功能頁面（無論是否於 iframe 內）在載入時檢查登入狀態，未登入則導回登入頁
  // loginUrl 使用相對路徑，依呼叫端所在目錄層級傳入（biz-shell.html 傳 'biz-login.html'，pages/ 內頁面傳 '../biz-login.html'）
  function requireLogin(currentWindow, loginUrl) {
    if (!isLoggedIn()) {
      const target = (currentWindow || window).top;
      target.location.href = loginUrl || 'biz-login.html';
      return false;
    }
    return true;
  }

  return { login, logout, isLoggedIn, getTenantId, getUserName, requireLogin };
})();
