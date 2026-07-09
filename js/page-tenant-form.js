/* page-tenant-form.js：建商租戶新增／編輯頁互動邏輯 */

(function () {
  if (!AuthService.requireLogin(window, '../login.html')) {
    return;
  }

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'pt-page-loaded', group: 'tenants' }, '*');
  }

  const params = new URLSearchParams(location.search);
  const idParam = params.get('id');
  const isNew = !idParam;

  const pageTitle = document.getElementById('page-title');
  const form = document.getElementById('tenant-form');
  const cidInput = document.getElementById('cid');
  const cidError = document.getElementById('cid-error');
  const nameInput = document.getElementById('name');
  const descInput = document.getElementById('desc');
  const taxIdInput = document.getElementById('taxId');
  const contractStartInput = document.getElementById('contractStart');
  const contractEndInput = document.getElementById('contractEnd');
  const buildCaseMaxInput = document.getElementById('buildCaseMax');
  const planSelect = document.getElementById('plan');
  const formError = document.getElementById('form-error');
  const formSuccess = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');

  const statusCard = document.getElementById('status-card');
  const statusText = document.getElementById('status-text');
  const statusActiveBtn = document.getElementById('status-active-btn');
  const statusDisabledBtn = document.getElementById('status-disabled-btn');
  const statusTerminatedBtn = document.getElementById('status-terminated-btn');
  const currentVersionText = document.getElementById('current-version-text');
  const lastUpdatedText = document.getElementById('last-updated-text');
  const versionHistoryLink = document.getElementById('version-history-link');

  const modulesCard = document.getElementById('modules-card');
  const modulesTableBody = document.getElementById('modules-table-body');

  const notesCard = document.getElementById('notes-card');
  const noteContentInput = document.getElementById('note-content');
  const noteAddBtn = document.getElementById('note-add-btn');
  const noteError = document.getElementById('note-error');
  const notesTableBody = document.getElementById('notes-table-body');
  const notesEmptyHint = document.getElementById('notes-empty-hint');

  let currentStatus = 1;
  let moduleOverrides = [];
  let featureModuleTiers = [];
  let planModuleCodes = [];
  let tenantNotes = [];
  const collapsedTiers = new Set();
  const collapsedCategories = new Set();

  submitBtn.textContent = isNew ? '建立' : '儲存';

  if (isNew) {
    pageTitle.textContent = '新增建商';
  } else {
    cidInput.disabled = true;
    statusCard.hidden = false;
    modulesCard.hidden = false;
    notesCard.hidden = false;
  }

  // 合作方案下拉選單
  const planListRes = MockData.getPlanList();
  if (planListRes.StatusCode === MockData.EnumStatusCode.Success) {
    (planListRes.Entries || []).forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.CurrentVersionId;
      opt.textContent = `${p.CName}（v${p.CurrentVersionNo}，上限 ${p.CurrentBuildCaseMax}）`;
      planSelect.appendChild(opt);
    });
  }

  // 功能模組清單（編輯時才顯示覆寫表格）
  const featureModuleTierRes = MockData.getFeatureModuleTiers();
  featureModuleTiers = featureModuleTierRes.Entries || [];

  if (!isNew) {
    loadTenant(idParam);
  }

  function loadTenant(cid) {
    const res = MockData.getTenantData(cid);
    if (res.StatusCode !== MockData.EnumStatusCode.Success || !res.Entries) {
      formError.hidden = false;
      formError.textContent = '讀取租戶資料失敗';
      return;
    }
    const d = res.Entries;
    pageTitle.textContent = d.CName;
    cidInput.value = d.CID;
    nameInput.value = d.CName;
    descInput.value = d.CDescription || '';
    taxIdInput.value = d.CTaxId || '';
    contractStartInput.value = (d.CContractStartDT || '').substring(0, 10);
    contractEndInput.value = (d.CAccountExpireDT || '').substring(0, 10);
    buildCaseMaxInput.value = d.CBuildCaseMax;
    planSelect.value = d.CPlanVersionId || '';
    currentStatus = d.CStatus ?? 1;
    moduleOverrides = d.ModuleOverrides || [];
    tenantNotes = d.Notes || [];
    loadPlanModules(d.CPlanVersionId);
    renderStatus();
    renderModules();
    renderNotes();
    renderSystemInfo(d);
  }

  // 目前版本／上次更新時間來自版本管理模組與租戶紀錄的異動時間，每次任何異動成功後都要重新讀取以維持同步
  function renderSystemInfo(d) {
    currentVersionText.textContent = `目前程式版本：${d.CCurrentAppVersion ? 'v' + d.CCurrentAppVersion : '－（尚無版本紀錄）'}`;
    lastUpdatedText.textContent = `上次更新時間：${d.CUpdatedAt ? formatDateTime(d.CUpdatedAt) : '－'}`;
    versionHistoryLink.href = `version-list.html?tenant=${encodeURIComponent(d.CID)}`;
  }

  function refreshSystemInfo() {
    const res = MockData.getTenantData(cidInput.value);
    if (res.StatusCode === MockData.EnumStatusCode.Success && res.Entries) {
      renderSystemInfo(res.Entries);
    }
  }

  function loadPlanModules(versionId) {
    const res = MockData.getPlanModulesByVersionId(versionId);
    planModuleCodes = res.StatusCode === MockData.EnumStatusCode.Success ? res.Entries : [];
  }

  // 方案下拉選單一變更就重新讀取該方案版本的預設模組，讓「方案預設」欄即時反映尚未儲存的選擇
  planSelect.addEventListener('change', function () {
    if (isNew) return;
    loadPlanModules(planSelect.value ? Number(planSelect.value) : null);
    renderModules();
  });

  function renderStatus() {
    const label = currentStatus === 1 ? '啟用中' : currentStatus === 9 ? '已終止' : '停用';
    statusText.textContent = `目前狀態：${label}`;
    statusActiveBtn.disabled = currentStatus === 1;
    statusDisabledBtn.disabled = currentStatus === 0;
    statusTerminatedBtn.disabled = currentStatus === 9;
  }

  function isPlanDefault(code) {
    return planModuleCodes.includes(code);
  }

  // 覆寫存在時以覆寫為準，否則沿用方案預設
  function effectiveGrant(code) {
    const override = moduleOverrides.find((m) => m.CModuleCode === code);
    return override ? override.CIsGrant : isPlanDefault(code);
  }

  // 套用單一模組的覆寫結果（成功回傳 true），失敗時顯示錯誤並回傳 false
  function applyModuleOverride(code, grantValue) {
    const res = MockData.setTenantModuleOverride({ CID: cidInput.value, CModuleCode: code, CIsGrant: grantValue });
    if (res.StatusCode !== MockData.EnumStatusCode.Success) {
      formError.hidden = false;
      formError.textContent = '更新模組覆寫失敗';
      return false;
    }
    if (grantValue === null) {
      moduleOverrides = moduleOverrides.filter((m) => m.CModuleCode !== code);
    } else {
      const existing = moduleOverrides.find((m) => m.CModuleCode === code);
      if (existing) {
        existing.CIsGrant = grantValue;
      } else {
        moduleOverrides.push({ CModuleCode: code, CIsGrant: grantValue });
      }
    }
    refreshSystemInfo();
    return true;
  }

  function renderModules() {
    modulesTableBody.innerHTML = featureModuleTiers
      .map((tier) => {
        const tierCollapsed = collapsedTiers.has(tier.CTier);
        const categoryRows = tier.Categories.map((cat) => {
          const catCollapsed = collapsedCategories.has(cat.CCategory);
          const moduleRows = cat.Modules.map((m) => {
            const inPlan = isPlanDefault(m.CModuleCode);
            const effective = effectiveGrant(m.CModuleCode);
            const overridden = effective !== inPlan;
            return `
              <tr>
                <td class="module-name">${escapeHtml(m.CModuleName)}</td>
                <td>${escapeHtml(m.CDescription)}</td>
                <td><span class="pill ${MockData.devStatusPillClass(m.CDevStatus)}" title="${escapeHtml(m.CDevNote)}">${escapeHtml(m.CDevStatus)}</span></td>
                <td><span class="pill ${inPlan ? 'good' : 'neutral'}">${inPlan ? '含' : '不含'}</span></td>
                <td>
                  <input type="checkbox" data-module-code="${escapeHtml(m.CModuleCode)}" ${effective ? 'checked' : ''} />
                  ${overridden ? `<span class="hint-inline">（已覆寫${effective ? '開啟' : '關閉'}）</span>` : ''}
                </td>
              </tr>
            `;
          }).join('');
          return `
            <tr class="category-row" data-category="${escapeHtml(cat.CCategory)}">
              <td colspan="5"><i class="fa-solid ${catCollapsed ? 'fa-caret-right' : 'fa-caret-down'}"></i>${escapeHtml(cat.CCategory)}</td>
            </tr>
            ${catCollapsed ? '' : moduleRows}
          `;
        }).join('');
        return `
          <tr class="tier-row" data-tier="${escapeHtml(tier.CTier)}">
            <td colspan="5"><i class="fa-solid ${tierCollapsed ? 'fa-caret-right' : 'fa-caret-down'}"></i>${escapeHtml(tier.CTier)}</td>
          </tr>
          ${tierCollapsed ? '' : categoryRows}
        `;
      })
      .join('');

    modulesTableBody.querySelectorAll('input[data-module-code]').forEach((checkbox) => {
      checkbox.addEventListener('change', function () {
        const code = checkbox.dataset.moduleCode;
        const newValue = checkbox.checked;
        // 勾選結果若跟方案預設相同，代表不需要覆寫，直接把覆寫清掉即可
        const grantValue = newValue === isPlanDefault(code) ? null : newValue;
        if (applyModuleOverride(code, grantValue)) {
          renderModules();
        } else {
          checkbox.checked = !checkbox.checked;
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

  cidInput.addEventListener('input', function () {
    const upper = cidInput.value.toUpperCase();
    if (upper !== cidInput.value) {
      cidInput.value = upper;
    }
    const valid = /^[A-Z0-9_-]*$/.test(upper);
    cidError.hidden = valid;
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    formError.hidden = true;
    formSuccess.hidden = true;

    const model = {
      CID: cidInput.value,
      CName: nameInput.value,
      CDescription: descInput.value,
      CTaxId: taxIdInput.value,
      CContractStartDT: contractStartInput.value,
      CAccountExpireDT: contractEndInput.value,
      CBuildCaseMax: Number(buildCaseMaxInput.value),
      CPlanVersionId: planSelect.value ? Number(planSelect.value) : null
    };

    submitBtn.disabled = true;

    if (isNew) {
      const res = MockData.createTenant(model);
      submitBtn.disabled = false;
      if (res.StatusCode === MockData.EnumStatusCode.Success) {
        location.href = `tenant-form.html?id=${encodeURIComponent(res.Entries)}`;
      } else {
        formError.hidden = false;
        formError.textContent = res.Message || '建立失敗';
      }
    } else {
      const res = MockData.updateTenant(model);
      submitBtn.disabled = false;
      if (res.StatusCode === MockData.EnumStatusCode.Success) {
        formSuccess.hidden = false;
        formSuccess.textContent = '已儲存';
        refreshSystemInfo();
      } else {
        formError.hidden = false;
        formError.textContent = res.Message || '儲存失敗';
      }
    }
  });

  function setStatus(newStatus) {
    const res = MockData.setTenantStatus({ CID: cidInput.value, CStatus: newStatus });
    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      currentStatus = newStatus;
      renderStatus();
      refreshSystemInfo();
    } else {
      formError.hidden = false;
      formError.textContent = res.Message || '更新狀態失敗';
    }
  }

  statusActiveBtn.addEventListener('click', () => setStatus(1));
  statusDisabledBtn.addEventListener('click', () => setStatus(0));
  statusTerminatedBtn.addEventListener('click', () => setStatus(9));

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso || '';
    return d.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // 備註軌跡：tenantNotes 已依新增時間倒序排列（最新在前），直接依序渲染即可
  function renderNotes() {
    notesEmptyHint.hidden = tenantNotes.length > 0;
    notesTableBody.innerHTML = tenantNotes.map((n) => `
      <tr>
        <td class="note-col-time">${escapeHtml(formatDateTime(n.CCreatedAt))}</td>
        <td class="note-col-user">${escapeHtml(n.CCreatedBy)}</td>
        <td class="note-content-cell">${escapeHtml(n.CContent)}</td>
      </tr>
    `).join('');
  }

  noteAddBtn.addEventListener('click', function () {
    noteError.hidden = true;
    const content = noteContentInput.value.trim();
    if (!content) {
      noteError.hidden = false;
      noteError.textContent = '請輸入備註內容';
      return;
    }
    noteAddBtn.disabled = true;
    const res = MockData.addTenantNote({ CID: cidInput.value, CContent: content, CCreatedBy: AuthService.getUserName() });
    noteAddBtn.disabled = false;
    if (res.StatusCode === MockData.EnumStatusCode.Success) {
      tenantNotes = res.Entries;
      noteContentInput.value = '';
      renderNotes();
      refreshSystemInfo();
    } else {
      noteError.hidden = false;
      noteError.textContent = res.Message || '新增備註失敗';
    }
  });
})();
