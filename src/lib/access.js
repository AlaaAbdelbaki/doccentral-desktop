// Who may open the clinic stored on this computer after signing in.
// Pure so every case is unit-tested (tests/unit/access.test.mjs).
//
//   localClinic: the clinic on this device, or null (fresh install)
//   localUser:   this account's user row on this device, or null
//   remote:      result of fetchMembership() — only consulted when localUser is null
//
// → { action: 'open' }       known here; works offline
//   { action: 'pull' }       member in the cloud; download the clinic first
//   { action: 'provision' }  account with no clinic anywhere; create one
//   { action: 'refuse', message }
export function decideAccess({ localClinic, localUser, remote }) {
  if (localUser) return { action: 'open' };
  const name = localClinic?.name;
  if (!remote || !remote.online) {
    return {
      action: 'refuse',
      message: localClinic
        ? `This account hasn't been used on this computer before. Connect to the internet so it can be verified as a member of ${name}.`
        : 'The first sign-in on this computer needs an internet connection to download your clinic.',
    };
  }
  const m = remote.membership;
  if (m && (!localClinic || m.clinic_id === localClinic.id)) return { action: 'pull' };
  if (!localClinic && !m) return { action: 'provision' };
  if (localClinic && remote.schemaMissing) {
    return {
      action: 'refuse',
      message: `New accounts can't be verified yet because cloud sync isn't set up. The owner of ${name} should finish the setup under Settings → Data & sync.`,
    };
  }
  return {
    action: 'refuse',
    message: localClinic
      ? `This account is not a member of ${name}. Ask the clinic owner to add you under Settings → Team & roles.`
      : 'This account belongs to another clinic.',
  };
}
