/* page-login.js：登入頁互動邏輯 */

(function () {
  // 已登入則直接進入主控台，不重複顯示登入頁
  if (AuthService.isLoggedIn()) {
    location.replace('shell.html');
    return;
  }

  const form = document.getElementById('login-form');
  const accountInput = document.getElementById('account');
  const passwordInput = document.getElementById('password');
  const errorMessage = document.getElementById('error-message');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const account = accountInput.value.trim();
    const password = passwordInput.value;

    if (!account || !password) {
      showError('請輸入帳號與密碼');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '登入中...';

    // 模擬非同步登入流程
    setTimeout(function () {
      const res = AuthService.login(account, password);
      submitBtn.disabled = false;
      submitBtn.textContent = '登入';

      if (res.StatusCode === 0) {
        location.href = 'shell.html';
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
