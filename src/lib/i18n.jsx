// Lightweight localization (EN / FR / AR with RTL), mirroring the Flutter app's
// language-switch feature. Keys fall back to English.
import { createContext, useContext, useEffect, useState } from 'react';

const DICT = {
  en: {},
  fr: {
    Home: 'Accueil', Calendar: 'Calendrier', Patients: 'Patients', Invoices: 'Factures',
    Documents: 'Documents', Inventory: 'Inventaire', 'Day closeout': 'Clôture du jour',
    Settings: 'Paramètres', Clinical: 'Clinique', Operations: 'Opérations',
    'Sign in': 'Se connecter', 'Sign out': 'Se déconnecter', 'Sign up': "S'inscrire",
    Email: 'E-mail', Password: 'Mot de passe', Search: 'Rechercher',
    'Add patient': 'Ajouter un patient', 'New appointment': 'Nouveau rendez-vous',
    'Book visit': 'Planifier une visite', Overview: 'Aperçu', 'Dental chart': 'Schéma dentaire',
    'Treatment plan': 'Plan de traitement', Visits: 'Visites', Balance: 'Solde',
    'Record payment': 'Enregistrer un paiement', 'Check in': 'Enregistrer arrivée',
    Cancel: 'Annuler', Save: 'Enregistrer', Edit: 'Modifier', Delete: 'Supprimer',
    Active: 'Actif', Overdue: 'En retard', 'Recall due': 'Rappel dû',
    Today: "Aujourd'hui", Day: 'Jour', Week: 'Semaine', Month: 'Mois',
    Status: 'Statut', Patient: 'Patient', Provider: 'Praticien', Fee: 'Tarif',
    Procedure: 'Acte', Tooth: 'Dent', Quantity: 'Quantité', Total: 'Total',
    Draft: 'Brouillon', Unpaid: 'Impayée', 'Partially paid': 'Partiellement payée',
    Paid: 'Payée', Void: 'Annulée', Finalize: 'Finaliser',
    'Outstanding balance': 'Solde impayé', 'Low stock': 'Stock bas',
    Restock: 'Réapprovisionner', Adjust: 'Ajuster', 'On hand': 'En stock',
    Upload: 'Téléverser', Language: 'Langue', Team: 'Équipe', Clinic: 'Cabinet',
    'Expected cash': 'Espèces attendues', 'Counted cash': 'Espèces comptées',
    'Confirm closeout': 'Confirmer la clôture', Reopen: 'Rouvrir', Notes: 'Notes',
    Diagnosis: 'Diagnostic', 'Clinical notes': 'Notes cliniques',
    'Complete visit': 'Terminer la visite', 'Start treatment': 'Commencer le soin',
    Reschedule: 'Reporter', Reason: 'Motif', Phone: 'Téléphone',
    'Date of birth': 'Date de naissance', 'First name': 'Prénom', 'Last name': 'Nom',
  },
  ar: {
    Home: 'الرئيسية', Calendar: 'التقويم', Patients: 'المرضى', Invoices: 'الفواتير',
    Documents: 'المستندات', Inventory: 'المخزون', 'Day closeout': 'إغلاق اليوم',
    Settings: 'الإعدادات', Clinical: 'سريري', Operations: 'العمليات',
    'Sign in': 'تسجيل الدخول', 'Sign out': 'تسجيل الخروج', 'Sign up': 'إنشاء حساب',
    Email: 'البريد الإلكتروني', Password: 'كلمة المرور', Search: 'بحث',
    'Add patient': 'إضافة مريض', 'New appointment': 'موعد جديد',
    'Book visit': 'حجز زيارة', Overview: 'نظرة عامة', 'Dental chart': 'مخطط الأسنان',
    'Treatment plan': 'خطة العلاج', Visits: 'الزيارات', Balance: 'الرصيد',
    'Record payment': 'تسجيل دفعة', 'Check in': 'تسجيل الوصول',
    Cancel: 'إلغاء', Save: 'حفظ', Edit: 'تعديل', Delete: 'حذف',
    Active: 'نشط', Overdue: 'متأخر', 'Recall due': 'موعد مراجعة',
    Today: 'اليوم', Day: 'يوم', Week: 'أسبوع', Month: 'شهر',
    Status: 'الحالة', Patient: 'مريض', Provider: 'الطبيب', Fee: 'الرسوم',
    Procedure: 'الإجراء', Tooth: 'سن', Quantity: 'الكمية', Total: 'المجموع',
    Draft: 'مسودة', Unpaid: 'غير مدفوعة', 'Partially paid': 'مدفوعة جزئيا',
    Paid: 'مدفوعة', Void: 'ملغاة', Finalize: 'إنهاء',
    'Outstanding balance': 'رصيد مستحق', 'Low stock': 'مخزون منخفض',
    Restock: 'إعادة تزويد', Adjust: 'تعديل', 'On hand': 'متوفر',
    Upload: 'رفع', Language: 'اللغة', Team: 'الفريق', Clinic: 'العيادة',
    'Expected cash': 'النقد المتوقع', 'Counted cash': 'النقد المعدود',
    'Confirm closeout': 'تأكيد الإغلاق', Reopen: 'إعادة فتح', Notes: 'ملاحظات',
    Diagnosis: 'التشخيص', 'Clinical notes': 'ملاحظات سريرية',
    'Complete visit': 'إنهاء الزيارة', 'Start treatment': 'بدء العلاج',
    Reschedule: 'إعادة جدولة', Reason: 'السبب', Phone: 'الهاتف',
    'Date of birth': 'تاريخ الميلاد', 'First name': 'الاسم', 'Last name': 'اللقب',
  },
};

const LangContext = createContext({ lang: 'en', t: (k) => k, setLang: () => {} });

export const LangProvider = ({ children }) => {
  const [lang, setLangState] = useState(localStorage.getItem('dc-lang') || 'en');
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  const setLang = (l) => { localStorage.setItem('dc-lang', l); setLangState(l); };
  const t = (k) => (DICT[lang] && DICT[lang][k]) || k;
  return <LangContext.Provider value={{ lang, t, setLang }}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);
