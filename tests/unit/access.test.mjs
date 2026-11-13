// Sign-in access decisions (src/lib/access.js): who may open the clinic
// stored on this computer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideAccess } from '../../src/lib/access.js';

const clinic = { id: 'c1', name: 'Cabinet Tunis' };
const me = { id: 'u1', clinic_id: 'c1' };
const online = (membership, extra = {}) => ({ online: true, membership, ...extra });

test('an account already known on this computer opens, even offline', () => {
  assert.deepEqual(decideAccess({ localClinic: clinic, localUser: me, remote: { online: false } }), { action: 'open' });
  assert.deepEqual(decideAccess({ localClinic: clinic, localUser: me }), { action: 'open' });
});

test('fresh computer + member in the cloud → download the clinic', () => {
  assert.equal(decideAccess({ localClinic: null, localUser: null, remote: online(me) }).action, 'pull');
});

test('fresh computer + account with no clinic anywhere → new clinic', () => {
  assert.equal(decideAccess({ localClinic: null, localUser: null, remote: online(null) }).action, 'provision');
  assert.equal(decideAccess({ localClinic: null, localUser: null, remote: online(null, { schemaMissing: true }) }).action, 'provision');
});

test('fresh computer offline → refused with an internet message', () => {
  const d = decideAccess({ localClinic: null, localUser: null, remote: { online: false } });
  assert.equal(d.action, 'refuse');
  assert.match(d.message, /internet/);
});

test('staff member of this clinic, first time on this computer → download', () => {
  assert.equal(decideAccess({ localClinic: clinic, localUser: null, remote: online({ clinic_id: 'c1' }) }).action, 'pull');
});

test('an outsider signing in on a clinic computer is refused (was: silently added as staff)', () => {
  const d = decideAccess({ localClinic: clinic, localUser: null, remote: online(null) });
  assert.equal(d.action, 'refuse');
  assert.match(d.message, /not a member of Cabinet Tunis/);
});

test("a member of a different clinic is refused on this clinic's computer", () => {
  const d = decideAccess({ localClinic: clinic, localUser: null, remote: online({ clinic_id: 'other' }) });
  assert.equal(d.action, 'refuse');
});

test('unknown account on a clinic computer while offline → refused, cannot verify', () => {
  const d = decideAccess({ localClinic: clinic, localUser: null, remote: { online: false } });
  assert.equal(d.action, 'refuse');
  assert.match(d.message, /verified as a member of Cabinet Tunis/);
});

test('unknown account on a clinic computer before cloud setup → refused with setup hint', () => {
  const d = decideAccess({ localClinic: clinic, localUser: null, remote: online(null, { schemaMissing: true }) });
  assert.equal(d.action, 'refuse');
  assert.match(d.message, /Settings → Data & sync/);
});
