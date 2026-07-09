/* page-biz-ticket-list.js：建商租戶服務入口「留言板」列表互動邏輯 */

(function () {
  if (!BizAuthService.requireLogin(window, '../biz-login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'biz-page-loaded', group: 'tickets' }, '*');
  }

  const tenantId = BizAuthService.getTenantId();

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const table = document.getElementById('ticket-table');
  const tableBody = document.getElementById('ticket-table-body');
  const emptyText = document.getElementById('empty-text');

  function statusLabel(status) {
    switch (status) {
      case 'open': return '受理中';
      case 'inProgress': return '處理中';
      case 'resolved': return '已回覆';
      case 'closed': return '結案';
      default: return status || '—';
    }
  }

  function statusPillClass(status) {
    return `pill status-${status}`;
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function render(list) {
    tableBody.innerHTML = list
      .map((t) => `
        <tr class="clickable-row" data-id="${t.id}">
          <td class="subject-cell">${escapeHtml(t.subject)}</td>
          <td><span class="${statusPillClass(t.status)}">${statusLabel(t.status)}</span></td>
          <td>${t.assignedAdminName ? escapeHtml(t.assignedAdminName) : '<span class="hint">尚未指派</span>'}</td>
          <td>${formatDateTime(t.updatedAt)}</td>
        </tr>
      `)
      .join('');

    tableBody.querySelectorAll('tr[data-id]').forEach((row) => {
      row.addEventListener('click', function () {
        location.href = `biz-ticket-detail.html?id=${encodeURIComponent(row.dataset.id)}`;
      });
    });
  }

  const res = MockData.getTicketList(tenantId);
  loadingMessage.hidden = true;
  if (res.StatusCode === MockData.EnumStatusCode.Success) {
    const tickets = (res.Entries || []).slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (tickets.length) {
      table.hidden = false;
      render(tickets);
    } else {
      emptyText.hidden = false;
    }
  } else {
    errorMessage.hidden = false;
    errorMessage.textContent = '讀取留言紀錄失敗';
  }
})();
