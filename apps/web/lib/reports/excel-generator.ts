import ExcelJS from 'exceljs';

export interface ReportActivityItem {
  id: string;
  activity_date: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  activity_type: string;
  related_entity_type: string;
  related_entity_id: string;
  entity_name: string;
  description?: string | null;
  outcome?: string | null;
  follow_up_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ReportExportMetadata {
  reportTitle?: string;
  dateRangeLabel?: string;
  generatedByName?: string;
  generatedByEmail?: string;
  filterScope?: string;
}

// Brand Style Tokens (CLC CRM Design System)
const COLORS = {
  ink900: '111111',       // Primary Brand Charcoal
  ink800: '1F2937',       // Dark Gray
  cream100: 'F4F3E4',     // Warm Dashboard Background
  cream200: 'EBE9D0',     // Warm border / highlight
  gray50: 'F9FAFB',       // Subtle Zebra Stripe
  gray100: 'F3F4F6',      // Light border
  gray200: 'E5E7EB',      // Card Border
  gray400: '9CA3AF',      // Muted text
  gray500: '6B7280',      // Secondary text
  white: 'FFFFFF',        // White
  green600: '16A34A',     // GPS & Success accent
  amber600: 'D97706',     // Warning / Follow-up accent
  blue600: '2563EB',      // Info / Meeting accent
};

const BORDER_THIN: ExcelJS.Border = {
  style: 'thin',
  color: { argb: COLORS.gray200 },
};

const BORDER_BOX: Partial<ExcelJS.Borders> = {
  top: BORDER_THIN,
  left: BORDER_THIN,
  bottom: BORDER_THIN,
  right: BORDER_THIN,
};

// Font family that excels at both Arabic and Latin typography
const FONT_FAMILY = 'Segoe UI, Tahoma, Arial, sans-serif';

/**
 * Detects if a given string contains Arabic characters
 */
export function isArabicText(text?: string | null): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

/**
 * Translate activity types based on language
 */
export function formatActivityTypeExcel(type?: string | null, lang: 'ar' | 'en' = 'ar'): string {
  const t = (type || '').toLowerCase();
  if (lang === 'en') {
    switch (t) {
      case 'visit': return 'Site Visit';
      case 'call': return 'Phone Call';
      case 'meeting': return 'Meeting';
      case 'email': return 'Email';
      default: return type || 'Unknown';
    }
  }
  switch (t) {
    case 'visit': return 'زيارة ميدانية (Visit)';
    case 'call': return 'اتصال هاتفي (Call)';
    case 'meeting': return 'اجتماع عمل (Meeting)';
    case 'email': return 'بريد إلكتروني (Email)';
    default: return type || 'غير محدد';
  }
}

// Keep old name for backward compatibility (used in detailed sheet)
export function formatActivityType(type?: string | null): string {
  return formatActivityTypeExcel(type, 'ar');
}

/**
 * Translate related entity type based on language
 */
export function formatEntityTypeExcel(type?: string | null, lang: 'ar' | 'en' = 'ar'): string {
  const t = (type || '').toLowerCase();
  if (lang === 'en') {
    switch (t) {
      case 'lead': return 'Lead';
      case 'customer': return 'Customer';
      default: return type || '—';
    }
  }
  switch (t) {
    case 'lead': return 'عميل محتمل (Lead)';
    case 'customer': return 'عميل حالي (Customer)';
    default: return type || '—';
  }
}

export function formatEntityType(type?: string | null): string {
  return formatEntityTypeExcel(type, 'ar');
}

/**
 * Comprehensive bilingual labels for all Excel content
 */
function getExcelLabels(lang: 'ar' | 'en') {
  if (lang === 'en') {
    return {
      // Sheet names
      sheetKpi: 'KPIs - Executive Summary',
      sheetPivot: 'Pivot Analysis',
      sheetDetail: 'Activities Log',
      // KPI Sheet - Title
      titleBanner: 'CLC CONTRACTING — FIELD OPERATIONS & ACTIVITIES REPORT',
      subtitleBanner: 'Executive CRM Intelligence • Performance KPIs & Touchpoint Audit',
      // Metadata
      metaDateRange: 'Report Date Range:',
      metaActiveAgents: 'Active Representatives:',
      metaAgentUnit: 'representative(s)',
      metaFilterScope: 'Filter Scope / Employee:',
      metaUniqueAccounts: 'Total Companies & Accounts:',
      metaAccountUnit: 'company / account',
      metaExportDate: 'Export Date & Time:',
      metaExportBy: 'Exported By:',
      metaAllHistory: 'Full Recorded History',
      metaAllEmployees: 'All Company Representatives',
      metaSystemAdmin: 'System Administrator',
      // KPI Cards
      kpiTotalTitle: 'Total Field Activities',
      kpiTotalSub: 'TOTAL TOUCHPOINTS',
      kpiTotalDesc: 'All recorded field activity entries',
      kpiVisitsTitle: 'Site Visits & GPS',
      kpiVisitsSub: 'SITE VISITS & GPS',
      kpiVisitsDesc: (rate: string, count: number) => `GPS Verified: ${rate}% (${count})`,
      kpiCallsTitle: 'Phone Calls',
      kpiCallsSub: 'PHONE CALLS',
      kpiCallsDesc: 'Outbound calls and phone contacts',
      kpiMeetingsTitle: 'Meetings & Emails',
      kpiMeetingsSub: 'MEETINGS & EMAILS',
      kpiMeetingsDesc: (m: number, e: number) => `${m} meeting(s) • ${e} email(s)`,
      kpiFollowupsTitle: 'Scheduled Follow-ups',
      kpiFollowupsSub: 'SCHEDULED FOLLOW-UPS',
      kpiFollowupsDesc: 'Future actions and follow-ups',
      kpiAccountsTitle: 'Companies & Accounts',
      kpiAccountsSub: 'UNIQUE ACCOUNTS',
      kpiAccountsDesc: 'Client and company coverage',
      // Activity Breakdown
      actBreakdownTitle: 'Activity Type Distribution & GPS Verification Rate',
      actHeaderType: 'Activity Type',
      actHeaderCount: 'Total Count',
      actHeaderShare: 'Share (%)',
      actHeaderGps: 'GPS Verified',
      actHeaderGpsRate: 'GPS Compliance (%)',
      actVisitLabel: 'Site Visit',
      actCallLabel: 'Phone Call',
      actMeetingLabel: 'Meeting',
      actEmailLabel: 'Email',
      actTotalLabel: 'Grand Total of All Field Activities',
      // Outcome section
      noOutcome: 'No specific outcome recorded',
      outcomeTitle: 'Business Outcomes & Field Operations Analysis',
      outcomeHeaderOutcome: 'Outcome / Business Status',
      outcomeHeaderCount: 'Count',
      outcomeHeaderShare: 'Share (%)',
      outcomeHeaderCategory: 'Operational Classification',
      outcomePositive: 'Positive / Deal Progress',
      outcomeFollowup: 'Follow-up Required',
      outcomeNeutral: 'Procedural / Informational',
      // Pivot Sheet
      pivotTitle: 'Multi-Dimensional Pivot Analysis Tables',
      pivotATitle: 'Pivot Matrix 1: Field Representative Performance & Activity Distribution with GPS Compliance',
      pivotAHeaderName: 'Representative Name',
      pivotAHeaderVisits: 'Site Visits',
      pivotAHeaderCalls: 'Phone Calls',
      pivotAHeaderMeetings: 'Meetings',
      pivotAHeaderEmails: 'Emails',
      pivotAHeaderTotal: 'Total Activities',
      pivotAHeaderGps: 'GPS Verified',
      pivotAHeaderGpsRate: 'GPS Compliance (%)',
      pivotATotalLabel: 'Grand Total — All Representatives',
      unknownEmployee: 'Unknown',
      pivotBTitle: 'Pivot Matrix 2: Field Effort Direction (New Leads vs. Existing Customers)',
      pivotBHeaderPipeline: 'Account Classification',
      pivotBHeaderTouchpoints: 'Total Touchpoints',
      pivotBHeaderEffort: 'Effort Share (%)',
      pivotBLeadLabel: 'Leads & Prospects (New Opportunities)',
      pivotBCustLabel: 'Existing Customers (Active Contracts)',
      pivotCTitle: 'Pivot Matrix 3: Daily Activity Volume Timeline',
      pivotCHeaderDate: 'Activity Date',
      pivotCHeaderVisits: 'Visits',
      pivotCHeaderCalls: 'Calls',
      pivotCHeaderMeetings: 'Meetings',
      pivotCHeaderEmails: 'Emails',
      pivotCHeaderDailyTotal: 'Daily Total',
      unknownDate: 'Unknown',
      // Detail Sheet
      detailHeaderIdx: '#',
      detailHeaderDate: 'Date & Time',
      detailHeaderRep: 'Representative',
      detailHeaderEmail: 'Email',
      detailHeaderType: 'Activity Type',
      detailHeaderAccType: 'Account Type',
      detailHeaderCompany: 'Company Name',
      detailHeaderNotes: 'Notes & Observations',
      detailHeaderOutcome: 'Outcome',
      detailHeaderFollowup: 'Follow-up Date',
      detailHeaderLat: 'Latitude',
      detailHeaderLng: 'Longitude',
      detailHeaderGpsStatus: 'GPS Status',
      detailHeaderMapLink: 'Google Maps Link',
      gpsVerified: 'GPS Verified',
      gpsNone: 'No Coordinates',
      openInMaps: 'Open in Google Maps',
    };
  }
  // Arabic (default)
  return {
    sheetKpi: 'مؤشرات الأداء - KPIs',
    sheetPivot: 'التحليلات المحورية - Pivot',
    sheetDetail: 'سجل العمليات - Activities',
    titleBanner: 'شركة CLC للمقاولات — تقرير العمليات الميدانية والأنشطة',
    subtitleBanner: 'Executive CRM Intelligence • Performance KPIs & Touchpoint Audit • لوحة مؤشرات الأداء والمتابعة',
    metaDateRange: 'الفترة الزمنية للتقرير:',
    metaActiveAgents: 'الممثلون النشطون:',
    metaAgentUnit: 'ممثل',
    metaFilterScope: 'نطاق التصفية / الموظف:',
    metaUniqueAccounts: 'إجمالي الحسابات والشركات:',
    metaAccountUnit: 'شركة / حساب',
    metaExportDate: 'تاريخ وساعة التصدير:',
    metaExportBy: 'تم التصدير بواسطة:',
    metaAllHistory: 'كامل السجل التاريخي',
    metaAllEmployees: 'كافة موظفي الشركة',
    metaSystemAdmin: 'إدارة النظام',
    kpiTotalTitle: 'إجمالي الأنشطة الميدانية',
    kpiTotalSub: 'TOTAL TOUCHPOINTS',
    kpiTotalDesc: 'سجلات النشاط الميداني المسجلة',
    kpiVisitsTitle: 'الزيارات وموقع GPS',
    kpiVisitsSub: 'SITE VISITS & GPS',
    kpiVisitsDesc: (rate: string, count: number) => `موثقة بـ GPS: ${rate}% (${count})`,
    kpiCallsTitle: 'المكالمات الهاتفية',
    kpiCallsSub: 'PHONE CALLS',
    kpiCallsDesc: 'اتصالات صادرة وتواصل هاتفي',
    kpiMeetingsTitle: 'الاجتماعات والمراسلات',
    kpiMeetingsSub: 'MEETINGS & EMAILS',
    kpiMeetingsDesc: (m: number, e: number) => `${m} اجتماع • ${e} إيميل`,
    kpiFollowupsTitle: 'المتابعات المجدولة',
    kpiFollowupsSub: 'SCHEDULED FOLLOW-UPS',
    kpiFollowupsDesc: 'إجراءات ومتابعات مستقبلية',
    kpiAccountsTitle: 'الشركات والعملاء',
    kpiAccountsSub: 'UNIQUE ACCOUNTS',
    kpiAccountsDesc: 'تغطية العملاء والشركات المستهدفة',
    actBreakdownTitle: 'توزيع أنواع الأنشطة ونسبة توثيق الموقع الجغرافي (GPS)',
    actHeaderType: 'نوع النشاط / Activity Type',
    actHeaderCount: 'العدد الإجمالي / Count',
    actHeaderShare: 'الحصة النسبية (%)',
    actHeaderGps: 'الموثّق بـ GPS',
    actHeaderGpsRate: 'معدل الالتزام بالـ GPS (%)',
    actVisitLabel: 'زيارة موقع ميدانية (Site Visit)',
    actCallLabel: 'اتصال هاتفي (Phone Call)',
    actMeetingLabel: 'اجتماع رسمي (Meeting)',
    actEmailLabel: 'مراسلة بريد إلكتروني (Email)',
    actTotalLabel: 'الإجمالي العام للأنشطة الميدانية',
    noOutcome: 'لم يتم تسجيل نتيجة محددة',
    outcomeTitle: 'تحليل مخرجات ونتائج العمليات التجارية الميدانية (Outcomes)',
    outcomeHeaderOutcome: 'النتيجة / الحالة التجارية (Outcome)',
    outcomeHeaderCount: 'العدد / Count',
    outcomeHeaderShare: 'النسبة / Share (%)',
    outcomeHeaderCategory: 'التصنيف التشغيلي (Status Category)',
    outcomePositive: 'إيجابي / تقدم في الصفقة (Positive)',
    outcomeFollowup: 'متابعة مطلوبة (Follow-up Required)',
    outcomeNeutral: 'إجرائي / معلوماتي (Neutral)',
    pivotTitle: 'جداول ومصفوفات التحليل المحوري متعدد الأبعاد (Multi-Dimensional Pivot Analysis)',
    pivotATitle: 'المصفوفة المحورية 1: أداء الممثلين الميدانيين وتوزيع الأنشطة ونسبة الـ GPS',
    pivotAHeaderName: 'اسم الممثل / Representative',
    pivotAHeaderVisits: 'الزيارات الميدانية',
    pivotAHeaderCalls: 'المكالمات الهاتفية',
    pivotAHeaderMeetings: 'الاجتماعات',
    pivotAHeaderEmails: 'المراسلات',
    pivotAHeaderTotal: 'إجمالي الأنشطة',
    pivotAHeaderGps: 'موثّقة بالـ GPS',
    pivotAHeaderGpsRate: 'معدل الالتزام بـ GPS (%)',
    pivotATotalLabel: 'الإجمالي العام لكافة الممثلين',
    unknownEmployee: 'غير محدد',
    pivotBTitle: 'المصفوفة المحورية 2: توجيه الجهد الميداني (عملاء محتملون جدد vs عملاء حاليون)',
    pivotBHeaderPipeline: 'تصنيف الحساب / Account Pipeline',
    pivotBHeaderTouchpoints: 'إجمالي نقاط التواصل',
    pivotBHeaderEffort: 'حصة الجهد (%)',
    pivotBLeadLabel: 'العملاء المحتملون (Leads & Prospects - فرص جديدة)',
    pivotBCustLabel: 'العملاء الحاليون (Customers - عقود وحسابات قائمة)',
    pivotCTitle: 'المصفوفة المحورية 3: التدرج والنسق الزمني اليومي لحجم الأنشطة الميدانية',
    pivotCHeaderDate: 'تاريخ النشاط / Date',
    pivotCHeaderVisits: 'الزيارات',
    pivotCHeaderCalls: 'المكالمات',
    pivotCHeaderMeetings: 'الاجتماعات',
    pivotCHeaderEmails: 'المراسلات',
    pivotCHeaderDailyTotal: 'الإجمالي اليومي',
    unknownDate: 'غير محدد',
    detailHeaderIdx: '# (الرقم)',
    detailHeaderDate: 'التاريخ والوقت (Date & Time)',
    detailHeaderRep: 'الممثل / الموظف (Representative)',
    detailHeaderEmail: 'البريد الإلكتروني (Email)',
    detailHeaderType: 'نوع النشاط (Activity Type)',
    detailHeaderAccType: 'نوع الحساب (Account Type)',
    detailHeaderCompany: 'اسم الشركة / العميل (Company Name)',
    detailHeaderNotes: 'الملاحظات والتفاصيل (Observations & Notes)',
    detailHeaderOutcome: 'النتيجة التشغيلية (Outcome)',
    detailHeaderFollowup: 'موعد المتابعة (Follow-up)',
    detailHeaderLat: 'خط العرض (Lat)',
    detailHeaderLng: 'خط الطول (Lng)',
    detailHeaderGpsStatus: 'توثيق GPS',
    detailHeaderMapLink: 'موقع خرائط Google',
    gpsVerified: 'موثّق بالـ GPS',
    gpsNone: 'بدون إحداثيات',
    openInMaps: 'فتح في خرائط Google',
  };
}

type ExcelLabels = ReturnType<typeof getExcelLabels>;

export async function generateExecutiveReportWorkbook(
  activities: ReportActivityItem[],
  metadata: ReportExportMetadata = {},
  lang: 'ar' | 'en' = 'ar'
): Promise<Buffer> {
  const L = getExcelLabels(lang);
  const isRTL = lang === 'ar';
  const textAlign = isRTL ? 'right' as const : 'left' as const;
  const readOrder = isRTL ? 'rtl' as const : 'ltr' as const;
  const dateLocale = isRTL ? 'ar-SA' : 'en-US';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CLC CRM';
  workbook.lastModifiedBy = metadata.generatedByName || 'CLC CRM Field Intelligence';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Compute Aggregates & KPIs
  const totalCount = activities.length;
  const visitActivities = activities.filter((a) => a.activity_type.toLowerCase() === 'visit');
  const visitCount = visitActivities.length;
  const gpsVerifiedCount = visitActivities.filter((a) => a.latitude && a.longitude).length;
  const gpsComplianceRate = visitCount > 0 ? (gpsVerifiedCount / visitCount) : 0;

  const callCount = activities.filter((a) => a.activity_type.toLowerCase() === 'call').length;
  const meetingCount = activities.filter((a) => a.activity_type.toLowerCase() === 'meeting').length;
  const emailCount = activities.filter((a) => a.activity_type.toLowerCase() === 'email').length;
  const followUpCount = activities.filter((a) => Boolean(a.follow_up_date)).length;

  const uniqueAccounts = new Set(activities.map((a) => `${a.related_entity_type}-${a.related_entity_id}`));
  const uniqueCompaniesCount = uniqueAccounts.size;

  const uniqueEmployees = new Set(activities.map((a) => a.employee_name || a.employee_id));
  const activeAgentsCount = uniqueEmployees.size;

  // -------------------------------------------------------------
  // SHEET 1: KPIs / Executive Summary
  // -------------------------------------------------------------
  const kpiSheet = workbook.addWorksheet(L.sheetKpi, {
    views: [{ showGridLines: true, rightToLeft: isRTL }],
    properties: { tabColor: { argb: COLORS.ink900 } },
  });

  // Set Column Widths for KPI Sheet
  kpiSheet.columns = [
    { width: 4 },  // A (Margin)
    { width: 24 }, // B
    { width: 20 }, // C
    { width: 20 }, // D
    { width: 20 }, // E
    { width: 20 }, // F
    { width: 22 }, // G
    { width: 4 },  // H (Margin)
  ];

  // Title Banner
  kpiSheet.mergeCells('B2:G2');
  const titleCell = kpiSheet.getCell('B2');
  titleCell.value = L.titleBanner;
  titleCell.font = { name: FONT_FAMILY, size: 16, bold: true, color: { argb: COLORS.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
  titleCell.alignment = { vertical: 'middle', horizontal: textAlign, readingOrder: readOrder, indent: 1 };
  kpiSheet.getRow(2).height = 38;

  // Subtitle Banner
  kpiSheet.mergeCells('B3:G3');
  const subTitleCell = kpiSheet.getCell('B3');
  subTitleCell.value = L.subtitleBanner;
  subTitleCell.font = { name: FONT_FAMILY, size: 9.5, italic: true, color: { argb: COLORS.gray400 } };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
  subTitleCell.alignment = { vertical: 'top', horizontal: textAlign, readingOrder: readOrder, indent: 1 };
  kpiSheet.getRow(3).height = 22;

  // Metadata Table (Rows 5-7)
  const metaLabels = [
    [L.metaDateRange, metadata.dateRangeLabel || L.metaAllHistory, L.metaActiveAgents, `${activeAgentsCount} ${L.metaAgentUnit}`],
    [L.metaFilterScope, metadata.filterScope || L.metaAllEmployees, L.metaUniqueAccounts, `${uniqueCompaniesCount} ${L.metaAccountUnit}`],
    [L.metaExportDate, new Date().toLocaleString(dateLocale, { hour12: true }), L.metaExportBy, metadata.generatedByName || L.metaSystemAdmin],
  ];

  metaLabels.forEach((rowVals, idx) => {
    const rowNum = 5 + idx;
    kpiSheet.getRow(rowNum).height = 20;

    kpiSheet.getCell(`B${rowNum}`).value = rowVals[0];
    kpiSheet.getCell(`B${rowNum}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.gray500 } };
    kpiSheet.getCell(`B${rowNum}`).alignment = { horizontal: textAlign, readingOrder: readOrder };
    
    kpiSheet.getCell(`C${rowNum}`).value = rowVals[1];
    kpiSheet.getCell(`C${rowNum}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.ink900 } };
    kpiSheet.getCell(`C${rowNum}`).alignment = { horizontal: textAlign, readingOrder: readOrder };

    kpiSheet.getCell(`E${rowNum}`).value = rowVals[2];
    kpiSheet.getCell(`E${rowNum}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.gray500 } };
    kpiSheet.getCell(`E${rowNum}`).alignment = { horizontal: textAlign, readingOrder: readOrder };

    kpiSheet.getCell(`F${rowNum}`).value = rowVals[3];
    kpiSheet.getCell(`F${rowNum}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.ink900 } };
    kpiSheet.getCell(`F${rowNum}`).alignment = { horizontal: textAlign, readingOrder: readOrder };
  });

  // KPI CARDS SECTION (Rows 10-12)
  const kpiCards = [
    {
      title: L.kpiTotalTitle,
      subTitle: L.kpiTotalSub,
      value: totalCount,
      sub: L.kpiTotalDesc,
      cellTop: 'B10',
      cellVal: 'B11',
      cellSub: 'B12',
      format: '#,##0',
    },
    {
      title: L.kpiVisitsTitle,
      subTitle: L.kpiVisitsSub,
      value: visitCount,
      sub: L.kpiVisitsDesc((gpsComplianceRate * 100).toFixed(1), gpsVerifiedCount),
      cellTop: 'C10',
      cellVal: 'C11',
      cellSub: 'C12',
      format: '#,##0',
    },
    {
      title: L.kpiCallsTitle,
      subTitle: L.kpiCallsSub,
      value: callCount,
      sub: L.kpiCallsDesc,
      cellTop: 'D10',
      cellVal: 'D11',
      cellSub: 'D12',
      format: '#,##0',
    },
    {
      title: L.kpiMeetingsTitle,
      subTitle: L.kpiMeetingsSub,
      value: meetingCount + emailCount,
      sub: L.kpiMeetingsDesc(meetingCount, emailCount),
      cellTop: 'E10',
      cellVal: 'E11',
      cellSub: 'E12',
      format: '#,##0',
    },
    {
      title: L.kpiFollowupsTitle,
      subTitle: L.kpiFollowupsSub,
      value: followUpCount,
      sub: L.kpiFollowupsDesc,
      cellTop: 'F10',
      cellVal: 'F11',
      cellSub: 'F12',
      format: '#,##0',
    },
    {
      title: L.kpiAccountsTitle,
      subTitle: L.kpiAccountsSub,
      value: uniqueCompaniesCount,
      sub: L.kpiAccountsDesc,
      cellTop: 'G10',
      cellVal: 'G11',
      cellSub: 'G12',
      format: '#,##0',
    },
  ];

  kpiCards.forEach((card) => {
    // Title row
    const cTop = kpiSheet.getCell(card.cellTop);
    cTop.value = `${card.title}\n${card.subTitle}`;
    cTop.font = { name: FONT_FAMILY, size: 8, bold: true, color: { argb: COLORS.gray500 } };
    cTop.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.cream100 } };
    cTop.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: readOrder };
    cTop.border = { top: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

    // Value row
    const cVal = kpiSheet.getCell(card.cellVal);
    cVal.value = card.value;
    cVal.numFmt = card.format;
    cVal.font = { name: FONT_FAMILY, size: 19, bold: true, color: { argb: COLORS.ink900 } };
    cVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.cream100 } };
    cVal.alignment = { horizontal: 'center', vertical: 'middle' };
    cVal.border = { left: BORDER_THIN, right: BORDER_THIN };

    // Subtitle row
    const cSub = kpiSheet.getCell(card.cellSub);
    cSub.value = card.sub;
    cSub.font = { name: FONT_FAMILY, size: 7.5, italic: true, color: { argb: COLORS.gray500 } };
    cSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.cream100 } };
    cSub.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: readOrder };
    cSub.border = { bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };
  });

  kpiSheet.getRow(10).height = 24;
  kpiSheet.getRow(11).height = 28;
  kpiSheet.getRow(12).height = 20;

  // ACTIVITY BREAKDOWN SUMMARY TABLE (Rows 15-21)
  const actTypesList = [
    { key: 'visit', label: L.actVisitLabel, count: visitCount, gps: gpsVerifiedCount },
    { key: 'call', label: L.actCallLabel, count: callCount, gps: 0 },
    { key: 'meeting', label: L.actMeetingLabel, count: meetingCount, gps: 0 },
    { key: 'email', label: L.actEmailLabel, count: emailCount, gps: 0 },
  ];

  kpiSheet.mergeCells('B15:G15');
  const actTableTitle = kpiSheet.getCell('B15');
  actTableTitle.value = L.actBreakdownTitle;
  actTableTitle.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLORS.ink900 } };
  actTableTitle.alignment = { horizontal: textAlign, readingOrder: readOrder };
  kpiSheet.getRow(15).height = 26;

  const actHeaders = [
    L.actHeaderType,
    L.actHeaderCount,
    L.actHeaderShare,
    L.actHeaderGps,
    L.actHeaderGpsRate,
  ];
  const actHeaderCols = ['B', 'C', 'D', 'E', 'F'];
  actHeaders.forEach((h, i) => {
    const c = kpiSheet.getCell(`${actHeaderCols[i]}16`);
    c.value = h;
    c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.white } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
    c.alignment = { horizontal: i === 0 ? textAlign : 'center', vertical: 'middle', readingOrder: readOrder };
    c.border = BORDER_BOX;
  });
  kpiSheet.getRow(16).height = 24;

  actTypesList.forEach((act, idx) => {
    const rNum = 17 + idx;
    const isZebra = idx % 2 === 1;
    const rowFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isZebra ? COLORS.gray50 : COLORS.white },
    };

    // Label
    const cType = kpiSheet.getCell(`B${rNum}`);
    cType.value = act.label;
    cType.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.ink900 } };
    cType.alignment = { horizontal: textAlign, vertical: 'middle', readingOrder: readOrder };
    cType.fill = rowFill;
    cType.border = BORDER_BOX;

    // Count
    const cCount = kpiSheet.getCell(`C${rNum}`);
    cCount.value = act.count;
    cCount.numFmt = '#,##0';
    cCount.font = { name: FONT_FAMILY, size: 9.5, color: { argb: COLORS.ink900 } };
    cCount.alignment = { horizontal: 'center' };
    cCount.fill = rowFill;
    cCount.border = BORDER_BOX;

    // Share
    const cShare = kpiSheet.getCell(`D${rNum}`);
    cShare.value = totalCount > 0 ? act.count / totalCount : 0;
    cShare.numFmt = '0.0%';
    cShare.font = { name: FONT_FAMILY, size: 9.5, color: { argb: COLORS.gray500 } };
    cShare.alignment = { horizontal: 'center' };
    cShare.fill = rowFill;
    cShare.border = BORDER_BOX;

    // GPS
    const cGps = kpiSheet.getCell(`E${rNum}`);
    cGps.value = act.key === 'visit' ? act.gps : '—';
    cGps.font = { name: FONT_FAMILY, size: 9.5, color: { argb: COLORS.ink900 } };
    cGps.alignment = { horizontal: 'center' };
    cGps.fill = rowFill;
    cGps.border = BORDER_BOX;

    // GPS Rate
    const cGpsRate = kpiSheet.getCell(`F${rNum}`);
    cGpsRate.value = act.key === 'visit' ? (act.count > 0 ? act.gps / act.count : 0) : '—';
    if (act.key === 'visit') cGpsRate.numFmt = '0.0%';
    cGpsRate.font = {
      name: FONT_FAMILY,
      size: 9.5,
      bold: act.key === 'visit',
      color: { argb: act.key === 'visit' ? COLORS.green600 : COLORS.gray400 },
    };
    cGpsRate.alignment = { horizontal: 'center' };
    cGpsRate.fill = rowFill;
    cGpsRate.border = BORDER_BOX;

    kpiSheet.getRow(rNum).height = 20;
  });

  // Total Summary Row
  const totRow = 17 + actTypesList.length;
  const totFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.cream100 } };
  
  const cTotLabel = kpiSheet.getCell(`B${totRow}`);
  cTotLabel.value = L.actTotalLabel;
  cTotLabel.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.ink900 } };
  cTotLabel.alignment = { horizontal: textAlign, vertical: 'middle', readingOrder: readOrder };
  cTotLabel.fill = totFill;
  cTotLabel.border = { top: BORDER_THIN, bottom: { style: 'double', color: { argb: COLORS.ink900 } }, left: BORDER_THIN, right: BORDER_THIN };

  const cTotCount = kpiSheet.getCell(`C${totRow}`);
  cTotCount.value = totalCount;
  cTotCount.numFmt = '#,##0';
  cTotCount.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.ink900 } };
  cTotCount.alignment = { horizontal: 'center' };
  cTotCount.fill = totFill;
  cTotCount.border = { top: BORDER_THIN, bottom: { style: 'double', color: { argb: COLORS.ink900 } }, left: BORDER_THIN, right: BORDER_THIN };

  const cTotShare = kpiSheet.getCell(`D${totRow}`);
  cTotShare.value = 1.0;
  cTotShare.numFmt = '100.0%';
  cTotShare.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.ink900 } };
  cTotShare.alignment = { horizontal: 'center' };
  cTotShare.fill = totFill;
  cTotShare.border = { top: BORDER_THIN, bottom: { style: 'double', color: { argb: COLORS.ink900 } }, left: BORDER_THIN, right: BORDER_THIN };

  const cTotGps = kpiSheet.getCell(`E${totRow}`);
  cTotGps.value = gpsVerifiedCount;
  cTotGps.numFmt = '#,##0';
  cTotGps.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.ink900 } };
  cTotGps.alignment = { horizontal: 'center' };
  cTotGps.fill = totFill;
  cTotGps.border = { top: BORDER_THIN, bottom: { style: 'double', color: { argb: COLORS.ink900 } }, left: BORDER_THIN, right: BORDER_THIN };

  const cTotGpsRate = kpiSheet.getCell(`F${totRow}`);
  cTotGpsRate.value = gpsComplianceRate;
  cTotGpsRate.numFmt = '0.0%';
  cTotGpsRate.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.green600 } };
  cTotGpsRate.alignment = { horizontal: 'center' };
  cTotGpsRate.fill = totFill;
  cTotGpsRate.border = { top: BORDER_THIN, bottom: { style: 'double', color: { argb: COLORS.ink900 } }, left: BORDER_THIN, right: BORDER_THIN };
  kpiSheet.getRow(totRow).height = 22;

  // OUTCOME BREAKDOWN SECTION
  const outcomeCounts: Record<string, number> = {};
  activities.forEach((a) => {
    const out = a.outcome?.trim() || L.noOutcome;
    outcomeCounts[out] = (outcomeCounts[out] || 0) + 1;
  });

  const sortedOutcomes = Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1]);

  kpiSheet.mergeCells(`B${totRow + 3}:G${totRow + 3}`);
  const outcomeTitle = kpiSheet.getCell(`B${totRow + 3}`);
  outcomeTitle.value = L.outcomeTitle;
  outcomeTitle.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLORS.ink900 } };
  outcomeTitle.alignment = { horizontal: textAlign, readingOrder: readOrder };
  kpiSheet.getRow(totRow + 3).height = 26;

  const outcomeHeaderRow = totRow + 4;
  kpiSheet.getCell(`B${outcomeHeaderRow}`).value = L.outcomeHeaderOutcome;
  kpiSheet.getCell(`B${outcomeHeaderRow}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.white } };
  kpiSheet.getCell(`B${outcomeHeaderRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
  kpiSheet.getCell(`B${outcomeHeaderRow}`).alignment = { horizontal: textAlign, readingOrder: readOrder };
  kpiSheet.getCell(`B${outcomeHeaderRow}`).border = BORDER_BOX;

  kpiSheet.getCell(`C${outcomeHeaderRow}`).value = L.outcomeHeaderCount;
  kpiSheet.getCell(`C${outcomeHeaderRow}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.white } };
  kpiSheet.getCell(`C${outcomeHeaderRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
  kpiSheet.getCell(`C${outcomeHeaderRow}`).alignment = { horizontal: 'center' };
  kpiSheet.getCell(`C${outcomeHeaderRow}`).border = BORDER_BOX;

  kpiSheet.getCell(`D${outcomeHeaderRow}`).value = L.outcomeHeaderShare;
  kpiSheet.getCell(`D${outcomeHeaderRow}`).font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.white } };
  kpiSheet.getCell(`D${outcomeHeaderRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
  kpiSheet.getCell(`D${outcomeHeaderRow}`).alignment = { horizontal: 'center' };
  kpiSheet.getCell(`D${outcomeHeaderRow}`).border = BORDER_BOX;

  kpiSheet.mergeCells(`E${outcomeHeaderRow}:F${outcomeHeaderRow}`);
  const outActionH = kpiSheet.getCell(`E${outcomeHeaderRow}`);
  outActionH.value = L.outcomeHeaderCategory;
  outActionH.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.white } };
  outActionH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
  outActionH.alignment = { horizontal: 'center', readingOrder: readOrder };
  outActionH.border = BORDER_BOX;
  kpiSheet.getCell(`F${outcomeHeaderRow}`).border = BORDER_BOX;

  kpiSheet.getRow(outcomeHeaderRow).height = 24;

  sortedOutcomes.slice(0, 10).forEach(([outcome, count], idx) => {
    const r = outcomeHeaderRow + 1 + idx;
    const isZebra = idx % 2 === 1;
    const rowFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isZebra ? COLORS.gray50 : COLORS.white },
    };

    const cOut = kpiSheet.getCell(`B${r}`);
    cOut.value = outcome;
    cOut.font = { name: FONT_FAMILY, size: 9, color: { argb: COLORS.ink900 } };
    cOut.alignment = { horizontal: textAlign, vertical: 'middle', readingOrder: readOrder };
    cOut.fill = rowFill;
    cOut.border = BORDER_BOX;

    const cCnt = kpiSheet.getCell(`C${r}`);
    cCnt.value = count;
    cCnt.numFmt = '#,##0';
    cCnt.font = { name: FONT_FAMILY, size: 9, color: { argb: COLORS.ink900 } };
    cCnt.alignment = { horizontal: 'center' };
    cCnt.fill = rowFill;
    cCnt.border = BORDER_BOX;

    const cPct = kpiSheet.getCell(`D${r}`);
    cPct.value = totalCount > 0 ? count / totalCount : 0;
    cPct.numFmt = '0.0%';
    cPct.font = { name: FONT_FAMILY, size: 9, color: { argb: COLORS.gray500 } };
    cPct.alignment = { horizontal: 'center' };
    cPct.fill = rowFill;
    cPct.border = BORDER_BOX;

    kpiSheet.mergeCells(`E${r}:F${r}`);
    const cClass = kpiSheet.getCell(`E${r}`);
    const lowerOut = outcome.toLowerCase();
    const isPositive =
      lowerOut.includes('interested') ||
      lowerOut.includes('won') ||
      lowerOut.includes('deal') ||
      lowerOut.includes('agree') ||
      lowerOut.includes('signed') ||
      lowerOut.includes('مهتم') ||
      lowerOut.includes('اتفاق') ||
      lowerOut.includes('عقد');

    const isFollowup =
      lowerOut.includes('follow') ||
      lowerOut.includes('call') ||
      lowerOut.includes('quote') ||
      lowerOut.includes('pending') ||
      lowerOut.includes('متابعة') ||
      lowerOut.includes('عرض') ||
      lowerOut.includes('معلق');

    cClass.value = isPositive
      ? L.outcomePositive
      : isFollowup
      ? L.outcomeFollowup
      : L.outcomeNeutral;

    cClass.font = {
      name: FONT_FAMILY,
      size: 8.5,
      color: { argb: isPositive ? COLORS.green600 : isFollowup ? COLORS.amber600 : COLORS.gray500 },
      bold: isPositive || isFollowup,
    };
    cClass.alignment = { horizontal: 'center', readingOrder: readOrder };
    cClass.fill = rowFill;
    cClass.border = BORDER_BOX;
    kpiSheet.getCell(`F${r}`).border = BORDER_BOX;

    kpiSheet.getRow(r).height = 20;
  });

  // -------------------------------------------------------------
  // SHEET 2: التحليلات المحورية (Pivot Analysis)
  // -------------------------------------------------------------
  const pivotSheet = workbook.addWorksheet(L.sheetPivot, {
    views: [{ showGridLines: true, rightToLeft: isRTL }],
    properties: { tabColor: { argb: '4F46E5' } },
  });

  pivotSheet.columns = [
    { width: 4 },  // A Margin
    { width: 28 }, // B Employee / Dimension
    { width: 16 }, // C Visits
    { width: 16 }, // D Calls
    { width: 16 }, // E Meetings
    { width: 16 }, // F Emails
    { width: 18 }, // G Total
    { width: 18 }, // H GPS Visits
    { width: 20 }, // I GPS Compliance %
    { width: 4 },  // J Margin
  ];

  // Pivot Title
  pivotSheet.mergeCells('B2:I2');
  const pivTitle = pivotSheet.getCell('B2');
  pivTitle.value = L.pivotTitle;
  pivTitle.font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: COLORS.white } };
  pivTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
  pivTitle.alignment = { vertical: 'middle', horizontal: textAlign, readingOrder: readOrder, indent: 1 };
  pivotSheet.getRow(2).height = 34;

  // 1. PIVOT TABLE A: Employee × Activity Type Matrix
  pivotSheet.mergeCells('B4:I4');
  const pivAHeader = pivotSheet.getCell('B4');
  pivAHeader.value = L.pivotATitle;
  pivAHeader.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLORS.ink900 } };
  pivAHeader.alignment = { horizontal: textAlign, readingOrder: readOrder };
  pivotSheet.getRow(4).height = 24;

  const pivAColHeaders = [
    L.pivotAHeaderName,
    L.pivotAHeaderVisits,
    L.pivotAHeaderCalls,
    L.pivotAHeaderMeetings,
    L.pivotAHeaderEmails,
    L.pivotAHeaderTotal,
    L.pivotAHeaderGps,
    L.pivotAHeaderGpsRate,
  ];
  const pivAColLetters = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

  pivAColHeaders.forEach((h, i) => {
    const c = pivotSheet.getCell(`${pivAColLetters[i]}5`);
    c.value = h;
    c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.white } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
    c.alignment = { horizontal: i === 0 ? 'right' : 'center', vertical: 'middle', readingOrder: 'rtl' };
    c.border = BORDER_BOX;
  });
  pivotSheet.getRow(5).height = 24;

  // Aggregate by Employee
  interface EmpPivotRow {
    name: string;
    email: string;
    visits: number;
    calls: number;
    meetings: number;
    emails: number;
    total: number;
    gpsVerified: number;
  }

  const empMap = new Map<string, EmpPivotRow>();
  activities.forEach((a) => {
    const key = a.employee_name || a.employee_id || L.unknownEmployee;
    const entry = empMap.get(key) || {
      name: key,
      email: a.employee_email || '',
      visits: 0,
      calls: 0,
      meetings: 0,
      emails: 0,
      total: 0,
      gpsVerified: 0,
    };

    const type = a.activity_type.toLowerCase();
    if (type === 'visit') {
      entry.visits += 1;
      if (a.latitude && a.longitude) entry.gpsVerified += 1;
    } else if (type === 'call') {
      entry.calls += 1;
    } else if (type === 'meeting') {
      entry.meetings += 1;
    } else if (type === 'email') {
      entry.emails += 1;
    }

    entry.total += 1;
    empMap.set(key, entry);
  });

  const empRows = Array.from(empMap.values()).sort((a, b) => b.total - a.total);

  let currentPivRow = 6;
  empRows.forEach((emp, idx) => {
    const isZebra = idx % 2 === 1;
    const rFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isZebra ? COLORS.gray50 : COLORS.white },
    };

    const cName = pivotSheet.getCell(`B${currentPivRow}`);
    cName.value = emp.name;
    cName.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.ink900 } };
    cName.alignment = { horizontal: textAlign, vertical: 'middle', readingOrder: readOrder };
    cName.fill = rFill;
    cName.border = BORDER_BOX;

    const values = [emp.visits, emp.calls, emp.meetings, emp.emails, emp.total, emp.gpsVerified];
    values.forEach((v, i) => {
      const colLetter = pivAColLetters[i + 1];
      const cell = pivotSheet.getCell(`${colLetter}${currentPivRow}`);
      cell.value = v;
      cell.numFmt = '#,##0';
      cell.font = {
        name: FONT_FAMILY,
        size: 9.5,
        bold: colLetter === 'G',
        color: { argb: colLetter === 'G' ? COLORS.ink900 : COLORS.gray500 },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = rFill;
      cell.border = BORDER_BOX;
    });

    const cGpsPct = pivotSheet.getCell(`I${currentPivRow}`);
    cGpsPct.value = emp.visits > 0 ? emp.gpsVerified / emp.visits : 0;
    cGpsPct.numFmt = '0.0%';
    cGpsPct.font = {
      name: FONT_FAMILY,
      size: 9.5,
      bold: true,
      color: { argb: emp.visits > 0 && emp.gpsVerified / emp.visits >= 0.8 ? COLORS.green600 : COLORS.amber600 },
    };
    cGpsPct.alignment = { horizontal: 'center', vertical: 'middle' };
    cGpsPct.fill = rFill;
    cGpsPct.border = BORDER_BOX;

    pivotSheet.getRow(currentPivRow).height = 20;
    currentPivRow++;
  });

  // Pivot A Grand Total Row
  const pivATotFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.cream100 } };
  const cTotEmp = pivotSheet.getCell(`B${currentPivRow}`);
  cTotEmp.value = L.pivotATotalLabel;
  cTotEmp.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.ink900 } };
  cTotEmp.alignment = { horizontal: textAlign, vertical: 'middle', readingOrder: readOrder };
  cTotEmp.fill = pivATotFill;
  cTotEmp.border = { top: BORDER_THIN, bottom: { style: 'double', color: { argb: COLORS.ink900 } }, left: BORDER_THIN, right: BORDER_THIN };

  const pivATotals = [visitCount, callCount, meetingCount, emailCount, totalCount, gpsVerifiedCount];
  pivATotals.forEach((v, i) => {
    const colLetter = pivAColLetters[i + 1];
    const cell = pivotSheet.getCell(`${colLetter}${currentPivRow}`);
    cell.value = v;
    cell.numFmt = '#,##0';
    cell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.ink900 } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = pivATotFill;
    cell.border = { top: BORDER_THIN, bottom: { style: 'double', color: { argb: COLORS.ink900 } }, left: BORDER_THIN, right: BORDER_THIN };
  });

  const cTotPivAGpsRate = pivotSheet.getCell(`I${currentPivRow}`);
  cTotPivAGpsRate.value = gpsComplianceRate;
  cTotPivAGpsRate.numFmt = '0.0%';
  cTotPivAGpsRate.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.green600 } };
  cTotPivAGpsRate.alignment = { horizontal: 'center', vertical: 'middle' };
  cTotPivAGpsRate.fill = pivATotFill;
  cTotPivAGpsRate.border = { top: BORDER_THIN, bottom: { style: 'double', color: { argb: COLORS.ink900 } }, left: BORDER_THIN, right: BORDER_THIN };
  pivotSheet.getRow(currentPivRow).height = 22;

  // 2. PIVOT TABLE B: Account Type (Leads vs Customers) × Activity Type
  currentPivRow += 3;
  pivotSheet.mergeCells(`B${currentPivRow}:I${currentPivRow}`);
  const pivBHeader = pivotSheet.getCell(`B${currentPivRow}`);
  pivBHeader.value = L.pivotBTitle;
  pivBHeader.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLORS.ink900 } };
  pivBHeader.alignment = { horizontal: textAlign, readingOrder: readOrder };
  pivotSheet.getRow(currentPivRow).height = 24;

  currentPivRow++;
  const pivBColHeaders = [
    L.pivotBHeaderPipeline,
    L.pivotAHeaderVisits,
    L.pivotAHeaderCalls,
    L.pivotAHeaderMeetings,
    L.pivotAHeaderEmails,
    L.pivotBHeaderTouchpoints,
    L.pivotBHeaderEffort,
  ];
  const pivBColLetters = ['B', 'C', 'D', 'E', 'F', 'G', 'H'];

  pivBColHeaders.forEach((h, i) => {
    const c = pivotSheet.getCell(`${pivBColLetters[i]}${currentPivRow}`);
    c.value = h;
    c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.white } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
    c.alignment = { horizontal: i === 0 ? 'right' : 'center', vertical: 'middle', readingOrder: 'rtl' };
    c.border = BORDER_BOX;
  });
  pivotSheet.getRow(currentPivRow).height = 24;

  const leadActs = activities.filter((a) => a.related_entity_type.toLowerCase() === 'lead');
  const custActs = activities.filter((a) => a.related_entity_type.toLowerCase() === 'customer');

  const accBreakdowns = [
    { label: L.pivotBLeadLabel, list: leadActs },
    { label: L.pivotBCustLabel, list: custActs },
  ];

  accBreakdowns.forEach((acc, idx) => {
    currentPivRow++;
    const isZebra = idx % 2 === 1;
    const rFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isZebra ? COLORS.gray50 : COLORS.white },
    };

    const cLbl = pivotSheet.getCell(`B${currentPivRow}`);
    cLbl.value = acc.label;
    cLbl.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.ink900 } };
    cLbl.alignment = { horizontal: textAlign, vertical: 'middle', readingOrder: readOrder };
    cLbl.fill = rFill;
    cLbl.border = BORDER_BOX;

    const vCount = acc.list.filter((a) => a.activity_type.toLowerCase() === 'visit').length;
    const cCount = acc.list.filter((a) => a.activity_type.toLowerCase() === 'call').length;
    const mCount = acc.list.filter((a) => a.activity_type.toLowerCase() === 'meeting').length;
    const eCount = acc.list.filter((a) => a.activity_type.toLowerCase() === 'email').length;
    const tCount = acc.list.length;

    const vals = [vCount, cCount, mCount, eCount, tCount];
    vals.forEach((v, i) => {
      const col = pivBColLetters[i + 1];
      const cell = pivotSheet.getCell(`${col}${currentPivRow}`);
      cell.value = v;
      cell.numFmt = '#,##0';
      cell.font = { name: FONT_FAMILY, size: 9.5, bold: col === 'G', color: { argb: COLORS.ink900 } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = rFill;
      cell.border = BORDER_BOX;
    });

    const cShare = pivotSheet.getCell(`H${currentPivRow}`);
    cShare.value = totalCount > 0 ? tCount / totalCount : 0;
    cShare.numFmt = '0.0%';
    cShare.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.blue600 } };
    cShare.alignment = { horizontal: 'center', vertical: 'middle' };
    cShare.fill = rFill;
    cShare.border = BORDER_BOX;

    pivotSheet.getRow(currentPivRow).height = 20;
  });

  // 3. PIVOT TABLE C: Daily Activity Timeline Matrix
  currentPivRow += 3;
  pivotSheet.mergeCells(`B${currentPivRow}:G${currentPivRow}`);
  const pivCHeader = pivotSheet.getCell(`B${currentPivRow}`);
  pivCHeader.value = L.pivotCTitle;
  pivCHeader.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLORS.ink900 } };
  pivCHeader.alignment = { horizontal: textAlign, readingOrder: readOrder };
  pivotSheet.getRow(currentPivRow).height = 24;

  currentPivRow++;
  const pivCColHeaders = [L.pivotCHeaderDate, L.pivotCHeaderVisits, L.pivotCHeaderCalls, L.pivotCHeaderMeetings, L.pivotCHeaderEmails, L.pivotCHeaderDailyTotal];
  const pivCColLetters = ['B', 'C', 'D', 'E', 'F', 'G'];

  pivCColHeaders.forEach((h, i) => {
    const c = pivotSheet.getCell(`${pivCColLetters[i]}${currentPivRow}`);
    c.value = h;
    c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.white } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
    c.alignment = { horizontal: i === 0 ? 'right' : 'center', vertical: 'middle', readingOrder: 'rtl' };
    c.border = BORDER_BOX;
  });
  pivotSheet.getRow(currentPivRow).height = 24;

  // Group by Date (YYYY-MM-DD)
  const dateMap = new Map<string, { visits: number; calls: number; meetings: number; emails: number; total: number }>();
  activities.forEach((a) => {
    const dStr = a.activity_date ? a.activity_date.split('T')[0] : L.unknownDate;
    const entry = dateMap.get(dStr) || { visits: 0, calls: 0, meetings: 0, emails: 0, total: 0 };
    const t = a.activity_type.toLowerCase();
    if (t === 'visit') entry.visits += 1;
    else if (t === 'call') entry.calls += 1;
    else if (t === 'meeting') entry.meetings += 1;
    else if (t === 'email') entry.emails += 1;
    entry.total += 1;
    dateMap.set(dStr, entry);
  });

  const sortedDates = Array.from(dateMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  sortedDates.forEach(([dateStr, counts], idx) => {
    currentPivRow++;
    const isZebra = idx % 2 === 1;
    const rFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isZebra ? COLORS.gray50 : COLORS.white },
    };

    const cDate = pivotSheet.getCell(`B${currentPivRow}`);
    cDate.value = dateStr;
    cDate.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.ink900 } };
    cDate.alignment = { horizontal: 'center', vertical: 'middle' };
    cDate.fill = rFill;
    cDate.border = BORDER_BOX;

    const rowCounts = [counts.visits, counts.calls, counts.meetings, counts.emails, counts.total];
    rowCounts.forEach((cnt, i) => {
      const col = pivCColLetters[i + 1];
      const cell = pivotSheet.getCell(`${col}${currentPivRow}`);
      cell.value = cnt;
      cell.numFmt = '#,##0';
      cell.font = {
        name: FONT_FAMILY,
        size: 9,
        bold: col === 'G',
        color: { argb: col === 'G' ? COLORS.ink900 : COLORS.gray500 },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = rFill;
      cell.border = BORDER_BOX;
    });

    pivotSheet.getRow(currentPivRow).height = 20;
  });

  // -------------------------------------------------------------
  // SHEET 3: سجل الأنشطة المفصل (Detailed Activities)
  // -------------------------------------------------------------
  const detailSheet = workbook.addWorksheet(L.sheetDetail, {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true, rightToLeft: isRTL }],
    properties: { tabColor: { argb: COLORS.green600 } },
  });

  const detailHeaders = [
    L.detailHeaderIdx,
    L.detailHeaderDate,
    L.detailHeaderRep,
    L.detailHeaderEmail,
    L.detailHeaderType,
    L.detailHeaderAccType,
    L.detailHeaderCompany,
    L.detailHeaderNotes,
    L.detailHeaderOutcome,
    L.detailHeaderFollowup,
    L.detailHeaderLat,
    L.detailHeaderLng,
    L.detailHeaderGpsStatus,
    L.detailHeaderMapLink,
  ];

  detailSheet.columns = [
    { width: 8 },  // 1: Index
    { width: 22 }, // 2: Date & Time
    { width: 25 }, // 3: Representative
    { width: 28 }, // 4: Email
    { width: 20 }, // 5: Type
    { width: 18 }, // 6: Account Type
    { width: 34 }, // 7: Company Name
    { width: 50 }, // 8: Observations & Notes
    { width: 28 }, // 9: Outcome
    { width: 16 }, // 10: Follow-up Date
    { width: 14 }, // 11: Latitude
    { width: 14 }, // 12: Longitude
    { width: 18 }, // 13: GPS Verified
    { width: 24 }, // 14: Google Maps Link
  ];

  // Header Row
  const dHeadRow = detailSheet.getRow(1);
  dHeadRow.height = 30;
  detailHeaders.forEach((h, i) => {
    const cell = dHeadRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ink900 } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', readingOrder: readOrder };
    cell.border = BORDER_BOX;
  });

  // Populate Data Rows
  activities.forEach((act, idx) => {
    const rowNum = idx + 2;
    const isZebra = idx % 2 === 1;
    const rFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isZebra ? COLORS.gray50 : COLORS.white },
    };

    const row = detailSheet.getRow(rowNum);
    row.height = 26;

    const hasGps = Boolean(act.latitude && act.longitude);
    const dateFormatted = act.activity_date
      ? new Date(act.activity_date).toISOString().replace('T', ' ').substring(0, 19)
      : '';

    // 1. Index
    const cIdx = row.getCell(1);
    cIdx.value = idx + 1;
    cIdx.alignment = { horizontal: 'center', vertical: 'middle' };

    // 2. Date
    const cDate = row.getCell(2);
    cDate.value = dateFormatted;
    cDate.alignment = { horizontal: 'center', vertical: 'middle' };

    // 3. Representative
    const cRep = row.getCell(3);
    cRep.value = act.employee_name || act.employee_id;
    cRep.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.ink900 } };
    cRep.alignment = {
      vertical: 'middle',
      horizontal: isArabicText(act.employee_name) ? 'right' : 'left',
      readingOrder: isArabicText(act.employee_name) ? 'rtl' : 'ltr',
    };

    // 4. Email
    const cEmail = row.getCell(4);
    cEmail.value = act.employee_email || '';
    cEmail.alignment = { vertical: 'middle', horizontal: 'left' };
    cEmail.font = { name: FONT_FAMILY, size: 8.5, color: { argb: COLORS.gray500 } };

    // 5. Activity Type
    const cType = row.getCell(5);
    cType.value = formatActivityTypeExcel(act.activity_type, lang);
    cType.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLORS.ink900 } };
    cType.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: readOrder };

    // 6. Account Type
    const cAccType = row.getCell(6);
    cAccType.value = formatEntityTypeExcel(act.related_entity_type, lang);
    cAccType.font = { name: FONT_FAMILY, size: 8.5, color: { argb: COLORS.gray500 } };
    cAccType.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: readOrder };

    // 7. Company Name
    const cComp = row.getCell(7);
    cComp.value = act.entity_name || '—';
    cComp.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLORS.ink900 } };
    cComp.alignment = {
      vertical: 'middle',
      horizontal: isArabicText(act.entity_name) ? 'right' : 'left',
      readingOrder: isArabicText(act.entity_name) ? 'rtl' : 'ltr',
    };

    // 8. Description / Notes
    const cDesc = row.getCell(8);
    cDesc.value = act.description || '—';
    cDesc.alignment = {
      wrapText: true,
      vertical: 'middle',
      horizontal: isArabicText(act.description) ? 'right' : 'left',
      readingOrder: isArabicText(act.description) ? 'rtl' : 'ltr',
    };
    cDesc.font = { name: FONT_FAMILY, size: 9, color: { argb: COLORS.ink800 } };

    // 9. Outcome
    const cOut = row.getCell(9);
    cOut.value = act.outcome || '—';
    cOut.alignment = {
      vertical: 'middle',
      horizontal: isArabicText(act.outcome) ? 'right' : 'left',
      readingOrder: isArabicText(act.outcome) ? 'rtl' : 'ltr',
    };
    cOut.font = { name: FONT_FAMILY, size: 9, color: { argb: COLORS.ink900 } };

    // 10. Follow-up
    const cFol = row.getCell(10);
    cFol.value = act.follow_up_date || '—';
    cFol.alignment = { horizontal: 'center', vertical: 'middle' };

    // 11. Lat
    const cLat = row.getCell(11);
    cLat.value = act.latitude ? Number(act.latitude.toFixed(5)) : '';
    cLat.alignment = { horizontal: 'center', vertical: 'middle' };

    // 12. Lng
    const cLng = row.getCell(12);
    cLng.value = act.longitude ? Number(act.longitude.toFixed(5)) : '';
    cLng.alignment = { horizontal: 'center', vertical: 'middle' };

    // 13. GPS Verified Badge
    const cGpsVer = row.getCell(13);
    cGpsVer.value = hasGps ? L.gpsVerified : L.gpsNone;
    cGpsVer.font = {
      name: FONT_FAMILY,
      size: 8.5,
      bold: true,
      color: { argb: hasGps ? COLORS.green600 : COLORS.gray400 },
    };
    cGpsVer.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: readOrder };

    // 14. Google Maps Link
    const cMap = row.getCell(14);
    if (hasGps) {
      cMap.value = {
        text: L.openInMaps,
        hyperlink: `https://www.google.com/maps?q=${act.latitude},${act.longitude}`,
      };
      cMap.font = { name: FONT_FAMILY, size: 9, underline: true, color: { argb: COLORS.blue600 } };
    } else {
      cMap.value = '—';
      cMap.font = { name: FONT_FAMILY, size: 9, color: { argb: COLORS.gray400 } };
    }
    cMap.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: readOrder };

    // Apply styles to all cells in the row
    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      if (!cell.fill) cell.fill = rFill;
      cell.border = BORDER_BOX;
      if (!cell.font) cell.font = { name: FONT_FAMILY, size: 9, color: { argb: COLORS.ink800 } };
    }
  });

  // Enable AutoFilter on Detailed Activities
  detailSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(activities.length + 1, 2), column: 14 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
