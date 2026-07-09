/* page-tenant-list.js：建商租戶列表頁互動邏輯 */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  // 通知外層 masterpage 目前所屬導覽群組，讓側邊選單反白正確
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'tenants' }, '*');
  }

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const table = document.getElementById('tenant-table');
  const tableBody = document.getElementById('tenant-table-body');

  function statusLabel(status) {
    switch (status) {
      case 1:
        return '啟用中';
      case 0:
        return '停用';
      case 9:
        return '已終止';
      default:
        return '未知';
    }
  }

  function statusPillClass(status) {
    if (status === 1) return 'pill good';
    if (status === 9) return 'pill critical';
    return 'pill neutral';
  }

  function isExpiringSoon(expireDt) {
    const days = (new Date(expireDt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  }

  function render(tenants) {
    if (!tenants.length) {
      tableBody.innerHTML = '<tr><td colspan="7">目前沒有租戶資料</td></tr>';
      return;
    }

    tableBody.innerHTML = tenants
      .map((t) => {
        const expiringBadge = isExpiringSoon(t.CAccountExpireDT) ? '<span class="pill critical">即將到期</span>' : '';
        return `
          <tr>
            <td class="code-cell">${escapeHtml(t.CID)}</td>
            <td>${escapeHtml(t.CName)}</td>
            <td>${escapeHtml(t.CTaxId) || '—'}</td>
            <td>${escapeHtml(t.PlanName) || '未指定'}</td>
            <td>${escapeHtml(t.CAccountExpireDT)} ${expiringBadge}</td>
            <td><span class="${statusPillClass(t.CStatus)}">${statusLabel(t.CStatus)}</span></td>
            <td class="actions-cell">
              <a class="btn secondary" href="tenant-form.html?id=${encodeURIComponent(t.CID)}">編輯</a>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  const res = MockData.getTenantList();
  loadingMessage.hidden = true;
  if (res.StatusCode === MockData.EnumStatusCode.Success) {
    table.hidden = false;
    render(res.Entries || []);
  } else {
    errorMessage.hidden = false;
    errorMessage.textContent = '讀取租戶清單失敗';
  }
})();
