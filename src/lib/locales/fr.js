// French UI strings. Keys are the English text (missing keys fall back to English).
// Placeholders like {n} are filled by t(key, { n }).
// Checked by tests/unit/i18n.test.mjs: every t('…') key must exist here.
export default {
  // ---- navigation & shell
  Home: 'Accueil', Calendar: 'Calendrier', Patients: 'Patients', Invoices: 'Factures',
  Documents: 'Documents', Inventory: 'Inventaire', 'Day closeout': 'Clôture du jour',
  Settings: 'Paramètres', Clinical: 'Clinique', Operations: 'Opérations',
  'Loading DocCentral…': 'Chargement de DocCentral…',
  'Open sync settings': 'Ouvrir les paramètres de synchronisation',
  'Syncing…': 'Synchronisation…', Synced: 'Synchronisé', '{n} pending': '{n} en attente',
  Offline: 'Hors ligne', Local: 'Local', Search: 'Rechercher',

  // ---- shared
  'Something went wrong': 'Une erreur est survenue', Dismiss: 'Fermer', Reload: 'Recharger', 'Back to Home': "Retour à l'accueil",
  'This screen hit an unexpected error. Your saved data is safe. Reload the app, or send us a report so we can fix it.': "Cet écran a rencontré une erreur inattendue. Vos données enregistrées sont en sécurité. Rechargez l'application ou envoyez-nous un signalement pour que nous puissions corriger le problème.",
  'The app showed "Something went wrong".': "L'application a affiché « Une erreur est survenue ».",
  'Discard changes?': 'Abandonner les modifications ?', 'Keep editing': 'Continuer la saisie', Discard: 'Abandonner',
  'What you typed in this form will be lost.': 'Ce que vous avez saisi dans ce formulaire sera perdu.', 'Saving…': 'Enregistrement…',
  DT: 'DT', All: 'Tous', 'All →': 'Tout voir →', Cancel: 'Annuler', Save: 'Enregistrer', Saved: 'Enregistré',
  'Save changes': 'Enregistrer les modifications', Edit: 'Modifier', Delete: 'Supprimer', Close: 'Fermer',
  Add: 'Ajouter', Keep: 'Conserver', Record: 'Enregistrer', Switch: 'Choisir',
  Status: 'Statut', Notes: 'Notes', Reason: 'Motif', Date: 'Date', Start: 'Début', End: 'Fin',
  Name: 'Nom', Description: 'Description', Amount: 'Montant', Total: 'Total', Due: 'Reste dû',
  Time: 'Heure', optional: 'facultatif', Active: 'Actif', Enabled: 'Activé',

  // ---- statuses
  Scheduled: 'Planifié', 'Checked in': 'Arrivé', Completed: 'Terminé', Cancelled: 'Annulé',
  'No-show': 'Absent', Rescheduled: 'Reporté', 'In progress': 'En cours',
  Draft: 'Brouillon', Unpaid: 'Impayée', 'Partially paid': 'Partiellement payée', Paid: 'Payée', Void: 'Annulée',
  Planned: 'Prévu', Done: 'Réalisé', Monitor: 'À surveiller',

  // ---- roles
  Dentist: 'Dentiste', Assistant: 'Assistant(e)', Nurse: 'Infirmier(ère)', Staff: 'Personnel',
  'Dentist · Clinic owner': 'Dentiste · Titulaire du cabinet', 'Owner · Dentist': 'Titulaire · Dentiste',
  Role: 'Rôle',

  // ---- sign-in
  'Sign in': 'Se connecter', 'Sign out': 'Se déconnecter', 'Sign up': "S'inscrire",
  Email: 'E-mail', Password: 'Mot de passe', Clinic: 'Cabinet', 'Clinic management': 'Gestion de cabinet',
  'Create your clinic': 'Créez votre cabinet',
  'First run — this provisions the clinic and the owner (Dentist) account.':
    'Premier démarrage — crée le cabinet et le compte du titulaire (dentiste).',
  'Use your clinic account. Sessions persist across restarts.':
    'Utilisez le compte du cabinet. La session reste ouverte après un redémarrage.',
  'Cabinet Dentaire — Tunis': 'Cabinet Dentaire — Tunis',
  'Already provisioned?': 'Cabinet déjà créé ?', 'First run on this clinic?': 'Premier démarrage du cabinet ?',
  'Create the clinic': 'Créer le cabinet', 'First name': 'Prénom', 'Last name': 'Nom',
  "This account hasn't been used on this computer before. Connect to the internet so it can be verified as a member of {clinic}.":
    "Ce compte n'a jamais été utilisé sur cet ordinateur. Connectez-vous à Internet pour vérifier qu'il fait partie de {clinic}.",
  'The first sign-in on this computer needs an internet connection to download your clinic.':
    'La première connexion sur cet ordinateur nécessite Internet pour télécharger votre cabinet.',
  "New accounts can't be verified yet because cloud sync isn't set up. The owner of {clinic} should finish the setup under Settings → Data & sync.":
    "Les nouveaux comptes ne peuvent pas encore être vérifiés : la synchronisation n'est pas configurée. Le titulaire de {clinic} doit terminer la configuration dans Paramètres → Données et synchronisation.",
  'This account is not a member of {clinic}. Ask the clinic owner to add you under Settings → Team & roles.':
    "Ce compte ne fait pas partie de {clinic}. Demandez au titulaire de vous ajouter dans Paramètres → Équipe et rôles.",
  'This account belongs to another clinic.': 'Ce compte appartient à un autre cabinet.',
  'Could not download your clinic data. Check your connection and try again.':
    'Impossible de télécharger les données du cabinet. Vérifiez la connexion et réessayez.',
  'My Clinic': 'Mon cabinet',
  'Sign-in did not return a session. If you just signed up, confirm your email first.':
    "La connexion n'a pas abouti. Si vous venez de vous inscrire, confirmez d'abord votre e-mail.",
  'Signed in, but the local clinic record could not be created.':
    "Connecté, mais le cabinet n'a pas pu être créé sur cet ordinateur.",
  'This computer is already set up for {clinic}. Sign in instead, or ask the owner to add you.':
    'Cet ordinateur est déjà configuré pour {clinic}. Connectez-vous, ou demandez au titulaire de vous ajouter.',
  'Sign-up failed: no user returned.': "Échec de l'inscription : aucun utilisateur créé.",
  'Account created. Confirm your email, then sign in.': 'Compte créé. Confirmez votre e-mail, puis connectez-vous.',
  'No clinic is set up on this computer.': "Aucun cabinet n'est configuré sur cet ordinateur.",
  "{email} already has an account. Adding existing accounts isn't supported yet — use a different email.":
    "{email} a déjà un compte. L'ajout de comptes existants n'est pas encore possible — utilisez une autre adresse.",
  "Couldn't create the account ({error}). Adding staff needs an internet connection.":
    "Impossible de créer le compte ({error}). L'ajout de personnel nécessite Internet.",
  'Account creation returned no user — try again.': "La création du compte n'a renvoyé aucun utilisateur — réessayez.",

  // ---- home
  'Good morning': 'Bonjour', 'Good afternoon': 'Bon après-midi', 'Good evening': 'Bonsoir',
  '{greeting},': '{greeting},',
  'Dr. {name}': 'Dr {name}', 'New appointment': 'Nouveau rendez-vous', Appointments: 'Rendez-vous',
  '1 appointment': '1 rendez-vous', '{n} appointments': '{n} rendez-vous', '{n} completed': '{n} terminés',
  'active records': 'dossiers actifs', 'Cash today': "Espèces aujourd'hui", 'payments received': 'paiements reçus',
  Outstanding: 'Impayés', 'across all patients': 'tous patients confondus', 'Low stock': 'Stock bas',
  'items at / below threshold': 'articles au seuil ou en dessous', "Today's schedule": 'Planning du jour',
  'Waiting room': "Salle d'attente", '{n} in clinic': '{n} au cabinet', 'since {time}': 'depuis {time}',
  'In chair': 'Au fauteuil', 'No one waiting': 'Personne en attente',
  '{qty} {unit} left · threshold {threshold}': 'Reste {qty} {unit} · seuil {threshold}',
  'Stock levels are healthy': 'Les stocks sont suffisants', 'Outstanding balances': 'Soldes impayés',
  'Everyone is paid up': 'Tout est réglé',

  // ---- calendar
  Today: "Aujourd'hui", Day: 'Jour', Week: 'Semaine', Month: 'Mois', 'Week of {date}': 'Semaine du {date}',
  'Edit appointment': 'Modifier le rendez-vous', 'Book anyway': 'Réserver quand même',
  'Choose a patient…': 'Choisir un patient…',
  'No patients yet — add one from the Patients page first.': "Aucun patient — ajoutez-en un depuis la page Patients d'abord.",
  'End time must be after the start time.': "L'heure de fin doit être après l'heure de début.",
  'This slot is already booked:': 'Ce créneau est déjà réservé :',
  Patient: 'Patient', Provider: 'Praticien', 'Reason / planned treatment': 'Motif / soin prévu',
  'e.g. Root canal #30 — session 2': 'ex. Traitement de canal n°30 — séance 2',
  'Cancel — {name}': 'Annuler — {name}', 'Keep appointment': 'Garder le rendez-vous',
  'Confirm cancellation': "Confirmer l'annulation", 'Patient cancelled': 'Annulé par le patient',
  'Clinic cancelled': 'Annulé par le cabinet', 'New date': 'Nouvelle date',
  'The new slot is already booked:': 'Le nouveau créneau est déjà réservé :', 'Optional context…': 'Précisions (facultatif)…',
  'Cancel / reschedule': 'Annuler / reporter', 'Check in': 'Enregistrer l’arrivée', 'Open visit': 'Ouvrir la visite',
  When: 'Quand', Exam: 'Examen', Hygiene: 'Hygiène', Surgery: 'Chirurgie', Emergency: 'Urgence',

  // ---- visit
  'Visit — {name}': 'Visite — {name}', 'Start treatment': 'Commencer le soin', 'Complete visit': 'Terminer la visite',
  'Unlock visit': 'Déverrouiller la visite', 'Save & close': 'Enregistrer et fermer',
  'Checked in {time}': 'Arrivé {time}', 'completed {time}': 'terminée {time}', 'invoice: {status}': 'facture : {status}',
  Diagnosis: 'Diagnostic', 'Clinical notes': 'Notes cliniques', 'e.g. Irreversible pulpitis #30': 'ex. Pulpite irréversible n°30',
  'Dictated note…': 'Note dictée…', 'Performed treatments': 'Soins réalisés', 'Total {amount}': 'Total {amount}',
  Tooth: 'Dent', Procedure: 'Acte', Unit: 'Unité', Qty: 'Qté', 'No treatments recorded yet': 'Aucun soin enregistré',
  'Procedure (free text)': 'Acte (texte libre)', Price: 'Prix', 'From treatment plan': 'Depuis le plan de traitement',
  'est. {amount} · session {n}': 'est. {amount} · séance {n}', 'Mark performed': 'Marquer comme réalisé',

  // ---- patients
  'Add patient': 'Ajouter un patient', 'Edit patient': 'Modifier le patient', '{n} active records': '{n} dossiers actifs',
  'Search name or phone…': 'Rechercher un nom ou un téléphone…', 'With balance': 'Avec solde', 'No patients match': 'Aucun patient trouvé',
  'Balance due': 'Solde dû', 'Book visit': 'Planifier une visite', 'No patient selected': 'Aucun patient sélectionné',
  'Add your first patient to get started.': 'Ajoutez votre premier patient pour commencer.',
  Overview: 'Aperçu', 'Treatment plan': 'Plan de traitement', Visits: 'Visites', 'Dental chart': 'Schéma dentaire',
  'Date of birth': 'Date de naissance', Phone: 'Téléphone', 'Email (optional)': 'E-mail (facultatif)',
  'History notes (paper-file backfill)': 'Antécédents (reprise du dossier papier)',
  'Allergies, prior treatments, paper folder summary…': 'Allergies, soins antérieurs, résumé du dossier papier…',
  '{n} yrs': '{n} ans', 'Next appointment': 'Prochain rendez-vous', 'Last visit': 'Dernière visite', Balance: 'Solde',
  'Outstanding balance': 'Solde impayé', 'Paid in full': 'Entièrement réglé', 'History notes': 'Antécédents',
  'paper-file backfill': 'reprise du dossier papier', Attachments: 'Pièces jointes', Upload: 'Téléverser', 'No files yet': 'Aucun fichier',
  'Delete patient': 'Supprimer le patient', 'Delete (soft)': 'Supprimer (archiver)',
  'Remove {name} from the roster? The record is soft-deleted and kept in the database for history and sync.':
    "Retirer {name} de la liste ? Le dossier est archivé et conservé pour l'historique et la synchronisation.",
  'Add planned treatment — {name}': 'Ajouter un soin prévu — {name}', 'Add to plan': 'Ajouter au plan',
  'Procedure (required)': 'Acte (obligatoire)', 'e.g. Root canal — session 1 of 3': 'ex. Traitement de canal — séance 1 sur 3',
  'e.g. 30 or FM': 'ex. 30 ou FM', 'Estimated fee': 'Tarif estimé',
  'Target date (optional — leave empty for next available)': 'Date cible (facultatif — vide = prochaine disponibilité)',
  'est. {amount} remaining': 'est. {amount} restant', Target: 'Date cible', 'Est. fee': 'Tarif est.',
  'Next available': 'Prochaine disponibilité', 'No treatment plan yet': 'Pas encore de plan de traitement',
  'Plan multi-session treatments and schedule them as appointments.': 'Planifiez les soins en plusieurs séances et réservez-les en rendez-vous.',
  '{n} total': '{n} au total', Visit: 'Visite', 'Open to record treatments and notes': 'Ouvrir pour saisir les soins et les notes',
  'No visits yet': 'Aucune visite',
  'Check the patient in from the calendar to start a visit.': 'Enregistrez l’arrivée du patient depuis le calendrier pour démarrer une visite.',
  'Planned treatment': 'Soin prévu', 'Treated (restoration)': 'Soignée (restauration)', Crown: 'Couronne',
  'Missing / extracted': 'Absente / extraite', Sound: 'Saine', Treated: 'Soignée', Missing: 'Absente',
  'Upper arch · Maxillary (1–16)': 'Arcade supérieure · Maxillaire (1–16)',
  'Lower arch · Mandibular (17–32)': 'Arcade inférieure · Mandibulaire (17–32)',
  Condition: 'État', 'Select a tooth': 'Sélectionnez une dent', 'Tooth #{n}': 'Dent n°{n}',

  // ---- invoices
  Invoice: 'Facture', Finalize: 'Finaliser', 'Record payment': 'Enregistrer un paiement',
  'Add discount': 'Ajouter une remise', 'Add surcharge': 'Ajouter un supplément', discount: 'remise', surcharge: 'supplément',
  'Line items': 'Lignes', Payments: 'Paiements', Method: 'Mode', 'No payments recorded': 'Aucun paiement enregistré',
  Cash: 'Espèces', Card: 'Carte', Cheque: 'Chèque', Transfer: 'Virement',
  'A discount cannot exceed the invoice total ({amount}).': 'Une remise ne peut pas dépasser le total de la facture ({amount}).',
  'e.g. Loyalty discount': 'ex. Remise fidélité', 'e.g. After-hours surcharge': 'ex. Supplément hors horaires',
  'Amount ({currency})': 'Montant ({currency})', 'Amount exceeds what is due ({amount}).': 'Le montant dépasse le reste dû ({amount}).',
  'e.g. Partial — rest next visit': 'ex. Partiel — le reste à la prochaine visite',
  'Due: {amount} — a lower amount records a partial payment.': 'Reste dû : {amount} — un montant inférieur enregistre un paiement partiel.',
  'Void invoice': 'Annuler la facture', 'e.g. Billing error — reissued': 'ex. Erreur de facturation — refaite',
  '{n} invoices · {owed} patients with balance': '{n} factures · {owed} patients avec solde',
  'No invoices': 'Aucune facture', 'Complete a visit to auto-generate a draft invoice.': 'Terminez une visite pour générer automatiquement un brouillon de facture.',
  'No outstanding balances': 'Aucun solde impayé',
  'Amount must be greater than zero.': 'Le montant doit être supérieur à zéro.',
  'Only draft invoices can be adjusted.': 'Seuls les brouillons de facture peuvent être modifiés.',
  'Discount cannot exceed the invoice total ({amount}).': 'La remise ne peut pas dépasser le total de la facture ({amount}).',
  'Payment amount must be greater than zero.': 'Le montant du paiement doit être supérieur à zéro.',
  'Payments can only be recorded on finalized, unpaid invoices.': 'Les paiements ne peuvent être enregistrés que sur des factures finalisées et impayées.',
  'Payment exceeds the amount due ({amount}).': 'Le paiement dépasse le reste dû ({amount}).',

  // ---- documents
  '{n} files · imaging, consents, records': '{n} fichiers · imagerie, consentements, dossiers',
  'Search files or patients…': 'Rechercher des fichiers ou des patients…', Imaging: 'Imagerie', Document: 'Document',
  'No documents': 'Aucun document', 'Upload X-rays, consents and records against a patient.': 'Téléversez radios, consentements et dossiers pour un patient.',
  'Upload — {file}': 'Téléverser — {file}', 'Attach to patient': 'Associer au patient',
  '{size} KB — the file stays on this computer; only its record syncs.': '{size} Ko — le fichier reste sur cet ordinateur ; seule sa fiche est synchronisée.',
  'Open in system viewer': 'Ouvrir avec la visionneuse du système',

  // ---- inventory
  Consumables: 'Consommables', 'Edit item': "Modifier l'article", 'New inventory item': 'Nouvel article', 'New item': 'Nouvel article',
  'e.g. Cotton rolls': 'ex. Rouleaux de coton', Category: 'Catégorie', 'pcs / box / carpule': 'pièce / boîte / carpule',
  'On hand': 'En stock', 'Low-stock threshold': "Seuil d'alerte", 'Out / critical': 'Rupture / critique', Low: 'Bas',
  'In stock': 'En stock', '{crit} critical · {low} low': '{crit} critiques · {low} bas', 'Tracked items': 'Articles suivis',
  '{n} categories': '{n} catégories', Critical: 'Critique', 'out of stock': 'en rupture', 'at / below threshold': 'au seuil ou en dessous',
  Healthy: 'Suffisant', 'above threshold': 'au-dessus du seuil', 'All items': 'Tous les articles', 'Needs reorder': 'À commander',
  'Search supplies…': 'Rechercher des fournitures…', Item: 'Article', 'Stock level': 'Niveau de stock', 'No items': 'Aucun article',
  'Track consumables like cotton rolls, gloves, anesthetic.': 'Suivez les consommables : rouleaux de coton, gants, anesthésiques…',
  Restock: 'Réapprovisionner', Adjust: 'Ajuster', 'Restock — {item}': 'Réapprovisionner — {item}', 'Record restock': 'Enregistrer le réapprovisionnement',
  'Quantity added ({unit})': 'Quantité ajoutée ({unit})', Supplier: 'Fournisseur',
  'Current: {from} {unit} → {to} {unit}': 'Actuel : {from} {unit} → {to} {unit}', 'Adjust stock — {item}': 'Ajuster le stock — {item}',
  'Apply adjustment': "Appliquer l'ajustement", 'New on-hand quantity ({unit})': 'Nouvelle quantité en stock ({unit})',
  'Reason (required)': 'Motif (obligatoire)', 'e.g. Physical count correction, expired batch': 'ex. Correction après inventaire, lot périmé',
  'Change: {delta}': 'Écart : {delta}',

  // ---- day closeout
  'Expected cash': 'Espèces attendues', 'Counted cash': 'Espèces comptées', "sum of today's cash payments": 'total des paiements en espèces du jour',
  'physical drawer count': 'comptage de la caisse', Delta: 'Écart', 'counted − expected': 'compté − attendu', 'Day closed': 'Journée clôturée',
  'Closed with {counted} counted ({delta} difference).': 'Clôturée avec {counted} comptés (écart de {delta}).',
  'Reopen day (Dentist action)': 'Rouvrir la journée (action du dentiste)', 'Close the day': 'Clôturer la journée',
  'Counted cash ({currency})': 'Espèces comptées ({currency})', 'Discrepancy note (optional)': "Note d'écart (facultatif)",
  'e.g. 5 DT change float': 'ex. 5 DT de fonds de caisse', 'Confirm closeout': 'Confirmer la clôture', History: 'Historique',
  Expected: 'Attendu', Counted: 'Compté', reopened: 'rouverte', 'No closeouts yet': 'Aucune clôture',

  // ---- settings
  'Clinic profile': 'Profil du cabinet', 'My profile': 'Mon profil', Language: 'Langue', 'Team & roles': 'Équipe et rôles',
  'Data & sync': 'Données et synchronisation', 'Clinic name': 'Nom du cabinet', Address: 'Adresse', Currency: 'Devise',
  'TND (Tunisian dinar)': 'TND (dinar tunisien)', EUR: 'EUR', USD: 'USD', 'Invoice footer': 'Pied de facture',
  'Email (sign-in)': 'E-mail (connexion)', 'Your name appears in the sidebar, on visits, and on recorded payments.':
    'Votre nom apparaît dans la barre latérale, sur les visites et sur les paiements enregistrés.',
  'Language & formats': 'Langue et formats', 'Primary clinic language': 'Langue principale du cabinet',
  'Right-to-left layout': 'Affichage de droite à gauche',
  'Same as this computer': 'Comme cet ordinateur',
  'Follows the Windows language — currently {language}.': 'Suit la langue de Windows — actuellement {language}.',
  "Used when the computer's language isn't supported": "Utilisée quand la langue de l'ordinateur n'est pas prise en charge", 'Add staff': 'Ajouter du personnel', 'Add staff user': 'Ajouter un membre du personnel',
  'Create user': "Créer l'utilisateur", 'Initial password': 'Mot de passe initial',
  Sync: 'Synchronisation', 'Supabase account': 'Compte Supabase', 'Not signed in': 'Non connecté', 'Sync now': 'Synchroniser',
  'All local changes synced · {time}.': 'Toutes les modifications locales sont synchronisées · {time}.',
  'All local changes synced.': 'Toutes les modifications locales sont synchronisées.',
  '{n} record(s) pending — {reason}.': '{n} enregistrement(s) en attente — {reason}.', 'will retry automatically': 'nouvel essai automatique',
  'Sync failed for {tables} table(s) — {n} record(s) kept locally:': 'Échec de synchronisation pour {tables} table(s) — {n} enregistrement(s) conservé(s) localement :',
  '· …and more (same cause for most tables)': '· …et d’autres (même cause pour la plupart des tables)',
  'Cloud setup missing or out of date.': 'Configuration du cloud absente ou obsolète.',
  "The Supabase project is missing the tables or the latest access rules this version needs. They can't be changed through the app's API key — copy the setup SQL below and run it once in the Supabase SQL editor (safe to run again), then sync resumes automatically. Records are safe locally meanwhile.":
    "Il manque au projet Supabase les tables ou les dernières règles d'accès requises par cette version. Elles ne peuvent pas être modifiées avec la clé de l'application — copiez le SQL de configuration ci-dessous et exécutez-le une fois dans l'éditeur SQL de Supabase (sans risque si répété) ; la synchronisation reprendra ensuite automatiquement. Les données restent en sécurité sur cet ordinateur en attendant.",
  'Copied ✓': 'Copié ✓', 'Copy migration SQL': 'Copier le SQL de configuration', 'Open Supabase SQL editor': "Ouvrir l'éditeur SQL Supabase",
  'Retry sync': 'Relancer la synchronisation', 'Offline-first storage': 'Stockage hors ligne',
  'All records saved locally (SQLite) with sync metadata; pending rows push when online.':
    'Toutes les données sont enregistrées localement (SQLite) ; les modifications en attente sont envoyées dès que la connexion revient.',
  Data: 'Données', 'Demo data': 'Données de démonstration',
  'Seed sample patients, appointments, inventory (only if the database is empty).': 'Ajoute des patients, rendez-vous et stocks fictifs (uniquement si la base est vide).',
  'Demo data loaded.': 'Données de démonstration chargées.', 'Database not empty — skipped.': 'Base de données non vide — ignoré.',
  'Load demo data': 'Charger les données de démonstration', Session: 'Session', 'Signed in as {name}': 'Connecté en tant que {name}',
  'Not signed in — records kept locally': 'Non connecté — données conservées localement',
  '{n} table(s) failed to sync — records kept locally': '{n} table(s) non synchronisée(s) — données conservées localement',

  // Report a problem
  'Report a problem': 'Signaler un problème',
  'What happened?': "Que s'est-il passé ?",
  'What were you doing, what did you expect, and what happened instead?': "Que faisiez-vous, qu'attendiez-vous, et que s'est-il passé à la place ?",
  'Attachments (optional)': 'Pièces jointes (facultatif)',
  'Screenshot of the screen': "Capture de l'écran",
  'Add files': 'Ajouter des fichiers',
  Remove: 'Retirer',
  '{n} MB': '{n} Mo',
  '{n} KB': '{n} Ko',
  'Screenshots and files may show patient information. Attach only what helps explain the problem.':
    'Les captures et fichiers peuvent montrer des informations sur les patients. Joignez uniquement ce qui aide à expliquer le problème.',
  'Help find the cause (optional)': 'Aider à trouver la cause (facultatif)',
  'Include device information': "Inclure les informations sur l'appareil",
  'App and Windows version, processor, memory, screens, language and sync status. No computer name, user name or network address.':
    "Versions de l'application et de Windows, processeur, mémoire, écrans, langue et état de la synchronisation. Ni nom d'ordinateur, ni nom d'utilisateur, ni adresse réseau.",
  'Include app logs': "Inclure le journal de l'application",
  'Recent errors and warnings from the app. Email addresses, phone numbers and passwords are removed.':
    "Erreurs et avertissements récents de l'application. Les adresses e-mail, numéros de téléphone et mots de passe sont retirés.",
  'Show what will be sent': 'Voir ce qui sera envoyé',
  'Hide what will be sent': 'Masquer ce qui sera envoyé',
  'Nothing recorded yet.': "Rien d'enregistré pour l'instant.",
  'Your patient records are never included.': 'Vos dossiers patients ne sont jamais inclus.',
  'Send report': 'Envoyer le rapport',
  'Sending…': 'Envoi…',
  'Please describe the problem.': 'Veuillez décrire le problème.',
  'Too large (over {n} MB): {files}': 'Trop volumineux (plus de {n} Mo) : {files}',
  'You can attach up to {n} files.': "Vous pouvez joindre jusqu'à {n} fichiers.",
  'Thank you — your report was sent.': 'Merci — votre rapport a été envoyé.',
  'Reference: {ref}': 'Référence : {ref}',
  'Report saved on this computer.': 'Rapport enregistré sur cet ordinateur.',
  "It couldn't be sent right now (offline or not connected to the cloud). It will be sent automatically.":
    "Il n'a pas pu être envoyé pour l'instant (hors ligne ou non connecté au cloud). Il sera envoyé automatiquement.",
};
