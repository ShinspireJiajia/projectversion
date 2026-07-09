/* page-notification-list.js：通知公告列表頁互動邏輯 */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  // 通知外層 masterpage 目前所屬導覽群組，讓側邊選單反白正確
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'notifications' }, '*');
  }

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const table = document.getElementById('notification-table');
  const tableBody = document.getElementById('notification-table-body');
  const statusFilter = document.getElementById('status-filter');

  let notifications = [];

  function statusLabel(status) {
    switch (status) {
      case 'draft':
        return '草稿';
      case 'published':
        return '已發布';
      case 'archived':
        return '已下架';
      default:
        return status || '—';
    }
  }

  function statusPillClass(status) {
    if (status === 'published') return 'pill good';
    if (status === 'archived') return 'pill critical';
    return 'pill neutral';
  }

  function scopeLabel(n) {
    if (n.scopeType === 'targeted') {
      return `指定租戶（${(n.targetTenantIds || []).length} 家）`;
    }
    return '全體廣播';
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

  function applyFilter() {
    const status = statusFilter.value;
    const filtered = status ? notifications.filter((n) => n.publishStatus === status) : notifications;
    render(filtered);
  }

  function render(list) {
    if (!list.length) {
      tableBody.innerHTML = '<tr><td colspan="7">目前沒有符合條件的通知</td></tr>';
      return;
    }

    tableBody.innerHTML = list
      .map((n) => {
        const quickAction = n.publishStatus === 'published'
          ? `<button class="btn secondary" type="button" data-archive-id="${n.id}">下架</button>`
          : n.publishStatus === 'archived'
            ? `<button class="btn secondary" type="button" data-republish-id="${n.id}">重新發布</button>`
            : '';
        return `
          <tr class="clickable-row" data-id="${n.id}">
            <td>${escapeHtml(n.title)}</td>
            <td>${escapeHtml(n.category) || '—'}</td>
            <td>${scopeLabel(n)}</td>
            <td>${n.isPublic ? '<span class="pill good">是</span>' : '<span class="pill neutral">否</span>'}</td>
            <td><span class="${statusPillClass(n.publishStatus)}">${statusLabel(n.publishStatus)}</span></td>
            <td>${formatDateTime(n.publishAt)}</td>
            <td class="actions-cell">${quickAction}</td>
          </tr>
        `;
      })
      .join('');

    // 點列（除操作欄按鈕外）導向編輯頁
    tableBody.querySelectorAll('tr[data-id]').forEach((row) => {
      row.addEventListener('click', function () {
        location.href = `notification-form.html?id=${encodeURIComponent(row.dataset.id)}`;
      });
    });

    tableBody.querySelectorAll('button[data-archive-id]').forEach((btn) => {
      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        const res = MockData.setNotificationPublishStatus({ id: btn.dataset.archiveId, publishStatus: 'archived' });
        if (res.StatusCode === MockData.EnumStatusCode.Success) {
          loadList();
        }
      });
    });

    tableBody.querySelectorAll('button[data-republish-id]').forEach((btn) => {
      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        const res = MockData.setNotificationPublishStatus({ id: btn.dataset.republishId, publishStatus: 'published' });
        if (res.StatusCode === MockData.EnumStatusCode.Success) {
          loadList();
        }
      });
    });
  }

  function loadList() {
    const res = MockData.getNotificationList();
    loadingMessage.hidden = true;
    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      table.hidden = false;
      notifications = res.Entries || [];
      applyFilter();
    } else {
      errorMessage.hidden = false;
      errorMessage.textContent = '讀取通知清單失敗';
    }
  }

  statusFilter.addEventListener('change', applyFilter);

  loadList();
})();
