/* page-biz-ticket-detail.js：建商租戶服務入口「留言詳情」互動邏輯（對話串、回覆） */

(function () {
  if (!BizAuthService.requireLogin(window, '../biz-login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'biz-page-loaded', group: 'tickets' }, '*');
  }

  const tenantId = BizAuthService.getTenantId();
  const params = new URLSearchParams(location.search);
  const ticketId = Number(params.get('id'));

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const ticketContent = document.getElementById('ticket-content');
  const pageTitle = document.getElementById('page-title');
  const metaStatus = document.getElementById('meta-status');
  const metaCreatedAt = document.getElementById('meta-created-at');
  const metaAssignee = document.getElementById('meta-assignee');
  const thread = document.getElementById('thread');
  const replyCard = document.getElementById('reply-card');
  const closedHint = document.getElementById('closed-hint');
  const replyContent = document.getElementById('reply-content');
  const closeCheckbox = document.getElementById('close-checkbox');
  const replyError = document.getElementById('reply-error');
  const replySuccess = document.getElementById('reply-success');
  const replyBtn = document.getElementById('reply-btn');

  let ticket = null;

  function statusLabel(status) {
    switch (status) {
      case 'open': return '受理中';
      case 'inProgress': return '處理中';
      case 'resolved': return '已回覆';
      case 'closed': return '結案';
      default: return status || '—';
    }
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

  function renderMeta() {
    pageTitle.textContent = ticket.subject;
    metaStatus.innerHTML = `<span class="pill status-${ticket.status}">${statusLabel(ticket.status)}</span>`;
    metaCreatedAt.textContent = formatDateTime(ticket.createdAt);
    metaAssignee.textContent = ticket.assignedAdminName || '尚未指派';

    if (ticket.status === 'closed') {
      replyCard.hidden = true;
      closedHint.hidden = false;
    } else {
      replyCard.hidden = false;
      closedHint.hidden = true;
    }
  }

  function renderThread() {
    thread.innerHTML = (ticket.messages || [])
      .map((m) => {
        const isMine = m.senderType === 'tenant';
        return `
          <div class="bubble-row ${isMine ? 'from-me' : 'from-support'}">
            <div class="bubble">
              <div class="bubble-meta">
                <span class="bubble-sender">${escapeHtml(m.senderName)}${isMine ? '' : '（平台客服）'}</span>
                <span class="bubble-time">${formatDateTime(m.createdAt)}</span>
              </div>
              <div class="bubble-content">${escapeHtml(m.content)}</div>
            </div>
          </div>
        `;
      })
      .join('');
    thread.scrollTop = thread.scrollHeight;
  }

  function loadTicket() {
    const res = MockData.getTicketData(ticketId);
    loadingMessage.hidden = true;
    if (res.StatusCode !== MockData.EnumStatusCode.Success || !res.Entries || res.Entries.tenantId !== tenantId) {
      errorMessage.hidden = false;
      errorMessage.textContent = '找不到這筆留言';
      return;
    }
    ticket = res.Entries;
    ticketContent.hidden = false;
    renderMeta();
    renderThread();
  }

  replyBtn.addEventListener('click', function () {
    replyError.hidden = true;
    replySuccess.hidden = true;

    const content = replyContent.value.trim();
    if (!content) {
      replyError.hidden = false;
      replyError.textContent = '請輸入回覆內容';
      return;
    }

    replyBtn.disabled = true;
    const res = MockData.replyAndUpdateStatus({
      id: ticketId,
      content,
      senderType: 'tenant',
      senderName: BizAuthService.getUserName(),
      status: closeCheckbox.checked ? 'closed' : undefined
    });
    replyBtn.disabled = false;

    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      ticket = res.Entries;
      renderMeta();
      renderThread();
      replyContent.value = '';
      closeCheckbox.checked = false;
      replySuccess.hidden = false;
      replySuccess.textContent = '已送出回覆';
    } else {
      replyError.hidden = false;
      replyError.textContent = res.Message || '回覆失敗';
    }
  });

  loadTicket();
})();
