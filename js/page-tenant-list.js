/* page-tenant-list.js：建商租戶列表頁互動邏輯（篩選建商名稱／統編／狀態，並分頁顯示） */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  // 通知外層 masterpage 目前所屬導覽群組，讓側邊選單反白正確
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'tenants' }, '*');
  }

  const PAGE_SIZE = 10;

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const table = document.getElementById('tenant-table');
  const tableBody = document.getElementById('tenant-table-body');
  const emptyHint = document.getElementById('empty-hint');

  const nameFilter = document.getElementById('name-filter');
  const taxIdFilter = document.getElementById('taxid-filter');
  const statusFilter = document.getElementById('status-filter');
  const resetFilterBtn = document.getElementById('reset-filter-btn');

  const paginationRow = document.getElementById('pagination-row');
  const paginationInfo = document.getElementById('pagination-info');
  const prevPageBtn = document.getElementById('prev-page-btn');
  const nextPageBtn = document.getElementById('next-page-btn');

  let currentPage = 1;
  let debounceTimer = null;

  function statusLabel(status) {
    switch (status) {
      case 1:
        return '啟用中';
      case 0:
        return '停用';
      case 9:
        return '已終止';
      default:
        return '未知';
    }
  }

  function statusPillClass(status) {
    if (status === 1) return 'pill good';
    if (status === 9) return 'pill critical';
    return 'pill neutral';
  }

  function isExpiringSoon(expireDt) {
    const days = (new Date(expireDt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function render(tenants) {
    tableBody.innerHTML = tenants
      .map((t) => {
        const expiringBadge = isExpiringSoon(t.CAccountExpireDT) ? '<span class="pill critical">即將到期</span>' : '';
        return `
          <tr>
            <td class="code-cell">${escapeHtml(t.CID)}</td>
            <td>${escapeHtml(t.CName)}</td>
            <td>${escapeHtml(t.CTaxId) || '—'}</td>
            <td>${escapeHtml(t.PlanName) || '未指定'}</td>
            <td>${escapeHtml(t.CAccountExpireDT)} ${expiringBadge}</td>
            <td><span class="${statusPillClass(t.CStatus)}">${statusLabel(t.CStatus)}</span></td>
            <td class="actions-cell">
              <a class="btn secondary" href="tenant-form.html?id=${encodeURIComponent(t.CID)}">編輯</a>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function renderPagination(totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    paginationRow.hidden = totalItems === 0;
    paginationInfo.textContent = `第 ${currentPage} / ${totalPages} 頁（共 ${totalItems} 筆）`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  function loadAndRender() {
    const res = MockData.getTenantList({
      name: nameFilter.value,
      taxId: taxIdFilter.value,
      status: statusFilter.value,
      page: currentPage,
      pageSize: PAGE_SIZE
    });
    loadingMessage.hidden = true;
    if (res.StatusCode !== MockData.EnumStatusCode.Success) {
      errorMessage.hidden = false;
      errorMessage.textContent = '讀取租戶清單失敗';
      return;
    }
    const entries = res.Entries || [];
    if (res.TotalItems === 0) {
      table.hidden = true;
      emptyHint.hidden = false;
      paginationRow.hidden = true;
      return;
    }
    table.hidden = false;
    emptyHint.hidden = true;
    render(entries);
    renderPagination(res.TotalItems);
  }

  function onFilterChange() {
    currentPage = 1;
    loadAndRender();
  }

  // 文字篩選欄位加上簡單防抖，避免每敲一個字就重新查詢
  function onFilterInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onFilterChange, 250);
  }

  nameFilter.addEventListener('input', onFilterInput);
  taxIdFilter.addEventListener('input', onFilterInput);
  statusFilter.addEventListener('change', onFilterChange);

  resetFilterBtn.addEventListener('click', function () {
    nameFilter.value = '';
    taxIdFilter.value = '';
    statusFilter.value = '';
    onFilterChange();
  });

  prevPageBtn.addEventListener('click', function () {
    if (currentPage > 1) {
      currentPage -= 1;
      loadAndRender();
    }
  });

  nextPageBtn.addEventListener('click', function () {
    currentPage += 1;
    loadAndRender();
  });

  loadAndRender();
})();
