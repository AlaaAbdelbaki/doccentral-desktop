// Demo dataset (Settings → "Load demo data") — same domain data used in the
// design prototype: Tunisian solo-dentist clinic, TND, CNAM/self-pay context.
import { get } from './dbx.js';
import {
  patientRepo, appointmentRepo, visitRepo, planRepo, invoiceRepo, inventoryRepo,
} from './repos.js';

const at = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };

export async function seedDemoData(userId) {
  const existing = await get(`SELECT COUNT(*) AS n FROM patients WHERE deleted_at IS NULL`);
  if (existing.n > 0) return false;

  const P = async (first, last, dob, phone, email, notes) =>
    patientRepo.create({ first_name: first, last_name: last, date_of_birth: dob, phone, email, history_notes: notes });

  const amira = await P('Amira', 'Ben Salah', '1979-03-14', '+216 22 314 508', null, 'Penicillin allergy. Hypertension (controlled). Paper file #124 backfilled.');
  const mohamed = await P('Mohamed', 'Trabelsi', '1964-07-02', '+216 98 771 042', null, 'Anticoagulant (Sintrom). Balance overdue since Feb.');
  const yasmine = await P('Yasmine', 'Gharbi', '1992-01-25', '+216 55 208 664', 'yasmine.gharbi@gmail.com', null);
  const hedi = await P('Hedi', 'Mzali', '1975-11-08', '+216 20 456 913', null, 'Diabetic (Type 2).');
  const lina = await P('Lina', 'Chaabane', '2012-05-19', '+216 23 640 195', null, 'Minor — guardian consent on file.');
  const meriem = await P('Meriem', 'Haddad', '1968-09-30', '+216 97 502 481', null, 'Latex sensitivity.');
  const youssef = await P('Youssef', 'Belhadj', '2004-02-11', '+216 54 887 210', null, null);
  const nadia = await P('Nadia', 'Karoui', '1982-06-23', '+216 58 461 902', null, 'Recall due — last cleaning Oct 2025.');

  // Inventory (PRD examples: cotton rolls, gloves, anesthetic…)
  const inv = async (name, category, unit, qty, threshold) =>
    inventoryRepo.create({ name, category, unit, on_hand_quantity: qty, low_stock_threshold: threshold });
  await inv('Cotton rolls', 'Consumables', 'pack', 2, 5);
  await inv('Nitrile gloves — M', 'Protection', 'box', 1, 3);
  await inv('Articaine 4% w/ epi', 'Anesthetic', 'carpule', 12, 20);
  await inv('Composite A2', 'Restorative', 'compule', 9, 6);
  await inv('Saliva ejectors', 'Consumables', 'pcs', 180, 50);
  await inv('Sterilization pouches', 'Hygiene', 'box', 7, 4);

  // Treatment plan for Amira — the PRD's three-session root canal example
  await planRepo.create({ patient_id: amira.id, procedure_name: 'Root canal — session 1 of 3', tooth_number: '30', estimated_unit_price: 120 });
  await planRepo.create({ patient_id: amira.id, procedure_name: 'Root canal — session 2 of 3', tooth_number: '30', estimated_unit_price: 120 });
  await planRepo.create({ patient_id: amira.id, procedure_name: 'Root canal — session 3 of 3 + obturation', tooth_number: '30', estimated_unit_price: 140 });
  await planRepo.create({ patient_id: yasmine.id, procedure_name: 'Scaling & polishing', tooth_number: 'FM', estimated_unit_price: 80 });

  // Today's appointments
  const appt = (p, sh, sm, eh, em, reason, status = 'scheduled') =>
    appointmentRepo.create({ patient_id: p.id, assigned_user_id: userId, start_time: at(sh, sm), end_time: at(eh, em), reason, status });
  await appt(amira, 9, 0, 10, 0, 'Root canal #30 — session 1');
  const a2 = await appt(mohamed, 10, 30, 11, 0, 'Emergency — chipped #8');
  await appt(yasmine, 11, 30, 12, 15, 'Scaling & polishing');
  await appt(hedi, 14, 0, 15, 0, 'Composite filling #14');
  await appt(lina, 15, 30, 16, 0, 'Recall exam');
  await appt(meriem, 16, 30, 17, 0, 'Crown try-in #19');

  // A completed visit + invoice with partial payment for Mohamed (yesterday)
  const yest = new Date(); yest.setDate(yest.getDate() - 1); yest.setHours(9, 0, 0, 0);
  const yEnd = new Date(yest); yEnd.setHours(10, 0, 0, 0);
  const pastAppt = await appointmentRepo.create({
    patient_id: mohamed.id, assigned_user_id: userId,
    start_time: yest.toISOString(), end_time: yEnd.toISOString(),
    reason: 'Extraction #19', status: 'completed',
  });
  const visit = await appointmentRepo.checkIn(pastAppt, userId);
  await visitRepo.start(visit.id);
  await visitRepo.saveNotes(visit.id, 'Irreversible pulpitis #19', 'Extraction under local anesthesia, no complications.');
  await visitRepo.addTreatment({ visit_id: visit.id, tooth_number: '19', procedure_name: 'Extraction', unit_price: 90, quantity: 1, recorded_by_user_id: userId });
  await visitRepo.addTreatment({ visit_id: visit.id, tooth_number: '19', procedure_name: 'Anesthesia + dressing', unit_price: 30, quantity: 1, recorded_by_user_id: userId });
  const invoice = await visitRepo.complete({ ...visit }, userId);
  await invoiceRepo.finalize(invoice.id);
  await invoiceRepo.recordPayment(invoice.id, 50, 'cash', 'Partial payment — rest next visit', userId);

  // Check in Mohamed's emergency (today) so the waiting room isn't empty
  await appointmentRepo.checkIn(a2, userId);
  return true;
}
