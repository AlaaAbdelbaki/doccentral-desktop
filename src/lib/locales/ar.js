// Arabic UI strings (RTL). Keys are the English text (missing keys fall back to English).
// Placeholders like {n} are filled by t(key, { n }). Counts use a "label: n" form
// to avoid Arabic singular/dual/plural agreement with a single template.
// Checked by tests/unit/i18n.test.mjs: every t('…') key must exist here.
export default {
  // ---- navigation & shell
  Home: 'الرئيسية', Calendar: 'التقويم', Patients: 'المرضى', Invoices: 'الفواتير',
  Documents: 'المستندات', Inventory: 'المخزون', 'Day closeout': 'إغلاق اليوم',
  Settings: 'الإعدادات', Clinical: 'العيادة', Operations: 'الإدارة',
  'Loading DocCentral…': 'جارٍ تحميل DocCentral…',
  'Open sync settings': 'فتح إعدادات المزامنة',
  'Syncing…': 'جارٍ المزامنة…', Synced: 'تمت المزامنة', '{n} pending': 'قيد الانتظار: {n}',
  Offline: 'غير متصل', Local: 'محلي', Search: 'بحث',

  // ---- shared
  DT: 'د.ت', All: 'الكل', 'All →': 'عرض الكل ←', Cancel: 'إلغاء', Save: 'حفظ', Saved: 'تم الحفظ',
  'Save changes': 'حفظ التغييرات', Edit: 'تعديل', Delete: 'حذف', Close: 'إغلاق',
  Add: 'إضافة', Keep: 'إبقاء', Record: 'تسجيل', Switch: 'اختيار',
  Status: 'الحالة', Notes: 'ملاحظات', Reason: 'السبب', Date: 'التاريخ', Start: 'البداية', End: 'النهاية',
  Name: 'الاسم', Description: 'الوصف', Amount: 'المبلغ', Total: 'المجموع', Due: 'المتبقي',
  Time: 'الوقت', optional: 'اختياري', Active: 'نشط', Enabled: 'مفعّل',

  // ---- statuses
  Scheduled: 'مجدول', 'Checked in': 'حاضر', Completed: 'مكتمل', Cancelled: 'ملغى',
  'No-show': 'لم يحضر', Rescheduled: 'مؤجَّل', 'In progress': 'جارٍ',
  Draft: 'مسودة', Unpaid: 'غير مدفوعة', 'Partially paid': 'مدفوعة جزئيًا', Paid: 'مدفوعة', Void: 'ملغاة',
  Planned: 'مخطط', Done: 'منجز', Monitor: 'تحت المتابعة',

  // ---- roles
  Dentist: 'طبيب أسنان', Assistant: 'مساعد', Nurse: 'ممرض', Staff: 'موظف',
  'Dentist · Clinic owner': 'طبيب أسنان · صاحب العيادة', 'Owner · Dentist': 'صاحب العيادة · طبيب أسنان',
  Role: 'الدور',

  // ---- sign-in
  'Sign in': 'تسجيل الدخول', 'Sign out': 'تسجيل الخروج', 'Sign up': 'إنشاء حساب',
  Email: 'البريد الإلكتروني', Password: 'كلمة المرور', Clinic: 'العيادة', 'Clinic management': 'إدارة العيادة',
  'Create your clinic': 'أنشئ عيادتك',
  'First run — this provisions the clinic and the owner (Dentist) account.':
    'التشغيل الأول — يُنشئ العيادة وحساب صاحبها (طبيب الأسنان).',
  'Use your clinic account. Sessions persist across restarts.':
    'استخدم حساب العيادة. تبقى الجلسة مفتوحة بعد إعادة التشغيل.',
  'Cabinet Dentaire — Tunis': 'عيادة أسنان — تونس',
  'Already provisioned?': 'هل العيادة منشأة مسبقًا؟', 'First run on this clinic?': 'أول تشغيل لهذه العيادة؟',
  'Create the clinic': 'إنشاء العيادة', 'First name': 'الاسم', 'Last name': 'اللقب',
  "This account hasn't been used on this computer before. Connect to the internet so it can be verified as a member of {clinic}.":
    'لم يُستخدم هذا الحساب على هذا الحاسوب من قبل. اتصل بالإنترنت للتحقق من أنه عضو في {clinic}.',
  'The first sign-in on this computer needs an internet connection to download your clinic.':
    'يتطلب أول تسجيل دخول على هذا الحاسوب اتصالًا بالإنترنت لتنزيل بيانات عيادتك.',
  "New accounts can't be verified yet because cloud sync isn't set up. The owner of {clinic} should finish the setup under Settings → Data & sync.":
    'لا يمكن التحقق من الحسابات الجديدة بعد لأن المزامنة السحابية غير مُعدّة. على صاحب {clinic} إكمال الإعداد من الإعدادات ← البيانات والمزامنة.',
  'This account is not a member of {clinic}. Ask the clinic owner to add you under Settings → Team & roles.':
    'هذا الحساب ليس عضوًا في {clinic}. اطلب من صاحب العيادة إضافتك من الإعدادات ← الفريق والأدوار.',
  'This account belongs to another clinic.': 'هذا الحساب تابع لعيادة أخرى.',
  'Could not download your clinic data. Check your connection and try again.':
    'تعذّر تنزيل بيانات العيادة. تحقق من الاتصال وحاول مجددًا.',
  'My Clinic': 'عيادتي',
  'Sign-in did not return a session. If you just signed up, confirm your email first.':
    'لم يكتمل تسجيل الدخول. إذا أنشأت حسابك للتو، فأكّد بريدك الإلكتروني أولًا.',
  'Signed in, but the local clinic record could not be created.':
    'تم تسجيل الدخول، لكن تعذّر إنشاء العيادة على هذا الحاسوب.',
  'This computer is already set up for {clinic}. Sign in instead, or ask the owner to add you.':
    'هذا الحاسوب مُعدّ مسبقًا لـ{clinic}. سجّل الدخول بدلًا من ذلك، أو اطلب من صاحب العيادة إضافتك.',
  'Sign-up failed: no user returned.': 'فشل إنشاء الحساب: لم يُنشأ أي مستخدم.',
  'Account created. Confirm your email, then sign in.': 'تم إنشاء الحساب. أكّد بريدك الإلكتروني ثم سجّل الدخول.',
  'No clinic is set up on this computer.': 'لا توجد عيادة مُعدّة على هذا الحاسوب.',
  "{email} already has an account. Adding existing accounts isn't supported yet — use a different email.":
    'لدى {email} حساب مسبقًا. إضافة الحسابات الموجودة غير مدعومة بعد — استخدم بريدًا إلكترونيًا آخر.',
  "Couldn't create the account ({error}). Adding staff needs an internet connection.":
    'تعذّر إنشاء الحساب ({error}). تتطلب إضافة الموظفين اتصالًا بالإنترنت.',
  'Account creation returned no user — try again.': 'لم يُنشأ أي مستخدم — حاول مجددًا.',

  // ---- home
  'Good morning': 'صباح الخير', 'Good afternoon': 'مساء الخير', 'Good evening': 'مساء الخير',
  '{greeting},': '{greeting}،',
  'Dr. {name}': 'د. {name}', 'New appointment': 'موعد جديد', Appointments: 'المواعيد',
  '1 appointment': 'موعد واحد', '{n} appointments': 'المواعيد: {n}', '{n} completed': 'المكتملة: {n}',
  'active records': 'ملفات نشطة', 'Cash today': 'النقد اليوم', 'payments received': 'المدفوعات المستلمة',
  Outstanding: 'المستحقات', 'across all patients': 'لكل المرضى', 'Low stock': 'مخزون منخفض',
  'items at / below threshold': 'أصناف عند الحد الأدنى أو دونه', "Today's schedule": 'جدول اليوم',
  'Waiting room': 'قاعة الانتظار', '{n} in clinic': 'في العيادة: {n}', 'since {time}': 'منذ {time}',
  'In chair': 'على الكرسي', 'No one waiting': 'لا أحد في الانتظار',
  '{qty} {unit} left · threshold {threshold}': 'المتبقي {qty} {unit} · الحد الأدنى {threshold}',
  'Stock levels are healthy': 'مستويات المخزون جيدة', 'Outstanding balances': 'الأرصدة المستحقة',
  'Everyone is paid up': 'لا توجد مستحقات',

  // ---- calendar
  Today: 'اليوم', Day: 'يوم', Week: 'أسبوع', Month: 'شهر', 'Week of {date}': 'أسبوع {date}',
  'Edit appointment': 'تعديل الموعد', 'Book anyway': 'الحجز رغم ذلك',
  'Choose a patient…': 'اختر مريضًا…',
  'No patients yet — add one from the Patients page first.': 'لا يوجد مرضى بعد — أضف مريضًا من صفحة المرضى أولًا.',
  'End time must be after the start time.': 'يجب أن يكون وقت النهاية بعد وقت البداية.',
  'This slot is already booked:': 'هذا الموعد محجوز مسبقًا:',
  Patient: 'المريض', Provider: 'الطبيب', 'Reason / planned treatment': 'السبب / العلاج المخطط',
  'e.g. Root canal #30 — session 2': 'مثال: علاج عصب السن 30 — الجلسة 2',
  'Cancel — {name}': 'إلغاء — {name}', 'Keep appointment': 'إبقاء الموعد',
  'Confirm cancellation': 'تأكيد الإلغاء', 'Patient cancelled': 'ألغاه المريض',
  'Clinic cancelled': 'ألغته العيادة', 'New date': 'التاريخ الجديد',
  'The new slot is already booked:': 'الموعد الجديد محجوز مسبقًا:', 'Optional context…': 'تفاصيل إضافية (اختياري)…',
  'Cancel / reschedule': 'إلغاء / تأجيل', 'Check in': 'تسجيل الحضور', 'Open visit': 'فتح الزيارة',
  When: 'الموعد', Exam: 'فحص', Hygiene: 'تنظيف', Surgery: 'جراحة', Emergency: 'طوارئ',

  // ---- visit
  'Visit — {name}': 'زيارة — {name}', 'Start treatment': 'بدء العلاج', 'Complete visit': 'إنهاء الزيارة',
  'Unlock visit': 'إلغاء قفل الزيارة', 'Save & close': 'حفظ وإغلاق',
  'Checked in {time}': 'الحضور {time}', 'completed {time}': 'الانتهاء {time}', 'invoice: {status}': 'الفاتورة: {status}',
  Diagnosis: 'التشخيص', 'Clinical notes': 'ملاحظات سريرية', 'e.g. Irreversible pulpitis #30': 'مثال: التهاب لب غير عكوس في السن 30',
  'Dictated note…': 'ملاحظة…', 'Performed treatments': 'العلاجات المنجزة', 'Total {amount}': 'المجموع {amount}',
  Tooth: 'السن', Procedure: 'الإجراء', Unit: 'الوحدة', Qty: 'الكمية', 'No treatments recorded yet': 'لم تُسجَّل أي علاجات بعد',
  'Procedure (free text)': 'الإجراء (نص حر)', Price: 'السعر', 'From treatment plan': 'من خطة العلاج',
  'est. {amount} · session {n}': 'تقديري {amount} · الجلسة {n}', 'Mark performed': 'تحديد كمنجز',

  // ---- patients
  'Add patient': 'إضافة مريض', 'Edit patient': 'تعديل بيانات المريض', '{n} active records': 'الملفات النشطة: {n}',
  'Search name or phone…': 'ابحث بالاسم أو الهاتف…', 'With balance': 'لديهم رصيد', 'No patients match': 'لا يوجد مرضى مطابقون',
  'Balance due': 'رصيد مستحق', 'Book visit': 'حجز زيارة', 'No patient selected': 'لم يتم اختيار مريض',
  'Add your first patient to get started.': 'أضف أول مريض للبدء.',
  Overview: 'نظرة عامة', 'Treatment plan': 'خطة العلاج', Visits: 'الزيارات', 'Dental chart': 'مخطط الأسنان',
  'Date of birth': 'تاريخ الميلاد', Phone: 'الهاتف', 'Email (optional)': 'البريد الإلكتروني (اختياري)',
  'History notes (paper-file backfill)': 'السوابق (من الملف الورقي)',
  'Allergies, prior treatments, paper folder summary…': 'الحساسية، العلاجات السابقة، ملخص الملف الورقي…',
  '{n} yrs': '{n} سنة', 'Next appointment': 'الموعد القادم', 'Last visit': 'آخر زيارة', Balance: 'الرصيد',
  'Outstanding balance': 'رصيد مستحق', 'Paid in full': 'مدفوع بالكامل', 'History notes': 'السوابق',
  'paper-file backfill': 'من الملف الورقي', Attachments: 'المرفقات', Upload: 'رفع', 'No files yet': 'لا توجد ملفات بعد',
  'Delete patient': 'حذف المريض', 'Delete (soft)': 'حذف (أرشفة)',
  'Remove {name} from the roster? The record is soft-deleted and kept in the database for history and sync.':
    'إزالة {name} من القائمة؟ يُؤرشف الملف ويُحفظ في قاعدة البيانات للسجل والمزامنة.',
  'Add planned treatment — {name}': 'إضافة علاج مخطط — {name}', 'Add to plan': 'إضافة إلى الخطة',
  'Procedure (required)': 'الإجراء (إلزامي)', 'e.g. Root canal — session 1 of 3': 'مثال: علاج العصب — الجلسة 1 من 3',
  'e.g. 30 or FM': 'مثال: 30 أو FM', 'Estimated fee': 'التكلفة التقديرية',
  'Target date (optional — leave empty for next available)': 'التاريخ المستهدف (اختياري — اتركه فارغًا لأقرب موعد متاح)',
  'est. {amount} remaining': 'المتبقي تقديريًا {amount}', Target: 'التاريخ المستهدف', 'Est. fee': 'التكلفة التقديرية',
  'Next available': 'أقرب موعد متاح', 'No treatment plan yet': 'لا توجد خطة علاج بعد',
  'Plan multi-session treatments and schedule them as appointments.': 'خطّط للعلاجات متعددة الجلسات واحجزها كمواعيد.',
  '{n} total': 'المجموع: {n}', Visit: 'زيارة', 'Open to record treatments and notes': 'افتح لتسجيل العلاجات والملاحظات',
  'No visits yet': 'لا توجد زيارات بعد',
  'Check the patient in from the calendar to start a visit.': 'سجّل حضور المريض من التقويم لبدء زيارة.',
  'Planned treatment': 'علاج مخطط', 'Treated (restoration)': 'معالَج (ترميم)', Crown: 'تاج',
  'Missing / extracted': 'مفقود / مقلوع', Sound: 'سليم', Treated: 'معالَج', Missing: 'مفقود',
  'Upper arch · Maxillary (1–16)': 'الفك العلوي (1–16)',
  'Lower arch · Mandibular (17–32)': 'الفك السفلي (17–32)',
  Condition: 'الحالة', 'Select a tooth': 'اختر سنًا', 'Tooth #{n}': 'السن رقم {n}',

  // ---- invoices
  Invoice: 'فاتورة', Finalize: 'اعتماد', 'Record payment': 'تسجيل دفعة',
  'Add discount': 'إضافة خصم', 'Add surcharge': 'إضافة رسوم إضافية', discount: 'خصم', surcharge: 'رسوم إضافية',
  'Line items': 'البنود', Payments: 'الدفعات', Method: 'طريقة الدفع', 'No payments recorded': 'لا توجد دفعات مسجلة',
  Cash: 'نقدًا', Card: 'بطاقة', Cheque: 'شيك', Transfer: 'تحويل',
  'A discount cannot exceed the invoice total ({amount}).': 'لا يمكن أن يتجاوز الخصم مجموع الفاتورة ({amount}).',
  'e.g. Loyalty discount': 'مثال: خصم وفاء', 'e.g. After-hours surcharge': 'مثال: رسوم خارج أوقات العمل',
  'Amount ({currency})': 'المبلغ ({currency})', 'Amount exceeds what is due ({amount}).': 'المبلغ يتجاوز المستحق ({amount}).',
  'e.g. Partial — rest next visit': 'مثال: دفعة جزئية — الباقي في الزيارة القادمة',
  'Due: {amount} — a lower amount records a partial payment.': 'المستحق: {amount} — المبلغ الأقل يُسجَّل كدفعة جزئية.',
  'Void invoice': 'إلغاء الفاتورة', 'e.g. Billing error — reissued': 'مثال: خطأ في الفوترة — أُعيد إصدارها',
  '{n} invoices · {owed} patients with balance': 'الفواتير: {n} · مرضى لديهم رصيد: {owed}',
  'No invoices': 'لا توجد فواتير', 'Complete a visit to auto-generate a draft invoice.': 'أنهِ زيارة لإنشاء مسودة فاتورة تلقائيًا.',
  'No outstanding balances': 'لا توجد أرصدة مستحقة',
  'Amount must be greater than zero.': 'يجب أن يكون المبلغ أكبر من صفر.',
  'Only draft invoices can be adjusted.': 'لا يمكن تعديل إلا مسودات الفواتير.',
  'Discount cannot exceed the invoice total ({amount}).': 'لا يمكن أن يتجاوز الخصم مجموع الفاتورة ({amount}).',
  'Payment amount must be greater than zero.': 'يجب أن يكون مبلغ الدفعة أكبر من صفر.',
  'Payments can only be recorded on finalized, unpaid invoices.': 'لا تُسجَّل الدفعات إلا على الفواتير المعتمدة غير المدفوعة.',
  'Payment exceeds the amount due ({amount}).': 'الدفعة تتجاوز المبلغ المستحق ({amount}).',

  // ---- documents
  '{n} files · imaging, consents, records': 'الملفات: {n} · أشعة، موافقات، سجلات',
  'Search files or patients…': 'ابحث في الملفات أو المرضى…', Imaging: 'أشعة', Document: 'مستند',
  'No documents': 'لا توجد مستندات', 'Upload X-rays, consents and records against a patient.': 'ارفع صور الأشعة والموافقات والسجلات لكل مريض.',
  'Upload — {file}': 'رفع — {file}', 'Attach to patient': 'إرفاق بالمريض',
  '{size} KB — the file stays on this computer; only its record syncs.': '{size} ك.ب — يبقى الملف على هذا الحاسوب؛ تتم مزامنة بياناته فقط.',
  'Open in system viewer': 'فتح في عارض النظام',

  // ---- inventory
  Consumables: 'مستهلكات', 'Edit item': 'تعديل الصنف', 'New inventory item': 'صنف جديد', 'New item': 'صنف جديد',
  'e.g. Cotton rolls': 'مثال: لفائف قطن', Category: 'الفئة', 'pcs / box / carpule': 'قطعة / علبة / خرطوشة',
  'On hand': 'المتوفر', 'Low-stock threshold': 'الحد الأدنى للمخزون', 'Out / critical': 'نفد / حرج', Low: 'منخفض',
  'In stock': 'متوفر', '{crit} critical · {low} low': 'حرج: {crit} · منخفض: {low}', 'Tracked items': 'الأصناف المتابَعة',
  '{n} categories': 'الفئات: {n}', Critical: 'حرج', 'out of stock': 'نفد من المخزون', 'at / below threshold': 'عند الحد الأدنى أو دونه',
  Healthy: 'جيد', 'above threshold': 'فوق الحد الأدنى', 'All items': 'كل الأصناف', 'Needs reorder': 'يحتاج طلبًا',
  'Search supplies…': 'ابحث في اللوازم…', Item: 'الصنف', 'Stock level': 'مستوى المخزون', 'No items': 'لا توجد أصناف',
  'Track consumables like cotton rolls, gloves, anesthetic.': 'تابِع المستهلكات مثل لفائف القطن والقفازات والمخدّر.',
  Restock: 'تزويد', Adjust: 'تعديل', 'Restock — {item}': 'تزويد — {item}', 'Record restock': 'تسجيل التزويد',
  'Quantity added ({unit})': 'الكمية المضافة ({unit})', Supplier: 'المورّد',
  'Current: {from} {unit} → {to} {unit}': 'الحالي: {from} {unit} ← {to} {unit}', 'Adjust stock — {item}': 'تعديل المخزون — {item}',
  'Apply adjustment': 'تطبيق التعديل', 'New on-hand quantity ({unit})': 'الكمية المتوفرة الجديدة ({unit})',
  'Reason (required)': 'السبب (إلزامي)', 'e.g. Physical count correction, expired batch': 'مثال: تصحيح بعد الجرد، دفعة منتهية الصلاحية',
  'Change: {delta}': 'الفرق: {delta}',

  // ---- day closeout
  'Expected cash': 'النقد المتوقع', 'Counted cash': 'النقد المعدود', "sum of today's cash payments": 'مجموع الدفعات النقدية اليوم',
  'physical drawer count': 'جرد الصندوق', Delta: 'الفرق', 'counted − expected': 'المعدود − المتوقع', 'Day closed': 'تم إغلاق اليوم',
  'Closed with {counted} counted ({delta} difference).': 'أُغلق بمبلغ معدود {counted} (الفرق {delta}).',
  'Reopen day (Dentist action)': 'إعادة فتح اليوم (من صلاحيات الطبيب)', 'Close the day': 'إغلاق اليوم',
  'Counted cash ({currency})': 'النقد المعدود ({currency})', 'Discrepancy note (optional)': 'ملاحظة حول الفرق (اختياري)',
  'e.g. 5 DT change float': 'مثال: 5 د.ت فكّة', 'Confirm closeout': 'تأكيد الإغلاق', History: 'السجل',
  Expected: 'المتوقع', Counted: 'المعدود', reopened: 'أُعيد فتحه', 'No closeouts yet': 'لا توجد عمليات إغلاق بعد',

  // ---- settings
  'Clinic profile': 'ملف العيادة', 'My profile': 'ملفي الشخصي', Language: 'اللغة', 'Team & roles': 'الفريق والأدوار',
  'Data & sync': 'البيانات والمزامنة', 'Clinic name': 'اسم العيادة', Address: 'العنوان', Currency: 'العملة',
  'TND (Tunisian dinar)': 'د.ت (الدينار التونسي)', EUR: 'يورو', USD: 'دولار أمريكي', 'Invoice footer': 'تذييل الفاتورة',
  'Email (sign-in)': 'البريد الإلكتروني (لتسجيل الدخول)', 'Your name appears in the sidebar, on visits, and on recorded payments.':
    'يظهر اسمك في الشريط الجانبي وفي الزيارات والدفعات المسجلة.',
  'Language & formats': 'اللغة والتنسيقات', 'Primary clinic language': 'اللغة الرئيسية للعيادة',
  'Right-to-left layout': 'عرض من اليمين إلى اليسار',
  'Same as this computer': 'لغة هذا الحاسوب',
  'Follows the Windows language — currently {language}.': 'تتبع لغة ويندوز — حاليًا {language}.',
  "Used when the computer's language isn't supported": 'تُستخدم عندما تكون لغة الحاسوب غير مدعومة', 'Add staff': 'إضافة موظف', 'Add staff user': 'إضافة موظف',
  'Create user': 'إنشاء المستخدم', 'Initial password': 'كلمة المرور الأولية',
  Sync: 'المزامنة', 'Supabase account': 'حساب Supabase', 'Not signed in': 'غير مسجّل الدخول', 'Sync now': 'مزامنة الآن',
  'All local changes synced · {time}.': 'تمت مزامنة جميع التغييرات المحلية · {time}.',
  'All local changes synced.': 'تمت مزامنة جميع التغييرات المحلية.',
  '{n} record(s) pending — {reason}.': 'سجلات قيد الانتظار: {n} — {reason}.', 'will retry automatically': 'ستُعاد المحاولة تلقائيًا',
  'Sync failed for {tables} table(s) — {n} record(s) kept locally:': 'فشلت مزامنة {tables} جدول — {n} سجل محفوظ محليًا:',
  '· …and more (same cause for most tables)': '· …وغيرها (السبب نفسه لمعظم الجداول)',
  'Cloud setup missing or out of date.': 'إعداد السحابة غير موجود أو قديم.',
  "The Supabase project is missing the tables or the latest access rules this version needs. They can't be changed through the app's API key — copy the setup SQL below and run it once in the Supabase SQL editor (safe to run again), then sync resumes automatically. Records are safe locally meanwhile.":
    'مشروع Supabase يفتقد الجداول أو أحدث قواعد الوصول التي يحتاجها هذا الإصدار. لا يمكن تغييرها بمفتاح التطبيق — انسخ شيفرة الإعداد أدناه وشغّلها مرة واحدة في محرر SQL في Supabase (لا ضرر من تكرارها)، ثم تستأنف المزامنة تلقائيًا. البيانات محفوظة بأمان على هذا الحاسوب في الأثناء.',
  'Copied ✓': 'تم النسخ ✓', 'Copy migration SQL': 'نسخ شيفرة الإعداد', 'Open Supabase SQL editor': 'فتح محرر SQL في Supabase',
  'Retry sync': 'إعادة المزامنة', 'Offline-first storage': 'تخزين يعمل دون اتصال',
  'All records saved locally (SQLite) with sync metadata; pending rows push when online.':
    'تُحفظ كل البيانات محليًا (SQLite)، وتُرسل التغييرات المعلقة عند توفر الاتصال.',
  Data: 'البيانات', 'Demo data': 'بيانات تجريبية',
  'Seed sample patients, appointments, inventory (only if the database is empty).': 'إضافة مرضى ومواعيد ومخزون تجريبي (فقط إذا كانت قاعدة البيانات فارغة).',
  'Demo data loaded.': 'تم تحميل البيانات التجريبية.', 'Database not empty — skipped.': 'قاعدة البيانات ليست فارغة — تم التخطي.',
  'Load demo data': 'تحميل البيانات التجريبية', Session: 'الجلسة', 'Signed in as {name}': 'مسجّل الدخول باسم {name}',
  'Not signed in — records kept locally': 'غير مسجّل الدخول — البيانات محفوظة محليًا',
  '{n} table(s) failed to sync — records kept locally': 'تعذّرت مزامنة {n} جدول — البيانات محفوظة محليًا',

  // Report a problem
  'Report a problem': 'الإبلاغ عن مشكلة',
  'What happened?': 'ماذا حدث؟',
  'What were you doing, what did you expect, and what happened instead?': 'ماذا كنت تفعل، وما الذي توقعته، وما الذي حدث بدلًا من ذلك؟',
  'Attachments (optional)': 'المرفقات (اختياري)',
  'Screenshot of the screen': 'لقطة من الشاشة',
  'Add files': 'إضافة ملفات',
  Remove: 'إزالة',
  '{n} MB': '{n} ميغابايت',
  '{n} KB': '{n} كيلوبايت',
  'Screenshots and files may show patient information. Attach only what helps explain the problem.':
    'قد تُظهر اللقطات والملفات معلومات عن المرضى. أرفق فقط ما يساعد على توضيح المشكلة.',
  'Help find the cause (optional)': 'المساعدة في معرفة السبب (اختياري)',
  'Include device information': 'تضمين معلومات الجهاز',
  'App and Windows version, processor, memory, screens, language and sync status. No computer name, user name or network address.':
    'إصدار التطبيق وويندوز، المعالج، الذاكرة، الشاشات، اللغة وحالة المزامنة. بدون اسم الحاسوب أو اسم المستخدم أو عنوان الشبكة.',
  'Include app logs': 'تضمين سجلّ التطبيق',
  'Recent errors and warnings from the app. Email addresses, phone numbers and passwords are removed.':
    'الأخطاء والتحذيرات الأخيرة في التطبيق. تُحذف عناوين البريد الإلكتروني وأرقام الهاتف وكلمات المرور.',
  'Show what will be sent': 'عرض ما سيُرسل',
  'Hide what will be sent': 'إخفاء ما سيُرسل',
  'Nothing recorded yet.': 'لا يوجد شيء مسجّل بعد.',
  'Your patient records are never included.': 'لا تُرسل ملفات مرضاك أبدًا.',
  'Send report': 'إرسال التقرير',
  'Sending…': 'جارٍ الإرسال…',
  'Please describe the problem.': 'يُرجى وصف المشكلة.',
  'Too large (over {n} MB): {files}': 'حجم كبير جدًا (أكثر من {n} ميغابايت): {files}',
  'You can attach up to {n} files.': 'يمكنك إرفاق {n} ملفات كحدّ أقصى.',
  'Thank you — your report was sent.': 'شكرًا — تم إرسال تقريرك.',
  'Reference: {ref}': 'المرجع: {ref}',
  'Report saved on this computer.': 'تم حفظ التقرير على هذا الحاسوب.',
  "It couldn't be sent right now (offline or not connected to the cloud). It will be sent automatically.":
    'تعذّر إرساله الآن (دون اتصال أو غير متصل بالسحابة). سيُرسل تلقائيًا.',
};
