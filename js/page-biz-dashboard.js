/* page-biz-dashboard.js：建商租戶服務入口首頁互動邏輯（合約概況、未讀公告／待處理留言統計、最新內容預覽） */

(function () {
  if (!BizAuthService.requireLogin(window, '../biz-login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'biz-page-loaded', group: 'dashboard' }, '*');
  }

  const tenantId = BizAuthService.getTenantId();

  const welcomeTitle = document.getElementById('welcome-title');
  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const dashboardContent = document.getElementById('dashboard-content');
  const infoTaxId = document.getElementById('info-tax-id');
  const infoContract = document.getElementById('info-contract');
  const infoPlan = document.getElementById('info-plan');
  const infoVersion = document.getElementById('info-version');
  const statUnreadNum = document.getElementById('stat-unread-num');
  const statOpenTicketsNum = document.getElementById('stat-open-tickets-num');
  const notificationPreview = document.getElementById('notification-preview');
  const ticketPreview = document.getElementById('ticket-preview');

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  function statusLabel(status) {
    switch (status) {
      case 'open': return '受理中';
      case 'inProgress': return '處理中';
      case 'resolved': return '已回覆';
      case 'closed': return '結案';
      default: return status || '—';
    }
  }

  const tenantListRes = MockData.getTenantList();
  const tenant = (tenantListRes.Entries || []).find((t) => t.CID === tenantId);

  loadingMessage.hidden = true;
  if (!tenant) {
    errorMessage.hidden = false;
    errorMessage.textContent = '讀取租戶資料失敗';
    return;
  }

  dashboardContent.hidden = false;
  welcomeTitle.textContent = `歡迎回來，${BizAuthService.getUserName()}`;
  infoTaxId.textContent = tenant.CTaxId || '—';
  infoContract.textContent = `${formatDate(tenant.CContractStartDT)} ～ ${formatDate(tenant.CAccountExpireDT)}`;
  infoPlan.textContent = tenant.PlanName || '—';
  infoVersion.textContent = tenant.CCurrentAppVersion || '—';

  const notificationRes = MockData.getTenantNotifications(tenantId);
  const notifications = notificationRes.Entries || [];
  statUnreadNum.textContent = notifications.filter((n) => !n.isRead).length;
  notificationPreview.innerHTML = notifications.length
    ? notifications.slice(0, 3).map((n) => `
        <li>
          <a href="biz-notification-list.html">
            ${n.isRead ? '' : '<span class="unread-dot"></span>'}${escapeHtml(n.title)}
          </a>
          <span class="preview-date">${formatDate(n.publishAt)}</span>
        </li>
      `).join('')
    : '<li class="empty">目前沒有公告或通知</li>';

  const ticketRes = MockData.getTicketList(tenantId);
  const tickets = (ticketRes.Entries || []).slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  statOpenTicketsNum.textContent = tickets.filter((t) => t.status === 'open' || t.status === 'inProgress').length;
  ticketPreview.innerHTML = tickets.length
    ? tickets.slice(0, 3).map((t) => `
        <li>
          <a href="biz-ticket-detail.html?id=${t.id}">${escapeHtml(t.subject)}</a>
          <span class="preview-date">${statusLabel(t.status)}</span>
        </li>
      `).join('')
    : '<li class="empty">目前沒有留言紀錄</li>';
})();
