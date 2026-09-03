/**
 * Central permission registry (single source of truth for the UI).
 *
 * Adding a new feature = adding an entry here (and to `public.permissions` via a
 * migration). The permissions matrix renders modules / sub-modules / actions
 * dynamically from this registry merged with the database catalog, so no UI code
 * changes are needed for new features.
 */

export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "import"
  | "review"
  | "approve"
  | "reject"
  | "publish";

export const ACTION_LABELS: Record<string, string> = {
  read: "عرض",
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
  export: "تصدير",
  import: "استيراد",
  review: "مراجعة",
  approve: "اعتماد",
  reject: "رفض",
  publish: "نشر",
};

export const MODULE_LABELS: Record<string, string> = {
  general: "عام",
  admissions: "القبول والتسجيل",
  students: "شؤون الطلاب",
  academics: "التتبع الأكاديمي",
  communications: "التواصل والمراسلات",
  finance: "الإدارة المالية",
  reports: "التقارير",
  website: "الموقع الإلكتروني",
  system: "إعدادات النظام",
};

export const MODULE_ORDER: string[] = [
  "general",
  "admissions",
  "students",
  "academics",
  "communications",
  "finance",
  "reports",
  "website",
  "system",
];

export const SUB_MODULE_LABELS: Record<string, string> = {
  dashboard: "لوحة المعلومات والملف الشخصي",
  portal: "بوابة ولي الأمر",
  applications: "طلبات التسجيل",
  documents: "المستندات",
  seats: "المقاعد وتوزيع الفصول",
  qurra: "دعم قرة",
  registry: "سجل الطلاب",
  children: "أبناء ولي الأمر",
  guardians: "أولياء الأمور والربط",
  attendance: "الحضور والغياب",
  curriculum: "إدارة المنهج",
  teacher_assignments: "إسناد المعلمات",
  assessments: "التقييمات",
  study_plans: "الخطط الدراسية",
  academic_reports: "التقارير الأكاديمية",
  class_chat: "محادثة الفصل",
  announcements: "الإعلانات",
  inbox: "المراسلات",
  notifications: "الإشعارات",
  invoices: "الفواتير والمدفوعات",
  financial_reports: "التقارير المالية",
  general_reports: "تقارير عامة",
  content: "محتوى الموقع",
  reviews: "التقييمات الواردة",
  surveys: "الاستبانات والآراء",
  users: "المستخدمون",
  roles: "الأدوار والصلاحيات",
  audit: "سجل العمليات",
  settings: "الإعدادات العامة",
  maintenance: "الصيانة والتخزين",
};

export type PermissionEntry = {
  code: string;
  module: string;
  subModule: string;
  action: PermissionAction;
  labelAr: string;
};

/** Mirror of `public.permissions`; DB rows win when both exist. */
export const PERMISSION_REGISTRY: PermissionEntry[] = [
  {
    code: "dashboard.view",
    module: "general",
    subModule: "dashboard",
    action: "read",
    labelAr: "عرض لوحة المعلومات",
  },
  {
    code: "profile.edit",
    module: "general",
    subModule: "dashboard",
    action: "update",
    labelAr: "تعديل الملف الشخصي",
  },

  {
    code: "portal.profile",
    module: "general",
    subModule: "portal",
    action: "read",
    labelAr: "إظهار «ملفي الشخصي ولوحتي»",
  },
  {
    code: "portal.children_link",
    module: "general",
    subModule: "portal",
    action: "update",
    labelAr: "إظهار «ربط أبنائي»",
  },
  {
    code: "portal.applications",
    module: "general",
    subModule: "portal",
    action: "read",
    labelAr: "إظهار «طلباتي وتتبع الطلب»",
  },
  {
    code: "portal.child_file",
    module: "general",
    subModule: "portal",
    action: "read",
    labelAr: "إظهار «ملف الطفل»",
  },
  {
    code: "portal.child_reports",
    module: "general",
    subModule: "portal",
    action: "read",
    labelAr: "إظهار «تقارير طفلي الأكاديمية»",
  },
  {
    code: "portal.study_plan",
    module: "general",
    subModule: "portal",
    action: "read",
    labelAr: "إظهار «خطة طفلي الدراسية»",
  },
  {
    code: "portal.class_chat",
    module: "general",
    subModule: "portal",
    action: "read",
    labelAr: "إظهار «محادثة فصل طفلي»",
  },
  {
    code: "portal.payments",
    module: "general",
    subModule: "portal",
    action: "read",
    labelAr: "إظهار «المدفوعات والرسوم»",
  },

  {
    code: "applications.view",
    module: "admissions",
    subModule: "applications",
    action: "read",
    labelAr: "عرض الطلبات",
  },
  {
    code: "applications.submit",
    module: "admissions",
    subModule: "applications",
    action: "create",
    labelAr: "تقديم طلب تسجيل",
  },
  {
    code: "applications.track",
    module: "admissions",
    subModule: "applications",
    action: "read",
    labelAr: "متابعة حالة الطلب",
  },
  {
    code: "applications.review",
    module: "admissions",
    subModule: "applications",
    action: "review",
    labelAr: "مراجعة الطلبات",
  },
  {
    code: "applications.verify_documents",
    module: "admissions",
    subModule: "applications",
    action: "review",
    labelAr: "التحقق من المستندات",
  },
  {
    code: "applications.return",
    module: "admissions",
    subModule: "applications",
    action: "update",
    labelAr: "إرجاع الطلبات الناقصة",
  },
  {
    code: "applications.forward",
    module: "admissions",
    subModule: "applications",
    action: "update",
    labelAr: "تحويل الطلبات المكتملة",
  },
  {
    code: "applications.request_changes",
    module: "admissions",
    subModule: "applications",
    action: "update",
    labelAr: "طلب تعديلات على الطلب",
  },
  {
    code: "applications.approve",
    module: "admissions",
    subModule: "applications",
    action: "approve",
    labelAr: "اعتماد الطلبات",
  },
  {
    code: "applications.reject",
    module: "admissions",
    subModule: "applications",
    action: "reject",
    labelAr: "رفض الطلبات",
  },
  {
    code: "documents.upload",
    module: "admissions",
    subModule: "documents",
    action: "create",
    labelAr: "رفع المستندات",
  },
  {
    code: "classrooms.assign",
    module: "admissions",
    subModule: "seats",
    action: "update",
    labelAr: "توزيع الفصول",
  },
  {
    code: "enrollment.manage",
    module: "admissions",
    subModule: "seats",
    action: "update",
    labelAr: "تحديث حالة القبول والتسجيل",
  },
  {
    code: "admissions.view",
    module: "admissions",
    subModule: "qurra",
    action: "read",
    labelAr: "عرض طلبات القبول",
  },
  {
    code: "admissions.review",
    module: "admissions",
    subModule: "qurra",
    action: "review",
    labelAr: "مراجعة طلبات القبول",
  },
  {
    code: "admissions.qurra",
    module: "admissions",
    subModule: "qurra",
    action: "update",
    labelAr: "إدارة طلبات دعم قرة",
  },

  {
    code: "students.view",
    module: "students",
    subModule: "registry",
    action: "read",
    labelAr: "عرض الطلاب",
  },
  {
    code: "students.create",
    module: "students",
    subModule: "registry",
    action: "create",
    labelAr: "إضافة طالب",
  },
  {
    code: "students.edit",
    module: "students",
    subModule: "registry",
    action: "update",
    labelAr: "تعديل بيانات طالب",
  },
  {
    code: "students.delete",
    module: "students",
    subModule: "registry",
    action: "delete",
    labelAr: "حذف طالب",
  },
  {
    code: "students.import",
    module: "students",
    subModule: "registry",
    action: "import",
    labelAr: "استيراد الطلاب من ملف أكسل",
  },
  {
    code: "students.export",
    module: "students",
    subModule: "registry",
    action: "export",
    labelAr: "تصدير بيانات الطلاب",
  },
  {
    code: "children.manage",
    module: "students",
    subModule: "children",
    action: "update",
    labelAr: "إدارة الأبناء",
  },
  {
    code: "guardians.link",
    module: "students",
    subModule: "guardians",
    action: "update",
    labelAr: "ربط الأطفال بأولياء أمورهم",
  },
  {
    code: "guardians.invite",
    module: "students",
    subModule: "guardians",
    action: "create",
    labelAr: "دعوة أولياء الأمور للمنصة",
  },
  {
    code: "guardians.unlink",
    module: "students",
    subModule: "guardians",
    action: "delete",
    labelAr: "إلغاء ربط طفل بولي أمر",
  },
  {
    code: "attendance.view",
    module: "students",
    subModule: "attendance",
    action: "read",
    labelAr: "عرض سجل الحضور والغياب",
  },
  {
    code: "attendance.record",
    module: "students",
    subModule: "attendance",
    action: "update",
    labelAr: "رصد الحضور والغياب",
  },
  {
    code: "attendance.export",
    module: "students",
    subModule: "attendance",
    action: "export",
    labelAr: "تصدير تقارير الحضور",
  },

  {
    code: "curriculum.view",
    module: "academics",
    subModule: "curriculum",
    action: "read",
    labelAr: "عرض المنهج والمواد والدروس",
  },
  {
    code: "curriculum.create",
    module: "academics",
    subModule: "curriculum",
    action: "create",
    labelAr: "إضافة مواد أو موضوعات أو دروس",
  },
  {
    code: "curriculum.update",
    module: "academics",
    subModule: "curriculum",
    action: "update",
    labelAr: "تعديل عناصر المنهج",
  },
  {
    code: "curriculum.delete",
    module: "academics",
    subModule: "curriculum",
    action: "delete",
    labelAr: "حذف عناصر المنهج",
  },
  {
    code: "teacher_assignments.view",
    module: "academics",
    subModule: "teacher_assignments",
    action: "read",
    labelAr: "عرض إسناد المعلمات للفصول",
  },
  {
    code: "teacher_assignments.manage",
    module: "academics",
    subModule: "teacher_assignments",
    action: "update",
    labelAr: "إسناد أو إلغاء إسناد المعلمات",
  },
  {
    code: "assessments.view",
    module: "academics",
    subModule: "assessments",
    action: "read",
    labelAr: "عرض التقييمات",
  },
  {
    code: "assessments.create",
    module: "academics",
    subModule: "assessments",
    action: "create",
    labelAr: "إضافة تقييم جديد",
  },
  {
    code: "assessments.update",
    module: "academics",
    subModule: "assessments",
    action: "update",
    labelAr: "تعديل التقييمات",
  },
  {
    code: "assessments.delete",
    module: "academics",
    subModule: "assessments",
    action: "delete",
    labelAr: "حذف التقييمات",
  },
  {
    code: "assessments.evidence_delete",
    module: "academics",
    subModule: "assessments",
    action: "delete",
    labelAr: "حذف الأدلة والشواهد",
  },
  {
    code: "study_plan.view",
    module: "academics",
    subModule: "study_plans",
    action: "read",
    labelAr: "عرض الخطط الدراسية",
  },
  {
    code: "study_plan.create",
    module: "academics",
    subModule: "study_plans",
    action: "create",
    labelAr: "إنشاء خطة دراسية",
  },
  {
    code: "study_plan.update",
    module: "academics",
    subModule: "study_plans",
    action: "update",
    labelAr: "تعديل الخطط الدراسية",
  },
  {
    code: "study_plan.delete",
    module: "academics",
    subModule: "study_plans",
    action: "delete",
    labelAr: "حذف الخطط الدراسية",
  },
  {
    code: "study_plan.publish",
    module: "academics",
    subModule: "study_plans",
    action: "publish",
    labelAr: "نشر الخطة لأولياء الأمور",
  },
  {
    code: "study_plan.export",
    module: "academics",
    subModule: "study_plans",
    action: "export",
    labelAr: "تصدير الخطة PDF أو صورة",
  },
  {
    code: "academic_reports.view",
    module: "academics",
    subModule: "academic_reports",
    action: "read",
    labelAr: "عرض التقارير الأكاديمية",
  },
  {
    code: "academic_reports.publish",
    module: "academics",
    subModule: "academic_reports",
    action: "publish",
    labelAr: "إظهار أو إخفاء التقارير لأولياء الأمور",
  },
  {
    code: "academic_reports.export",
    module: "academics",
    subModule: "academic_reports",
    action: "export",
    labelAr: "تصدير التقارير الأكاديمية",
  },

  {
    code: "class_chat.view",
    module: "communications",
    subModule: "class_chat",
    action: "read",
    labelAr: "الاطلاع على محادثة الفصل",
  },
  {
    code: "class_chat.post",
    module: "communications",
    subModule: "class_chat",
    action: "create",
    labelAr: "إرسال رسائل ومرفقات في الفصل",
  },
  {
    code: "class_chat.delete",
    module: "communications",
    subModule: "class_chat",
    action: "delete",
    labelAr: "حذف رسائل الفصل",
  },
  {
    code: "announcements.view",
    module: "communications",
    subModule: "announcements",
    action: "read",
    labelAr: "عرض الإعلانات",
  },
  {
    code: "announcements.create",
    module: "communications",
    subModule: "announcements",
    action: "create",
    labelAr: "نشر إعلان جديد",
  },
  {
    code: "announcements.delete",
    module: "communications",
    subModule: "announcements",
    action: "delete",
    labelAr: "حذف الإعلانات",
  },
  {
    code: "inbox.view",
    module: "communications",
    subModule: "inbox",
    action: "read",
    labelAr: "الاطلاع على المراسلات الواردة",
  },
  {
    code: "inbox.reply",
    module: "communications",
    subModule: "inbox",
    action: "update",
    labelAr: "الرد على المراسلات",
  },
  {
    code: "inbox.status",
    module: "communications",
    subModule: "inbox",
    action: "update",
    labelAr: "تغيير حالة المراسلة",
  },
  {
    code: "inbox.note",
    module: "communications",
    subModule: "inbox",
    action: "update",
    labelAr: "كتابة الملاحظات الداخلية",
  },
  {
    code: "inbox.export",
    module: "communications",
    subModule: "inbox",
    action: "export",
    labelAr: "تصدير المراسلات",
  },
  {
    code: "inbox.delete",
    module: "communications",
    subModule: "inbox",
    action: "delete",
    labelAr: "حذف المراسلات نهائيًا",
  },
  {
    code: "notifications.manage",
    module: "communications",
    subModule: "notifications",
    action: "update",
    labelAr: "إدارة الإشعارات",
  },

  {
    code: "invoices.view",
    module: "finance",
    subModule: "invoices",
    action: "read",
    labelAr: "عرض الفواتير",
  },
  {
    code: "payments.manage",
    module: "finance",
    subModule: "invoices",
    action: "update",
    labelAr: "إدارة المدفوعات والفواتير",
  },
  {
    code: "payments.pay",
    module: "finance",
    subModule: "invoices",
    action: "create",
    labelAr: "سداد الرسوم",
  },
  {
    code: "receipts.print",
    module: "finance",
    subModule: "invoices",
    action: "export",
    labelAr: "طباعة السندات",
  },
  {
    code: "reports.financial",
    module: "finance",
    subModule: "financial_reports",
    action: "read",
    labelAr: "التقارير المالية",
  },

  {
    code: "reports.view",
    module: "reports",
    subModule: "general_reports",
    action: "read",
    labelAr: "عرض التقارير",
  },

  {
    code: "website.content_manage",
    module: "website",
    subModule: "content",
    action: "update",
    labelAr: "إدارة محتوى الموقع الإلكتروني",
  },
  {
    code: "reviews.moderate",
    module: "website",
    subModule: "reviews",
    action: "update",
    labelAr: "اعتماد أو رفض تقييمات أولياء الأمور",
  },
  {
    code: "surveys.view",
    module: "website",
    subModule: "surveys",
    action: "read",
    labelAr: "عرض الاستبانات",
  },
  {
    code: "surveys.create",
    module: "website",
    subModule: "surveys",
    action: "create",
    labelAr: "إنشاء استبانة",
  },
  {
    code: "surveys.update",
    module: "website",
    subModule: "surveys",
    action: "update",
    labelAr: "تعديل الاستبانات",
  },
  {
    code: "surveys.delete",
    module: "website",
    subModule: "surveys",
    action: "delete",
    labelAr: "حذف الاستبانات",
  },
  {
    code: "surveys.publish",
    module: "website",
    subModule: "surveys",
    action: "publish",
    labelAr: "نشر الاستبانات",
  },
  {
    code: "surveys.analytics",
    module: "website",
    subModule: "surveys",
    action: "read",
    labelAr: "عرض تحليلات الاستبانات",
  },
  {
    code: "surveys.export",
    module: "website",
    subModule: "surveys",
    action: "export",
    labelAr: "تصدير تقارير الاستبانات",
  },

  {
    code: "users.view",
    module: "system",
    subModule: "users",
    action: "read",
    labelAr: "عرض المستخدمين",
  },
  {
    code: "users.create",
    module: "system",
    subModule: "users",
    action: "create",
    labelAr: "إضافة مستخدم",
  },
  {
    code: "users.edit",
    module: "system",
    subModule: "users",
    action: "update",
    labelAr: "تعديل مستخدم",
  },
  {
    code: "users.delete",
    module: "system",
    subModule: "users",
    action: "delete",
    labelAr: "حذف مستخدم",
  },
  {
    code: "roles.manage",
    module: "system",
    subModule: "roles",
    action: "update",
    labelAr: "إدارة الأدوار",
  },
  {
    code: "permissions.manage",
    module: "system",
    subModule: "roles",
    action: "update",
    labelAr: "إدارة الصلاحيات",
  },
  {
    code: "audit.view",
    module: "system",
    subModule: "audit",
    action: "read",
    labelAr: "عرض سجل العمليات",
  },
  {
    code: "settings.manage",
    module: "system",
    subModule: "settings",
    action: "update",
    labelAr: "إدارة إعدادات النظام",
  },
  {
    code: "stages.manage",
    module: "system",
    subModule: "settings",
    action: "update",
    labelAr: "إدارة المراحل الدراسية",
  },
  {
    code: "classes.manage",
    module: "system",
    subModule: "settings",
    action: "update",
    labelAr: "إدارة الفصول",
  },
  {
    code: "storage_cleanup.run",
    module: "system",
    subModule: "maintenance",
    action: "delete",
    labelAr: "تنفيذ تنظيف مساحة التخزين",
  },
  {
    code: "chat_history.wipe",
    module: "system",
    subModule: "maintenance",
    action: "delete",
    labelAr: "مسح سجل المحادثات",
  },
  {
    code: "colors_config.manage",
    module: "system",
    subModule: "maintenance",
    action: "update",
    labelAr: "تعديل إعدادات الألوان والهوية",
  },
];

export type MatrixRow = {
  code: string;
  module: string;
  subModule: string;
  action: string;
  labelAr: string;
};

export type MatrixModule = {
  module: string;
  label: string;
  subModules: Array<{
    subModule: string;
    label: string;
    permissions: MatrixRow[];
  }>;
  codes: string[];
};

export function moduleLabel(module: string): string {
  return MODULE_LABELS[module] ?? module;
}

export function subModuleLabel(subModule: string): string {
  return SUB_MODULE_LABELS[subModule] ?? subModule;
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/**
 * Merge the DB catalog with the static registry, then group into
 * module → sub-module → actions for the hierarchical matrix.
 */
export function buildPermissionTree(
  dbRows: Array<{
    key: string;
    module_name?: string | null;
    sub_module_name?: string | null;
    action?: string | null;
    description_ar?: string | null;
  }> = [],
): MatrixModule[] {
  const merged = new Map<string, MatrixRow>();

  for (const entry of PERMISSION_REGISTRY) {
    merged.set(entry.code, {
      code: entry.code,
      module: entry.module,
      subModule: entry.subModule,
      action: entry.action,
      labelAr: entry.labelAr,
    });
  }

  for (const row of dbRows) {
    const fallback = merged.get(row.key);
    merged.set(row.key, {
      code: row.key,
      module: row.module_name || fallback?.module || "general",
      subModule: row.sub_module_name || fallback?.subModule || "general",
      action: row.action || fallback?.action || "read",
      labelAr: row.description_ar || fallback?.labelAr || row.key,
    });
  }

  const byModule = new Map<string, Map<string, MatrixRow[]>>();
  for (const row of merged.values()) {
    const subs = byModule.get(row.module) ?? new Map<string, MatrixRow[]>();
    const list = subs.get(row.subModule) ?? [];
    list.push(row);
    subs.set(row.subModule, list);
    byModule.set(row.module, subs);
  }

  const orderOf = (module: string) => {
    const index = MODULE_ORDER.indexOf(module);
    return index === -1 ? MODULE_ORDER.length : index;
  };

  return [...byModule.entries()]
    .sort((a, b) => orderOf(a[0]) - orderOf(b[0]) || a[0].localeCompare(b[0]))
    .map(([module, subs]) => {
      const subModules = [...subs.entries()]
        .sort((a, b) => subModuleLabel(a[0]).localeCompare(subModuleLabel(b[0]), "ar"))
        .map(([subModule, permissions]) => ({
          subModule,
          label: subModuleLabel(subModule),
          permissions: permissions.slice().sort((a, b) => a.code.localeCompare(b.code)),
        }));

      return {
        module,
        label: moduleLabel(module),
        subModules,
        codes: subModules.flatMap((s) => s.permissions.map((p) => p.code)),
      };
    });
}
