/* page-biz-personnel-form.js：建商租戶服務入口「新增人員」互動邏輯 */

(function () {
  if (!BizAuthService.requireLogin(window, '../biz-login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'biz-page-loaded', group: 'personnel' }, '*');
  }

  const tenantId = BizAuthService.getTenantId();

  const form = document.getElementById('personnel-form');
  const displayNameInput = document.getElementById('displayName');
  const titleInput = document.getElementById('title');
  const emailInput = document.getElementById('email');
  const accountInput = document.getElementById('account');
  const formError = document.getElementById('form-error');
  const formSuccess = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');
  const gotoListLink = document.getElementById('goto-list-link');

  const emailPreviewCard = document.getElementById('email-preview-card');
  const emailPreviewTo = document.getElementById('email-preview-to');
  const emailPreviewUrl = document.getElementById('email-preview-url');
  const emailPreviewAccount = document.getElementById('email-preview-account');
  const emailPreviewPassword = document.getElementById('email-preview-password');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    formError.hidden = true;
    formSuccess.hidden = true;
    submitBtn.disabled = true;

    // 新增人員表單位於 pages/ 底下，相對根目錄的 biz-login.html 一層即可
    const loginUrl = new URL('../biz-login.html', window.location.href).href;
    const res = MockData.addTenantUser({
      CTenantId: tenantId,
      CDisplayName: displayNameInput.value,
      CTitle: titleInput.value,
      CEmail: emailInput.value,
      CAccount: accountInput.value,
      CLoginUrl: loginUrl
    });

    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      const info = res.Entries;
      form.querySelectorAll('input').forEach((el) => { el.disabled = true; });
      submitBtn.disabled = true;
      submitBtn.textContent = '已建立';
      formSuccess.hidden = false;
      formSuccess.textContent = `已建立人員帳號，登入資訊已模擬發送至 ${info.CToEmail}`;
      gotoListLink.hidden = false;
      emailPreviewCard.hidden = false;
      emailPreviewTo.textContent = info.CToEmail;
      emailPreviewUrl.textContent = info.CLoginUrl;
      emailPreviewAccount.textContent = info.CAccount;
      emailPreviewPassword.textContent = info.CPassword;
    } else {
      submitBtn.disabled = false;
      formError.hidden = false;
      formError.textContent = res.Message || '建立失敗';
    }
  });
})();
