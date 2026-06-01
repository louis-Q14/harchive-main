import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requesterId } = await req.json();

    if (!requesterId) {
      return Response.json({ error: 'requesterId requis' }, { status: 400 });
    }

    // Récupérer les données des deux utilisateurs
    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const requesterUsers = await base44.asServiceRole.entities.User.filter({ id: requesterId });
    
    const currentUserData = users[0];
    const requesterData = requesterUsers[0];

    if (!requesterData) {
      return Response.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const demandesRecues = currentUserData?.demandes_amis_recues || [];
    const amisActuels = currentUserData?.amis || [];
    const demandesEnvoyees = requesterData?.demandes_amis_envoyees || [];
    const amisRequester = requesterData?.amis || [];

    // Vérifier que la demande existe
    if (!demandesRecues.includes(requesterId)) {
      return Response.json({ error: 'Aucune demande de cet utilisateur' }, { status: 400 });
    }

    // Retirer la demande et ajouter aux amis
    const nouvellesDemandesRecues = demandesRecues.filter(id => id !== requesterId);
    const nouveauxAmis = [...amisActuels, requesterId];

    const nouvellesDemandesEnvoyees = demandesEnvoyees.filter(id => id !== user.id);
    const nouveauxAmisRequester = [...amisRequester, user.id];

    // Mettre à jour les deux utilisateurs
    await base44.asServiceRole.entities.User.update(user.id, {
      demandes_amis_recues: nouvellesDemandesRecues,
      amis: nouveauxAmis
    });

    await base44.asServiceRole.entities.User.update(requesterId, {
      demandes_amis_envoyees: nouvellesDemandesEnvoyees,
      amis: nouveauxAmisRequester
    });

    // Mettre à jour le statut dans FriendRequest
    const allRequests = await base44.asServiceRole.entities.FriendRequest.filter({
      sender_id: requesterId,
      receiver_id: user.id,
      status: 'pending'
    });
    
    if (allRequests.length > 0) {
      await base44.asServiceRole.entities.FriendRequest.update(allRequests[0].id, {
        status: 'accepted'
      });
    }

    // Créer une notification
    await base44.asServiceRole.entities.Notification.create({
      destinataire_id: requesterId,
      type: 'ami_accepte',
      titre: 'Demande acceptée',
      contenu: `${user.full_name} a accepté votre demande d'ami`,
      emetteur_id: user.id,
      emetteur_nom: user.full_name,
      lien: '/Amis'
    });

    return Response.json({ 
      success: true, 
      message: 'Demande acceptée' 
    });

  } catch (error) {
    console.error('Erreur acceptFriendRequest:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});