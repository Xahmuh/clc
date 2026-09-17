import type { District, LeadStatus, ActivityType, UserRole } from '../types/database';

export type Language = 'en' | 'ar';

export const translations = {
  en: {
    // App & Brand
    app_title: 'CLC CRM',
    app_tagline: 'Contracting & Field Activity Tracking',
    company_name: 'CLC Contracting',

    // Language
    language: 'Language',
    language_en: 'English',
    language_ar: 'العربية',
    switch_language: 'عربي',

    // Common Actions
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    confirm: 'Confirm',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    export_csv: 'Export CSV',
    export_json: 'Export JSON',
    exporting: 'Exporting...',
    back: 'Back',
    refresh: 'Refresh',
    all: 'All',
    view_details: 'View Details',
    view_all: 'View All',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    notice: 'Notice',
    na: 'N/A',
    you: 'You',
    current: 'Current',
    active: 'Active',
    inactive: 'Inactive',

    // Edit & 24-Hour Delete Actions
    edit_lead: 'Edit Lead',
    edit_customer: 'Edit Customer',
    delete_lead: 'Delete Lead',
    delete_customer: 'Delete Customer',
    delete_confirm_title: 'Confirm Permanent Deletion',
    delete_confirm_msg: 'Are you sure you want to permanently delete this record from the database? This action cannot be undone.',
    delete_within_24h_only: 'Deletion is only available within 24 hours of creation.',
    delete_time_expired: 'Deletion period expired (only available within 24 hours of creation).',
    delete_activity: 'Delete Activity Log',
    delete_activity_confirm: 'Are you sure you want to delete this activity log? This action cannot be undone.',
    activity_deleted: 'Activity log deleted successfully',
    field_registration_date: 'Registration Date',
    field_customer_since: 'Customer Since',
    backdated_date_hint: 'Select date (supports retroactive recording)',
    deleted_successfully: 'Deleted successfully',
    updated_successfully: 'Updated successfully',
    time_left_to_delete: 'Time left to delete',
    hours_left: 'hours left',

    // Navigation & Tabs
    nav_dashboard: 'Dashboard',
    nav_leads: 'Leads',
    nav_customers: 'Customers',
    nav_reports: 'Reports',
    nav_team: 'Team Management',
    nav_settings: 'Settings',
    nav_home: 'Home',
    nav_directory: 'Directory',
    nav_quick_log: 'Quick Log',
    nav_profile: 'Profile',

    // Auth & Account
    auth_title: 'Sign in to CLC CRM',
    auth_subtitle: 'Management & Field Tracking Portal',
    auth_sign_in: 'Sign In',
    auth_sign_out: 'Sign Out',
    auth_email: 'Email address',
    auth_placeholder_email: 'Type your Email address',
    auth_password: 'Password',
    auth_placeholder_password: 'Enter your password',
    auth_remember_me: 'Remember me',
    auth_signing_in: 'Signing in...',
    auth_signed_out_confirm: 'Are you sure you want to sign out?',
    auth_access_restricted: 'Access Restricted',
    auth_admin_only: 'This section is restricted to Administrators only.',

    // Roles
    role_admin: 'Administrator',
    role_supervisor: 'Supervisor',
    role_employee: 'Executive',

    // Lead Statuses
    status_new: 'New',
    status_contacted: 'Contacted',
    status_qualified: 'Qualified',
    status_negotiation: 'Negotiation',
    status_won: 'Won',
    status_lost: 'Lost',
    all_statuses: 'All Statuses',

    // Activity Types
    activity_visit: 'Site Visit',
    activity_email: 'Email',
    activity_call: 'Phone Call',
    activity_meeting: 'Meeting',
    activity_other: 'Other Touchpoint',
    all_activity_types: 'All Activity Types',

    // Common Field Labels
    field_company_name: 'Company Name',
    field_contact_person: 'Contact Person',
    field_phone: 'Phone',
    field_email: 'Email',
    field_estimated_value: 'Estimated Value (SAR)',
    field_value_sar: 'Value (SAR)',
    field_project_type: 'Project Type',
    field_district: 'District / Area',
    field_address: 'Address',
    field_assigned_to: 'Assigned To',
    field_notes: 'Notes & Observations',
    field_source: 'Lead Source',
    field_date: 'Date',
    field_time: 'Time',
    field_role: 'Role',
    field_status: 'Status',
    field_actions: 'Actions',
    field_outcome: 'Outcome / Result',
    field_follow_up: 'Next Follow-up Date',

    // Executives Filter
    filter_all_executives: 'All Executives',
    filter_by_executive: 'Filter by Executive',
    representative: 'Representative',

    // Districts Filter
    filter_all_areas: 'All Areas',
    filter_by_district: 'Filter by District',
    select_district: 'Select District',
    search_district_placeholder: 'Search Riyadh districts...',
    custom_district_prompt: 'District not listed? Add as New District',
    custom_district_title: 'Add New Unlisted District',
    custom_district_name_en: 'District Name (English)',
    custom_district_name_ar: 'District Name (Arabic)',
    custom_district_city: 'City',
    use_gps_location: 'Detect Nearest District via GPS',
    gps_detected: 'Nearest district detected',

    // Transfer Account Feature
    transfer_title: 'Transfer Account',
    transfer_lead: 'Transfer Lead',
    transfer_customer: 'Transfer Customer',
    transfer_button: 'Transfer to Colleague',
    transfer_current_assignee: 'Current Assignee',
    transfer_select_colleague: 'Select Colleague to Receive Account',
    transfer_search_colleague: 'Search colleague by name or email...',
    transfer_confirm_message: 'Are you sure you want to transfer this account?',
    transfer_success_title: 'Account Transferred',
    transfer_success_body: 'has been successfully transferred to',
    transfer_already_assigned: 'This account is already assigned to this colleague.',
    transfer_audit_log: 'Account transferred to',

    // Convert Lead Feature
    convert_to_customer: 'Convert to Customer',
    convert_confirm_title: 'Deal Won!',
    convert_confirm_body: 'Congratulations! Would you like to convert this lead to a permanent Customer account now?',
    convert_now: 'Convert Now',
    convert_later: 'Later',
    convert_success: 'Lead successfully converted to Customer.',

    // Quick Communication
    comm_call: 'Call',
    comm_whatsapp: 'WhatsApp',
    comm_email: 'Email',
    comm_maps: 'Maps',
    whatsapp_message_prefix: 'Greetings from CLC Contracting regarding our project with',

    // Lead Stages Stepper
    lead_stage_title: 'Lead Stage',

    // Activity History
    activity_history: 'Activity History',
    no_activities_yet: 'No field activities logged yet.',
    log_first_activity_hint: 'Record your visits, calls, or meetings with this account.',
    log_activity_for_this_account: 'Log Activity for this Account',

    // Quick Log Screen
    quick_log_title: 'Quick Activity Log',
    quick_log_subtitle: 'Log visits, calls, or meetings with GPS location',
    quick_log_entity_type: 'Related Account Type',
    quick_log_select_account: 'Select Account',
    quick_log_search_account: 'Search company name...',
    quick_log_activity_type: 'Activity Type',
    quick_log_gps_location: 'GPS Location',
    quick_log_fetching_gps: 'Fetching current location...',
    quick_log_notes_placeholder: 'What was discussed? Decisions made, client feedback...',
    quick_log_outcome_placeholder: 'Result or next commitment...',
    quick_log_submit_button: 'Submit Field Activity',
    quick_log_success: 'Field activity logged successfully!',
    quick_log_offline_saved: 'Saved offline. Will sync when online.',

    // Daily Report Screen
    report_title: 'Daily Field Report',
    report_filter_daily: 'Daily',
    report_filter_weekly: 'Weekly',
    report_filter_monthly: 'Monthly',
    report_total_activities: 'Total Activities',
    report_site_visits: 'Site Visits',
    report_deals_won: 'Deals Won',
    report_pipeline_value: 'Pipeline Value',

    // Dashboard Overview (Web)
    dash_executive_management: 'Executive Management',
    dash_sales_operations: 'Field Sales Operations',
    dash_company_overview: 'Company Overview',
    dash_welcome_back: 'Welcome back',
    dash_company_subtitle: 'Real-time pipeline metrics, conversion performance, and field activity logs.',
    dash_rep_subtitle: 'Your personal pipeline snapshot, scheduled follow-ups, and daily touchpoints.',
    dash_kpi_title_manager: 'KEY PERFORMANCE INDICATORS',
    dash_kpi_title_rep: 'MY PIPELINE SNAPSHOT',
    dash_kpi_sub_manager: 'Consolidated company figures for the current billing cycle',
    dash_kpi_sub_rep: 'Directly tracked from your active deals and scheduled clients',
    dash_live_feed: 'Live Feed',
    dash_open_leads: 'Open Leads',
    dash_my_open_leads: 'My Open Leads',
    dash_won_ratio: 'Won Ratio',
    dash_activities_today: 'Activities Today',
    dash_my_activities_today: 'My Activities Today',
    dash_site_visits_recorded: 'site visits recorded',
    dash_top_performer: 'Top Performer',
    dash_follow_ups_due: 'Follow-ups Due',
    dash_deals_won_label: 'deals won',
    dash_pending_touches: 'Pending touches today',
    dash_sla_title: 'Lead Inactivity Escalations',
    dash_sla_subtitle: 'Active pipeline deals with zero logged touches for designated days.',
    dash_leaderboard: 'Sales Leaderboard',
    dash_leaderboard_subtitle: 'Ranked by closed deals and activity',
    dash_recent_activities: 'Recent Field Activities',
    dash_no_escalations: 'No dormant leads found. All active opportunities have recent touches.',

    // Leads & Customers Directory
    dir_leads_tab: 'Leads',
    dir_customers_tab: 'Customers',
    dir_search_leads: 'Search leads by company, contact, or notes...',
    dir_search_customers: 'Search customer by name, contact, phone, or email...',
    dir_add_lead: 'Add Lead',
    dir_add_customer: 'Add Customer',
    dir_kanban_view: 'Kanban',
    dir_list_view: 'List',
    dir_no_leads_found: 'No leads found matching your filters.',
    dir_no_customers_found: 'No customers found matching your filters.',
    dir_showing_results: 'Showing results',

    // Team Management (Web)
    team_title: 'Team Management',
    team_subtitle: 'Manage company employees, assign roles, and reassign leads',
    team_add_employee: 'Add Employee',
    team_reassign_leads: 'Reassign Leads',
    team_member: 'Member',
    team_contact: 'Contact',
    team_status: 'Status',
    team_joined_date: 'Joined Date',
    team_deactivate: 'Deactivate',
    team_activate: 'Activate',
    team_no_members: 'No team members found.',

    // Settings (Web)
    settings_title: 'System Settings',
    settings_subtitle: 'Configure organization preferences, SLAs, and language',
    settings_language_label: 'Display Language',
    settings_language_desc: 'Select the primary language for the CRM interface',
    settings_sla_label: 'Inactivity SLA Threshold (Days)',
    settings_sla_desc: 'Alert when an active lead has no touchpoints for this number of days',
    settings_save_button: 'Save Settings',

    // Column & Table Headers
    th_company: 'Company',
    th_contact: 'Contact',
    th_contact_info: 'Contact Info',
    th_district: 'District',
    th_account_manager: 'Account Manager',
    th_customer_since: 'Customer Since',
    th_value: 'Estimated Value',
    th_status: 'Status',
    th_actions: 'Actions',
    th_role: 'Role',
    th_last_touch: 'Last Touchpoint',
    th_stage: 'Stage',
    th_inactivity: 'Inactivity Duration',
    th_opportunity: 'Opportunity',

    // Extra UI labels
    unassigned: 'Unassigned',
    customers_subtitle: 'Active accounts and recurring contracting clients',
    loading_customers: 'Loading customers...',
    loading_leads: 'Loading leads...',
    loading_details: 'Loading details...',
    no_notes: 'No notes provided',
    no_due_date: 'No due date',
    not_specified: 'Not specified',
    back_to_leads: 'Back to leads',
    back_to_customers: 'Back to customers',
    lead_details: 'Lead Details',
    customer_details: 'Customer Details',
    log_new_activity: 'Log New Activity',
    log_activity_submit: 'Log Activity',
    logging_activity: 'Logging...',
    activity_desc_placeholder: 'What happened? (e.g. Discussed proposal, client requested revision...)',
    activity_outcome_placeholder: 'Outcome or next steps...',
    follow_up_date: 'Next Follow-up Date',
    pipeline_stages_title: 'Pipeline Stages',
    pipeline_stages_subtitle: 'Distribution across stages',
    manage_kanban_pipeline: 'Manage full Kanban pipeline',
    view_team_management: 'View team management',
    view_all_accounts: 'View all accounts',
    recent_activity_feed: 'Recent Activity Feed',
    recent_activity_feed_sub: 'Chronological field activity log',
    view_full_reports: 'View full activity reports',
    print_pdf: 'Print PDF',
    export_excel: 'Export Excel (.xlsx)',
    generating_report: 'Generating Report...',
    field_intelligence: 'Field Operations Intelligence',
    activities_field_reports: 'Activities & Field Reports',
    reports_desc: 'Audit logs and activity performance derived dynamically from field agent records.',
    range_daily: 'Daily (Today)',
    range_weekly: 'Weekly (7 Days)',
    range_monthly: 'Monthly (30 Days)',
    range_all: 'All History',
    range_custom: 'Custom Range',
    custom_from: 'From',
    custom_to: 'To',
    all_employees: 'All Company Employees',
    all_touchpoints: 'All Touchpoints',
    search_report_placeholder: 'Search company, agent, notes...',
    total_touchpoints: 'Total Touchpoints',
    logged_in_range: 'Logged within selected range',
    sla_compliant_msg: 'All active leads are currently receiving regular contact.',
    review: 'Review',
    reassign_leads_btn: 'Reassign Leads',

    // Mobile specific keys
    login_subtitle: 'Sign in with your company credentials',
    login_email_placeholder: 'Type your Email address',
    login_error_missing: 'Please enter both email and password.',
    home_field_dispatch: 'FIELD DISPATCH',
    home_quick_log_banner_title: 'Quick Log Activity',
    home_quick_log_banner_sub: "Standing outside a client's office? Tap to record a visit with automatic GPS district detection.",
    home_quick_log_banner_btn: 'Log Visit / Call / Meeting →',
    home_activities_today: 'Activities Logged Today',
    home_view_daily_report: 'Tap to view & share daily field report',
    home_todays_followups: "Today's Follow-ups",
    home_no_followups: 'No follow-ups due today',
    home_no_followups_sub: 'All scheduled touches are complete or upcoming.',
    home_hello: 'Hello',
    home_view_account: 'View Account',
    my_leads: 'My Leads',
    my_customers: 'My Customers',
    clear_filters: 'Clear filters',
    showing_matches: 'Showing',
    results: 'results',
    create_first_lead: 'Create First Lead',
    create_first_customer: 'Create First Customer',
    no_leads_assigned_yet: 'No leads assigned yet.',
    no_customers_assigned_yet: 'No customer accounts yet.',
    profile_sync_title: 'Field Resilience Queue',
    profile_sync_desc: 'Activities saved while offline in the field are kept locally and will sync automatically when network is restored.',
    profile_sync_now: 'Sync Offline Records Now',
    profile_report_card_desc: "Review today's logged visits, calls, and meetings, and 1-tap share an end-of-day summary to management via WhatsApp.",
    profile_report_card_btn: 'Open & Share Daily Report',
    profile_sign_out: 'Sign Out',
    profile_sign_out_confirm: 'Are you sure you want to sign out?',
    profile_language_card_title: 'App Language',
    profile_language_card_desc: 'Switch between English and Arabic interface instantly',
    login_title: 'Welcome to CLC CRM',
    login_email_label: 'Email address',
    login_password_label: 'Password',
    login_password_placeholder: 'Enter your password',
    login_submit_button: 'Sign In',
    login_signing_in: 'Signing in...',
    login_error_invalid: 'Invalid email or password.',
    report_share_whatsapp: 'Share on WhatsApp',
    report_copied: 'Report text copied to clipboard!',
    report_whatsapp_error: 'Could not open WhatsApp directly. Report has been copied to your clipboard.',
    quick_log_selected_lead: 'Selected Lead:',
    quick_log_selected_customer: 'Selected Customer:',
    quick_log_deselect: 'Deselect',
    quick_log_loading_accounts: 'Loading registered accounts...',
    quick_log_no_accounts: 'No accounts available',
    quick_log_no_accounts_sub: 'Make sure accounts are assigned to your profile.',
    quick_log_view_directory: 'View Accounts Directory',
    quick_log_notes_label: 'Notes & Observations *',
    quick_log_outcome_label: 'Outcome / Next Step',
    quick_log_photo_label: 'Site Photo / Business Card',
    quick_log_photo_attached: 'Photo Attached',
    quick_log_photo_sub: 'Will be uploaded to cloud storage with this activity',
    quick_log_photo_remove: 'Remove Photo',
    quick_log_photo_take: 'Take Photo',
    quick_log_photo_gallery: 'From Gallery',
    quick_log_followup_label: 'Schedule Next Follow-up',
    quick_log_tomorrow: 'Tomorrow',
    quick_log_in_3_days: 'In 3 Days',
    quick_log_in_1_week: 'In 1 Week',
    quick_log_err_auth: 'You must be signed in to log an activity.',
    quick_log_err_select: 'Please select an account to log against.',
    quick_log_err_notes: 'Please enter a brief note or visit summary.',
  },

  ar: {
    // App & Brand
    app_title: 'نظام سي إل سي لإدارة العملاء',
    app_tagline: 'متابعة المقاولات والأنشطة الميدانية',
    company_name: 'شركة سي إل سي للمقاولات',

    // Language
    language: 'اللغة',
    language_en: 'English',
    language_ar: 'العربية',
    switch_language: 'English',

    // Common Actions
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    cancel: 'إلغاء',
    save: 'حفظ',
    saving: 'جاري الحفظ...',
    confirm: 'تأكيد',
    close: 'إغلاق',
    search: 'بحث',
    filter: 'تصفية',
    export: 'تصدير',
    export_csv: 'تصدير CSV',
    export_json: 'تصدير JSON',
    exporting: 'جاري التصدير...',
    back: 'رجوع',
    refresh: 'تحديث',
    all: 'الكل',
    view_details: 'عرض التفاصيل',
    view_all: 'عرض الكل',
    loading: 'جاري التحميل...',
    success: 'تم بنجاح',
    error: 'خطأ',
    notice: 'تنبيه',
    na: 'غير متوفر',
    you: 'أنت',
    current: 'الحالي',
    active: 'نشط',
    inactive: 'غير نشط',

    // Edit & 24-Hour Delete Actions
    edit_lead: 'تعديل بيانات الفرصة',
    edit_customer: 'تعديل بيانات العميل',
    delete_lead: 'حذف الفرصة',
    delete_customer: 'حذف العميل',
    delete_confirm_title: 'تأكيد الحذف النهائي',
    delete_confirm_msg: 'هل أنت متأكد من حذف هذا السجل نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.',
    delete_within_24h_only: 'الحذف متاح فقط خلال أول 24 ساعة من التسجيل.',
    delete_time_expired: 'انتهت مهلة الحذف (الحذف متاح خلال أول 24 ساعة فقط من التسجيل).',
    delete_activity: 'حذف سجل النشاط',
    delete_activity_confirm: 'هل أنت متأكد من حذف هذا النشاط الميداني؟ لا يمكن التراجع عن هذا الإجراء.',
    activity_deleted: 'تم حذف النشاط بنجاح',
    field_registration_date: 'تاريخ التسجيل',
    field_customer_since: 'عميل منذ تاريخ',
    backdated_date_hint: 'تحديد التاريخ (يتيح التسجيل بأثر رجعي)',
    deleted_successfully: 'تم الحذف بنجاح',
    updated_successfully: 'تم التحديث بنجاح',
    time_left_to_delete: 'الوقت المتبقي للحذف',
    hours_left: 'ساعة متبقية',

    // Navigation & Tabs
    nav_dashboard: 'لوحة التحكم',
    nav_leads: 'الفرص المحتملة',
    nav_customers: 'العملاء',
    nav_reports: 'التقارير',
    nav_team: 'إدارة الفريق',
    nav_settings: 'الإعدادات',
    nav_home: 'الرئيسية',
    nav_directory: 'الدليل',
    nav_quick_log: 'تسجيل سريع',
    nav_profile: 'حسابي',

    // Auth & Account
    auth_title: 'تسجيل الدخول إلى نظام CLC',
    auth_subtitle: 'بوابة الإدارة والمتابعة الميدانية',
    auth_sign_in: 'تسجيل الدخول',
    auth_sign_out: 'تسجيل الخروج',
    auth_email: 'البريد الإلكتروني',
    auth_placeholder_email: 'أدخل البريد الإلكتروني',
    auth_password: 'كلمة المرور',
    auth_placeholder_password: 'أدخل كلمة المرور',
    auth_remember_me: 'تذكرني',
    auth_signing_in: 'جاري تسجيل الدخول...',
    auth_signed_out_confirm: 'هل أنت متأكد من رغبتك في تسجيل الخروج؟',
    auth_access_restricted: 'الوصول مقيد',
    auth_admin_only: 'هذا القسم مخصص للمسؤولين فقط.',

    // Roles
    role_admin: 'مدير نظام',
    role_supervisor: 'مشرف',
    role_employee: 'موظف تنفيذي',

    // Lead Statuses
    status_new: 'جديد',
    status_contacted: 'تم التواصل',
    status_qualified: 'مؤهل',
    status_negotiation: 'مفاوضات',
    status_won: 'ناجحة',
    status_lost: 'خاسرة',
    all_statuses: 'جميع الحالات',

    // Activity Types
    activity_visit: 'زيارة موقع',
    activity_email: 'بريد إلكتروني',
    activity_call: 'اتصال هاتفي',
    activity_meeting: 'اجتماع عمل',
    activity_other: 'نشاط آخر',
    all_activity_types: 'جميع أنواع الأنشطة',

    // Common Field Labels
    field_company_name: 'اسم الشركة',
    field_contact_person: 'الشخص المسؤول',
    field_phone: 'رقم الهاتف',
    field_email: 'البريد الإلكتروني',
    field_estimated_value: 'القيمة التقديرية (ريال)',
    field_value_sar: 'القيمة (ريال)',
    field_project_type: 'نوع المشروع',
    field_district: 'الحي / المنطقة',
    field_address: 'العنوان',
    field_assigned_to: 'المسؤول الميداني',
    field_notes: 'الملاحظات والتفاصيل',
    field_source: 'مصدر الفرصة',
    field_date: 'التاريخ',
    field_time: 'الوقت',
    field_role: 'الدور والصلاحية',
    field_status: 'الحالة',
    field_actions: 'الإجراءات',
    field_outcome: 'النتيجة والمخرجات',
    field_follow_up: 'موعد المتابعة القادم',

    // Executives Filter
    filter_all_executives: 'جميع التنفيذيين',
    filter_by_executive: 'تصفية حسب التنفيذي',
    representative: 'الممثل التنفيذي',

    // Districts Filter
    filter_all_areas: 'جميع الأحياء',
    filter_by_district: 'تصفية حسب الحي',
    select_district: 'اختر الحي',
    search_district_placeholder: 'البحث في أحياء الرياض...',
    custom_district_prompt: 'الحي غير مسجل؟ اضغط هنا لإضافة حي جديد',
    custom_district_title: 'إضافة حي جديد غير مسجل',
    custom_district_name_en: 'اسم الحي (بالإنجليزي)',
    custom_district_name_ar: 'اسم الحي (بالعربي)',
    custom_district_city: 'المدينة',
    use_gps_location: 'تحديد أقرب حي عبر نظام GPS',
    gps_detected: 'تم تحديد أقرب حي',

    // Transfer Account Feature
    transfer_title: 'نقل صلاحية الحساب',
    transfer_lead: 'نقل فرصة البيع',
    transfer_customer: 'نقل العميل',
    transfer_button: 'نقل الصلاحية لزميل',
    transfer_current_assignee: 'المسؤول الحالي',
    transfer_select_colleague: 'اختر الزميل التنفيذي المستلم',
    transfer_search_colleague: 'ابحث عن زميل بالاسم أو البريد...',
    transfer_confirm_message: 'هل أنت متأكد من نقل صلاحيات هذا الحساب للزميل المختار؟',
    transfer_success_title: 'تم نقل الحساب',
    transfer_success_body: 'تم نقل الحساب بنجاح إلى الموظف',
    transfer_already_assigned: 'هذا الحساب مسجل بالفعل لدى هذا الموظف.',
    transfer_audit_log: 'تم نقل ملكية الحساب إلى',

    // Convert Lead Feature
    convert_to_customer: 'تحويل لعميل دائم',
    convert_confirm_title: 'صفقة ناجحة!',
    convert_confirm_body: 'تهانينا! هل ترغب في تحويل هذه الفرصة إلى حساب عميل دائم الآن؟',
    convert_now: 'تحويل الآن',
    convert_later: 'لاحقاً',
    convert_success: 'تم تحويل الفرصة بنجاح إلى عميل دائم.',

    // Quick Communication
    comm_call: 'اتصال',
    comm_whatsapp: 'واتساب',
    comm_email: 'إيميل',
    comm_maps: 'الموقع',
    whatsapp_message_prefix: 'السلام عليكم ورحمة الله، بخصوص شركة سي إل سي للمقاولات ومتابعة مشروعكم مع',

    // Lead Stages Stepper
    lead_stage_title: 'مرحلة الصفقة',

    // Activity History
    activity_history: 'سجل الأنشطة الميدانية',
    no_activities_yet: 'لا توجد أنشطة ميدانية مسجلة حتى الآن.',
    log_first_activity_hint: 'قم بتسجيل الزيارات أو المكالمات أو الاجتماعات الخاصة بهذا الحساب.',
    log_activity_for_this_account: 'تسجيل نشاط لهذا الحساب',

    // Quick Log Screen
    quick_log_title: 'تسجيل نشاط ميداني سريع',
    quick_log_subtitle: 'توثيق الزيارات والمكالمات مع إحداثيات الموقع الجغرافي',
    quick_log_entity_type: 'نوع الحساب المعني',
    quick_log_select_account: 'اختر الحساب',
    quick_log_search_account: 'البحث عن اسم الشركة...',
    quick_log_activity_type: 'نوع النشاط الميداني',
    quick_log_gps_location: 'إحداثيات الموقع (GPS)',
    quick_log_fetching_gps: 'جاري تحديد الإحداثيات الجغرافية...',
    quick_log_notes_placeholder: 'ما الذي دار في اللقاء؟ القرارات والاتفاقات وملاحظات العميل...',
    quick_log_outcome_placeholder: 'النتيجة أو التعهد القادم...',
    quick_log_submit_button: 'تسجيل النشاط الميداني',
    quick_log_success: 'تم تسجيل النشاط الميداني بنجاح!',
    quick_log_offline_saved: 'تم الحفظ بدون اتصال. ستتم المزامنة تلقائياً عند توفر الإنترنت.',

    // Daily Report Screen
    report_title: 'التقرير الميداني اليومي',
    report_filter_daily: 'يومي',
    report_filter_weekly: 'أسبوعي',
    report_filter_monthly: 'شهري',
    report_total_activities: 'إجمالي الأنشطة',
    report_site_visits: 'زيارات المواقع',
    report_deals_won: 'الصفقات الناجحة',
    report_pipeline_value: 'قيمة الفرص',

    // Dashboard Overview (Web)
    dash_executive_management: 'الإدارة التنفيذية العليا',
    dash_sales_operations: 'عمليات المبيعات الميدانية',
    dash_company_overview: 'نظرة عامة على أداء الشركة',
    dash_welcome_back: 'مرحباً بعودتك',
    dash_company_subtitle: 'مؤشرات الأداء المباشرة، معدلات التحويل، وسجلات الأنشطة الميدانية.',
    dash_rep_subtitle: 'ملخص الفرص الخاصة بك، المتابعات المجدولة، والتواصل اليومي.',
    dash_kpi_title_manager: 'مؤشرات الأداء الرئيسية (KPIS)',
    dash_kpi_title_rep: 'ملخص الفرص الخاصة بي',
    dash_kpi_sub_manager: 'أرقام مجمعة على مستوى الشركة لدورة العمل الحالية',
    dash_kpi_sub_rep: 'متابعة مباشرة لصفقاتك النشطة وعملائك المجدولين',
    dash_live_feed: 'تحديث مباشر',
    dash_open_leads: 'الفرص المفتوحة',
    dash_my_open_leads: 'فرصي المفتوحة',
    dash_won_ratio: 'نسبة النجاح',
    dash_activities_today: 'أنشطة اليوم',
    dash_my_activities_today: 'أنشطتي اليوم',
    dash_site_visits_recorded: 'زيارات موقع مسجلة',
    dash_top_performer: 'الأعلى إنجازاً',
    dash_follow_ups_due: 'متابعات مستحقة',
    dash_deals_won_label: 'صفقات ناجحة',
    dash_pending_touches: 'متابعات مطلوبة اليوم',
    dash_sla_title: 'تنبيهات انقطاع التواصل مع الفرص (SLA)',
    dash_sla_subtitle: 'صفقات نشطة لم يتم تسجيل أي تواصل معها لعدد الأيام المحدد.',
    dash_leaderboard: 'لوحة شرف المبيعات',
    dash_leaderboard_subtitle: 'الترتيب حسب الصفقات المغلقة والأنشطة المسجلة',
    dash_recent_activities: 'أحدث الأنشطة الميدانية',
    dash_no_escalations: 'لا توجد فرص راكدة. جميع الفرص النشطة تحظى بتواصل مستمر.',

    // Leads & Customers Directory
    dir_leads_tab: 'الفرص المحتملة',
    dir_customers_tab: 'العملاء',
    dir_search_leads: 'البحث عن فرصة بالشركة أو المسؤول أو الملاحظات...',
    dir_search_customers: 'البحث عن عميل بالاسم أو الهاتف أو البريد...',
    dir_add_lead: 'إضافة فرصة',
    dir_add_customer: 'إضافة عميل',
    dir_kanban_view: 'لوحة كانبان',
    dir_list_view: 'قائمة',
    dir_no_leads_found: 'لم يتم العثور على فرص تطابق معايير البحث.',
    dir_no_customers_found: 'لم يتم العثور على عملاء يطابقون معايير البحث.',
    dir_showing_results: 'عرض النتائج',

    // Team Management (Web)
    team_title: 'إدارة فريق العمل',
    team_subtitle: 'إدارة موظفي الشركة، تعيين الأدوار والصلاحيات، وإعادة توزيع الفرص',
    team_add_employee: 'إضافة موظف',
    team_reassign_leads: 'إعادة تعيين الفرص',
    team_member: 'الموظف',
    team_contact: 'معلومات التواصل',
    team_status: 'الحالة',
    team_joined_date: 'تاريخ الانضمام',
    team_deactivate: 'تعطيل الحساب',
    team_activate: 'تفعيل الحساب',
    team_no_members: 'لم يتم العثور على موظفين.',

    // Settings (Web)
    settings_title: 'إعدادات النظام',
    settings_subtitle: 'تخصيص تفضيلات المنظمة وسياسات المتابعة واللغة',
    settings_language_label: 'لغة الواجهة',
    settings_language_desc: 'اختر اللغة الأساسية لواجهة نظام الـ CRM',
    settings_sla_label: 'حد مهلة التواصل للفرص بالأيام (SLA)',
    settings_sla_desc: 'إصدار تنبيه عند مرور هذا العدد من الأيام دون تسجيل تواصل مع الفرصة',
    settings_save_button: 'حفظ التغييرات',

    // Column & Table Headers
    th_company: 'الشركة',
    th_contact: 'المسؤول',
    th_contact_info: 'بيانات التواصل',
    th_district: 'الحي',
    th_account_manager: 'مدير الحساب',
    th_customer_since: 'عميل منذ',
    th_value: 'القيمة التقديرية',
    th_status: 'الحالة',
    th_actions: 'الإجراءات',
    th_role: 'الدور والصلاحية',
    th_last_touch: 'آخر تواصل',
    th_stage: 'المرحلة',
    th_inactivity: 'مدة الركود',
    th_opportunity: 'الفرصة',

    // Extra UI labels
    unassigned: 'غير معين',
    customers_subtitle: 'الحسابات النشطة وعملاء المقاولات الدائمين',
    loading_customers: 'جاري تحميل العملاء...',
    loading_leads: 'جاري تحميل الفرص...',
    loading_details: 'جاري تحميل التفاصيل...',
    no_notes: 'لا توجد ملاحظات',
    no_due_date: 'بدون موعد محدد',
    not_specified: 'غير محدد',
    back_to_leads: 'الرجوع إلى الفرص',
    back_to_customers: 'الرجوع إلى العملاء',
    lead_details: 'تفاصيل الفرصة',
    customer_details: 'تفاصيل العميل',
    log_new_activity: 'تسجيل نشاط جديد',
    log_activity_submit: 'تسجيل النشاط',
    logging_activity: 'جاري التسجيل...',
    activity_desc_placeholder: 'ما الذي دار في اللقاء؟ (مثلاً: مناقشة العرض المالي، طلب تعديل التصميم...)',
    activity_outcome_placeholder: 'النتيجة أو الخطوة القادمة...',
    follow_up_date: 'موعد المتابعة القادم',
    pipeline_stages_title: 'مراحل الفرص',
    pipeline_stages_subtitle: 'توزيع الصفقات عبر المراحل',
    manage_kanban_pipeline: 'إدارة لوحة كانبان للفرص',
    view_team_management: 'عرض إدارة الفريق',
    view_all_accounts: 'عرض جميع الحسابات',
    recent_activity_feed: 'شريط الأنشطة الحديثة',
    recent_activity_feed_sub: 'سجل زمني للأنشطة الميدانية',
    view_full_reports: 'عرض تقارير الأنشطة الكاملة',
    print_pdf: 'طباعة PDF',
    export_excel: 'تصدير إكسيل (.xlsx)',
    generating_report: 'جاري إنشاء التقرير...',
    field_intelligence: 'تحليلات العمليات الميدانية',
    activities_field_reports: 'الأنشطة والتقارير الميدانية',
    reports_desc: 'سجلات المتابعة وأداء الأنشطة الميدانية للممثلين.',
    range_daily: 'يومي (اليوم)',
    range_weekly: 'أسبوعي (7 أيام)',
    range_monthly: 'شهري (30 يوماً)',
    range_all: 'كامل السجل',
    range_custom: 'فترة مخصصة',
    custom_from: 'من',
    custom_to: 'إلى',
    all_employees: 'جميع موظفي الشركة',
    all_touchpoints: 'جميع نقاط التواصل',
    search_report_placeholder: 'بحث بالشركة، الموظف، الملاحظات...',
    total_touchpoints: 'إجمالي نقاط التواصل',
    logged_in_range: 'المسجلة خلال الفترة المحددة',
    sla_compliant_msg: 'جميع الفرص النشطة تحظى بتواصل مستمر.',
    review: 'مراجعة',
    reassign_leads_btn: 'إعادة تعيين الفرص',

    // Mobile specific keys
    login_subtitle: 'تسجيل الدخول ببيانات اعتماد الشركة',
    login_email_placeholder: 'Type your Email address',
    login_error_missing: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.',
    home_field_dispatch: 'الميدان',
    home_quick_log_banner_title: 'تسجيل سريع للنشاط',
    home_quick_log_banner_sub: 'متواجد عند العميل؟ اضغط لتسجيل الزيارة مع تحديد الحي تلقائياً عبر GPS.',
    home_quick_log_banner_btn: 'تسجيل زيارة / اتصال / اجتماع ←',
    home_activities_today: 'الأنشطة المسجلة اليوم',
    home_view_daily_report: 'اضغط لعرض ومشاركة تقرير اليوم',
    home_todays_followups: 'متابعات اليوم',
    home_no_followups: 'لا توجد متابعات مستحقة اليوم',
    home_no_followups_sub: 'جميع المواعيد المجدولة مكتملة أو قادمة.',
    home_hello: 'مرحباً',
    home_view_account: 'عرض الحساب',
    my_leads: 'فرصي',
    my_customers: 'عملائي',
    clear_filters: 'مسح التصفية',
    showing_matches: 'عرض',
    results: 'نتائج',
    create_first_lead: 'إنشاء أول فرصة',
    create_first_customer: 'إنشاء أول عميل',
    no_leads_assigned_yet: 'لا توجد فرص معينة لك حالياً.',
    no_customers_assigned_yet: 'لا توجد حسابات عملاء حالياً.',
    profile_sync_title: 'قائمة المزامنة الميدانية',
    profile_sync_desc: 'يتم حفظ الحركات في حالة انقطاع الاتصال محلياً ومزامنتها تلقائياً عند عودة الشبكة.',
    profile_sync_now: 'مزامنة السجلات الآن',
    profile_report_card_desc: 'مراجعة زيارات ومكالمات واجتماعات اليوم، ومشاركة تقرير ملخص بنقرة واحدة للإدارة عبر واتساب.',
    profile_report_card_btn: 'عرض ومشاركة تقرير اليوم',
    profile_sign_out: 'تسجيل الخروج',
    profile_sign_out_confirm: 'هل أنت متأكد من رغبتك في تسجيل الخروج؟',
    profile_language_card_title: 'لغة التطبيق',
    profile_language_card_desc: 'التبديل الفوري بين الواجهة العربية والإنجليزية',
    login_title: 'مرحباً بك في نظام سي إل سي',
    login_email_label: 'Email address',
    login_password_label: 'Password',
    login_password_placeholder: 'أدخل كلمة المرور',
    login_submit_button: 'تسجيل الدخول',
    login_signing_in: 'جاري تسجيل الدخول...',
    login_error_invalid: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    report_share_whatsapp: 'مشاركة عبر واتساب',
    report_copied: 'تم نسخ نص التقرير للحافظة!',
    report_whatsapp_error: 'تعذر فتح واتساب مباشرة. تم نسخ نص التقرير إلى الحافظة.',
    quick_log_selected_lead: 'الفرصة المختارة:',
    quick_log_selected_customer: 'العميل المختار:',
    quick_log_deselect: 'إلغاء التحديد',
    quick_log_loading_accounts: 'جاري تحميل الحسابات المسجلة...',
    quick_log_no_accounts: 'لا توجد حسابات متاحة',
    quick_log_no_accounts_sub: 'تأكد من إسناد الحسابات إلى ملفك الشخصي.',
    quick_log_view_directory: 'عرض دليل الحسابات',
    quick_log_notes_label: 'الملاحظات والقرارات *',
    quick_log_outcome_label: 'النتيجة أو الخطوة القادمة',
    quick_log_photo_label: 'صورة الموقع أو كرت العمل',
    quick_log_photo_attached: 'تم إرفاق الصورة',
    quick_log_photo_sub: 'سيتم رفعها مع سجل هذا النشاط إلى السحابة',
    quick_log_photo_remove: 'حذف الصورة',
    quick_log_photo_take: 'التقاط صورة',
    quick_log_photo_gallery: 'من المعرض',
    quick_log_followup_label: 'جدولة المتابعة القادمة',
    quick_log_tomorrow: 'غداً',
    quick_log_in_3_days: 'بعد 3 أيام',
    quick_log_in_1_week: 'بعد أسبوع',
    quick_log_err_auth: 'يجب تسجيل الدخول لتسجيل نشاط.',
    quick_log_err_select: 'يرجى اختيار حساب لتسجيل النشاط عليه.',
    quick_log_err_notes: 'يرجى إدخال ملخص للملاحظات أو الزيارة.',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

/**
 * Returns district name strictly in the chosen language.
 * When language is 'ar', returns name_ar. When 'en', returns name_en.
 */
export function getDistrictName(
  district: District | null | undefined,
  lang: Language = 'en'
): string {
  if (!district) return '';
  if (lang === 'ar') {
    return district.name_ar || district.name_en || '';
  }
  return district.name_en || district.name_ar || '';
}

/**
 * Returns strictly localized lead status label
 */
export function getLeadStatusLabel(status: LeadStatus, lang: Language = 'en'): string {
  const dict = translations[lang];
  switch (status) {
    case 'new':
      return dict.status_new;
    case 'contacted':
      return dict.status_contacted;
    case 'qualified':
      return dict.status_qualified;
    case 'negotiation':
      return dict.status_negotiation;
    case 'won':
      return dict.status_won;
    case 'lost':
      return dict.status_lost;
    default:
      return status;
  }
}

/**
 * Returns strictly localized activity type label
 */
export function getActivityTypeLabel(type: ActivityType, lang: Language = 'en'): string {
  const dict = translations[lang];
  switch (type) {
    case 'visit':
      return dict.activity_visit;
    case 'email':
      return dict.activity_email;
    case 'call':
      return dict.activity_call;
    case 'meeting':
      return dict.activity_meeting;
    case 'other':
      return dict.activity_other;
    default:
      return type;
  }
}

/**
 * Returns strictly localized user role label
 */
export function getUserRoleLabel(role: UserRole, lang: Language = 'en'): string {
  const dict = translations[lang];
  switch (role) {
    case 'admin':
      return dict.role_admin;
    case 'supervisor':
      return dict.role_supervisor;
    case 'employee':
      return dict.role_employee;
    default:
      return role;
  }
}
