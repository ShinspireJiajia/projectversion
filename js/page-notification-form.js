/* page-notification-form.js：通知公告新增／編輯頁互動邏輯 */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'notifications' }, '*');
  }

  const params = new URLSearchParams(location.search);
  const idParam = params.get('id');
  const isNew = !idParam;
  const notificationId = isNew ? 0 : Number(idParam);

  const pageTitle = document.getElementById('page-title');
  const form = document.getElementById('notification-form');
  const titleInput = document.getElementById('title');
  const categorySelect = document.getElementById('category');
  const contentTextarea = document.getElementById('content');
  const scopeAllRadio = document.getElementById('scope-all');
  const scopeTargetedRadio = document.getElementById('scope-targeted');
  const targetTenantsField = document.getElementById('target-tenants-field');
  const targetTenantsSelect = document.getElementById('target-tenants');
  const isPublicCheckbox = document.getElementById('is-public');
  const publishNowRadio = document.getElementById('publish-now');
  const publishScheduledRadio = document.getElementById('publish-scheduled');
  const publishAtField = document.getElementById('publish-at-field');
  const publishAtInput = document.getElementById('publish-at');
  const expireAtInput = document.getElementById('expire-at');
  const formError = document.getElementById('form-error');
  const formSuccess = document.getElementById('form-success');
  const saveDraftBtn = document.getElementById('save-draft-btn');
  const publishBtn = document.getElementById('publish-btn');

  pageTitle.textContent = isNew ? '新增通知' : '編輯通知';

  // 指定租戶下拉：取用建商租戶清單（跟租戶管理共用同一份 mock 資料）
  const tenantListRes = MockData.getTenantList();
  (tenantListRes.Entries || []).forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.CID;
    opt.textContent = `${t.CName}（${t.CID}）`;
    targetTenantsSelect.appendChild(opt);
  });

  function toggleScopeFields() {
    targetTenantsField.hidden = !scopeTargetedRadio.checked;
  }
  scopeAllRadio.addEventListener('change', toggleScopeFields);
  scopeTargetedRadio.addEventListener('change', toggleScopeFields);
  toggleScopeFields();

  function togglePublishAtField() {
    publishAtField.hidden = !publishScheduledRadio.checked;
  }
  publishNowRadio.addEventListener('change', togglePublishAtField);
  publishScheduledRadio.addEventListener('change', togglePublishAtField);
  togglePublishAtField();

  // TinyMCE：原型用途，CDN 載入失敗或延遲時直接以純 textarea 運作，不阻塞流程
  function initEditor() {
    if (window.tinymce) {
      tinymce.init({
        selector: '#content',
        height: 320,
        menubar: false,
        branding: false,
        plugins: 'lists link',
        toolbar: 'bold italic underline | bullist numlist | link | removeformat'
      });
    }
  }
  setTimeout(initEditor, 300);

  function getContentValue() {
    if (window.tinymce && tinymce.get('content')) {
      return tinymce.get('content').getContent();
    }
    return contentTextarea.value;
  }

  function setContentValue(html) {
    contentTextarea.value = html || '';
    if (window.tinymce && tinymce.get('content')) {
      tinymce.get('content').setContent(html || '');
    }
  }

  function toDatetimeLocal(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  if (!isNew) {
    loadNotification(notificationId);
  }

  function loadNotification(id) {
    const res = MockData.getNotificationData(id);
    if (res.StatusCode !== MockData.EnumStatusCode.Success || !res.Entries) {
      formError.hidden = false;
      formError.textContent = '讀取通知資料失敗';
      return;
    }
    const d = res.Entries;
    pageTitle.textContent = d.title;
    titleInput.value = d.title;
    categorySelect.value = d.category || '系統公告';
    contentTextarea.value = d.content || '';
    // TinyMCE 為非同步載入，設定內容時需重試一次確保編輯器已就緒
    setTimeout(() => setContentValue(d.content || ''), 500);

    if (d.scopeType === 'targeted') {
      scopeTargetedRadio.checked = true;
      Array.from(targetTenantsSelect.options).forEach((opt) => {
        opt.selected = (d.targetTenantIds || []).includes(opt.value);
      });
    } else {
      scopeAllRadio.checked = true;
    }
    toggleScopeFields();

    isPublicCheckbox.checked = !!d.isPublic;

    if (d.publishAt) {
      publishScheduledRadio.checked = true;
      publishAtInput.value = toDatetimeLocal(d.publishAt);
    } else {
      publishNowRadio.checked = true;
    }
    togglePublishAtField();

    expireAtInput.value = d.expireAt ? toDatetimeLocal(d.expireAt) : '';
  }

  function collectFormModel(publishStatus) {
    const scopeType = scopeTargetedRadio.checked ? 'targeted' : 'all';
    const targetTenantIds = scopeType === 'targeted'
      ? Array.from(targetTenantsSelect.selectedOptions).map((o) => o.value)
      : [];
    let publishAt = null;
    if (publishScheduledRadio.checked && publishAtInput.value) {
      publishAt = new Date(publishAtInput.value).toISOString();
    } else if (publishStatus === 'published') {
      publishAt = new Date().toISOString();
    }
    return {
      id: isNew ? undefined : notificationId,
      title: titleInput.value,
      category: categorySelect.value,
      content: getContentValue(),
      scopeType,
      targetTenantIds,
      isPublic: isPublicCheckbox.checked,
      publishStatus,
      publishAt,
      expireAt: expireAtInput.value ? new Date(expireAtInput.value).toISOString() : null,
      createdByAdminName: AuthService.getUserName()
    };
  }

  function submit(publishStatus) {
    formError.hidden = true;
    formSuccess.hidden = true;

    if (!titleInput.value.trim()) {
      formError.hidden = false;
      formError.textContent = '請輸入標題';
      return;
    }
    if (scopeTargetedRadio.checked && !targetTenantsSelect.selectedOptions.length) {
      formError.hidden = false;
      formError.textContent = '請至少選擇一個指定租戶';
      return;
    }

    const model = collectFormModel(publishStatus);
    saveDraftBtn.disabled = true;
    publishBtn.disabled = true;
    const res = MockData.saveNotification(model);
    saveDraftBtn.disabled = false;
    publishBtn.disabled = false;

    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      formSuccess.hidden = false;
      formSuccess.textContent = publishStatus === 'published' ? '已發布' : '已儲存草稿';
      if (isNew) {
        location.href = `notification-form.html?id=${res.Entries}`;
      }
    } else {
      formError.hidden = false;
      formError.textContent = res.Message || '儲存失敗';
    }
  }

  saveDraftBtn.addEventListener('click', () => submit('draft'));
  publishBtn.addEventListener('click', () => submit('published'));

  // 原型用途：表單本身不需要原生 submit（改由儲存草稿／發布兩顆按鈕分別觸發），
  // 但仍攔截 Enter 觸發的預設送出行為避免整頁刷新
  form.addEventListener('submit', function (event) {
    event.preventDefault();
  });
})();
