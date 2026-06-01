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

    if (targetUserId === user.id) {
      return Response.json({ error: 'Vous ne pouvez pas vous bloquer vous-même' }, { status: 400 });
    }

    // Récupérer les données des deux utilisateurs
    const [currentUserData] = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const [targetUserData] = await base44.asServiceRole.entities.User.filter({ id: targetUserId });

    if (!targetUserData) {
      return Response.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const utilisateursBloques = currentUserData?.utilisateurs_bloques || [];
    const amisActuels = currentUserData?.amis || [];
    const demandesEnvoyees = currentUserData?.demandes_amis_envoyees || [];
    const demandesRecues = currentUserData?.demandes_amis_recues || [];

    // Vérifier si déjà bloqué
    if (utilisateursBloques.includes(targetUserId)) {
      return Response.json({ error: 'Utilisateur déjà bloqué' }, { status: 400 });
    }

    // Bloquer l'utilisateur
    const nouveauxBloques = [...utilisateursBloques, targetUserId];
    
    // Retirer de la liste d'amis si présent
    const nouveauxAmis = amisActuels.filter(id => id !== targetUserId);
    
    // Retirer des demandes envoyées/reçues
    const nouvellesDemandesEnvoyees = demandesEnvoyees.filter(id => id !== targetUserId);
    const nouvellesDemandesRecues = demandesRecues.filter(id => id !== targetUserId);

    // Mettre à jour l'utilisateur actuel
    await base44.asServiceRole.entities.User.update(user.id, {
      utilisateurs_bloques: nouveauxBloques,
      amis: nouveauxAmis,
      demandes_amis_envoyees: nouvellesDemandesEnvoyees,
      demandes_amis_recues: nouvellesDemandesRecues
    });

    // Retirer l'utilisateur actuel de la liste d'amis de la cible
    const amisCible = targetUserData?.amis || [];
    const demandesEnvoyeesCible = targetUserData?.demandes_amis_envoyees || [];
    const demandesRecuesCible = targetUserData?.demandes_amis_recues || [];

    await base44.asServiceRole.entities.User.update(targetUserId, {
      amis: amisCible.filter(id => id !== user.id),
      demandes_amis_envoyees: demandesEnvoyeesCible.filter(id => id !== user.id),
      demandes_amis_recues: demandesRecuesCible.filter(id => id !== user.id)
    });

    // Supprimer les FriendRequest entre ces deux utilisateurs
    const allRequests = await base44.asServiceRole.entities.FriendRequest.list();
    const requestsToDelete = allRequests.filter(req => 
      (req.sender_id === user.id && req.receiver_id === targetUserId) ||
      (req.sender_id === targetUserId && req.receiver_id === user.id)
    );

    for (const req of requestsToDelete) {
      await base44.asServiceRole.entities.FriendRequest.delete(req.id);
    }

    return Response.json({ 
      success: true, 
      message: 'Utilisateur bloqué' 
    });

  } catch (error) {
    console.error('Erreur blockUser:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});