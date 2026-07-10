/* page-biz-forgot-password.js：建商租戶忘記密碼頁互動邏輯 */

(function () {
  // 已登入狀態下仍允許操作忘記密碼（例如要幫其他人員重設），不強制導回登入頁

  const form = document.getElementById('forgot-form');
  const taxIdInput = document.getElementById('taxId');
  const accountInput = document.getElementById('account');
  const emailInput = document.getElementById('email');
  const errorMessage = document.getElementById('error-message');
  const successMessage = document.getElementById('success-message');
  const submitBtn = document.getElementById('submit-btn');

  const emailPreviewCard = document.getElementById('email-preview-card');
  const emailPreviewTo = document.getElementById('email-preview-to');
  const emailPreviewAccount = document.getElementById('email-preview-account');
  const emailPreviewPassword = document.getElementById('email-preview-password');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    errorMessage.hidden = true;
    successMessage.hidden = true;
    emailPreviewCard.hidden = true;
    submitBtn.disabled = true;

    const loginUrl = new URL('biz-login.html', window.location.href).href;
    const res = MockData.resetTenantUserPassword({
      taxId: taxIdInput.value,
      account: accountInput.value,
      email: emailInput.value,
      CLoginUrl: loginUrl
    });

    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      const info = res.Entries;
      successMessage.hidden = false;
      successMessage.textContent = `新密碼已模擬發送至 ${info.CToEmail}，請至登入頁使用新密碼登入。`;
      emailPreviewCard.hidden = false;
      emailPreviewTo.textContent = info.CToEmail;
      emailPreviewAccount.textContent = info.CAccount;
      emailPreviewPassword.textContent = info.CPassword;
      submitBtn.textContent = '已重新設定';
      submitBtn.disabled = true;
    } else {
      submitBtn.disabled = false;
      errorMessage.hidden = false;
      errorMessage.textContent = res.Message || '重設失敗，請確認統一編號／帳號／Email 是否正確';
    }
  });
})();
