-- 1) Extend the permissions catalog with hierarchy metadata
ALTER TABLE public.permissions
  ADD COLUMN IF NOT EXISTS module_name text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS sub_module_name text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'read',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;

-- 2) Upsert the full registry (code, module, sub-module, action, description, category)
WITH registry(key, module_name, sub_module_name, action, description_ar, category, sort_order) AS (
  VALUES
    ('dashboard.view','general','dashboard','read','عرض لوحة المعلومات','general',10),
    ('profile.edit','general','dashboard','update','تعديل الملف الشخصي','general',20),

    ('applications.view','admissions','applications','read','عرض الطلبات','applications',10),
    ('applications.submit','admissions','applications','create','تقديم طلب تسجيل','applications',20),
    ('applications.track','admissions','applications','read','متابعة حالة الطلب','applications',30),
    ('applications.review','admissions','applications','review','مراجعة الطلبات','applications',40),
    ('applications.verify_documents','admissions','applications','review','التحقق من المستندات','applications',50),
    ('applications.return','admissions','applications','update','إرجاع الطلبات الناقصة','applications',60),
    ('applications.forward','admissions','applications','update','تحويل الطلبات المكتملة','applications',70),
    ('applications.request_changes','admissions','applications','update','طلب تعديلات على الطلب','applications',80),
    ('applications.approve','admissions','applications','approve','اعتماد الطلبات','applications',90),
    ('applications.reject','admissions','applications','reject','رفض الطلبات','applications',100),
    ('documents.upload','admissions','documents','create','رفع المستندات','documents',10),
    ('classrooms.assign','admissions','seats','update','توزيع الفصول','applications',10),
    ('enrollment.manage','admissions','seats','update','تحديث حالة القبول والتسجيل','applications',20),
    ('admissions.view','admissions','qurra','read','عرض طلبات القبول','applications',10),
    ('admissions.review','admissions','qurra','review','مراجعة طلبات القبول وتغيير حالتها','applications',20),
    ('admissions.qurra','admissions','qurra','update','إدارة طلبات دعم قرة','applications',30),

    ('students.view','students','registry','read','عرض الطلاب','students',10),
    ('students.create','students','registry','create','إضافة طالب','students',20),
    ('students.edit','students','registry','update','تعديل بيانات طالب','students',30),
    ('students.delete','students','registry','delete','حذف طالب','students',40),
    ('students.import','students','registry','import','استيراد الطلاب من ملف أكسل','students',50),
    ('students.export','students','registry','export','تصدير بيانات الطلاب','students',60),
    ('children.manage','students','children','update','إدارة الأبناء','students',10),
    ('guardians.link','students','guardians','update','ربط الأطفال بأولياء أمورهم','students',10),
    ('guardians.invite','students','guardians','create','دعوة أولياء الأمور للمنصة','students',20),
    ('attendance.view','students','attendance','read','عرض سجل الحضور والغياب','students',10),
    ('attendance.record','students','attendance','update','رصد الحضور والغياب','students',20),
    ('attendance.export','students','attendance','export','تصدير تقارير الحضور','students',30),

    ('curriculum.view','academics','curriculum','read','عرض المنهج والمواد والدروس','academics',10),
    ('curriculum.create','academics','curriculum','create','إضافة مواد أو موضوعات أو دروس','academics',20),
    ('curriculum.update','academics','curriculum','update','تعديل عناصر المنهج','academics',30),
    ('curriculum.delete','academics','curriculum','delete','حذف عناصر المنهج','academics',40),
    ('teacher_assignments.view','academics','teacher_assignments','read','عرض إسناد المعلمات للفصول','academics',10),
    ('teacher_assignments.manage','academics','teacher_assignments','update','إسناد أو إلغاء إسناد المعلمات','academics',20),
    ('assessments.view','academics','assessments','read','عرض التقييمات','academics',10),
    ('assessments.create','academics','assessments','create','إضافة تقييم جديد','academics',20),
    ('assessments.update','academics','assessments','update','تعديل التقييمات','academics',30),
    ('assessments.delete','academics','assessments','delete','حذف التقييمات','academics',40),
    ('assessments.evidence_delete','academics','assessments','delete','حذف الأدلة والشواهد','academics',50),
    ('study_plan.view','academics','study_plans','read','عرض الخطط الدراسية','academics',10),
    ('study_plan.create','academics','study_plans','create','إنشاء خطة دراسية','academics',20),
    ('study_plan.update','academics','study_plans','update','تعديل الخطط الدراسية','academics',30),
    ('study_plan.delete','academics','study_plans','delete','حذف الخطط الدراسية','academics',40),
    ('study_plan.publish','academics','study_plans','publish','نشر الخطة لأولياء الأمور','academics',50),
    ('study_plan.export','academics','study_plans','export','تصدير الخطة PDF أو صورة','academics',60),
    ('academic_reports.view','academics','academic_reports','read','عرض التقارير الأكاديمية','academics',10),
    ('academic_reports.publish','academics','academic_reports','publish','إظهار أو إخفاء التقارير لأولياء الأمور','academics',20),
    ('academic_reports.export','academics','academic_reports','export','تصدير التقارير الأكاديمية','academics',30),

    ('class_chat.view','communications','class_chat','read','الاطلاع على محادثة الفصل','communications',10),
    ('class_chat.post','communications','class_chat','create','إرسال رسائل ومرفقات في الفصل','communications',20),
    ('class_chat.delete','communications','class_chat','delete','حذف رسائل الفصل','communications',30),
    ('announcements.view','communications','announcements','read','عرض الإعلانات','communications',10),
    ('announcements.create','communications','announcements','create','نشر إعلان جديد','communications',20),
    ('announcements.delete','communications','announcements','delete','حذف الإعلانات','communications',30),
    ('inbox.view','communications','inbox','read','الاطلاع على المراسلات والتقييمات الواردة','communications',10),
    ('inbox.reply','communications','inbox','update','الرد على المراسلات عبر واتساب أو البريد','communications',20),
    ('inbox.status','communications','inbox','update','تغيير حالة المراسلة ودرجة أهميتها','communications',30),
    ('inbox.note','communications','inbox','update','كتابة الملاحظات الداخلية على المراسلات','communications',40),
    ('inbox.export','communications','inbox','export','تصدير المراسلات إلى ملف CSV','communications',50),
    ('inbox.delete','communications','inbox','delete','حذف المراسلات نهائيًا','communications',60),
    ('notifications.manage','communications','notifications','update','إدارة الإشعارات','communications',10),

    ('invoices.view','finance','invoices','read','عرض الفواتير','finance',10),
    ('payments.manage','finance','invoices','update','إدارة المدفوعات والفواتير','finance',20),
    ('payments.pay','finance','invoices','create','سداد الرسوم','finance',30),
    ('receipts.print','finance','invoices','export','طباعة السندات','finance',40),
    ('reports.financial','finance','financial_reports','read','التقارير المالية','finance',10),

    ('reports.view','reports','general_reports','read','عرض التقارير','reports',10),

    ('website.content_manage','website','content','update','إدارة محتوى الموقع الإلكتروني','settings',10),
    ('reviews.moderate','website','reviews','update','اعتماد أو رفض أو حذف تقييمات أولياء الأمور','settings',10),

    ('users.view','system','users','read','عرض المستخدمين','users',10),
    ('users.create','system','users','create','إضافة مستخدم','users',20),
    ('users.edit','system','users','update','تعديل مستخدم','users',30),
    ('users.delete','system','users','delete','حذف مستخدم','users',40),
    ('roles.manage','system','roles','update','إدارة الأدوار','users',10),
    ('permissions.manage','system','roles','update','إدارة الصلاحيات','users',20),
    ('audit.view','system','audit','read','عرض سجل العمليات','users',10),
    ('settings.manage','system','settings','update','إدارة إعدادات النظام','settings',10),
    ('stages.manage','system','settings','update','إدارة المراحل الدراسية','settings',20),
    ('classes.manage','system','settings','update','إدارة الفصول','settings',30),
    ('storage_cleanup.run','system','maintenance','delete','تنفيذ تنظيف مساحة التخزين','settings',10),
    ('chat_history.wipe','system','maintenance','delete','مسح سجل المحادثات','settings',20),
    ('colors_config.manage','system','maintenance','update','تعديل إعدادات الألوان والهوية','settings',30)
)
INSERT INTO public.permissions (key, module_name, sub_module_name, action, description_ar, category, sort_order)
SELECT key, module_name, sub_module_name, action, description_ar, category, sort_order FROM registry
ON CONFLICT (key) DO UPDATE
SET module_name = EXCLUDED.module_name,
    sub_module_name = EXCLUDED.sub_module_name,
    action = EXCLUDED.action,
    description_ar = EXCLUDED.description_ar,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

-- 3) Bulk grant/revoke for a role (admin only)
CREATE OR REPLACE FUNCTION public.admin_set_role_permissions_bulk(
  _role app_role,
  _permission_keys text[],
  _granted boolean
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _permission_keys IS NULL OR array_length(_permission_keys, 1) IS NULL THEN
    RETURN 0;
  END IF;

  IF _granted THEN
    INSERT INTO public.role_permissions (role, permission_key)
    SELECT _role, k
    FROM unnest(_permission_keys) AS k
    WHERE EXISTS (SELECT 1 FROM public.permissions p WHERE p.key = k)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    DELETE FROM public.role_permissions
    WHERE role = _role AND permission_key = ANY(_permission_keys);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_role_permissions_bulk(app_role, text[], boolean) TO authenticated;