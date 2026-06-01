import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return Response.json({ error: 'targetUserId requis' }, { status: 400 });
    }

    // Récupérer les données de l'utilisateur actuel
    const [currentUserData] = await base44.asServiceRole.entities.User.filter({ id: user.id });

    const utilisateursBloques = currentUserData?.utilisateurs_bloques || [];

    // Vérifier si l'utilisateur est bien bloqué
    if (!utilisateursBloques.includes(targetUserId)) {
      return Response.json({ error: 'Cet utilisateur n\'est pas bloqué' }, { status: 400 });
    }

    // Débloquer l'utilisateur
    const nouveauxBloques = utilisateursBloques.filter(id => id !== targetUserId);

    await base44.asServiceRole.entities.User.update(user.id, {
      utilisateurs_bloques: nouveauxBloques
    });

    return Response.json({ 
      success: true, 
      message: 'Utilisateur débloqué' 
    });

  } catch (error) {
    console.error('Erreur unblockUser:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});