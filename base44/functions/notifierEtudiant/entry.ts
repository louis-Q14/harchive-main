import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, etablissement_nom, emetteur_nom, pre_certification, pieces_rejetes } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email requis' }, { status: 400 });
    }

    // Chercher l'utilisateur par email avec les droits service role
    const etudiantUsers = await base44.asServiceRole.entities.User.filter({ email });

    if (etudiantUsers.length > 0) {
      let titre, contenu;

      if (pre_certification) {
        const listePJ = (pieces_rejetes || []).join(', ');
        titre = "⚠️ Dossier transmis — Documents à corriger";
        contenu = `Votre dossier a été transmis en pré-certification par l'administration de ${etablissement_nom || 'votre établissement'}. Cependant, ${pieces_rejetes?.length || 'certaines'} pièce(s) jointe(s) ont été rejetées et doivent être renvoyées : ${listePJ}. Consultez "Mes Dossiers Académiques" pour les renvoyer.`;
      } else {
        titre = "🎓 Vos dossiers académiques sont disponibles";
        contenu = `Votre dossier d'inscription a été certifié et transmis par l'administration de ${etablissement_nom || 'votre établissement'}. Consultez "Mes Dossiers Académiques" → "Inscription".`;
      }

      await base44.asServiceRole.entities.Notification.create({
        destinataire_id: etudiantUsers[0].id,
        type: "systeme",
        titre,
        contenu,
        emetteur_nom: emetteur_nom || "",
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});