/* page-plan-form.js：合作方案新增／編輯頁互動邏輯 */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'plans' }, '*');
  }

  const params = new URLSearchParams(location.search);
  const idParam = params.get('id');
  const isNew = !idParam;
  const planId = isNew ? 0 : Number(idParam);

  const pageTitle = document.getElementById('page-title');
  const revisionNote = document.getElementById('revision-note');
  const form = document.getElementById('plan-form');
  const nameInput = document.getElementById('name');
  const buildCaseMaxInput = document.getElementById('buildCaseMax');
  const modulesTableBody = document.getElementById('modules-table-body');
  const formError = document.getElementById('form-error');
  const formSuccess = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');

  let featureModuleTiers = [];
  let selectedModuleCodes = new Set();
  let currentVersionNo = 0;
  const collapsedTiers = new Set();
  const collapsedCategories = new Set();

  submitBtn.textContent = isNew ? '建立' : '儲存為新版本';

  if (!isNew) {
    nameInput.disabled = true;
    revisionNote.hidden = false;
  }

  const featureModuleTierRes = MockData.getFeatureModuleTiers();
  featureModuleTiers = featureModuleTierRes.Entries || [];

  if (!isNew) {
    loadPlan(planId);
  } else {
    buildCaseMaxInput.value = 10;
    renderModules();
  }

  function loadPlan(id) {
    const res = MockData.getPlanData(id);
    if (res.StatusCode !== MockData.EnumStatusCode.Success || !res.Entries) {
      formError.hidden = false;
      formError.textContent = '讀取方案資料失敗';
      return;
    }
    const d = res.Entries;
    nameInput.value = d.CName;
    buildCaseMaxInput.value = d.CurrentBuildCaseMax;
    currentVersionNo = d.CurrentVersionNo;
    selectedModuleCodes = new Set(d.ModuleCodes || []);
    pageTitle.textContent = `${d.CName}（v${d.CurrentVersionNo}）`;
    renderModules();
  }

  function renderModules() {
    modulesTableBody.innerHTML = featureModuleTiers
      .map((tier) => {
        const tierCollapsed = collapsedTiers.has(tier.CTier);
        const categoryRows = tier.Categories.map((cat) => {
          const catCollapsed = collapsedCategories.has(cat.CCategory);
          const moduleRows = cat.Modules.map(
            (m) => `
              <tr>
                <td class="module-name">${escapeHtml(m.CModuleName)}</td>
                <td>${escapeHtml(m.CDescription)}</td>
                <td><span class="pill ${MockData.devStatusPillClass(m.CDevStatus)}" title="${escapeHtml(m.CDevNote)}">${escapeHtml(m.CDevStatus)}</span></td>
                <td><input type="checkbox" data-module-code="${escapeHtml(m.CModuleCode)}" ${selectedModuleCodes.has(m.CModuleCode) ? 'checked' : ''} /></td>
              </tr>
            `
          ).join('');
          return `
            <tr class="category-row" data-category="${escapeHtml(cat.CCategory)}">
              <td colspan="4"><i class="fa-solid ${catCollapsed ? 'fa-caret-right' : 'fa-caret-down'}"></i>${escapeHtml(cat.CCategory)}</td>
            </tr>
            ${catCollapsed ? '' : moduleRows}
          `;
        }).join('');
        return `
          <tr class="tier-row" data-tier="${escapeHtml(tier.CTier)}">
            <td colspan="4"><i class="fa-solid ${tierCollapsed ? 'fa-caret-right' : 'fa-caret-down'}"></i>${escapeHtml(tier.CTier)}</td>
          </tr>
          ${tierCollapsed ? '' : categoryRows}
        `;
      })
      .join('');

    modulesTableBody.querySelectorAll('input[data-module-code]').forEach((checkbox) => {
      checkbox.addEventListener('change', function () {
        const code = checkbox.dataset.moduleCode;
        if (checkbox.checked) {
          selectedModuleCodes.add(code);
        } else {
          selectedModuleCodes.delete(code);
        }
      });
    });

    // 點分類列／基本功能・擴充功能列＝收合或展開該層底下的項目
    modulesTableBody.querySelectorAll('.category-row').forEach((row) => {
      row.addEventListener('click', function () {
        const category = row.dataset.category;
        if (collapsedCategories.has(category)) {
          collapsedCategories.delete(category);
        } else {
          collapsedCategories.add(category);
        }
        renderModules();
      });
    });

    modulesTableBody.querySelectorAll('.tier-row').forEach((row) => {
      row.addEventListener('click', function () {
        const tier = row.dataset.tier;
        if (collapsedTiers.has(tier)) {
          collapsedTiers.delete(tier);
        } else {
          collapsedTiers.add(tier);
        }
        renderModules();
      });
    });
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    formError.hidden = true;
    formSuccess.hidden = true;

    const moduleCodes = Array.from(selectedModuleCodes);
    const buildCaseMax = Number(buildCaseMaxInput.value);
    submitBtn.disabled = true;

    if (isNew) {
      const res = MockData.createPlan({ CName: nameInput.value, CBuildCaseMax: buildCaseMax, ModuleCodes: moduleCodes });
      submitBtn.disabled = false;
      if (res.StatusCode === MockData.EnumStatusCode.Success) {
        location.href = `plan-form.html?id=${res.Entries}`;
      } else {
        formError.hidden = false;
        formError.textContent = res.Message || '建立失敗';
      }
    } else {
      const res = MockData.createPlanNewVersion({ CPlanId: planId, CBuildCaseMax: buildCaseMax, ModuleCodes: moduleCodes });
      submitBtn.disabled = false;
      if (res.StatusCode === MockData.EnumStatusCode.Success) {
        currentVersionNo += 1;
        pageTitle.textContent = `${nameInput.value}（v${currentVersionNo}）`;
        formSuccess.hidden = false;
        formSuccess.textContent = `已產生新版本 v${currentVersionNo}，既有租戶維持原版本直到手動升版`;
      } else {
        formError.hidden = false;
        formError.textContent = res.Message || '儲存失敗';
      }
    }
  });
})();
