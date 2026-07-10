/* page-admin-user-form.js：新增管理者帳號互動邏輯 */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'admin-users' }, '*');
  }

  const form = document.getElementById('admin-user-form');
  const displayNameInput = document.getElementById('displayName');
  const accountInput = document.getElementById('account');
  const passwordInput = document.getElementById('password');
  const formError = document.getElementById('form-error');
  const formSuccess = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');
  const gotoListLink = document.getElementById('goto-list-link');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    formError.hidden = true;
    formSuccess.hidden = true;
    submitBtn.disabled = true;

    const res = MockData.createAdminAccount({
      CDisplayName: displayNameInput.value,
      CAccount: accountInput.value,
      CPassword: passwordInput.value
    });

    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      form.querySelectorAll('input').forEach((el) => { el.disabled = true; });
      submitBtn.disabled = true;
      submitBtn.textContent = '已建立';
      formSuccess.hidden = false;
      formSuccess.textContent = `已建立管理者帳號「${accountInput.value}」`;
      gotoListLink.hidden = false;
    } else {
      submitBtn.disabled = false;
      formError.hidden = false;
      formError.textContent = res.Message || '建立失敗';
    }
  });
})();
