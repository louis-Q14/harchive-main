import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { friendId } = await req.json();

    if (!friendId) {
      return Response.json({ error: 'friendId requis' }, { status: 400 });
    }

    // Récupérer les données des deux utilisateurs
    const [currentUserData] = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const [friendData] = await base44.asServiceRole.entities.User.filter({ id: friendId });

    if (!friendData) {
      return Response.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const amisActuels = currentUserData?.amis || [];
    const amisFriend = friendData?.amis || [];

    // Vérifier que c'est bien un ami
    if (!amisActuels.includes(friendId)) {
      return Response.json({ error: 'Cet utilisateur n\'est pas votre ami' }, { status: 400 });
    }

    // Retirer l'ami des deux côtés
    const nouveauxAmis = amisActuels.filter(id => id !== friendId);
    const nouveauxAmisFriend = amisFriend.filter(id => id !== user.id);

    // Mettre à jour les deux utilisateurs
    await base44.asServiceRole.entities.User.update(user.id, {
      amis: nouveauxAmis
    });

    await base44.asServiceRole.entities.User.update(friendId, {
      amis: nouveauxAmisFriend
    });

    // Supprimer les FriendRequest entre ces deux utilisateurs
    const allRequests = await base44.asServiceRole.entities.FriendRequest.list();
    const requestsToDelete = allRequests.filter(req => 
      (req.sender_id === user.id && req.receiver_id === friendId) ||
      (req.sender_id === friendId && req.receiver_id === user.id)
    );

    for (const req of requestsToDelete) {
      await base44.asServiceRole.entities.FriendRequest.delete(req.id);
    }

    return Response.json({ 
      success: true, 
      message: 'Ami retiré' 
    });

  } catch (error) {
    console.error('Erreur removeFriend:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});