// Mock data for the DocCentral Patients page.
// Domain data follows the DocCentral PRD (_bmad-output/planning-artifacts):
// solo-dentist practice in Tunisia, TND currency, dentist + combined-role assistant.
export const DC_DATA = {
  user: { name: 'Dr. Karim Ben Ammar', role: 'Dentist · Clinic owner', initials: 'KB' },
  clinic: { name: 'Cabinet Dentaire — Tunis', date: 'Monday, July 13, 2026' },

  // Full patient roster
  patients: [
    { id: '00124', name: 'Amira Ben Salah', age: 47, sex: 'F', phone: '+216 22 314 508', last: 'Nov 12, 2025', next: 'Today 1:30 PM', provider: 'Dr. Ben Ammar', ins: 'CNAM', balance: 240, status: 'active', alerts: ['Penicillin allergy', 'Hypertension'], color: 'blue' },
    { id: '00097', name: 'Mohamed Trabelsi', age: 62, sex: 'M', phone: '+216 98 771 042', last: 'Feb 03, 2026', next: 'Today 12:00 PM', provider: 'Dr. Ben Ammar', ins: 'CNAM', balance: 1840, status: 'overdue', alerts: ['Balance overdue 92d', 'Anticoagulant (Sintrom)'], color: 'coral' },
    { id: '00215', name: 'Yasmine Gharbi', age: 34, sex: 'F', phone: '+216 55 208 664', last: 'Apr 22, 2026', next: 'Today 1:00 PM', provider: 'Dr. Ben Ammar', ins: 'Self-pay', balance: 0, status: 'active', alerts: [], color: 'plum' },
    { id: '00188', name: 'Hedi Mzali', age: 51, sex: 'M', phone: '+216 20 456 913', last: 'Jan 19, 2026', next: 'Today 11:00 AM', provider: 'Dr. Ben Ammar', ins: 'CNAM', balance: 320, status: 'active', alerts: ['Diabetic (Type 2)'], color: 'mint' },
    { id: '00241', name: 'Aymen Jelassi', age: 29, sex: 'M', phone: '+216 52 118 377', last: 'Today', next: 'Jan 2027', provider: 'Dr. Ben Ammar', ins: 'Self-pay', balance: 0, status: 'active', alerts: [], color: 'amber' },
    { id: '00252', name: 'Lina Chaabane', age: 14, sex: 'F', phone: '+216 23 640 195', last: 'Today', next: 'Jan 2027', provider: 'Dr. Ben Ammar', ins: 'CNAM', balance: 60, status: 'active', alerts: ['Minor — guardian consent'], color: 'blue' },
    { id: '00063', name: 'Meriem Haddad', age: 58, sex: 'F', phone: '+216 97 502 481', last: 'Mar 30, 2026', next: 'Jul 15, 2026', provider: 'Dr. Ben Ammar', ins: 'CNAM', balance: 0, status: 'active', alerts: ['Latex sensitivity'], color: 'mint' },
    { id: '00230', name: 'Youssef Belhadj', age: 22, sex: 'M', phone: '+216 54 887 210', last: 'Today', next: 'Aug 01, 2026', provider: 'Dr. Ben Ammar', ins: 'Self-pay', balance: 480, status: 'active', alerts: [], color: 'plum' },
    { id: '00041', name: 'Sonia Mansouri', age: 41, sex: 'F', phone: '+216 21 339 754', last: 'Today', next: '—', provider: 'Dr. Ben Ammar', ins: 'CNAM', balance: 0, status: 'active', alerts: [], color: 'coral' },
    { id: '00209', name: 'Kamel Ayari', age: 55, sex: 'M', phone: '+216 99 214 630', last: 'Dec 08, 2025', next: 'Today 1:15 PM', provider: 'Dr. Ben Ammar', ins: 'CNAM', balance: 0, status: 'active', alerts: [], color: 'amber' },
    { id: '00135', name: 'Rania Bouazizi', age: 37, sex: 'F', phone: '+216 26 903 118', last: 'Today', next: 'Jan 2027', provider: 'Dr. Ben Ammar', ins: 'Self-pay', balance: 0, status: 'active', alerts: [], color: 'blue' },
    { id: '00172', name: 'Nadia Karoui', age: 44, sex: 'F', phone: '+216 58 461 902', last: 'Oct 15, 2025', next: 'Today 10:45 AM', provider: 'Dr. Ben Ammar', ins: 'CNAM', balance: 95, status: 'recall', alerts: [], color: 'mint' },
  ],
};
