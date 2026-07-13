// Auth: Supabase email+password with persistent session (works offline from
// the cached session), first-run clinic provisioning, staff user creation.
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, makeEphemeralClient } from './supabase.js';
import { clinicRepo, userRepo } from './repos.js';
import { seedDemoData } from './seed.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

async function provisionClinic({ clinicName, firstName, lastName, email, authUserId }) {
  const clinic = await clinicRepo.create({
    name: clinicName, locale: 'fr-TN', currency: 'TND',
    address: null, phone: null, email: null, invoice_footer: null, logo_path: null,
  });
  await userRepo.ensureRoles(clinic.id);
  const user = await userRepo.create({
    clinic_id: clinic.id, first_name: firstName, last_name: lastName,
    email, auth_user_id: authUserId, is_clinic_owner: 1,
  });
  const dentist = await userRepo.roleByName(clinic.id, 'Dentist');
  if (dentist) await userRepo.assignRole(user.id, dentist.id);
  return { clinic, user };
}

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [localUser, setLocalUser] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [notice, setNotice] = useState(null);

  // Make sure an authenticated session always has local clinic + user rows.
  // Covers signing in on a fresh device with an account created elsewhere
  // (e.g. the Flutter app) — without this the app would silently stay on
  // the sign-in screen after a successful sign-in.
  const loadLocal = (sess) => {
    // Serialize: signIn and onAuthStateChange can both land here at once,
    // and concurrent runs could each provision a clinic.
    loadLocal._lock = (loadLocal._lock || Promise.resolve())
      .then(() => doLoadLocal(sess), () => doLoadLocal(sess));
    return loadLocal._lock;
  };

  const doLoadLocal = async (sess) => {
    let c = await clinicRepo.current();
    let u = sess?.user ? await userRepo.byAuthId(sess.user.id) : null;
    if (sess?.user && !c) {
      const guess = (sess.user.email || 'user').split('@')[0];
      ({ clinic: c, user: u } = await provisionClinic({
        clinicName: 'My Clinic', firstName: guess, lastName: '',
        email: sess.user.email || '', authUserId: sess.user.id,
      }));
    } else if (sess?.user && c && !u) {
      const guess = (sess.user.email || 'user').split('@')[0];
      u = await userRepo.create({
        clinic_id: c.id, first_name: guess, last_name: '',
        email: sess.user.email || '', auth_user_id: sess.user.id, is_clinic_owner: 0,
      });
    }
    setClinic(c);
    setLocalUser(sess?.user ? u : null);
    return { clinic: c, user: sess?.user ? u : null };
  };

  useEffect(() => {
    (async () => {
      const info = await window.dc.app.info();
      if (info.devAutologin) {
        // Dev/self-check mode: bypass Supabase entirely.
        let c = await clinicRepo.current();
        let u = null;
        if (!c) {
          ({ clinic: c, user: u } = await provisionClinic({
            clinicName: 'Cabinet Dentaire — Tunis', firstName: 'Karim', lastName: 'Ben Ammar',
            email: 'dev@doccentral.local', authUserId: 'dev-auth-user',
          }));
          await seedDemoData(u.id);
        } else {
          u = await userRepo.byAuthId('dev-auth-user');
        }
        setClinic(c); setLocalUser(u);
        setSession({ user: { id: 'dev-auth-user', email: 'dev@doccentral.local' }, dev: true });
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadLocal(data.session);
      setLoading(false);
      supabase.auth.onAuthStateChange(async (_event, sess) => {
        setSession(sess);
        await loadLocal(sess);
      });
    })();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error('Sign-in did not return a session. If you just signed up, confirm your email first.');
    const { user } = await loadLocal(data.session);
    if (!user) throw new Error('Signed in, but the local clinic record could not be created.');
    setSession(data.session);
    return data.session;
  };

  const signUp = async ({ clinicName, firstName, lastName, email, password }) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    const authUserId = data.user?.id;
    if (!authUserId) throw new Error('Sign-up failed: no user returned');
    await provisionClinic({ clinicName, firstName, lastName, email, authUserId });
    if (!data.session) {
      setNotice('Account created. Confirm your email, then sign in.');
    }
    await loadLocal(data.session);
    setSession(data.session);
    return data.session;
  };

  const addStaff = async ({ firstName, lastName, email, password, roleName }) => {
    const c = await clinicRepo.current();
    if (!c) throw new Error('No clinic provisioned');
    let authUserId = crypto.randomUUID(); // offline fallback id
    try {
      const eph = makeEphemeralClient();
      const { data, error } = await eph.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user?.id) authUserId = data.user.id;
    } catch (e) {
      // Offline or duplicate — keep local record, auth can be linked later.
    }
    const user = await userRepo.create({
      clinic_id: c.id, first_name: firstName, last_name: lastName,
      email, auth_user_id: authUserId, is_clinic_owner: 0,
    });
    const role = await userRepo.roleByName(c.id, roleName || 'Assistant');
    if (role) await userRepo.assignRole(user.id, role.id);
    return user;
  };

  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setSession(null); setLocalUser(null);
  };

  const refreshClinic = async () => setClinic(await clinicRepo.current());
  const refreshUser = async () => {
    if (session?.user) setLocalUser(await userRepo.byAuthId(session.user.id));
  };

  return (
    <AuthContext.Provider value={{
      loading, session, localUser, clinic, notice, setNotice,
      signIn, signUp, signOut, addStaff, refreshClinic, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
