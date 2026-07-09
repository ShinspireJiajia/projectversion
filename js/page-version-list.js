/* page-version-list.js：版本管理列表頁互動邏輯 */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'versions' }, '*');
  }

  const params = new URLSearchParams(location.search);
  const initialTenant = params.get('tenant') || '';

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const table = document.getElementById('version-table');
  const tableBody = document.getElementById('version-table-body');
  const emptyHint = document.getElementById('empty-hint');
  const tenantFilter = document.getElementById('tenant-filter');

  // 篩選下拉選單：帶入所有租戶供選擇，若網址帶 tenant 參數則預先選定（例如從租戶編輯頁點「查看版本歷程」進來）
  const tenantListRes = MockData.getTenantList();
  if (tenantListRes.StatusCode === MockData.EnumStatusCode.Success) {
    (tenantListRes.Entries || []).forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.CID;
      opt.textContent = `${t.CName}（${t.CID}）`;
      tenantFilter.appendChild(opt);
    });
  }
  tenantFilter.value = initialTenant;

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function render(entries) {
    if (!entries.length) {
      table.hidden = true;
      emptyHint.hidden = false;
      return;
    }
    table.hidden = false;
    emptyHint.hidden = true;
    tableBody.innerHTML = entries
      .map(
        (v) => `
          <tr>
            <td class="version-no-cell">v${escapeHtml(v.versionNo)}</td>
            <td>${escapeHtml(v.releaseDate)}</td>
            <td>${v.tenantNames.map((name) => `<span class="pill neutral">${escapeHtml(name)}</span>`).join(' ')}</td>
            <td class="summary-cell">${escapeHtml(v.summary)}</td>
            <td class="branch-cell">${v.sourceBranch ? escapeHtml(v.sourceBranch) : '－'}</td>
            <td class="actions-cell">
              <a class="btn secondary" href="version-form.html?id=${v.id}">編輯</a>
            </td>
          </tr>
        `
      )
      .join('');
  }

  function loadAndRender() {
    const res = MockData.getVersionList(tenantFilter.value || null);
    loadingMessage.hidden = true;
    if (res.StatusCode !== MockData.EnumStatusCode.Success) {
      errorMessage.hidden = false;
      errorMessage.textContent = '讀取版本清單失敗';
      return;
    }
    render(res.Entries || []);
  }

  tenantFilter.addEventListener('change', loadAndRender);

  loadAndRender();
})();
