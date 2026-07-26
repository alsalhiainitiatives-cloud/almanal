-- =========================================================
-- Roles enum
-- =========================================================
CREATE TYPE public.app_role AS ENUM (
  'parent',
  'registration_officer',
  'accountant',
  'principal',
  'supervisor',
  'admin'
);

-- =========================================================
-- updated_at helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'ar',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- user_roles
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- security definer role check (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =========================================================
-- permissions catalog
-- =========================================================
CREATE TABLE public.permissions (
  key TEXT PRIMARY KEY,
  description_ar TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND rp.permission_key = _permission
  );
$$;

CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS TABLE (permission_key TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT rp.permission_key
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  WHERE ur.user_id = auth.uid();
$$;

-- =========================================================
-- audit logs
-- =========================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device TEXT,
  browser TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_user_id_idx ON public.audit_logs (user_id);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- login attempts (brute force protection)
-- =========================================================
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX login_attempts_identifier_idx ON public.login_attempts (identifier, created_at DESC);
CREATE INDEX login_attempts_ip_idx ON public.login_attempts (ip_address, created_at DESC);

GRANT SELECT ON public.login_attempts TO authenticated;
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- active sessions
-- =========================================================
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token_hash TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device TEXT,
  browser TEXT,
  remember_me BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_sessions_user_idx ON public.user_sessions (user_id, last_seen_at DESC);

GRANT SELECT ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_user_sessions_updated_at
BEFORE UPDATE ON public.user_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RLS policies
-- =========================================================
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.has_permission(auth.uid(), 'users.view'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_permission(auth.uid(), 'roles.manage'));

CREATE POLICY "Anyone signed in can read permission catalog"
  ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone signed in can read role permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_permission(auth.uid(), 'audit.view'));

CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_permission(auth.uid(), 'audit.view'));

CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- new user trigger: profile + default parent role
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NEW.phone)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'parent')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- seed permissions
-- =========================================================
INSERT INTO public.permissions (key, description_ar, category) VALUES
  ('dashboard.view', 'عرض لوحة المعلومات', 'general'),
  ('profile.edit', 'تعديل الملف الشخصي', 'general'),
  ('users.view', 'عرض المستخدمين', 'users'),
  ('users.create', 'إضافة مستخدم', 'users'),
  ('users.edit', 'تعديل مستخدم', 'users'),
  ('users.delete', 'حذف مستخدم', 'users'),
  ('roles.manage', 'إدارة الأدوار', 'users'),
  ('permissions.manage', 'إدارة الصلاحيات', 'users'),
  ('audit.view', 'عرض سجل العمليات', 'users'),
  ('children.manage', 'إدارة الأبناء', 'students'),
  ('students.view', 'عرض الطلاب', 'students'),
  ('students.create', 'إضافة طالب', 'students'),
  ('students.edit', 'تعديل بيانات طالب', 'students'),
  ('applications.submit', 'تقديم طلب تسجيل', 'applications'),
  ('applications.track', 'متابعة حالة الطلب', 'applications'),
  ('applications.view', 'عرض الطلبات', 'applications'),
  ('applications.review', 'مراجعة الطلبات', 'applications'),
  ('applications.verify_documents', 'التحقق من المستندات', 'applications'),
  ('applications.return', 'إرجاع الطلبات الناقصة', 'applications'),
  ('applications.forward', 'تحويل الطلبات المكتملة', 'applications'),
  ('applications.request_changes', 'طلب تعديلات على الطلب', 'applications'),
  ('applications.approve', 'اعتماد الطلبات', 'applications'),
  ('applications.reject', 'رفض الطلبات', 'applications'),
  ('enrollment.manage', 'تحديث حالة القبول والتسجيل', 'applications'),
  ('classrooms.assign', 'توزيع الفصول', 'applications'),
  ('documents.upload', 'رفع المستندات', 'documents'),
  ('invoices.view', 'عرض الفواتير', 'finance'),
  ('payments.pay', 'سداد الرسوم', 'finance'),
  ('payments.manage', 'إدارة المدفوعات والفواتير', 'finance'),
  ('receipts.print', 'طباعة السندات', 'finance'),
  ('reports.view', 'عرض التقارير', 'reports'),
  ('reports.financial', 'التقارير المالية', 'reports'),
  ('settings.manage', 'إدارة إعدادات النظام', 'settings'),
  ('stages.manage', 'إدارة المراحل الدراسية', 'settings'),
  ('classes.manage', 'إدارة الفصول', 'settings'),
  ('notifications.manage', 'إدارة الإشعارات', 'settings');

-- =========================================================
-- seed role -> permissions
-- =========================================================
INSERT INTO public.role_permissions (role, permission_key) VALUES
  -- Parent
  ('parent', 'dashboard.view'),
  ('parent', 'profile.edit'),
  ('parent', 'children.manage'),
  ('parent', 'applications.submit'),
  ('parent', 'applications.track'),
  ('parent', 'documents.upload'),
  ('parent', 'invoices.view'),
  ('parent', 'payments.pay'),
  -- Registration officer
  ('registration_officer', 'dashboard.view'),
  ('registration_officer', 'profile.edit'),
  ('registration_officer', 'students.view'),
  ('registration_officer', 'applications.view'),
  ('registration_officer', 'applications.review'),
  ('registration_officer', 'applications.verify_documents'),
  ('registration_officer', 'applications.return'),
  ('registration_officer', 'applications.forward'),
  ('registration_officer', 'reports.view'),
  -- Accountant
  ('accountant', 'dashboard.view'),
  ('accountant', 'profile.edit'),
  ('accountant', 'payments.manage'),
  ('accountant', 'invoices.view'),
  ('accountant', 'receipts.print'),
  ('accountant', 'reports.view'),
  ('accountant', 'reports.financial'),
  -- Principal
  ('principal', 'dashboard.view'),
  ('principal', 'profile.edit'),
  ('principal', 'students.view'),
  ('principal', 'students.edit'),
  ('principal', 'applications.view'),
  ('principal', 'applications.review'),
  ('principal', 'applications.request_changes'),
  ('principal', 'applications.approve'),
  ('principal', 'applications.reject'),
  ('principal', 'enrollment.manage'),
  ('principal', 'classrooms.assign'),
  ('principal', 'reports.view'),
  ('principal', 'reports.financial'),
  -- General supervisor (read only)
  ('supervisor', 'dashboard.view'),
  ('supervisor', 'profile.edit'),
  ('supervisor', 'students.view'),
  ('supervisor', 'applications.view'),
  ('supervisor', 'reports.view'),
  -- System administrator (no admission decisions)
  ('admin', 'dashboard.view'),
  ('admin', 'profile.edit'),
  ('admin', 'users.view'),
  ('admin', 'users.create'),
  ('admin', 'users.edit'),
  ('admin', 'users.delete'),
  ('admin', 'roles.manage'),
  ('admin', 'permissions.manage'),
  ('admin', 'audit.view'),
  ('admin', 'settings.manage'),
  ('admin', 'stages.manage'),
  ('admin', 'classes.manage'),
  ('admin', 'notifications.manage'),
  ('admin', 'students.view'),
  ('admin', 'applications.view'),
  ('admin', 'reports.view');