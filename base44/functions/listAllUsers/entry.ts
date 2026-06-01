import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Vérifier que l'utilisateur est authentifié
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Non autorisé' }, { status: 401 });
        }
        
        // Tous les utilisateurs authentifiés peuvent voir la liste pour les fonctionnalités sociales
        // Utiliser le rôle de service pour lister tous les utilisateurs
        const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 1000);
        
        // Log pour le débogage : afficher les photo_url des 5 premiers utilisateurs
        console.log('🔍 DEBUG Backend listAllUsers - 5 premiers utilisateurs:', 
            allUsers.slice(0, 5).map(u => ({ 
                id: u.id, 
                email: u.email, 
                photo_url: u.photo_url,
                has_photo: !!u.photo_url
            }))
        );
        
        const usersWithPhotos = allUsers.filter(u => u.photo_url).length;
        console.log(`📊 Backend STATS: ${usersWithPhotos}/${allUsers.length} utilisateurs ont une photo_url`);
        
        return Response.json({ users: allUsers });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});