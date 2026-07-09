/* page-biz-login.js：建商租戶登入頁互動邏輯 */

(function () {
  // 已登入則直接進入服務入口，不重複顯示登入頁
  if (BizAuthService.isLoggedIn()) {
    location.replace('biz-shell.html');
    return;
  }

  const form = document.getElementById('login-form');
  const taxIdInput = document.getElementById('taxId');
  const accountInput = document.getElementById('account');
  const passwordInput = document.getElementById('password');
  const errorMessage = document.getElementById('error-message');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    submitBtn.disabled = true;
    submitBtn.textContent = '登入中...';

    // 模擬非同步登入流程
    setTimeout(function () {
      const res = BizAuthService.login(taxIdInput.value, accountInput.value, passwordInput.value);
      submitBtn.disabled = false;
      submitBtn.textContent = '登入';

      if (res.StatusCode === 0) {
        location.href = 'biz-shell.html';
      } else {
        showError(res.Message || '登入失敗');
      }
    }, 200);
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }
})();
