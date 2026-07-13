// Repositories + services per feature (UI → repo → SQLite bridge),
// mirroring the Flutter app's feature set and lifecycle rules from the PRD.
import { all, get, run, insert, update, softDelete, nowIso, emitDataChanged } from './dbx.js';

const LIVE = 'deleted_at IS NULL';
const dayRange = (date) => {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return [start.toISOString(), end.toISOString()];
};

// ---------------------------------------------------------------- clinic/users
export const clinicRepo = {
  current: () => get(`SELECT * FROM clinics WHERE ${LIVE} LIMIT 1`),
  create: (fields) => insert('clinics', fields),
  update: async (id, patch) => { await update('clinics', id, patch); emitDataChanged(); },
};

export const userRepo = {
  byAuthId: (authUserId) => get(`SELECT * FROM users WHERE auth_user_id=? AND ${LIVE}`, [authUserId]),
  byId: (id) => get(`SELECT * FROM users WHERE id=?`, [id]),
  list: () => all(`SELECT u.*, (SELECT r.name FROM user_roles ur JOIN roles r ON r.id=ur.role_id
                   WHERE ur.user_id=u.id AND ur.deleted_at IS NULL LIMIT 1) AS role_name
                   FROM users u WHERE u.${LIVE} ORDER BY u.created_at`),
  create: (fields) => insert('users', fields),
  update: async (id, patch) => { await update('users', id, patch); emitDataChanged(); },
  ensureRoles: async (clinicId) => {
    for (const name of ['Dentist', 'Assistant', 'Nurse']) {
      const existing = await get(`SELECT id FROM roles WHERE clinic_id=? AND name=?`, [clinicId, name]);
      if (!existing) await insert('roles', { clinic_id: clinicId, name });
    }
  },
  roleByName: (clinicId, name) => get(`SELECT * FROM roles WHERE clinic_id=? AND name=?`, [clinicId, name]),
  assignRole: (userId, roleId) => insert('user_roles', { user_id: userId, role_id: roleId }),
};

// ---------------------------------------------------------------- patients
export const patientRepo = {
  list: () => all(`SELECT * FROM patients WHERE ${LIVE} ORDER BY last_name, first_name`),
  byId: (id) => get(`SELECT * FROM patients WHERE id=?`, [id]),
  create: async (fields) => { const r = await insert('patients', fields); emitDataChanged(); return r; },
  update: async (id, patch) => { await update('patients', id, patch); emitDataChanged(); },
  remove: async (id) => { await softDelete('patients', id); emitDataChanged(); },
  outstanding: () => all(`
    SELECT p.*, COALESCE(SUM(i.total_amount),0) - COALESCE((
      SELECT SUM(pay.amount) FROM payments pay
      JOIN invoices i2 ON i2.id = pay.invoice_id
      WHERE i2.patient_id = p.id AND i2.status != 'void' AND i2.deleted_at IS NULL AND pay.deleted_at IS NULL
    ),0) AS balance
    FROM patients p
    LEFT JOIN invoices i ON i.patient_id = p.id AND i.status != 'void' AND i.deleted_at IS NULL
    WHERE p.${LIVE}
    GROUP BY p.id HAVING balance > 0.001 ORDER BY balance DESC`),
  balanceOf: async (patientId) => {
    const r = await get(`
      SELECT COALESCE((SELECT SUM(total_amount) FROM invoices
              WHERE patient_id=? AND status != 'void' AND ${LIVE}),0) -
             COALESCE((SELECT SUM(pay.amount) FROM payments pay
              JOIN invoices i ON i.id=pay.invoice_id
              WHERE i.patient_id=? AND i.status != 'void' AND i.deleted_at IS NULL AND pay.deleted_at IS NULL),0)
             AS balance`, [patientId, patientId]);
    return r ? r.balance : 0;
  },
};

// ---------------------------------------------------------------- appointments
export const appointmentRepo = {
  forDay: (date) => {
    const [s, e] = dayRange(date);
    return all(`SELECT a.*, p.first_name, p.last_name FROM appointments a
                JOIN patients p ON p.id=a.patient_id
                WHERE a.start_time >= ? AND a.start_time < ? AND a.${LIVE}
                ORDER BY a.start_time`, [s, e]);
  },
  forRange: (startIso, endIso) => all(
    `SELECT a.*, p.first_name, p.last_name FROM appointments a
     JOIN patients p ON p.id=a.patient_id
     WHERE a.start_time >= ? AND a.start_time < ? AND a.${LIVE}
     ORDER BY a.start_time`, [startIso, endIso]),
  forPatient: (patientId) => all(
    `SELECT * FROM appointments WHERE patient_id=? AND ${LIVE} ORDER BY start_time DESC`, [patientId]),
  // Appointments occupying [startIso, endIso) for a provider (slot conflicts).
  overlapping: (assignedUserId, startIso, endIso, excludeId) => all(
    `SELECT a.*, p.first_name, p.last_name FROM appointments a
     JOIN patients p ON p.id=a.patient_id
     WHERE a.assigned_user_id=? AND a.${LIVE}
       AND a.status IN ('scheduled','checked_in')
       AND a.start_time < ? AND a.end_time > ?
       AND a.id != ?
     ORDER BY a.start_time`,
    [assignedUserId, endIso, startIso, excludeId || '']),
  create: async (fields) => {
    const r = await insert('appointments', { status: 'scheduled', ...fields });
    emitDataChanged(); return r;
  },
  update: async (id, patch) => { await update('appointments', id, patch); emitDataChanged(); },
  cancel: async (id, reason, notes, actorUserId, replacement) => {
    let rescheduledTo = null;
    if (reason === 'rescheduled' && replacement) {
      const rep = await insert('appointments', { status: 'scheduled', ...replacement });
      rescheduledTo = rep.id;
    }
    await update('appointments', id, {
      status: reason === 'no_show' ? 'no_show' : reason === 'rescheduled' ? 'rescheduled' : 'cancelled',
      rescheduled_to_appointment_id: rescheduledTo,
    });
    await insert('appointment_cancellations', { appointment_id: id, actor_user_id: actorUserId, reason, notes: notes || null });
    emitDataChanged();
  },
  checkIn: async (appt, actorUserId) => {
    await update('appointments', appt.id, { status: 'checked_in' });
    const visit = await insert('visits', {
      appointment_id: appt.id, patient_id: appt.patient_id,
      dentist_id: appt.assigned_user_id || actorUserId,
      status: 'checked_in', started_at: nowIso(),
    });
    emitDataChanged();
    return visit;
  },
  linkPlanned: (appointmentId, plannedTreatmentId) =>
    insert('appointment_planned_treatments', { appointment_id: appointmentId, planned_treatment_id: plannedTreatmentId }),
};

// ---------------------------------------------------------------- visits
export const visitRepo = {
  byId: (id) => get(`SELECT * FROM visits WHERE id=?`, [id]),
  byAppointment: (appointmentId) => get(`SELECT * FROM visits WHERE appointment_id=? AND ${LIVE}`, [appointmentId]),
  forPatient: (patientId) => all(
    `SELECT * FROM visits WHERE patient_id=? AND ${LIVE} ORDER BY started_at DESC`, [patientId]),
  openToday: (date) => {
    const [s, e] = dayRange(date);
    return all(`SELECT v.*, p.first_name, p.last_name FROM visits v
                JOIN patients p ON p.id=v.patient_id
                WHERE v.started_at >= ? AND v.started_at < ? AND v.${LIVE}
                ORDER BY v.started_at`, [s, e]);
  },
  start: async (id) => { await update('visits', id, { status: 'in_progress', in_progress_at: nowIso() }); emitDataChanged(); },
  saveNotes: async (id, diagnosis, clinicalNotes) => {
    await update('visits', id, { diagnosis, clinical_notes: clinicalNotes }); emitDataChanged();
  },
  unlock: async (id) => { await update('visits', id, { status: 'in_progress', ended_at: null }); emitDataChanged(); },
  treatments: (visitId) => all(
    `SELECT * FROM performed_treatments WHERE visit_id=? AND ${LIVE} ORDER BY created_at`, [visitId]),
  addTreatment: async (fields) => { const r = await insert('performed_treatments', fields); emitDataChanged(); return r; },
  removeTreatment: async (id) => { await softDelete('performed_treatments', id); emitDataChanged(); },
  // Complete visit: lock treatments, mark appointment completed, auto-generate draft invoice.
  complete: async (visit, actorUserId) => {
    await update('visits', visit.id, { status: 'completed', ended_at: nowIso() });
    await update('appointments', visit.appointment_id, { status: 'completed' });
    const treatments = await visitRepo.treatments(visit.id);
    const total = treatments.reduce((s, t) => s + t.unit_price * t.quantity, 0);
    const invoice = await insert('invoices', {
      patient_id: visit.patient_id, visit_id: visit.id,
      total_amount: total, status: 'draft', created_by_user_id: actorUserId,
    });
    for (const t of treatments) {
      await insert('invoice_items', {
        invoice_id: invoice.id, description: t.procedure_name, tooth_number: t.tooth_number,
        quantity: t.quantity, unit_price: t.unit_price, total_price: t.unit_price * t.quantity,
        adjustment_type: null,
      });
    }
    emitDataChanged();
    return invoice;
  },
};

// ---------------------------------------------------------------- treatment plans
export const planRepo = {
  forPatient: (patientId) => all(
    `SELECT * FROM planned_treatments WHERE patient_id=? AND ${LIVE} ORDER BY sequence_number`, [patientId]),
  create: async (fields) => {
    const seq = await get(`SELECT COALESCE(MAX(sequence_number),0)+1 AS n FROM planned_treatments WHERE patient_id=?`, [fields.patient_id]);
    const r = await insert('planned_treatments', { status: 'planned', sequence_number: seq.n, ...fields });
    emitDataChanged(); return r;
  },
  update: async (id, patch) => { await update('planned_treatments', id, patch); emitDataChanged(); },
  cancel: async (id) => { await update('planned_treatments', id, { status: 'cancelled' }); emitDataChanged(); },
  markPerformed: async (planned, visit, actorUserId) => {
    await visitRepo.addTreatment({
      visit_id: visit.id, tooth_number: planned.tooth_number,
      procedure_name: planned.procedure_name, unit_price: planned.estimated_unit_price,
      quantity: 1, recorded_by_user_id: actorUserId,
    });
    await update('planned_treatments', planned.id, { status: 'done' });
    emitDataChanged();
  },
};

// ---------------------------------------------------------------- invoices
const deriveStatus = async (invoice) => {
  if (invoice.status === 'draft' || invoice.status === 'void') return invoice.status;
  const paid = await get(
    `SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE invoice_id=? AND ${LIVE}`, [invoice.id]);
  if (paid.s >= invoice.total_amount - 0.001) return 'paid';
  if (paid.s > 0) return 'partially_paid';
  return 'unpaid';
};

export const invoiceRepo = {
  list: () => all(`SELECT i.*, p.first_name, p.last_name,
    COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id=i.id AND deleted_at IS NULL),0) AS paid_amount
    FROM invoices i JOIN patients p ON p.id=i.patient_id
    WHERE i.${LIVE} ORDER BY i.created_at DESC`),
  byId: (id) => get(`SELECT * FROM invoices WHERE id=?`, [id]),
  byVisit: (visitId) => get(`SELECT * FROM invoices WHERE visit_id=? AND ${LIVE}`, [visitId]),
  forPatient: (patientId) => all(`SELECT i.*,
    COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id=i.id AND deleted_at IS NULL),0) AS paid_amount
    FROM invoices i WHERE i.patient_id=? AND i.${LIVE} ORDER BY i.created_at DESC`, [patientId]),
  items: (invoiceId) => all(`SELECT * FROM invoice_items WHERE invoice_id=? AND ${LIVE} ORDER BY created_at`, [invoiceId]),
  payments: (invoiceId) => all(`SELECT * FROM payments WHERE invoice_id=? AND ${LIVE} ORDER BY payment_date`, [invoiceId]),
  recomputeTotal: async (invoiceId) => {
    const t = await get(`SELECT COALESCE(SUM(total_price),0) AS s FROM invoice_items WHERE invoice_id=? AND ${LIVE}`, [invoiceId]);
    await update('invoices', invoiceId, { total_amount: t.s });
  },
  addAdjustment: async (invoiceId, type, description, amount) => {
    const signed = type === 'discount' ? -Math.abs(amount) : Math.abs(amount);
    await insert('invoice_items', {
      invoice_id: invoiceId, description, tooth_number: null,
      quantity: 1, unit_price: signed, total_price: signed, adjustment_type: type,
    });
    await invoiceRepo.recomputeTotal(invoiceId);
    emitDataChanged();
  },
  removeItem: async (invoiceId, itemId) => {
    await softDelete('invoice_items', itemId);
    await invoiceRepo.recomputeTotal(invoiceId);
    emitDataChanged();
  },
  finalize: async (invoiceId) => {
    const inv = await invoiceRepo.byId(invoiceId);
    await update('invoices', invoiceId, { status: inv.total_amount <= 0.001 ? 'paid' : 'unpaid' });
    emitDataChanged();
  },
  recordPayment: async (invoiceId, amount, method, notes, actorUserId) => {
    await insert('payments', {
      invoice_id: invoiceId, amount, method: method || 'cash',
      payment_date: nowIso(), notes: notes || null, recorded_by_user_id: actorUserId,
    });
    const inv = await invoiceRepo.byId(invoiceId);
    await update('invoices', invoiceId, { status: await deriveStatus(inv) });
    emitDataChanged();
  },
  void: async (invoiceId, reason, actorUserId) => {
    await update('invoices', invoiceId, { status: 'void' });
    await insert('invoice_voids', { invoice_id: invoiceId, actor_user_id: actorUserId, reason });
    emitDataChanged();
  },
};

// ---------------------------------------------------------------- inventory
export const inventoryRepo = {
  list: () => all(`SELECT * FROM inventory_items WHERE ${LIVE} ORDER BY name`),
  lowStock: () => all(`SELECT * FROM inventory_items WHERE on_hand_quantity <= low_stock_threshold AND ${LIVE} ORDER BY on_hand_quantity*1.0/MAX(low_stock_threshold,1)`),
  create: async (fields) => { const r = await insert('inventory_items', fields); emitDataChanged(); return r; },
  update: async (id, patch) => { await update('inventory_items', id, patch); emitDataChanged(); },
  remove: async (id) => { await softDelete('inventory_items', id); emitDataChanged(); },
  restock: async (item, quantityAdded, supplier, notes, actorUserId) => {
    await insert('restock_events', {
      inventory_item_id: item.id, quantity_added: quantityAdded,
      restock_date: nowIso(), supplier: supplier || null, notes: notes || null,
      actor_user_id: actorUserId,
    });
    await update('inventory_items', item.id, { on_hand_quantity: item.on_hand_quantity + quantityAdded });
    emitDataChanged();
  },
  adjust: async (item, newQuantity, reason, actorUserId) => {
    await insert('stock_adjustments', {
      inventory_item_id: item.id, old_quantity: item.on_hand_quantity,
      new_quantity: newQuantity, delta: newQuantity - item.on_hand_quantity,
      reason, actor_user_id: actorUserId,
    });
    await update('inventory_items', item.id, { on_hand_quantity: newQuantity });
    emitDataChanged();
  },
};

// ---------------------------------------------------------------- attachments
export const attachmentRepo = {
  list: () => all(`SELECT a.*,
      CASE WHEN a.target_type='patient' THEN (SELECT first_name || ' ' || last_name FROM patients WHERE id=a.target_id)
           ELSE (SELECT first_name || ' ' || last_name FROM patients WHERE id=(SELECT patient_id FROM visits WHERE id=a.target_id)) END AS patient_name
    FROM attachments a WHERE a.${LIVE} ORDER BY a.created_at DESC`),
  forTarget: (type, id) => all(`SELECT * FROM attachments WHERE target_type=? AND target_id=? AND ${LIVE} ORDER BY created_at DESC`, [type, id]),
  forPatient: (patientId) => all(
    `SELECT * FROM attachments WHERE ${LIVE} AND (
       (target_type='patient' AND target_id=?) OR
       (target_type='visit' AND target_id IN (SELECT id FROM visits WHERE patient_id=?)))
     ORDER BY created_at DESC`, [patientId, patientId]),
  create: async (fields) => { const r = await insert('attachments', fields); emitDataChanged(); return r; },
  remove: async (id) => { await softDelete('attachments', id); emitDataChanged(); },
};

// ---------------------------------------------------------------- day closeout
export const closeoutRepo = {
  expectedCash: async (date) => {
    const [s, e] = dayRange(date);
    const r = await get(`SELECT COALESCE(SUM(amount),0) AS s FROM payments
      WHERE method='cash' AND payment_date >= ? AND payment_date < ? AND ${LIVE}`, [s, e]);
    return r.s;
  },
  forDate: (date) => {
    const [s] = dayRange(date);
    return get(`SELECT * FROM day_closeouts WHERE closeout_date=? AND ${LIVE}`, [s]);
  },
  list: () => all(`SELECT * FROM day_closeouts WHERE ${LIVE} ORDER BY closeout_date DESC LIMIT 30`),
  confirm: async (date, expected, counted, notes, actorUserId) => {
    const [s] = dayRange(date);
    const r = await insert('day_closeouts', {
      closeout_date: s, expected_cash: expected, counted_cash: counted,
      delta: counted - expected, notes: notes || null, actor_user_id: actorUserId, reopened_at: null,
    });
    emitDataChanged(); return r;
  },
  reopen: async (id) => { await update('day_closeouts', id, { reopened_at: nowIso() }); emitDataChanged(); },
};

// ---------------------------------------------------------------- dashboard stats
export const statsRepo = {
  today: async () => {
    const [s, e] = dayRange(new Date());
    const appts = await get(`SELECT COUNT(*) AS n FROM appointments WHERE start_time>=? AND start_time<? AND status NOT IN ('cancelled','rescheduled') AND ${LIVE}`, [s, e]);
    const done = await get(`SELECT COUNT(*) AS n FROM appointments WHERE start_time>=? AND start_time<? AND status='completed' AND ${LIVE}`, [s, e]);
    const cash = await get(`SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE payment_date>=? AND payment_date<? AND ${LIVE}`, [s, e]);
    const low = await get(`SELECT COUNT(*) AS n FROM inventory_items WHERE on_hand_quantity <= low_stock_threshold AND ${LIVE}`);
    const owed = await get(`
      SELECT COALESCE((SELECT SUM(total_amount) FROM invoices WHERE status IN ('unpaid','partially_paid') AND ${LIVE}),0) -
             COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices i ON i.id=p.invoice_id
                       WHERE i.status IN ('unpaid','partially_paid') AND i.deleted_at IS NULL AND p.deleted_at IS NULL),0) AS s`);
    const patients = await get(`SELECT COUNT(*) AS n FROM patients WHERE ${LIVE}`);
    return { appts: appts.n, done: done.n, cash: cash.s, low: low.n, owed: owed.s, patients: patients.n };
  },
};
