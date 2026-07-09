/* page-biz-notification-list.js：建商租戶服務入口「公告與通知」列表互動邏輯（展開內容並標記已讀） */

(function () {
  if (!BizAuthService.requireLogin(window, '../biz-login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'biz-page-loaded', group: 'notifications' }, '*');
  }

  const tenantId = BizAuthService.getTenantId();

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const noticeList = document.getElementById('notice-list');
  const emptyText = document.getElementById('empty-text');

  let notifications = [];
  let expandedId = null;

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

  function scopeLabel(n) {
    return n.scopeType === 'targeted' ? '專屬通知' : '全體公告';
  }

  function render() {
    noticeList.innerHTML = notifications
      .map((n) => {
        const isExpanded = n.id === expandedId;
        return `
          <li class="notice-card ${n.isRead ? '' : 'is-unread'}">
            <button class="notice-header" type="button" data-id="${n.id}">
              ${n.isRead ? '' : '<span class="unread-dot" title="尚未讀取"></span>'}
              <span class="notice-title">${escapeHtml(n.title)}</span>
              <span class="notice-tags">
                <span class="pill neutral">${scopeLabel(n)}</span>
                ${n.category ? `<span class="pill neutral">${escapeHtml(n.category)}</span>` : ''}
              </span>
              <span class="notice-date">${formatDateTime(n.publishAt)}</span>
              <i class="fa-solid ${isExpanded ? 'fa-caret-up' : 'fa-caret-down'}"></i>
            </button>
            ${isExpanded ? `<div class="notice-body">${n.content || ''}</div>` : ''}
          </li>
        `;
      })
      .join('');

    noticeList.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const id = Number(btn.dataset.id);
        expandedId = expandedId === id ? null : id;
        if (expandedId === id) {
          const target = notifications.find((n) => n.id === id);
          if (target && !target.isRead) {
            const res = MockData.markNotificationRead({ tenantId, notificationId: id });
            if (res.StatusCode === MockData.EnumStatusCode.Success) {
              target.isRead = true;
            }
          }
        }
        render();
      });
    });
  }

  const res = MockData.getTenantNotifications(tenantId);
  loadingMessage.hidden = true;
  if (res.StatusCode === MockData.EnumStatusCode.Success) {
    notifications = res.Entries || [];
    if (notifications.length) {
      noticeList.hidden = false;
      render();
    } else {
      emptyText.hidden = false;
    }
  } else {
    errorMessage.hidden = false;
    errorMessage.textContent = '讀取公告與通知失敗';
  }
})();
