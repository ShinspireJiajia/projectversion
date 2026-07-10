/* page-admin-user-list.js：管理者人員列表頁互動邏輯（列表、重設密碼） */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'admin-users' }, '*');
  }

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const table = document.getElementById('admin-user-table');
  const tableBody = document.getElementById('admin-user-table-body');
  const resetResult = document.getElementById('reset-result');

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function render(list) {
    tableBody.innerHTML = list.map((a) => `
      <tr>
        <td>${escapeHtml(a.CDisplayName)}</td>
        <td>${escapeHtml(a.CAccount)}</td>
        <td><button class="btn secondary" type="button" data-reset-id="${a.CId}">重設密碼</button></td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('button[data-reset-id]').forEach((btn) => {
      btn.addEventListener('click', function () {
        handleReset(Number(btn.dataset.resetId), btn);
      });
    });
  }

  function handleReset(cId, btn) {
    btn.disabled = true;
    const res = MockData.resetAdminAccountPassword({ CId: cId });
    btn.disabled = false;
    resetResult.hidden = false;
    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      const info = res.Entries;
      resetResult.className = 'reset-result success-text';
      resetResult.textContent = `已重設「${info.CAccount}」的密碼為：${info.CPassword}（請立即告知本人，此密碼僅本次顯示）`;
    } else {
      resetResult.className = 'reset-result error-text';
      resetResult.textContent = res.Message || '重設密碼失敗';
    }
  }

  const res = MockData.getAdminAccountList();
  loadingMessage.hidden = true;
  if (res.StatusCode === MockData.EnumStatusCode.Success) {
    table.hidden = false;
    render(res.Entries || []);
  } else {
    errorMessage.hidden = false;
    errorMessage.textContent = '讀取管理者清單失敗';
  }
})();
