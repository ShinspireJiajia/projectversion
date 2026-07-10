/* page-change-password.js：管理者本人變更密碼互動邏輯 */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'account' }, '*');
  }

  const form = document.getElementById('change-password-form');
  const currentPasswordInput = document.getElementById('currentPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const formError = document.getElementById('form-error');
  const formSuccess = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    formError.hidden = true;
    formSuccess.hidden = true;

    if (newPasswordInput.value !== confirmPasswordInput.value) {
      formError.hidden = false;
      formError.textContent = '新密碼與確認新密碼不一致';
      return;
    }

    submitBtn.disabled = true;
    const res = MockData.changeAdminPassword({
      account: AuthService.getAccount(),
      currentPassword: currentPasswordInput.value,
      newPassword: newPasswordInput.value
    });
    submitBtn.disabled = false;

    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      form.reset();
      formSuccess.hidden = false;
      formSuccess.textContent = '密碼已變更，下次登入請使用新密碼。';
    } else {
      formError.hidden = false;
      formError.textContent = res.Message || '變更密碼失敗';
    }
  });
})();
