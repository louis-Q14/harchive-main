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
      return Response.json({ error: 'Vous ne pouvez pas vous ajouter vous-même' }, { status: 400 });
    }

    // Récupérer les données actuelles des deux utilisateurs
    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const targetUsers = await base44.asServiceRole.entities.User.filter({ id: targetUserId });
    
    const currentUserData = users[0];
    const targetUserData = targetUsers[0];

    if (!targetUserData) {
      return Response.json({ error: 'Utilisateur cible introuvable' }, { status: 404 });
    }

    const demandesEnvoyees = currentUserData?.demandes_amis_envoyees || [];
    const amisActuels = currentUserData?.amis || [];
    const demandesRecues = targetUserData?.demandes_amis_recues || [];
    const utilisateursBloques = currentUserData?.utilisateurs_bloques || [];
    const utilisateursBloquesCible = targetUserData?.utilisateurs_bloques || [];

    // Vérifications
    if (utilisateursBloques.includes(targetUserId)) {
      return Response.json({ error: 'Vous avez bloqué cet utilisateur' }, { status: 400 });
    }

    if (utilisateursBloquesCible.includes(user.id)) {
      return Response.json({ error: 'Cet utilisateur vous a bloqué' }, { status: 400 });
    }

    if (amisActuels.includes(targetUserId)) {
      return Response.json({ error: 'Cet utilisateur est déjà votre ami' }, { status: 400 });
    }

    if (demandesEnvoyees.includes(targetUserId)) {
      return Response.json({ error: 'Demande déjà envoyée' }, { status: 400 });
    }

    // Créer l'entité FriendRequest
    await base44.asServiceRole.entities.FriendRequest.create({
      sender_id: user.id,
      receiver_id: targetUserId,
      status: 'pending'
    });

    // Ajouter la demande dans les tableaux User
    await base44.asServiceRole.entities.User.update(user.id, {
      demandes_amis_envoyees: [...demandesEnvoyees, targetUserId]
    });

    await base44.asServiceRole.entities.User.update(targetUserId, {
      demandes_amis_recues: [...demandesRecues, user.id]
    });

    // Créer une notification
    await base44.asServiceRole.entities.Notification.create({
      destinataire_id: targetUserId,
      type: 'demande_ami',
      titre: 'Nouvelle demande d\'ami',
      contenu: `${user.full_name || user.email} vous a envoyé une demande d'ami`,
      lue: false,
      emetteur_id: user.id,
      emetteur_nom: user.full_name || user.email,
      lien: '/Amis'
    });

    return Response.json({ 
      success: true, 
      message: 'Demande d\'ami envoyée' 
    });

  } catch (error) {
    console.error('Erreur sendFriendRequest:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});