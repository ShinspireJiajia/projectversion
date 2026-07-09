/* page-version-form.js：版本紀錄新增／編輯頁互動邏輯 */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'versions' }, '*');
  }

  const params = new URLSearchParams(location.search);
  const idParam = params.get('id');
  const isNew = !idParam;

  const pageTitle = document.getElementById('page-title');
  const form = document.getElementById('version-form');
  const versionNoInput = document.getElementById('versionNo');
  const releaseDateInput = document.getElementById('releaseDate');
  const summaryInput = document.getElementById('summary');
  const sourceBranchInput = document.getElementById('sourceBranch');
  const tenantCheckboxList = document.getElementById('tenant-checkbox-list');
  const metaHint = document.getElementById('meta-hint');
  const formError = document.getElementById('form-error');
  const formSuccess = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');

  let tenants = [];

  submitBtn.textContent = isNew ? '建立' : '儲存';

  const tenantListRes = MockData.getTenantList();
  tenants = tenantListRes.StatusCode === MockData.EnumStatusCode.Success ? (tenantListRes.Entries || []) : [];
  renderTenantCheckboxes([]);

  if (isNew) {
    releaseDateInput.value = new Date().toISOString().substring(0, 10);
  } else {
    loadVersion(Number(idParam));
  }

  function renderTenantCheckboxes(selectedIds) {
    const selected = new Set(selectedIds);
    tenantCheckboxList.innerHTML = tenants
      .map(
        (t) => `
          <label class="tenant-checkbox-item">
            <input type="checkbox" value="${t.CID}" ${selected.has(t.CID) ? 'checked' : ''} />
            ${t.CName}（${t.CID}）
          </label>
        `
      )
      .join('');
  }

  function getSelectedTenantIds() {
    return Array.from(tenantCheckboxList.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso || '';
    return d.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function loadVersion(id) {
    const res = MockData.getVersionData(id);
    if (res.StatusCode !== MockData.EnumStatusCode.Success || !res.Entries) {
      formError.hidden = false;
      formError.textContent = '讀取版本紀錄失敗';
      return;
    }
    const d = res.Entries;
    pageTitle.textContent = `v${d.versionNo}`;
    versionNoInput.value = d.versionNo;
    releaseDateInput.value = d.releaseDate;
    summaryInput.value = d.summary || '';
    sourceBranchInput.value = d.sourceBranch || '';
    renderTenantCheckboxes(d.tenantIds || []);
    metaHint.hidden = false;
    metaHint.textContent = `建立人：${d.createdBy || '－'}／建立時間：${formatDateTime(d.createdAt)}`;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    formError.hidden = true;
    formSuccess.hidden = true;

    const model = {
      versionNo: versionNoInput.value,
      releaseDate: releaseDateInput.value,
      summary: summaryInput.value,
      sourceBranch: sourceBranchInput.value,
      tenantIds: getSelectedTenantIds()
    };

    submitBtn.disabled = true;

    if (isNew) {
      const res = MockData.createVersionRecord(Object.assign(model, { createdBy: AuthService.getUserName() }));
      submitBtn.disabled = false;
      if (res.StatusCode === MockData.EnumStatusCode.Success) {
        location.href = `version-form.html?id=${res.Entries}`;
      } else {
        formError.hidden = false;
        formError.textContent = res.Message || '建立失敗';
      }
    } else {
      const res = MockData.updateVersionRecord(Object.assign(model, { id: Number(idParam) }));
      submitBtn.disabled = false;
      if (res.StatusCode === MockData.EnumStatusCode.Success) {
        formSuccess.hidden = false;
        formSuccess.textContent = '已儲存';
      } else {
        formError.hidden = false;
        formError.textContent = res.Message || '儲存失敗';
      }
    }
  });
})();
