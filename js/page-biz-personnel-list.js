/* page-biz-personnel-list.js：建商租戶服務入口「人員管理」列表互動邏輯（列表、重設密碼、信件發送記錄） */

(function () {
  if (!BizAuthService.requireLogin(window, '../biz-login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'biz-page-loaded', group: 'personnel' }, '*');
  }

  const tenantId = BizAuthService.getTenantId();

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const personnelTable = document.getElementById('personnel-table');
  const personnelTableBody = document.getElementById('personnel-table-body');
  const resetResult = document.getElementById('reset-result');

  const emailLogTableBody = document.getElementById('email-log-table-body');
  const emailLogEmptyHint = document.getElementById('email-log-empty-hint');

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function renderPersonnel(list) {
    personnelTableBody.innerHTML = list.map((u) => `
      <tr>
        <td>${escapeHtml(u.CDisplayName)}</td>
        <td>${escapeHtml(u.CTitle)}</td>
        <td>${escapeHtml(u.CEmail)}</td>
        <td>${escapeHtml(u.CAccount)}</td>
        <td><span class="pill ${u.CIsPrimary ? 'good' : 'neutral'}">${u.CIsPrimary ? '主要聯絡人' : '一般人員'}</span></td>
        <td><button class="btn secondary" type="button" data-reset-id="${u.CId}">重設密碼</button></td>
      </tr>
    `).join('');

    personnelTableBody.querySelectorAll('button[data-reset-id]').forEach((btn) => {
      btn.addEventListener('click', function () {
        handleResetPassword(Number(btn.dataset.resetId), btn);
      });
    });
  }

  function renderEmailLog() {
    const res = MockData.getSentEmailLog(tenantId);
    const list = res.StatusCode === MockData.EnumStatusCode.Success ? (res.Entries || []) : [];
    emailLogEmptyHint.hidden = list.length > 0;
    emailLogTableBody.innerHTML = list.map((e) => `
      <tr>
        <td class="log-col-time">${escapeHtml(formatDateTime(e.CCreatedAt))}</td>
        <td>${escapeHtml(e.CToEmail)}</td>
        <td>${escapeHtml(e.CAccount)}</td>
        <td>${escapeHtml(e.CReason)}</td>
      </tr>
    `).join('');
  }

  function loadPersonnel() {
    const res = MockData.getTenantUsers(tenantId);
    loadingMessage.hidden = true;
    if (res.StatusCode !== MockData.EnumStatusCode.Success) {
      errorMessage.hidden = false;
      errorMessage.textContent = '讀取人員清單失敗';
      return;
    }
    personnelTable.hidden = false;
    renderPersonnel(res.Entries || []);
  }

  function handleResetPassword(cId, btn) {
    btn.disabled = true;
    const loginUrl = new URL('../biz-login.html', window.location.href).href;
    const res = MockData.bizResetTenantUserPassword({ CTenantId: tenantId, CId: cId, CLoginUrl: loginUrl });
    btn.disabled = false;
    resetResult.hidden = false;
    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      const info = res.Entries;
      resetResult.className = 'reset-result success-text';
      resetResult.textContent = `已重設「${info.CAccount}」的密碼並模擬發送至 ${info.CToEmail}（新密碼：${info.CPassword}，僅本次顯示）`;
      renderEmailLog();
    } else {
      resetResult.className = 'reset-result error-text';
      resetResult.textContent = res.Message || '重設密碼失敗';
    }
  }

  loadPersonnel();
  renderEmailLog();
})();
