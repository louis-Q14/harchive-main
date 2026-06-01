import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { email } = await req.json();
    if (!email) return Response.json({ photo_url: null });

    // Chercher l'étudiant dans DemandeInscription
    const demandes = await base44.asServiceRole.entities.DemandeInscription.filter({ email, statut: 'approuvee' });
    if (demandes.length > 0 && demandes[0].photo_url) {
      return Response.json({ photo_url: demandes[0].photo_url });
    }

    // Fallback: chercher dans User via service role
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users.length > 0 && users[0].photo_url) {
      return Response.json({ photo_url: users[0].photo_url });
    }

    return Response.json({ photo_url: null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});