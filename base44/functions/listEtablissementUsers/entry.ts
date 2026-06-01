import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (me.role_archive !== 'admin_etablissement') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const role = body.role || 'professeur';

    // Determine establishment of the admin if missing
    let etablissementId = me.etablissement_id || null;
    let etablissementNom = me.etablissement_nom || null;
    if (!etablissementId || !etablissementNom) {
      const etablissements = await base44.asServiceRole.entities.Etablissement.list();
      const etab = etablissements.find(
        (e) => e.admin_id === me.id || e.admin_email?.toLowerCase() === me.email?.toLowerCase()
      );
      if (etab) {
        etablissementId = etab.id;
        etablissementNom = etab.nom;
      }
    }

    // Fetch all users with service role
    const allUsers = await base44.asServiceRole.entities.User.list();

    // Fallback via approved inscription requests when user profiles miss etablissement fields
    let approvedEmails = new Set();
    if (etablissementNom) {
      try {
        const demandes = await base44.asServiceRole.entities.DemandeInscription.filter({
          type_utilisateur: 'professeur',
          statut: 'approuvee',
          etablissement_nom: etablissementNom,
        });
        approvedEmails = new Set((demandes || []).map(d => (d.email || '').toLowerCase()));
      } catch (_) {}
    }

    const filtered = allUsers.filter((u) => {
      const sameEtab = (etablissementId && u.etablissement_id === etablissementId) ||
                       (etablissementNom && u.etablissement_nom === etablissementNom);
      const emailMatch = u.email && approvedEmails.has(u.email.toLowerCase());
      return u.role_archive === role && (sameEtab || emailMatch);
    });

    return Response.json(filtered);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});