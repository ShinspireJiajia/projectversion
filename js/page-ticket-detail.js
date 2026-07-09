/* page-ticket-detail.js：工單詳情頁互動邏輯（訊息串、回覆、狀態與承辦人維護） */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'tickets' }, '*');
  }

  const params = new URLSearchParams(location.search);
  const ticketId = Number(params.get('id'));

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const ticketContent = document.getElementById('ticket-content');
  const pageTitle = document.getElementById('page-title');
  const metaTenant = document.getElementById('meta-tenant');
  const metaSubject = document.getElementById('meta-subject');
  const metaRelatedRow = document.getElementById('meta-related-row');
  const metaRelatedLink = document.getElementById('meta-related-link');
  const metaCreatedBy = document.getElementById('meta-created-by');
  const metaCreatedAt = document.getElementById('meta-created-at');
  const statusSelect = document.getElementById('status-select');
  const assigneeSelect = document.getElementById('assignee-select');
  const thread = document.getElementById('thread');
  const replyContent = document.getElementById('reply-content');
  const replyAttachmentsInput = document.getElementById('reply-attachments');
  const attachmentChips = document.getElementById('attachment-chips');
  const replyError = document.getElementById('reply-error');
  const replySuccess = document.getElementById('reply-success');
  const replyBtn = document.getElementById('reply-btn');

  let ticket = null;
  let pendingAttachments = [];

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

  // 承辦人下拉：取用大平台端 mock 管理者名單
  const adminListRes = MockData.getAdminUserList();
  (adminListRes.Entries || []).forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    assigneeSelect.appendChild(opt);
  });

  function renderMeta() {
    pageTitle.textContent = ticket.subject;
    metaTenant.textContent = ticket.tenantName;
    metaSubject.textContent = ticket.subject;
    metaCreatedBy.textContent = ticket.createdByUserName;
    metaCreatedAt.textContent = formatDateTime(ticket.createdAt);

    if (ticket.relatedNotificationId) {
      const res = MockData.getNotificationData(ticket.relatedNotificationId);
      if (res.StatusCode === MockData.EnumStatusCode.Success && res.Entries) {
        metaRelatedRow.hidden = false;
        metaRelatedLink.textContent = res.Entries.title;
        metaRelatedLink.href = `notification-form.html?id=${ticket.relatedNotificationId}`;
      } else {
        metaRelatedRow.hidden = true;
      }
    } else {
      metaRelatedRow.hidden = true;
    }

    statusSelect.value = ticket.status;
    assigneeSelect.value = ticket.assignedAdminName || '';
  }

  function renderThread() {
    thread.innerHTML = (ticket.messages || [])
      .map((m) => {
        const isAdmin = m.senderType === 'admin';
        const attachmentsHtml = (m.attachments || []).length
          ? `<div class="bubble-attachments">${m.attachments.map((a) => `<span class="chip"><i class="fa-solid fa-paperclip"></i> ${escapeHtml(a.name)}</span>`).join('')}</div>`
          : '';
        return `
          <div class="bubble-row ${isAdmin ? 'from-admin' : 'from-tenant'}">
            <div class="bubble">
              <div class="bubble-meta">
                <span class="bubble-sender">${escapeHtml(m.senderName)}${isAdmin ? '（大平台）' : '（建商）'}</span>
                <span class="bubble-time">${formatDateTime(m.createdAt)}</span>
              </div>
              <div class="bubble-content">${escapeHtml(m.content)}</div>
              ${attachmentsHtml}
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
    if (res.StatusCode !== MockData.EnumStatusCode.Success || !res.Entries) {
      errorMessage.hidden = false;
      errorMessage.textContent = '讀取工單資料失敗';
      return;
    }
    ticket = res.Entries;
    ticketContent.hidden = false;
    renderMeta();
    renderThread();
  }

  // 承辦人變更立即儲存（獨立於下方回覆動作）
  assigneeSelect.addEventListener('change', function () {
    const res = MockData.setTicketAssignee({ id: ticketId, assignedAdminName: assigneeSelect.value || null });
    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      ticket.assignedAdminName = assigneeSelect.value || null;
    }
  });

  function renderAttachmentChips() {
    attachmentChips.innerHTML = pendingAttachments
      .map((a) => `<span class="chip"><i class="fa-solid fa-paperclip"></i> ${escapeHtml(a.name)}</span>`)
      .join('');
  }

  // 原型用途：僅擷取檔名顯示為 chip，不做任何實際上傳
  replyAttachmentsInput.addEventListener('change', function () {
    const files = Array.from(replyAttachmentsInput.files || []);
    if (files.length > 5) {
      replyError.hidden = false;
      replyError.textContent = '最多只能附加 5 個檔案';
      replyAttachmentsInput.value = '';
      pendingAttachments = [];
    } else {
      replyError.hidden = true;
      pendingAttachments = files.map((f) => ({ name: f.name }));
    }
    renderAttachmentChips();
  });

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
      attachments: pendingAttachments,
      status: statusSelect.value,
      senderName: AuthService.getUserName()
    });
    replyBtn.disabled = false;

    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      ticket = res.Entries;
      renderMeta();
      renderThread();
      replyContent.value = '';
      pendingAttachments = [];
      replyAttachmentsInput.value = '';
      renderAttachmentChips();
      replySuccess.hidden = false;
      replySuccess.textContent = '已回覆並更新狀態';
    } else {
      replyError.hidden = false;
      replyError.textContent = res.Message || '回覆失敗';
    }
  });

  loadTicket();
})();
