/* page-plan-list.js：合作方案列表頁互動邏輯 */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'plans' }, '*');
  }

  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const table = document.getElementById('plan-table');
  const tableBody = document.getElementById('plan-table-body');
  const hintText = document.getElementById('hint-text');

  let plans = [];

  function render() {
    if (!plans.length) {
      tableBody.innerHTML = '<tr><td colspan="5">目前沒有方案資料</td></tr>';
      return;
    }

    tableBody.innerHTML = plans
      .map(
        (p, index) => `
          <tr>
            <td>${escapeHtml(p.CName)}</td>
            <td>v${p.CurrentVersionNo}</td>
            <td>${p.CurrentBuildCaseMax}</td>
            <td><span class="${p.CIsEnabled ? 'pill good' : 'pill neutral'}">${p.CIsEnabled ? '上架中' : '已下架'}</span></td>
            <td class="actions-cell">
              <a class="btn secondary" href="plan-form.html?id=${p.CId}">編輯</a>
              <button class="btn secondary" type="button" data-toggle-index="${index}">${p.CIsEnabled ? '下架' : '上架'}</button>
            </td>
          </tr>
        `
      )
      .join('');

    tableBody.querySelectorAll('button[data-toggle-index]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const plan = plans[Number(btn.dataset.toggleIndex)];
        const res = MockData.setPlanEnabled({ CPlanId: plan.CId, CIsEnabled: !plan.CIsEnabled });
        if (res.StatusCode === MockData.EnumStatusCode.Success) {
          plan.CIsEnabled = !plan.CIsEnabled;
          render();
        }
      });
    });
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  const res = MockData.getPlanList();
  loadingMessage.hidden = true;
  if (res.StatusCode === MockData.EnumStatusCode.Success) {
    table.hidden = false;
    hintText.hidden = false;
    plans = res.Entries || [];
    render();
  } else {
    errorMessage.hidden = false;
    errorMessage.textContent = '讀取方案清單失敗';
  }
})();
