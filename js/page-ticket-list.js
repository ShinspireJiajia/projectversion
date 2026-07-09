/* page-ticket-list.js：留言工單列表頁互動邏輯 */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'tickets' }, '*');
  }

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const table = document.getElementById('ticket-table');
  const tableBody = document.getElementById('ticket-table-body');
  const statusFilter = document.getElementById('status-filter');
  const tenantFilter = document.getElementById('tenant-filter');

  let tickets = [];

  function statusLabel(status) {
    switch (status) {
      case 'open':
        return '受理中';
      case 'inProgress':
        return '處理中';
      case 'resolved':
        return '已回覆';
      case 'closed':
        return '結案';
      default:
        return status || '—';
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

  // 租戶篩選下拉：取用建商租戶清單（跟租戶管理共用同一份 mock 資料）
  const tenantListRes = MockData.getTenantList();
  (tenantListRes.Entries || []).forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.CID;
    opt.textContent = t.CName;
    tenantFilter.appendChild(opt);
  });

  // 依來源通知 id 查詢通知標題，供「主旨／來源通知」欄顯示關聯
  function notificationTitle(id) {
    if (!id) return '';
    const res = MockData.getNotificationData(id);
    return res.StatusCode === MockData.EnumStatusCode.Success && res.Entries ? res.Entries.title : '';
  }

  function applyFilter() {
    let filtered = tickets;
    if (statusFilter.value) {
      filtered = filtered.filter((t) => t.status === statusFilter.value);
    }
    if (tenantFilter.value) {
      filtered = filtered.filter((t) => t.tenantId === tenantFilter.value);
    }
    render(filtered);
  }

  function render(list) {
    if (!list.length) {
      tableBody.innerHTML = '<tr><td colspan="5">目前沒有符合條件的工單</td></tr>';
      return;
    }

    tableBody.innerHTML = list
      .map((t) => {
        const relatedTitle = notificationTitle(t.relatedNotificationId);
        return `
          <tr class="clickable-row" data-id="${t.id}">
            <td>${escapeHtml(t.tenantName)}</td>
            <td>
              <div class="subject-cell">${escapeHtml(t.subject)}</div>
              ${relatedTitle ? `<div class="related-note">來自通知：${escapeHtml(relatedTitle)}</div>` : ''}
            </td>
            <td><span class="${statusPillClass(t.status)}">${statusLabel(t.status)}</span></td>
            <td>${t.assignedAdminName ? escapeHtml(t.assignedAdminName) : '<span class="hint">未指派</span>'}</td>
            <td>${formatDateTime(t.updatedAt)}</td>
          </tr>
        `;
      })
      .join('');

    tableBody.querySelectorAll('tr[data-id]').forEach((row) => {
      row.addEventListener('click', function () {
        location.href = `ticket-detail.html?id=${encodeURIComponent(row.dataset.id)}`;
      });
    });
  }

  function loadList() {
    const res = MockData.getTicketList();
    loadingMessage.hidden = true;
    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      table.hidden = false;
      tickets = res.Entries || [];
      applyFilter();
    } else {
      errorMessage.hidden = false;
      errorMessage.textContent = '讀取工單清單失敗';
    }
  }

  statusFilter.addEventListener('change', applyFilter);
  tenantFilter.addEventListener('change', applyFilter);

  loadList();
})();
