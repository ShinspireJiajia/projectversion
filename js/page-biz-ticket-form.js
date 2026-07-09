/* page-biz-ticket-form.js：建商租戶服務入口「新增留言」互動邏輯 */

(function () {
  if (!BizAuthService.requireLogin(window, '../biz-login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'biz-page-loaded', group: 'tickets' }, '*');
  }

  const tenantId = BizAuthService.getTenantId();

  const form = document.getElementById('ticket-form');
  const subjectInput = document.getElementById('subject');
  const contentInput = document.getElementById('content');
  const formError = document.getElementById('form-error');
  const submitBtn = document.getElementById('submit-btn');

  const tenantListRes = MockData.getTenantList();
  const tenant = (tenantListRes.Entries || []).find((t) => t.CID === tenantId);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    formError.hidden = true;

    submitBtn.disabled = true;
    const res = MockData.createTicket({
      tenantId,
      tenantName: tenant ? tenant.CName : '',
      subject: subjectInput.value,
      content: contentInput.value,
      createdByUserName: BizAuthService.getUserName()
    });
    submitBtn.disabled = false;

    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      location.href = `biz-ticket-detail.html?id=${res.Entries}`;
    } else {
      formError.hidden = false;
      formError.textContent = res.Message || '送出失敗';
    }
  });
})();
