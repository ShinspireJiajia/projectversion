/**
 * mock-data.js
 * 純前端模擬資料層：不呼叫任何後端 API，所有資料存放於 localStorage，
 * 供各功能頁面（tenant-list / tenant-form / plan-list / plan-form）共用讀寫。
 * 回傳格式比照後端 ResponseBase<T>：{ StatusCode, Message, Entries }
 */

const MockData = (function () {
  // v3：功能模組改依 webAPI/App.Enum/Functions.cs 的真實功能重新盤點（CRUD 子權限收斂為單一模組），
  // 分組對齊 CRM4 現有選單（系統管理／個案單管理／綠海養護為已確認選單標題，其餘為依 Functions.cs 排列推論），升版避免舊快取殘留舊模組代碼
  // v4：每個模組新增 CDevStatus／CDevNote（實際開發情形查證結果），升版避免舊快取缺欄位
  // v5：戶別款項管理從戶別管理拆成獨立模組 HOUSEHOLD_PAYMENT_MANAGEMENT，升版避免舊快取殘留舊模組代碼
  // v6：建商租戶新增 Notes（備註軌跡：時間／人員／內容），升版避免舊快取缺欄位
  // v7：新增通知公告（notifications）與留言工單（tickets）雛型資料，升版避免舊快取缺欄位
  // v8：建商租戶新增 CUpdatedAt（最後更新時間）；新增獨立「版本管理」模組（versions，可回溯每次程式版本異動內容，一筆可套用多個租戶），升版避免舊快取缺欄位
  // v9：新增建商租戶服務入口（biz-*）所需資料：留言板可由建商自行建立新留言（nextTicketId 計數器），
  // 通知公告新增「租戶已讀」追蹤（notificationReads，依租戶記錄已讀通知 id），升版避免舊快取缺欄位
  // v10：新增建商租戶端使用者帳號（tenantUsers：帳號僅在租戶內唯一，不同租戶可重複使用同一帳號代碼），
  // 供建商登入頁改為統編＋帳號＋密碼三欄驗證，升版避免舊快取缺欄位
  // v11：租戶端使用者新增 CId／CTitle／CEmail／CIsPrimary（新增建商時同步建立主要聯絡人＝平台管理者帳號，
  // 並可在建商平台新增其他人員），新增 sentEmails（模擬帳號資訊信件發送記錄，供忘記密碼與人員新增流程共用），升版避免舊快取缺欄位
  // v12：新增大平台端管理者帳號（adminAccounts：帳號／密碼／姓名），登入頁改為對這份清單做帳號密碼驗證，
  // 不再只認單一硬編碼示範帳號；原本承辦人名單（getAdminUserList）改為由這份帳號清單的姓名衍生，避免兩份名單失去同步，升版避免舊快取缺欄位
  const STORAGE_KEY = 'pt_admin_mock_db_v12';

  const EnumStatusCode = {
    Success: 0,
    Fail: 1
  };

  // 開發狀況：已完成／部分完成／未開發。CDevNote 為判斷依據（對應 CRM4/webAPI 實際程式碼查證結果，2026-07-07 盤點）
  const EnumDevStatus = {
    Done: '已完成',
    Partial: '部分完成',
    NotStarted: '未開發'
  };

  // 功能模組清單：對齊 webAPI/App.Enum/Functions.cs 的基礎功能（不含 [檢視]/[新增]/[修改]/[刪除]/[匯入]/[匯出] 等 CRUD 子權限）
  const DEFAULT_FEATURE_MODULES = [
    // 系統管理
    { CModuleCode: 'USER_MANAGEMENT', CCategory: '系統管理', CModuleName: '使用者管理', CDescription: 'CRM 後台使用者帳號管理', CDevStatus: EnumDevStatus.Done, CDevNote: '前端頁面＋UserController 完整 CRUD' },
    { CModuleCode: 'ROLE_MANAGEMENT', CCategory: '系統管理', CModuleName: '角色權限管理', CDescription: '角色與功能權限設定', CDevStatus: EnumDevStatus.Done, CDevNote: '角色權限頁面＋UserGroupController 完整' },
    { CModuleCode: 'LOGS_MANAGEMENT', CCategory: '系統管理', CModuleName: '操作紀錄查詢', CDescription: '後台操作歷程查詢', CDevStatus: EnumDevStatus.Done, CDevNote: '查詢與匯出皆有（僅查詢性質，無需新增修改）' },
    // 資料管理
    { CModuleCode: 'TAGS_MANAGEMENT', CCategory: '資料管理', CModuleName: '標籤集管理', CDescription: '行銷標籤集定義與維護', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '前端僅零散引用 /Tag API，後端無 Controller／資料表' },
    { CModuleCode: 'DATA_MANAGEMENT', CCategory: '資料管理', CModuleName: '資料集管理', CDescription: '行銷用資料集匯入與維護', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '僅 Functions.cs 有列舉定義，無任何實作' },
    { CModuleCode: 'DATA_EVENT_MANAGEMENT', CCategory: '資料管理', CModuleName: '資料集活動管理', CDescription: '資料集對應行銷活動管理', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '僅 Functions.cs 有列舉定義，無任何實作' },
    // 會員管理
    { CModuleCode: 'MEMBER_MANAGEMENT', CCategory: '會員管理', CModuleName: '會員管理', CDescription: '會員基本資料建立，含匯入匯出', CDevStatus: EnumDevStatus.Done, CDevNote: 'member-management 頁面＋MemberController 完整' },
    { CModuleCode: 'MEMBER_TAG_MANAGEMENT', CCategory: '會員管理', CModuleName: '會員標籤管理', CDescription: '會員標籤指派與維護', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '前端 service 骨架未被任何頁面使用，後端無實作' },
    { CModuleCode: 'TAG_MEMBER_MANAGEMENT', CCategory: '會員管理', CModuleName: '標籤會員管理', CDescription: '依標籤反查會員名單', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '前端 service 骨架未被任何頁面使用，後端無實作' },
    // 報表
    { CModuleCode: 'REPORT_SALES_FUNNEL', CCategory: '報表', CModuleName: '人營銷售漏斗分析', CDescription: '銷售流程各階段轉換分析', CDevStatus: EnumDevStatus.NotStarted, CDevNote: 'report.service.ts 對應程式碼整段被註解，無頁面無 API' },
    { CModuleCode: 'REPORT_POP_FEATURE', CCategory: '報表', CModuleName: '人群特徵分析', CDescription: '受眾輪廓與特徵分析', CDevStatus: EnumDevStatus.NotStarted, CDevNote: 'report.service.ts 對應程式碼整段被註解，無頁面無 API' },
    { CModuleCode: 'REPORT_ADVERTISION_EFFECT', CCategory: '報表', CModuleName: '廣告效果分析', CDescription: '廣告投放成效分析', CDevStatus: EnumDevStatus.NotStarted, CDevNote: 'report.service.ts 對應程式碼整段被註解，無頁面無 API' },
    { CModuleCode: 'REPORT_CHANNEL_ORDER', CCategory: '報表', CModuleName: '渠道訂單分析', CDescription: '各渠道訂單來源分析', CDevStatus: EnumDevStatus.NotStarted, CDevNote: 'report.service.ts 對應程式碼整段被註解，無頁面無 API' },
    { CModuleCode: 'REPORT_UNIQUE_RESPONDENT', CCategory: '報表', CModuleName: '獨特性及受眾數分布圖', CDescription: '受眾去重與分布統計', CDevStatus: EnumDevStatus.NotStarted, CDevNote: 'report.service.ts 對應程式碼整段被註解，無頁面無 API' },
    { CModuleCode: 'REPAIR_TYPE_STATISTICS', CCategory: '報表', CModuleName: '全部建案維修類統計表', CDescription: '跨建案維修類型統計', CDevStatus: EnumDevStatus.Partial, CDevNote: '僅 iframe 嵌入外部 Looker Studio 報表，無自有統計 API' },
    { CModuleCode: 'REPAIR_PART_STATISTICS', CCategory: '報表', CModuleName: '全部建案維修部品統計表', CDescription: '跨建案維修部品統計', CDevStatus: EnumDevStatus.Partial, CDevNote: '僅 iframe 嵌入外部 Looker Studio 報表，無自有統計 API' },
    { CModuleCode: 'REPAIR_LOCATION_STATISTICS', CCategory: '報表', CModuleName: '全部建案維修位置統計表', CDescription: '跨建案維修位置統計', CDevStatus: EnumDevStatus.Partial, CDevNote: '僅 iframe 嵌入外部 Looker Studio 報表，無自有統計 API' },
    { CModuleCode: 'REPAIR_STATUS_STATISTICS', CCategory: '報表', CModuleName: '全部建案維修狀態統計表', CDescription: '跨建案維修單狀態統計', CDevStatus: EnumDevStatus.Partial, CDevNote: '僅 iframe 嵌入外部 Looker Studio 報表，無自有統計 API' },
    { CModuleCode: 'SATISFACTION_SURVEY_STATISTICS', CCategory: '報表', CModuleName: '滿意度調查統計', CDescription: '售服滿意度問卷統計', CDevStatus: EnumDevStatus.Partial, CDevNote: '僅 iframe 嵌入外部報表，後端無統計 API（僅有問卷設定 Controller）' },
    { CModuleCode: 'CUSTOMER_SATISFACTION_DETAIL', CCategory: '報表', CModuleName: '客戶滿意度明細表', CDescription: '個別客戶滿意度回覆明細', CDevStatus: EnumDevStatus.Partial, CDevNote: '僅 iframe 嵌入外部 Looker Studio 報表，無自有統計 API' },
    { CModuleCode: 'CASE_COUNT_STATISTICS', CCategory: '報表', CModuleName: '案件數量統計表', CDescription: '個案單數量統計', CDevStatus: EnumDevStatus.Partial, CDevNote: '僅 iframe 嵌入外部 Looker Studio 報表，無自有統計 API' },
    { CModuleCode: 'TASK_COMPLETION_STATISTICS', CCategory: '報表', CModuleName: '任務完成統計表', CDescription: '派工任務完成率統計', CDevStatus: EnumDevStatus.Partial, CDevNote: '僅 iframe 嵌入外部 Looker Studio 報表，無自有統計 API' },
    // 個案單管理
    { CModuleCode: 'CASE_MILESTONE', CCategory: '個案單管理', CModuleName: '個案里程碑', CDescription: '個案單進度里程碑設定與追蹤', CDevStatus: EnumDevStatus.Done, CDevNote: '里程碑設定頁＋CaseMileStoneController 完整 CRUD' },
    { CModuleCode: 'UNCLOSED_CASE', CCategory: '個案單管理', CModuleName: '未結案個案單', CDescription: '尚未結案個案單列表', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '無獨立頁面／API，僅是個案單管理列表的篩選條件' },
    { CModuleCode: 'CASE_MANAGEMENT', CCategory: '個案單管理', CModuleName: '個案單管理', CDescription: '售服個案單建立、派工、結案，含匯入匯出', CDevStatus: EnumDevStatus.Done, CDevNote: '個案單/派工頁面＋CaseBaseController 完整，含匯入匯出' },
    { CModuleCode: 'VENDOR_MANAGEMENT', CCategory: '個案單管理', CModuleName: '廠商管理', CDescription: '維修廠商資料管理(驗屋、巡檢功能相關)', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '無 VendorController，廠商欄位僅為自由輸入文字' },
    { CModuleCode: 'PUSH_NOTIFICATION_LOG', CCategory: '個案單管理', CModuleName: '推播記錄查詢', CDescription: 'APP/LINE 推播發送紀錄查詢', CDevStatus: EnumDevStatus.Done, CDevNote: '推播紀錄查詢頁＋LineMessageHistoryController 完整' },
    // 戶別管理
    { CModuleCode: 'HOUSEHOLD_MANAGEMENT', CCategory: '戶別管理', CModuleName: '戶別管理', CDescription: '戶別基本資料、住戶，含匯入匯出', CDevStatus: EnumDevStatus.Done, CDevNote: '戶別/住戶頁面＋ProductHouseController 完整，含匯入匯出' },
    { CModuleCode: 'HOUSEHOLD_PAYMENT_MANAGEMENT', CCategory: '戶別管理', CModuleName: '戶別款項管理', CDescription: '戶別繳款期數/金額設定，及工程進度維護功能', CDevStatus: EnumDevStatus.Partial, CDevNote: 'ProductHousePaymentTermsController API 齊全，但無獨立前端頁面（僅為戶別管理頁內對話框）且權限碼 household_management_payment 未實際掛上 AuthorizationFilter，尚無法真正獨立控管' },
    // 預約管理
    { CModuleCode: 'RESERVATION_COLLATERAL', CCategory: '預約管理', CModuleName: '對保預約', CDescription: '購屋對保作業預約(案場對保問卷設計、戶別預約維護、對保預約表單、對保預約模組管理)', CDevStatus: EnumDevStatus.Done, CDevNote: '對保預約頁＋ReservationCustomController 對保系列端點完整' },
    { CModuleCode: 'RESERVATION_INSPECTION', CCategory: '預約管理', CModuleName: '驗屋預約', CDescription: '驗屋作業預約(戶別預約維護、驗屋預約表單、驗屋預約模組管理)', CDevStatus: EnumDevStatus.Done, CDevNote: '驗屋預約頁＋ReservationInspectionController 完整' },
    { CModuleCode: 'RESERVATION_HANDOVER', CCategory: '預約管理', CModuleName: '交屋預約', CDescription: '交屋作業預約(交屋預約維護、交屋預約表單、交屋預約模組管理)', CDevStatus: EnumDevStatus.Done, CDevNote: '交屋預約頁＋ReservationHandoverController 完整' },
    { CModuleCode: 'RESERVATION_CUSTOM', CCategory: '預約管理', CModuleName: '客變預約', CDescription: '客戶變更需求預約(客變預約維護、客變預約表單、客變預約模組管理)', CDevStatus: EnumDevStatus.Done, CDevNote: '客變預約頁＋ReservationCustomController 完整' },
    // 驗屋管理
    { CModuleCode: 'HOUSE_INSPECTION_MODULE', CCategory: '驗屋管理', CModuleName: '驗屋模組', CDescription: '驗屋作業總開關', CDevStatus: EnumDevStatus.Partial, CDevNote: '實際只做成「預約驗屋」流程，非完整驗屋作業總開關' },
    { CModuleCode: 'INSPECTION_ITEM_MANAGEMENT', CCategory: '驗屋管理', CModuleName: '驗屋項目管理', CDescription: '驗屋檢查項目清單維護', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '僅有資料表 scaffold，無 Controller／BLL／前端頁面' },
    { CModuleCode: 'INSPECTION_HOUSEHOLD_MANAGEMENT', CCategory: '驗屋管理', CModuleName: '驗屋戶別管理', CDescription: '納入驗屋範圍的戶別管理', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '無對應 Controller／BLL／前端頁面' },
    { CModuleCode: 'INSPECTION_REPAIR_RECORD', CCategory: '驗屋管理', CModuleName: '驗屋修繕紀錄', CDescription: '驗屋發現問題的修繕紀錄', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '找不到對應表／BLL／前端（CaseRepairController 屬一般報修）' },
    { CModuleCode: 'INSPECTION_HOUSEHOLD_RECORD', CCategory: '驗屋管理', CModuleName: '驗屋戶別記錄', CDescription: '戶別驗屋歷程記錄', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '僅有資料表 scaffold，無業務邏輯與前端' },
    { CModuleCode: 'INSPECTION_HOUSEHOLD_RECORD_DETAIL', CCategory: '驗屋管理', CModuleName: '驗屋戶別記錄明細', CDescription: '單筆驗屋記錄明細', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '僅有資料表 scaffold，無業務邏輯與前端' },
    { CModuleCode: 'STANDARD_FLOOR_PLAN_MANAGEMENT', CCategory: '驗屋管理', CModuleName: '標準平面圖管理', CDescription: '標準戶型平面圖維護', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '僅有資料表定義，無 Controller／BLL／前端頁面' },
    { CModuleCode: 'HOUSE_INSPECTION_CASE', CCategory: '驗屋管理', CModuleName: '驗屋個案單', CDescription: '驗屋流程個案單，含匯入匯出', CDevStatus: EnumDevStatus.Partial, CDevNote: '驗屋預約流程可匯出，但找不到對應匯入功能' },
    // 巡檢管理
    { CModuleCode: 'PATROL_INSPECTION_MODULE', CCategory: '巡檢管理', CModuleName: '巡檢模組', CDescription: '巡檢作業總開關', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '全專案搜尋「巡檢／Patrol」查無任何實作' },
    { CModuleCode: 'PATROL_ITEM_MANAGEMENT', CCategory: '巡檢管理', CModuleName: '巡檢項目管理', CDescription: '巡檢檢查項目清單維護', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '全專案搜尋「巡檢／Patrol」查無任何實作' },
    { CModuleCode: 'PATROL_CASE', CCategory: '巡檢管理', CModuleName: '巡檢個案單', CDescription: '巡檢流程個案單，含匯入匯出', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '全專案搜尋「巡檢／Patrol」查無任何實作' },
    // 綠海養護（CRM4 確認存在的選單標題）
    { CModuleCode: 'GREENLAND_REPAIR_CASE', CCategory: '綠海養護', CModuleName: '綠海報修個案單', CDescription: '綠海養護體系報修個案單，含轉換/結案/匯入匯出', CDevStatus: EnumDevStatus.Done, CDevNote: '綠海報修個案單流程＋通知（GreenSeaNotiService）皆完整' },
    { CModuleCode: 'SITE_MANAGEMENT', CCategory: '綠海養護', CModuleName: '案場管理', CDescription: '建案案場基本資料管理', CDevStatus: EnumDevStatus.Done, CDevNote: '案場管理頁＋ContractController 對應端點完整' },
    { CModuleCode: 'RESERVATION_RECORD_MANAGEMENT', CCategory: '綠海養護', CModuleName: '預約紀錄管理', CDescription: '綠海養護預約紀錄管理', CDevStatus: EnumDevStatus.Done, CDevNote: '綠海預約紀錄新增/編輯/完成流程完整' },
    // APP／通路
    { CModuleCode: 'APP_USER_MANAGEMENT', CCategory: 'APP／通路', CModuleName: 'APP使用者管理', CDescription: '屋主端 APP 帳號管理', CDevStatus: EnumDevStatus.Done, CDevNote: '屋主會員 CRUD（MemberController）＋LineFrontWeb 會員中心皆有' },
    { CModuleCode: 'APP_USER_ROLE_MANAGEMENT', CCategory: 'APP／通路', CModuleName: 'APP使用者權限管理', CDescription: '屋主端 APP 權限設定', CDevStatus: EnumDevStatus.NotStarted, CDevNote: '無角色／權限欄位，也無對應頁面' }
  ];

  function allFeatureModuleCodes() {
    return DEFAULT_FEATURE_MODULES.map((m) => m.CModuleCode);
  }

  const DEFAULT_PLANS = [
    {
      CId: 1,
      CName: '標準方案',
      CIsEnabled: true,
      CurrentVersionId: 101,
      CurrentVersionNo: 2,
      CurrentBuildCaseMax: 5,
      ModuleCodes: [
        'USER_MANAGEMENT', 'ROLE_MANAGEMENT', 'LOGS_MANAGEMENT',
        'HOUSEHOLD_MANAGEMENT', 'HOUSEHOLD_PAYMENT_MANAGEMENT', 'CASE_MANAGEMENT', 'VENDOR_MANAGEMENT', 'UNCLOSED_CASE',
        'RESERVATION_HANDOVER', 'RESERVATION_INSPECTION',
        'SATISFACTION_SURVEY_STATISTICS'
      ]
    },
    {
      CId: 2,
      CName: '進階方案',
      CIsEnabled: true,
      CurrentVersionId: 201,
      CurrentVersionNo: 1,
      CurrentBuildCaseMax: 15,
      ModuleCodes: [
        'USER_MANAGEMENT', 'ROLE_MANAGEMENT', 'LOGS_MANAGEMENT',
        'HOUSEHOLD_MANAGEMENT', 'HOUSEHOLD_PAYMENT_MANAGEMENT', 'CASE_MANAGEMENT', 'VENDOR_MANAGEMENT', 'UNCLOSED_CASE', 'CASE_MILESTONE', 'PUSH_NOTIFICATION_LOG',
        'RESERVATION_HANDOVER', 'RESERVATION_INSPECTION', 'RESERVATION_COLLATERAL', 'RESERVATION_CUSTOM',
        'HOUSE_INSPECTION_MODULE', 'INSPECTION_ITEM_MANAGEMENT', 'INSPECTION_HOUSEHOLD_MANAGEMENT',
        'INSPECTION_REPAIR_RECORD', 'INSPECTION_HOUSEHOLD_RECORD', 'INSPECTION_HOUSEHOLD_RECORD_DETAIL',
        'STANDARD_FLOOR_PLAN_MANAGEMENT', 'HOUSE_INSPECTION_CASE',
        'PATROL_INSPECTION_MODULE', 'PATROL_ITEM_MANAGEMENT', 'PATROL_CASE',
        'SATISFACTION_SURVEY_STATISTICS', 'CUSTOMER_SATISFACTION_DETAIL', 'CASE_COUNT_STATISTICS', 'TASK_COMPLETION_STATISTICS',
        'APP_USER_MANAGEMENT', 'APP_USER_ROLE_MANAGEMENT'
      ]
    },
    {
      CId: 3,
      CName: '品牌加值方案',
      CIsEnabled: false,
      CurrentVersionId: 301,
      CurrentVersionNo: 1,
      CurrentBuildCaseMax: 30,
      ModuleCodes: allFeatureModuleCodes()
    }
  ];

  const DEFAULT_TENANTS = [
    {
      CID: 'LUFU',
      CName: '陸府建設',
      CDescription: '主力建商租戶',
      CTaxId: '12345678',
      CStatus: 1,
      CContractStartDT: '2025-01-01',
      CAccountExpireDT: '2026-08-15',
      CBuildCaseMax: 8,
      CPlanVersionId: 201,
      CUpdatedAt: '2026-07-06T09:00:00.000Z',
      Notes: [
        { CCreatedAt: '2026-06-20T10:15:00.000Z', CCreatedBy: '預設管理者', CContent: '客戶已確認升級至進階方案，合約結束日順延一年。' }
      ]
    },
    {
      CID: 'SMC',
      CName: '三民建設',
      CDescription: '',
      CTaxId: '87654321',
      CStatus: 1,
      CContractStartDT: '2025-06-01',
      CAccountExpireDT: '2026-07-20',
      CBuildCaseMax: 5,
      CPlanVersionId: 101,
      CUpdatedAt: '2026-06-28T14:30:00.000Z',
      Notes: []
    },
    {
      CID: 'DEMO',
      CName: '示範建商（已停用）',
      CDescription: '測試用租戶',
      CTaxId: '',
      CStatus: 0,
      CContractStartDT: '2024-01-01',
      CAccountExpireDT: '2025-01-01',
      CBuildCaseMax: 3,
      CPlanVersionId: null,
      CUpdatedAt: '2025-01-01T00:00:00.000Z',
      Notes: []
    }
  ];

  // 建商租戶端使用者帳號：帳號僅在同一租戶內唯一（不同租戶可各自使用相同帳號代碼），
  // 對齊已確認的登入流程規格——統編先解析出租戶，帳號密碼再對該租戶底下的使用者做驗證
  const DEFAULT_TENANT_USERS = [
    { CId: 1, CTenantId: 'LUFU', CAccount: 'lufu.manager', CPassword: '55688', CDisplayName: '陸府-林經理', CTitle: '專案經理', CEmail: 'lufu.manager@example.com', CIsPrimary: true },
    { CId: 2, CTenantId: 'LUFU', CAccount: 'lufu.assist', CPassword: '55688', CDisplayName: '陸府-陳助理', CTitle: '專案助理', CEmail: 'lufu.assist@example.com', CIsPrimary: false },
    { CId: 3, CTenantId: 'SMC', CAccount: 'smc.miss', CPassword: '55688', CDisplayName: '三民-王小姐', CTitle: '客服主管', CEmail: 'smc.miss@example.com', CIsPrimary: true },
    { CId: 4, CTenantId: 'SMC', CAccount: 'smc.director', CPassword: '55688', CDisplayName: '三民-李協理', CTitle: '協理', CEmail: 'smc.director@example.com', CIsPrimary: false }
  ];

  // 模擬帳號資訊信件發送記錄：新增建商（建立主要聯絡人帳號）／建商平台新增人員／忘記密碼重設，都會各留一筆，
  // 僅記錄事由與收件資訊，密碼不記錄於此（避免明碼長期留存），密碼僅於當次操作的回傳結果中一次性提供畫面預覽
  const DEFAULT_SENT_EMAILS = [
    { CTenantId: 'LUFU', CToEmail: 'lufu.manager@example.com', CAccount: 'lufu.manager', CReason: '建立租戶初始登入帳號', CCreatedAt: '2025-01-01T09:00:00.000Z' }
  ];

  // 程式版本歷史：一筆紀錄可套用多個租戶（共用主線版本），亦可能只套用單一租戶（客製分支尚未合併回主線）。
  // 租戶「目前版本」＝該租戶所有適用紀錄中 releaseDate 最新的一筆，不另外存欄位以免與此清單失去同步。
  const DEFAULT_VERSIONS = [
    {
      id: 1,
      versionNo: '4.2.0',
      releaseDate: '2026-07-06',
      tenantIds: ['LUFU'],
      summary: '案場管理模組客製化：新增基地即時影像牆功能',
      sourceBranch: 'feature/lufu-site-management-custom',
      createdBy: '預設管理者',
      createdAt: '2026-07-06T09:00:00.000Z'
    },
    {
      id: 2,
      versionNo: '4.1.5',
      releaseDate: '2026-06-28',
      tenantIds: ['LUFU', 'SMC'],
      summary: '戶別款項管理拆分為獨立模組，共用主線功能更新',
      sourceBranch: 'release/4.1.5',
      createdBy: '預設管理者',
      createdAt: '2026-06-28T14:30:00.000Z'
    },
    {
      id: 3,
      versionNo: '4.1.0',
      releaseDate: '2026-05-15',
      tenantIds: ['LUFU', 'SMC', 'DEMO'],
      summary: '平台基礎版本：建商租戶／合作方案雛型上線',
      sourceBranch: 'release/4.1.0',
      createdBy: '預設管理者',
      createdAt: '2026-05-15T08:00:00.000Z'
    }
  ];

  // 大平台端登入人員帳號：帳號全域唯一（大平台僅一套管理者帳號體系，不像建商租戶端按租戶分別建立），
  // 登入頁改為對這份清單做帳號密碼驗證；姓名同時也是通知管理／留言工單承辦人下拉選單的來源，避免兩份名單失去同步
  const DEFAULT_ADMIN_ACCOUNTS = [
    { CId: 1, CAccount: 'adminuser', CPassword: '55688', CDisplayName: '預設管理者' },
    { CId: 2, CAccount: 'chen.ling', CPassword: '55688', CDisplayName: '客服－陳姿伶' },
    { CId: 3, CAccount: 'huang.jh', CPassword: '55688', CDisplayName: '客服－黃建宏' }
  ];

  // 通知公告：scopeType 全體廣播(all)／指定租戶(targeted)；publishStatus 草稿(draft)／已發布(published)／已下架(archived)
  const DEFAULT_NOTIFICATIONS = [
    {
      id: 1,
      title: '系統排程維護通知（7/10 凌晨 02:00-04:00）',
      content: '<p>親愛的建商夥伴您好，平台將於 7/10 凌晨 02:00-04:00 進行排程維護，期間後台將暫停服務，請提前完成當日待辦作業。造成不便敬請見諒。</p>',
      category: '維護通知',
      scopeType: 'all',
      targetTenantIds: [],
      isPublic: true,
      publishStatus: 'published',
      publishAt: '2026-07-05T09:00:00.000Z',
      expireAt: '2026-07-11T00:00:00.000Z',
      createdByAdminName: '預設管理者',
      createdAt: '2026-07-04T08:00:00.000Z'
    },
    {
      id: 2,
      title: '新增「戶別款項管理」獨立模組公告',
      content: '<p>戶別款項管理已從戶別管理拆分為獨立模組，方案內容如有調整請洽窗口確認是否需要加購。</p>',
      category: '功能更新',
      scopeType: 'all',
      targetTenantIds: [],
      isPublic: true,
      publishStatus: 'published',
      publishAt: '2026-06-25T10:00:00.000Z',
      expireAt: null,
      createdByAdminName: '預設管理者',
      createdAt: '2026-06-24T15:30:00.000Z'
    },
    {
      id: 3,
      title: '【陸府建設專屬】合約續約提醒',
      content: '<p>貴司合約將於 2026-08-15 到期，請於到期前與客服窗口聯繫辦理續約，以免影響後台使用權限。</p>',
      category: '合約提醒',
      scopeType: 'targeted',
      targetTenantIds: ['LUFU'],
      isPublic: false,
      publishStatus: 'published',
      publishAt: '2026-07-01T09:00:00.000Z',
      expireAt: '2026-08-15T00:00:00.000Z',
      createdByAdminName: '客服－陳姿伶',
      createdAt: '2026-06-30T11:00:00.000Z'
    },
    {
      id: 4,
      title: '【三民建設專屬】帳號即將到期通知',
      content: '<p>貴司帳號將於 2026-07-20 到期，提醒盡早完成續約作業。</p>',
      category: '合約提醒',
      scopeType: 'targeted',
      targetTenantIds: ['SMC'],
      isPublic: false,
      publishStatus: 'draft',
      publishAt: null,
      expireAt: null,
      createdByAdminName: '客服－陳姿伶',
      createdAt: '2026-07-07T14:00:00.000Z'
    },
    {
      id: 5,
      title: '品牌加值方案上市預告',
      content: '<p>全新品牌加值方案即將上市，涵蓋巡檢、驗屋等完整擴充模組，敬請期待。</p>',
      category: '行銷推廣',
      scopeType: 'all',
      targetTenantIds: [],
      isPublic: true,
      publishStatus: 'draft',
      publishAt: null,
      expireAt: null,
      createdByAdminName: '預設管理者',
      createdAt: '2026-07-06T09:20:00.000Z'
    },
    {
      id: 6,
      title: '（已下架）舊版驗屋流程公告',
      content: '<p>舊版驗屋流程說明，已隨新版流程上線而下架。</p>',
      category: '系統公告',
      scopeType: 'all',
      targetTenantIds: [],
      isPublic: false,
      publishStatus: 'archived',
      publishAt: '2026-01-05T09:00:00.000Z',
      expireAt: '2026-03-01T00:00:00.000Z',
      createdByAdminName: '客服－黃建宏',
      createdAt: '2026-01-04T09:00:00.000Z'
    }
  ];

  // 留言工單：status 受理中(open)／處理中(inProgress)／已回覆(resolved)／結案(closed)
  const DEFAULT_TICKETS = [
    {
      id: 1,
      tenantId: 'LUFU',
      tenantName: '陸府建設',
      relatedNotificationId: 3,
      subject: '合約續約流程詢問',
      status: 'open',
      createdByUserName: '陸府-林經理',
      assignedAdminName: null,
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
      messages: [
        { id: 1, senderType: 'tenant', senderName: '陸府-林經理', content: '請問合約續約需要提供哪些文件？流程大概需要多久時間？', attachments: [], createdAt: '2026-07-01T10:00:00.000Z' }
      ]
    },
    {
      id: 2,
      tenantId: 'SMC',
      tenantName: '三民建設',
      relatedNotificationId: null,
      subject: '無法上傳驗屋照片',
      status: 'inProgress',
      createdByUserName: '三民-王小姐',
      assignedAdminName: '客服－黃建宏',
      createdAt: '2026-06-28T09:00:00.000Z',
      updatedAt: '2026-06-29T16:00:00.000Z',
      messages: [
        { id: 1, senderType: 'tenant', senderName: '三民-王小姐', content: '驗屋預約頁面上傳照片時一直失敗，麻煩協助確認。', attachments: [{ name: '錯誤畫面截圖.png' }], createdAt: '2026-06-28T09:00:00.000Z' },
        { id: 2, senderType: 'admin', senderName: '客服－黃建宏', content: '您好，已收到問題回報，正在確認上傳容量限制設定，煩請提供使用的瀏覽器版本。', attachments: [], createdAt: '2026-06-28T14:20:00.000Z' },
        { id: 3, senderType: 'tenant', senderName: '三民-王小姐', content: '使用 Chrome 最新版，檔案大小約 8MB。', attachments: [], createdAt: '2026-06-29T16:00:00.000Z' }
      ]
    },
    {
      id: 3,
      tenantId: 'LUFU',
      tenantName: '陸府建設',
      relatedNotificationId: 1,
      subject: '維護期間系統是否完全無法使用？',
      status: 'resolved',
      createdByUserName: '陸府-陳助理',
      assignedAdminName: '客服－陳姿伶',
      createdAt: '2026-07-04T09:00:00.000Z',
      updatedAt: '2026-07-04T13:00:00.000Z',
      messages: [
        { id: 1, senderType: 'tenant', senderName: '陸府-陳助理', content: '請問 7/10 維護期間，APP 端會員也無法使用嗎？', attachments: [], createdAt: '2026-07-04T09:00:00.000Z' },
        { id: 2, senderType: 'admin', senderName: '客服－陳姿伶', content: '您好，維護期間後台與 APP／LINE 相關服務皆會暫停，建議提前告知住戶。', attachments: [], createdAt: '2026-07-04T11:30:00.000Z' },
        { id: 3, senderType: 'tenant', senderName: '陸府-陳助理', content: '了解，謝謝說明。', attachments: [], createdAt: '2026-07-04T13:00:00.000Z' }
      ]
    },
    {
      id: 4,
      tenantId: 'SMC',
      tenantName: '三民建設',
      relatedNotificationId: null,
      subject: '新增使用者帳號請求',
      status: 'closed',
      createdByUserName: '三民-李協理',
      assignedAdminName: '預設管理者',
      createdAt: '2026-06-10T09:00:00.000Z',
      updatedAt: '2026-06-12T11:00:00.000Z',
      messages: [
        { id: 1, senderType: 'tenant', senderName: '三民-李協理', content: '想幫新進同仁申請一組後台帳號，需要提供什麼資料？', attachments: [], createdAt: '2026-06-10T09:00:00.000Z' },
        { id: 2, senderType: 'admin', senderName: '預設管理者', content: '請提供同仁姓名、Email 及欲開通的角色權限即可，我們會協助建立帳號。', attachments: [], createdAt: '2026-06-10T15:00:00.000Z' },
        { id: 3, senderType: 'tenant', senderName: '三民-李協理', content: '姓名：黃小姐，Email：huang@smc.example.com，角色：一般客服。', attachments: [], createdAt: '2026-06-11T10:00:00.000Z' },
        { id: 4, senderType: 'admin', senderName: '預設管理者', content: '帳號已建立完成並寄送初始密碼信，麻煩提醒同仁登入後儘速修改密碼，本案結案。', attachments: [], createdAt: '2026-06-12T11:00:00.000Z' }
      ]
    },
    {
      id: 5,
      tenantId: 'DEMO',
      tenantName: '示範建商（已停用）',
      relatedNotificationId: null,
      subject: '帳號停用後資料保存期限',
      status: 'open',
      createdByUserName: '示範建商-測試員',
      assignedAdminName: null,
      createdAt: '2026-07-07T15:00:00.000Z',
      updatedAt: '2026-07-07T15:00:00.000Z',
      messages: [
        { id: 1, senderType: 'tenant', senderName: '示範建商-測試員', content: '帳號停用後，原本的個案單資料還會保留多久？', attachments: [], createdAt: '2026-07-07T15:00:00.000Z' }
      ]
    }
  ];

  // 逐欄位補值而非整包重播種：舊版 localStorage（例如加入通知/留言前存的資料）
  // 缺少新欄位時，只補上缺的部分，不會把既有的方案/租戶測試資料一併洗掉
  function loadDb() {
    const raw = localStorage.getItem(STORAGE_KEY);
    let db = null;
    if (raw) {
      try {
        db = JSON.parse(raw);
      } catch (e) {
        db = null;
      }
    }
    if (!db) db = {};

    let dirty = !raw;
    if (!db.featureModules) { db.featureModules = DEFAULT_FEATURE_MODULES; dirty = true; }
    if (!db.plans) { db.plans = DEFAULT_PLANS; dirty = true; }
    if (!db.tenants) { db.tenants = DEFAULT_TENANTS; dirty = true; }
    if (!db.tenantUsers) { db.tenantUsers = DEFAULT_TENANT_USERS; dirty = true; }
    if (!db.notifications) { db.notifications = DEFAULT_NOTIFICATIONS; dirty = true; }
    if (!db.tickets) { db.tickets = DEFAULT_TICKETS; dirty = true; }
    if (!db.versions) { db.versions = DEFAULT_VERSIONS; dirty = true; }
    if (!db.sentEmails) { db.sentEmails = DEFAULT_SENT_EMAILS; dirty = true; }
    if (!db.adminAccounts) { db.adminAccounts = DEFAULT_ADMIN_ACCOUNTS; dirty = true; }
    if (db.nextPlanId === undefined) { db.nextPlanId = 4; dirty = true; }
    if (db.nextVersionId === undefined) { db.nextVersionId = 302; dirty = true; }
    if (db.nextNotificationId === undefined) { db.nextNotificationId = 7; dirty = true; }
    if (db.nextTicketMessageId === undefined) { db.nextTicketMessageId = 100; dirty = true; }
    if (db.nextAppVersionRecordId === undefined) { db.nextAppVersionRecordId = 4; dirty = true; }
    if (db.nextTicketId === undefined) { db.nextTicketId = 6; dirty = true; }
    if (db.nextTenantUserId === undefined) { db.nextTenantUserId = 5; dirty = true; }
    if (db.nextAdminAccountId === undefined) { db.nextAdminAccountId = 4; dirty = true; }
    if (!db.notificationReads) { db.notificationReads = {}; dirty = true; }

    if (dirty) saveDb(db);
    return db;
  }

  function saveDb(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  // totalItemsOverride 供分頁查詢使用：Entries 只回傳當頁資料，但 TotalItems 需回報篩選後的總筆數
  function ok(entries, message, totalItemsOverride) {
    const totalItems = totalItemsOverride !== undefined ? totalItemsOverride : (Array.isArray(entries) ? entries.length : 1);
    return { StatusCode: EnumStatusCode.Success, Message: message || '', Entries: entries, TotalItems: totalItems };
  }

  function fail(message) {
    return { StatusCode: EnumStatusCode.Fail, Message: message || '失敗', Entries: null, TotalItems: 0 };
  }

  // 模擬產生初始密碼／忘記密碼重設密碼，避免容易混淆的字元（0/O、1/I 等）
  function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let pw = '';
    for (let i = 0; i < 8; i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    return pw;
  }

  // 記錄一筆模擬帳號資訊信件發送：正式環境會實際寄出 Email，這裡只留存事由與收件資訊供事後查核，
  // 密碼不落地保存於此紀錄，僅在觸發當次的回傳結果中提供畫面一次性預覽
  function recordSentEmail(db, args) {
    db.sentEmails.unshift({
      CTenantId: args.tenantId,
      CToEmail: args.toEmail,
      CAccount: args.account,
      CReason: args.reason,
      CCreatedAt: new Date().toISOString()
    });
  }

  // 開發狀況 → pill 樣式（style-base.css：good/neutral/critical）
  function devStatusPillClass(status) {
    if (status === EnumDevStatus.Done) return 'good';
    if (status === EnumDevStatus.Partial) return 'neutral';
    return 'critical';
  }

  function findPlanByVersionId(db, versionId) {
    return db.plans.find((p) => p.CurrentVersionId === versionId);
  }

  // ---- 功能模組 ----
  function getFeatureModuleList() {
    const db = loadDb();
    return ok(db.featureModules);
  }

  // 分類再往上收成兩層：基本功能＝讓 CRM 能運作下去的必要功能，擴充功能＝依建商需求選配的功能
  const CATEGORY_TIERS = [
    { CTier: '基本功能', CCategories: ['系統管理', '會員管理', '個案單管理', '戶別管理'] },
    { CTier: '擴充功能', CCategories: ['資料管理', '報表', '預約管理', '驗屋管理', '巡檢管理', '綠海養護', 'APP／通路'] }
  ];

  // 呈現方式對齊 CRM4 /pages/system-management/role-permissions 的群組階層，
  // 三層：基本/擴充功能（Lv1）→ CCategory 分類（Lv2）→ 模組（Lv3，即勾選項目）
  function getFeatureModuleTiers() {
    const db = loadDb();
    const categoryGroups = {};
    db.featureModules.forEach((m) => {
      if (!categoryGroups[m.CCategory]) {
        categoryGroups[m.CCategory] = { CCategory: m.CCategory, Modules: [] };
      }
      categoryGroups[m.CCategory].Modules.push(m);
    });
    const tiers = CATEGORY_TIERS.map((t) => ({
      CTier: t.CTier,
      Categories: t.CCategories.map((c) => categoryGroups[c]).filter(Boolean)
    }));
    return ok(tiers);
  }

  // ---- 合作方案 ----
  function getPlanList() {
    const db = loadDb();
    const entries = db.plans.map((p) => ({
      CId: p.CId,
      CName: p.CName,
      CIsEnabled: p.CIsEnabled,
      CurrentVersionId: p.CurrentVersionId,
      CurrentVersionNo: p.CurrentVersionNo,
      CurrentBuildCaseMax: p.CurrentBuildCaseMax
    }));
    return ok(entries);
  }

  function getPlanData(planId) {
    const db = loadDb();
    const p = db.plans.find((x) => x.CId === Number(planId));
    if (!p) return fail('找不到方案');
    return ok({
      CId: p.CId,
      CName: p.CName,
      CIsEnabled: p.CIsEnabled,
      CurrentVersionId: p.CurrentVersionId,
      CurrentVersionNo: p.CurrentVersionNo,
      CurrentBuildCaseMax: p.CurrentBuildCaseMax,
      ModuleCodes: p.ModuleCodes.slice()
    });
  }

  // 依方案版本查詢預設可用模組（租戶掛的是特定版本，非一定是方案目前版本）
  function getPlanModulesByVersionId(versionId) {
    const db = loadDb();
    if (!versionId) return ok([]);
    const p = findPlanByVersionId(db, Number(versionId));
    if (!p) return ok([]);
    return ok(p.ModuleCodes.slice());
  }

  function createPlan(args) {
    const db = loadDb();
    if (!args.CName) return fail('請輸入方案名稱');
    const planId = db.nextPlanId++;
    const versionId = db.nextVersionId++;
    db.plans.push({
      CId: planId,
      CName: args.CName,
      CIsEnabled: true,
      CurrentVersionId: versionId,
      CurrentVersionNo: 1,
      CurrentBuildCaseMax: args.CBuildCaseMax,
      ModuleCodes: args.ModuleCodes || []
    });
    saveDb(db);
    return ok(planId, '已建立');
  }

  function createPlanNewVersion(args) {
    const db = loadDb();
    const p = db.plans.find((x) => x.CId === Number(args.CPlanId));
    if (!p) return fail('找不到方案');
    p.CurrentVersionId = db.nextVersionId++;
    p.CurrentVersionNo += 1;
    p.CurrentBuildCaseMax = args.CBuildCaseMax;
    p.ModuleCodes = args.ModuleCodes || [];
    saveDb(db);
    return ok(p.CId, '已產生新版本');
  }

  function setPlanEnabled(args) {
    const db = loadDb();
    const p = db.plans.find((x) => x.CId === Number(args.CPlanId));
    if (!p) return fail('找不到方案');
    p.CIsEnabled = args.CIsEnabled;
    saveDb(db);
    return ok(true, '已更新');
  }

  // ---- 建商租戶 ----
  // args 可省略（既有呼叫端如下拉選單、biz-shell 皆不帶參數，維持回傳全部未分頁清單的既有行為）；
  // 帶入 name／taxId／status 篩選條件，以及 page／pageSize 才會做篩選與分頁，TotalItems 回報篩選後（分頁前）的總筆數
  function getTenantList(args) {
    args = args || {};
    const db = loadDb();
    let entries = db.tenants.map((t) => {
      const plan = findPlanByVersionId(db, t.CPlanVersionId);
      return {
        CID: t.CID,
        CName: t.CName,
        CTaxId: t.CTaxId,
        CStatus: t.CStatus,
        CContractStartDT: t.CContractStartDT,
        CAccountExpireDT: t.CAccountExpireDT,
        PlanName: plan ? plan.CName : null,
        CCurrentAppVersion: getCurrentVersionForTenant(db, t.CID),
        CUpdatedAt: t.CUpdatedAt || null
      };
    });

    if (args.name && args.name.trim()) {
      const kw = args.name.trim().toLowerCase();
      entries = entries.filter((t) => t.CName.toLowerCase().includes(kw) || t.CID.toLowerCase().includes(kw));
    }
    if (args.taxId && args.taxId.trim()) {
      const kw = args.taxId.trim();
      entries = entries.filter((t) => (t.CTaxId || '').includes(kw));
    }
    if (args.status !== undefined && args.status !== null && args.status !== '') {
      entries = entries.filter((t) => t.CStatus === Number(args.status));
    }

    const totalItems = entries.length;
    if (args.page && args.pageSize) {
      const start = (args.page - 1) * args.pageSize;
      entries = entries.slice(start, start + args.pageSize);
    }
    return ok(entries, '', totalItems);
  }

  function getTenantData(cid) {
    const db = loadDb();
    const t = db.tenants.find((x) => x.CID === cid);
    if (!t) return fail('找不到租戶');
    const data = JSON.parse(JSON.stringify(t));
    data.CCurrentAppVersion = getCurrentVersionForTenant(db, cid);
    return ok(data);
  }

  // 建商租戶登入驗證：統編解析租戶（停用/查無租戶在密碼核對前就先擋下，錯誤訊息才準確）→
  // 帳號密碼對該租戶底下的使用者做驗證（帳號僅在租戶內唯一，不做全域查找）
  function verifyTenantUserLogin(args) {
    const db = loadDb();
    const tenant = db.tenants.find((t) => t.CTaxId && t.CTaxId === args.taxId);
    if (!tenant) return fail('統一編號查無建商租戶資料');
    if (tenant.CStatus !== 1) return fail('此租戶帳號已停用，請聯繫平台客服');
    const user = db.tenantUsers.find((u) => u.CTenantId === tenant.CID && u.CAccount === args.account);
    if (!user || user.CPassword !== args.password) return fail('帳號或密碼錯誤');
    return ok({ CTenantId: tenant.CID, CTenantName: tenant.CName, CDisplayName: user.CDisplayName });
  }

  // 新增建商時同步建立主要聯絡人帳號（即該租戶在建商平台的第一位使用者／平台管理者），
  // 建立成功後模擬發送登入網址／帳號／密碼信件給該聯絡人，後續其他人員由該管理者登入建商平台自行新增
  function createTenant(args) {
    const db = loadDb();
    if (!args.CID) return fail('請輸入租戶代碼');
    if (!/^[A-Z0-9_-]+$/.test(args.CID)) return fail('租戶代碼格式不正確');
    if (db.tenants.some((x) => x.CID === args.CID)) return fail('租戶代碼已存在');
    if (!args.CContactName || !args.CContactName.trim()) return fail('請輸入主要聯絡人姓名');
    if (!args.CContactEmail || !args.CContactEmail.trim()) return fail('請輸入主要聯絡人 Email');
    if (!args.CLoginAccount || !args.CLoginAccount.trim()) return fail('請輸入登入帳號');

    db.tenants.push({
      CID: args.CID,
      CName: args.CName,
      CDescription: args.CDescription || '',
      CTaxId: args.CTaxId || '',
      CStatus: 1,
      CContractStartDT: args.CContractStartDT || '',
      CAccountExpireDT: args.CAccountExpireDT,
      CBuildCaseMax: args.CBuildCaseMax,
      CPlanVersionId: args.CPlanVersionId,
      CUpdatedAt: new Date().toISOString(),
      Notes: []
    });

    const account = args.CLoginAccount.trim();
    const email = args.CContactEmail.trim();
    const password = generatePassword();
    db.tenantUsers.push({
      CId: db.nextTenantUserId++,
      CTenantId: args.CID,
      CAccount: account,
      CPassword: password,
      CDisplayName: args.CContactName.trim(),
      CTitle: (args.CContactTitle || '').trim(),
      CEmail: email,
      CIsPrimary: true
    });
    recordSentEmail(db, { tenantId: args.CID, toEmail: email, account, reason: '建立租戶初始登入帳號' });

    saveDb(db);
    return ok({ CID: args.CID, CAccount: account, CPassword: password, CToEmail: email, CLoginUrl: args.CLoginUrl || '' }, '已建立');
  }

  function updateTenant(args) {
    const db = loadDb();
    const t = db.tenants.find((x) => x.CID === args.CID);
    if (!t) return fail('找不到租戶');
    Object.assign(t, {
      CName: args.CName,
      CDescription: args.CDescription,
      CTaxId: args.CTaxId,
      CContractStartDT: args.CContractStartDT,
      CAccountExpireDT: args.CAccountExpireDT,
      CBuildCaseMax: args.CBuildCaseMax,
      CPlanVersionId: args.CPlanVersionId
    });
    t.CUpdatedAt = new Date().toISOString();
    saveDb(db);
    return ok(true, '已儲存');
  }

  function setTenantStatus(args) {
    const db = loadDb();
    const t = db.tenants.find((x) => x.CID === args.CID);
    if (!t) return fail('找不到租戶');
    t.CStatus = args.CStatus;
    t.CUpdatedAt = new Date().toISOString();
    saveDb(db);
    return ok(true, '已更新狀態');
  }

  // 新增備註：軌跡以陣列儲存，最新一筆插入最前面，供表單頁依時間倒序顯示
  function addTenantNote(args) {
    const db = loadDb();
    const t = db.tenants.find((x) => x.CID === args.CID);
    if (!t) return fail('找不到租戶');
    if (!args.CContent || !args.CContent.trim()) return fail('請輸入備註內容');
    if (!t.Notes) t.Notes = [];
    t.Notes.unshift({
      CCreatedAt: new Date().toISOString(),
      CCreatedBy: args.CCreatedBy || '',
      CContent: args.CContent.trim()
    });
    t.CUpdatedAt = new Date().toISOString();
    saveDb(db);
    return ok(t.Notes, '已新增備註');
  }

  // ---- 建商租戶端使用者（人員）----
  function getTenantUsers(tenantId) {
    const db = loadDb();
    const list = db.tenantUsers
      .filter((u) => u.CTenantId === tenantId)
      .map((u) => ({ CId: u.CId, CAccount: u.CAccount, CDisplayName: u.CDisplayName, CTitle: u.CTitle || '', CEmail: u.CEmail || '', CIsPrimary: !!u.CIsPrimary }));
    return ok(list);
  }

  // 由建商平台管理者自行新增其他人員，新帳號預設非主要聯絡人；建立成功後模擬發送登入資訊信件
  function addTenantUser(args) {
    const db = loadDb();
    const tenantId = args.CTenantId;
    if (!db.tenants.some((t) => t.CID === tenantId)) return fail('找不到租戶');
    if (!args.CDisplayName || !args.CDisplayName.trim()) return fail('請輸入姓名');
    if (!args.CEmail || !args.CEmail.trim()) return fail('請輸入 Email');
    if (!args.CAccount || !args.CAccount.trim()) return fail('請輸入登入帳號');
    const account = args.CAccount.trim();
    if (db.tenantUsers.some((u) => u.CTenantId === tenantId && u.CAccount === account)) {
      return fail('此帳號已存在，請改用其他帳號');
    }
    const email = args.CEmail.trim();
    const password = generatePassword();
    const record = {
      CId: db.nextTenantUserId++,
      CTenantId: tenantId,
      CAccount: account,
      CPassword: password,
      CDisplayName: args.CDisplayName.trim(),
      CTitle: (args.CTitle || '').trim(),
      CEmail: email,
      CIsPrimary: false
    };
    db.tenantUsers.push(record);
    recordSentEmail(db, { tenantId, toEmail: email, account, reason: '新增人員登入帳號' });
    saveDb(db);
    return ok({ CId: record.CId, CAccount: account, CPassword: password, CToEmail: email, CLoginUrl: args.CLoginUrl || '' }, '已建立人員帳號');
  }

  // 建商平台管理者為既有人員重設密碼（已登入狀態下操作，無需再驗證 Email）
  function bizResetTenantUserPassword(args) {
    const db = loadDb();
    const user = db.tenantUsers.find((u) => u.CTenantId === args.CTenantId && u.CId === Number(args.CId));
    if (!user) return fail('找不到人員資料');
    const password = generatePassword();
    user.CPassword = password;
    recordSentEmail(db, { tenantId: args.CTenantId, toEmail: user.CEmail, account: user.CAccount, reason: '管理者重新設定密碼' });
    saveDb(db);
    return ok({ CAccount: user.CAccount, CPassword: password, CToEmail: user.CEmail, CLoginUrl: args.CLoginUrl || '' }, '已重新設定密碼');
  }

  // 忘記密碼自助重設：統編解析租戶（比照登入流程）→ 帳號＋登記 Email 需同時吻合才能重設，
  // 避免僅知道帳號就能重設別人的密碼
  function resetTenantUserPassword(args) {
    const db = loadDb();
    const tenant = db.tenants.find((t) => t.CTaxId && t.CTaxId === (args.taxId || '').trim());
    if (!tenant) return fail('統一編號查無建商租戶資料');
    if (tenant.CStatus !== 1) return fail('此租戶帳號已停用，請聯繫平台客服');
    const account = (args.account || '').trim();
    const email = (args.email || '').trim();
    const user = db.tenantUsers.find((u) => u.CTenantId === tenant.CID && u.CAccount === account);
    if (!user || !user.CEmail || user.CEmail.toLowerCase() !== email.toLowerCase()) {
      return fail('帳號或 Email 不正確，請確認後再試');
    }
    const password = generatePassword();
    user.CPassword = password;
    recordSentEmail(db, { tenantId: tenant.CID, toEmail: user.CEmail, account: user.CAccount, reason: '忘記密碼重新設定' });
    saveDb(db);
    return ok({ CAccount: user.CAccount, CPassword: password, CToEmail: user.CEmail, CLoginUrl: args.CLoginUrl || '' }, '已重新設定密碼');
  }

  // 帳號資訊信件發送記錄查詢，供大平台端租戶詳細頁與建商平台人員管理頁共用查核
  function getSentEmailLog(tenantId) {
    const db = loadDb();
    return ok((db.sentEmails || []).filter((e) => e.CTenantId === tenantId));
  }

  // ---- 程式版本管理 ----
  // 租戶「目前版本」＝該租戶所有適用版本紀錄中，releaseDate 最新的一筆
  function getCurrentVersionForTenant(db, cid) {
    const list = db.versions.filter((v) => (v.tenantIds || []).includes(cid));
    if (!list.length) return null;
    list.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    return list[0].versionNo;
  }

  function findTenantNamesByIds(db, ids) {
    return (ids || []).map((cid) => {
      const t = db.tenants.find((x) => x.CID === cid);
      return t ? t.CName : cid;
    });
  }

  // filterCid 有帶值時只回傳套用到該租戶的版本紀錄，供租戶編輯頁顯示自身版本歷程
  function getVersionList(filterCid) {
    const db = loadDb();
    let list = db.versions.slice();
    if (filterCid) {
      list = list.filter((v) => (v.tenantIds || []).includes(filterCid));
    }
    list.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    const entries = list.map((v) => ({
      id: v.id,
      versionNo: v.versionNo,
      releaseDate: v.releaseDate,
      summary: v.summary || '',
      sourceBranch: v.sourceBranch || '',
      tenantIds: v.tenantIds || [],
      tenantNames: findTenantNamesByIds(db, v.tenantIds),
      createdBy: v.createdBy || '',
      createdAt: v.createdAt
    }));
    return ok(entries);
  }

  function getVersionData(id) {
    const db = loadDb();
    const v = db.versions.find((x) => x.id === Number(id));
    if (!v) return fail('找不到版本紀錄');
    return ok(JSON.parse(JSON.stringify(v)));
  }

  function createVersionRecord(args) {
    const db = loadDb();
    if (!args.versionNo || !args.versionNo.trim()) return fail('請輸入版本號');
    if (!args.tenantIds || !args.tenantIds.length) return fail('請至少選擇一個適用租戶');
    const id = db.nextAppVersionRecordId++;
    db.versions.unshift({
      id,
      versionNo: args.versionNo.trim(),
      releaseDate: args.releaseDate || new Date().toISOString().substring(0, 10),
      tenantIds: args.tenantIds,
      summary: args.summary || '',
      sourceBranch: args.sourceBranch || '',
      createdBy: args.createdBy || '',
      createdAt: new Date().toISOString()
    });
    saveDb(db);
    return ok(id, '已建立版本紀錄');
  }

  function updateVersionRecord(args) {
    const db = loadDb();
    const v = db.versions.find((x) => x.id === Number(args.id));
    if (!v) return fail('找不到版本紀錄');
    if (!args.versionNo || !args.versionNo.trim()) return fail('請輸入版本號');
    if (!args.tenantIds || !args.tenantIds.length) return fail('請至少選擇一個適用租戶');
    Object.assign(v, {
      versionNo: args.versionNo.trim(),
      releaseDate: args.releaseDate,
      tenantIds: args.tenantIds,
      summary: args.summary || '',
      sourceBranch: args.sourceBranch || ''
    });
    saveDb(db);
    return ok(true, '已儲存');
  }

  // ---- 大平台端管理者帳號 ----
  // 通知管理／留言工單承辦人下拉選單的姓名來源，直接衍生自管理者帳號清單，新增管理者後即同步出現在承辦人選項
  function getAdminUserList() {
    const db = loadDb();
    return ok(db.adminAccounts.map((a) => a.CDisplayName));
  }

  function getAdminAccountList() {
    const db = loadDb();
    return ok(db.adminAccounts.map((a) => ({ CId: a.CId, CAccount: a.CAccount, CDisplayName: a.CDisplayName })));
  }

  // 大平台登入驗證：帳號密碼需同時吻合管理者帳號清單中的一筆紀錄
  function verifyAdminLogin(args) {
    const db = loadDb();
    const account = (args.account || '').trim();
    const acc = db.adminAccounts.find((a) => a.CAccount === account);
    if (!acc || acc.CPassword !== args.password) return fail('帳號或密碼錯誤');
    return ok({ CDisplayName: acc.CDisplayName });
  }

  function createAdminAccount(args) {
    const db = loadDb();
    if (!args.CDisplayName || !args.CDisplayName.trim()) return fail('請輸入姓名');
    if (!args.CAccount || !args.CAccount.trim()) return fail('請輸入帳號');
    if (!args.CPassword || !args.CPassword.trim()) return fail('請輸入密碼');
    const account = args.CAccount.trim();
    if (db.adminAccounts.some((a) => a.CAccount === account)) return fail('此帳號已存在，請改用其他帳號');
    const record = {
      CId: db.nextAdminAccountId++,
      CAccount: account,
      CPassword: args.CPassword,
      CDisplayName: args.CDisplayName.trim()
    };
    db.adminAccounts.push(record);
    saveDb(db);
    return ok({ CId: record.CId }, '已建立管理者帳號');
  }

  // 管理者為其他管理者重設密碼：直接產生新密碼並回傳一次性顯示，供畫面提示後手動告知本人
  function resetAdminAccountPassword(args) {
    const db = loadDb();
    const acc = db.adminAccounts.find((a) => a.CId === Number(args.CId));
    if (!acc) return fail('找不到管理者帳號');
    const password = generatePassword();
    acc.CPassword = password;
    saveDb(db);
    return ok({ CAccount: acc.CAccount, CPassword: password }, '已重新設定密碼');
  }

  // 管理者本人變更密碼：需先核對目前密碼才能設定新密碼（區別於 resetAdminAccountPassword 由他人代為重設）
  function changeAdminPassword(args) {
    const db = loadDb();
    const acc = db.adminAccounts.find((a) => a.CAccount === args.account);
    if (!acc) return fail('找不到管理者帳號');
    if (!args.currentPassword || acc.CPassword !== args.currentPassword) return fail('目前密碼不正確');
    if (!args.newPassword || !args.newPassword.trim()) return fail('請輸入新密碼');
    acc.CPassword = args.newPassword;
    saveDb(db);
    return ok(true, '已變更密碼');
  }

  // ---- 通知公告 ----
  function getNotificationList() {
    const db = loadDb();
    return ok(db.notifications.slice());
  }

  function getNotificationData(id) {
    const db = loadDb();
    const n = db.notifications.find((x) => x.id === Number(id));
    if (!n) return fail('找不到通知');
    return ok(JSON.parse(JSON.stringify(n)));
  }

  // 新增或編輯共用：有帶 id 視為編輯（就地更新），否則視為新增
  function saveNotification(args) {
    const db = loadDb();
    if (!args.title || !args.title.trim()) return fail('請輸入標題');
    if (args.scopeType === 'targeted' && (!args.targetTenantIds || !args.targetTenantIds.length)) {
      return fail('請至少選擇一個指定租戶');
    }
    const targetTenantIds = args.scopeType === 'targeted' ? (args.targetTenantIds || []) : [];

    if (args.id) {
      const n = db.notifications.find((x) => x.id === Number(args.id));
      if (!n) return fail('找不到通知');
      Object.assign(n, {
        title: args.title,
        content: args.content || '',
        category: args.category || '',
        scopeType: args.scopeType,
        targetTenantIds,
        isPublic: !!args.isPublic,
        publishStatus: args.publishStatus || n.publishStatus,
        publishAt: args.publishAt || null,
        expireAt: args.expireAt || null
      });
      saveDb(db);
      return ok(n.id, '已儲存');
    }

    const id = db.nextNotificationId++;
    db.notifications.unshift({
      id,
      title: args.title,
      content: args.content || '',
      category: args.category || '',
      scopeType: args.scopeType,
      targetTenantIds,
      isPublic: !!args.isPublic,
      publishStatus: args.publishStatus || 'draft',
      publishAt: args.publishAt || null,
      expireAt: args.expireAt || null,
      createdByAdminName: args.createdByAdminName || '',
      createdAt: new Date().toISOString()
    });
    saveDb(db);
    return ok(id, '已建立');
  }

  // 快速上／下架動作（列表頁用），publishAt 若尚未設定則於發布當下補上
  function setNotificationPublishStatus(args) {
    const db = loadDb();
    const n = db.notifications.find((x) => x.id === Number(args.id));
    if (!n) return fail('找不到通知');
    n.publishStatus = args.publishStatus;
    if (args.publishStatus === 'published' && !n.publishAt) {
      n.publishAt = new Date().toISOString();
    }
    saveDb(db);
    return ok(true, '已更新發布狀態');
  }

  // ---- 留言工單 ----
  // filterTenantId 有帶值時只回傳該租戶自己的工單，供建商租戶服務入口（biz-ticket-list）使用；
  // 大平台端 ticket-list 呼叫時不帶參數，維持回傳全部租戶工單
  function getTicketList(filterTenantId) {
    const db = loadDb();
    let list = db.tickets.slice();
    if (filterTenantId) {
      list = list.filter((t) => t.tenantId === filterTenantId);
    }
    // 列表頁不需要完整訊息內容，僅回傳訊息數量供顯示
    return ok(list.map((t) => {
      const { messages, ...summary } = t;
      return Object.assign({}, summary, { messageCount: messages.length });
    }));
  }

  // 建商租戶於留言板自行建立新留言：初始狀態受理中，第一則訊息即為租戶輸入的內容
  function createTicket(args) {
    const db = loadDb();
    if (!args.subject || !args.subject.trim()) return fail('請輸入主旨');
    if (!args.content || !args.content.trim()) return fail('請輸入留言內容');
    const id = db.nextTicketId++;
    const now = new Date().toISOString();
    db.tickets.push({
      id,
      tenantId: args.tenantId,
      tenantName: args.tenantName,
      relatedNotificationId: null,
      subject: args.subject.trim(),
      status: 'open',
      createdByUserName: args.createdByUserName || '',
      assignedAdminName: null,
      createdAt: now,
      updatedAt: now,
      messages: [
        { id: 1, senderType: 'tenant', senderName: args.createdByUserName || '', content: args.content.trim(), attachments: [], createdAt: now }
      ]
    });
    saveDb(db);
    return ok(id, '已送出留言');
  }

  function getTicketData(id) {
    const db = loadDb();
    const t = db.tickets.find((x) => x.id === Number(id));
    if (!t) return fail('找不到工單');
    return ok(JSON.parse(JSON.stringify(t)));
  }

  function setTicketAssignee(args) {
    const db = loadDb();
    const t = db.tickets.find((x) => x.id === Number(args.id));
    if (!t) return fail('找不到工單');
    t.assignedAdminName = args.assignedAdminName || null;
    t.updatedAt = new Date().toISOString();
    saveDb(db);
    return ok(true, '已更新承辦人');
  }

  // 回覆並更新狀態：附加一則訊息，同時更新工單狀態與最後更新時間
  // senderType 預設 'admin'（大平台端既有呼叫未帶此參數，行為不變）；建商租戶服務入口回覆時會帶 'tenant'
  function replyAndUpdateStatus(args) {
    const db = loadDb();
    const t = db.tickets.find((x) => x.id === Number(args.id));
    if (!t) return fail('找不到工單');
    if (!args.content || !args.content.trim()) return fail('請輸入回覆內容');
    t.messages.push({
      id: db.nextTicketMessageId++,
      senderType: args.senderType || 'admin',
      senderName: args.senderName || '',
      content: args.content.trim(),
      attachments: args.attachments || [],
      createdAt: new Date().toISOString()
    });
    if (args.status) {
      t.status = args.status;
    }
    t.updatedAt = new Date().toISOString();
    saveDb(db);
    return ok(JSON.parse(JSON.stringify(t)), '已回覆並更新狀態');
  }

  // ---- 通知公告（建商租戶視角） ----
  function isNotificationVisibleToTenant(n, tenantId) {
    if (n.publishStatus !== 'published') return false;
    if (n.expireAt && new Date(n.expireAt).getTime() < Date.now()) return false;
    if (n.scopeType === 'targeted') return (n.targetTenantIds || []).includes(tenantId);
    return true;
  }

  // 建商租戶看得到的通知＝全體廣播（已發布、未過期）＋指定給該租戶的通知，依發布時間新到舊排序，並標示是否已讀
  function getTenantNotifications(tenantId) {
    const db = loadDb();
    const readIds = new Set((db.notificationReads[tenantId] || []));
    const list = db.notifications
      .filter((n) => isNotificationVisibleToTenant(n, tenantId))
      .map((n) => Object.assign({}, n, { isRead: readIds.has(n.id) }))
      .sort((a, b) => new Date(b.publishAt || b.createdAt) - new Date(a.publishAt || a.createdAt));
    return ok(list);
  }

  function markNotificationRead(args) {
    const db = loadDb();
    if (!db.notificationReads[args.tenantId]) db.notificationReads[args.tenantId] = [];
    if (!db.notificationReads[args.tenantId].includes(Number(args.notificationId))) {
      db.notificationReads[args.tenantId].push(Number(args.notificationId));
      saveDb(db);
    }
    return ok(true);
  }

  return {
    EnumStatusCode,
    EnumDevStatus,
    devStatusPillClass,
    getFeatureModuleList,
    getFeatureModuleTiers,
    getPlanList,
    getPlanData,
    getPlanModulesByVersionId,
    createPlan,
    createPlanNewVersion,
    setPlanEnabled,
    getTenantList,
    getTenantData,
    verifyTenantUserLogin,
    createTenant,
    updateTenant,
    setTenantStatus,
    addTenantNote,
    getTenantUsers,
    addTenantUser,
    bizResetTenantUserPassword,
    resetTenantUserPassword,
    getSentEmailLog,
    getVersionList,
    getVersionData,
    createVersionRecord,
    updateVersionRecord,
    getAdminUserList,
    getAdminAccountList,
    verifyAdminLogin,
    createAdminAccount,
    resetAdminAccountPassword,
    changeAdminPassword,
    getNotificationList,
    getNotificationData,
    saveNotification,
    setNotificationPublishStatus,
    getTicketList,
    getTicketData,
    setTicketAssignee,
    replyAndUpdateStatus,
    createTicket,
    getTenantNotifications,
    markNotificationRead
  };
})();
