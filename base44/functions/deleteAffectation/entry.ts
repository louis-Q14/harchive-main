import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Vérifier que l'utilisateur est admin ou propriétaire de l'affectation
        if (user.role_archive !== 'admin_etablissement' && user.role_archive !== 'admin_systeme') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { affectation_id } = await req.json();

        if (!affectation_id) {
            return Response.json({ error: 'Missing affectation_id' }, { status: 400 });
        }

        // Supprimer avec les droits service role
        await base44.asServiceRole.entities.AssignationProfesseur.delete(affectation_id);

        return Response.json({ success: true, message: 'Affectation supprimée' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});