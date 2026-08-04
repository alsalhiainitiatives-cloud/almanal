/** Ready-made reply templates for contact messages and parent reviews. */
export type ReplyTemplate = {
  key: string;
  label: string;
  subject: string;
  build: (input: { name: string; subject?: string | null; program?: string | null }) => string;
};

const school = "روضة ومدارس المنال";

export const MESSAGE_TEMPLATES: ReplyTemplate[] = [
  {
    key: "ack",
    label: "تأكيد الاستلام",
    subject: `تأكيد استلام رسالتكم — ${school}`,
    build: ({ name }) =>
      `أهلًا ${name}،\nشكرًا لتواصلكم مع ${school}. تم استلام رسالتكم وسيتم الرد عليكم خلال يوم عمل واحد.\nمع تحيات فريق خدمة أولياء الأمور.`,
  },
  {
    key: "admission",
    label: "تفاصيل التسجيل",
    subject: `تفاصيل التسجيل — ${school}`,
    build: ({ name, program }) =>
      `أهلًا ${name}،\nيسعدنا اهتمامكم بالتسجيل${program ? ` في ${program}` : ""} لدى ${school}.\nيمكنكم إكمال طلب التسجيل إلكترونيًا من الموقع، وسيتواصل معكم مسؤول التسجيل لاستكمال المستندات.\nمع تحيات فريق القبول والتسجيل.`,
  },
  {
    key: "visit",
    label: "دعوة لزيارة",
    subject: `دعوة لزيارة ${school}`,
    build: ({ name }) =>
      `أهلًا ${name}،\nندعوكم لزيارة ${school} والتعرّف على البيئة التعليمية وفصولنا.\nالزيارات من الأحد إلى الخميس، 8 صباحًا حتى 12 ظهرًا. يرجى إبلاغنا بالموعد المناسب لكم.\nمع تحيات الإدارة.`,
  },
  {
    key: "fees",
    label: "استفسار المصاريف",
    subject: `تفاصيل المصاريف الدراسية — ${school}`,
    build: ({ name }) =>
      `أهلًا ${name}،\nبخصوص استفساركم عن المصاريف الدراسية: تختلف القيمة حسب المرحلة والفصل والخدمات المختارة، ويوجد دعم قُرّة للحالات المستحقة.\nيسعدنا تزويدكم بعرض تفصيلي عند تحديد المرحلة.\nمع تحيات الإدارة المالية.`,
  },
  {
    key: "close",
    label: "إغلاق ومتابعة",
    subject: `متابعة طلبكم — ${school}`,
    build: ({ name }) =>
      `أهلًا ${name}،\nنأمل أن نكون قد أجبنا على استفساركم بشكل كامل. في حال وجود أي ملاحظة إضافية نحن على تواصل دائم.\nشكرًا لثقتكم بـ${school}.`,
  },
];

export const REVIEW_TEMPLATES: ReplyTemplate[] = [
  {
    key: "thanks",
    label: "شكر على التقييم",
    subject: `شكرًا لتقييمكم — ${school}`,
    build: ({ name }) =>
      `أهلًا ${name}،\nشكرًا لمشاركتكم رأيكم عن ${school}. كلماتكم دافع لفريقنا لتقديم الأفضل لأبنائكم.`,
  },
  {
    key: "published",
    label: "إشعار النشر",
    subject: `تم نشر رأيكم — ${school}`,
    build: ({ name }) =>
      `أهلًا ${name}،\nتم اعتماد رأيكم ونشره على موقع ${school}. نشكركم على وقتكم وثقتكم.`,
  },
  {
    key: "followup",
    label: "معالجة ملاحظة",
    subject: `متابعة ملاحظتكم — ${school}`,
    build: ({ name }) =>
      `أهلًا ${name}،\nتم إحالة ملاحظتكم إلى الإدارة المختصة لمعالجتها، وسنوافيكم بما يتم بشأنها.\nنعتذر عن أي إزعاج، ونشكركم على صراحتكم.`,
  },
];

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "966");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(email: string, subject: string, text: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}