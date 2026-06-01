import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Vérifier que l'utilisateur est admin système
    const currentUser = await base44.auth.me();
    if (!currentUser || currentUser.role_archive !== 'admin_systeme') {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Récupérer les données une seule fois
    const [allUsers, demandesEtudiants, demandesParents, demandesEtablissements, allEtablissements, allPromotions] = 
      await Promise.all([
        base44.asServiceRole.entities.User.list(),
        base44.asServiceRole.entities.DemandeInscription.filter({ statut: 'approuvee' }),
        base44.asServiceRole.entities.DemandeInscriptionParent.filter({ statut: 'approuvee' }),
        base44.asServiceRole.entities.DemandeInscriptionEtablissement.filter({ statut: 'approuvee' }),
        base44.asServiceRole.entities.Etablissement.list(),
        base44.asServiceRole.entities.Promotion.list()
      ]);

    // Créer des maps pour recherche rapide
    const demandesMap = new Map();
    const etablissementMap = new Map();
    const promotionMap = new Map();

    // Mapper les demandes par email
    demandesEtudiants.forEach(d => {
      if (d.email) demandesMap.set(d.email.toLowerCase(), { ...d, source: 'etudiant' });
    });
    
    demandesParents.forEach(d => {
      if (d.email) demandesMap.set(d.email.toLowerCase(), { ...d, source: 'parent' });
    });
    
    demandesEtablissements.forEach(d => {
      if (d.email_responsable) demandesMap.set(d.email_responsable.toLowerCase(), { ...d, source: 'etablissement' });
    });

    // Mapper les établissements par nom
    allEtablissements.forEach(e => {
      if (e.nom) etablissementMap.set(e.nom.toLowerCase(), e);
    });

    // Mapper les promotions par (nom + etablissement_id)
    allPromotions.forEach(p => {
      if (p.nom && p.etablissement_id) {
        promotionMap.set(`${p.nom.toLowerCase()}_${p.etablissement_id}`, p);
      }
    });

    // Synchroniser chaque utilisateur
    let syncCount = 0;
    const updates = [];

    for (const user of allUsers) {
      if (!user.email) continue;
      
      const demande = demandesMap.get(user.email.toLowerCase());
      if (!demande) continue;

      let dataToSync = {};
      
      // Déterminer le type de demande et extraire les données selon la source
      if (demande.source === 'etudiant') {
        const fullName = [demande.prenom, demande.nom, demande.post_nom].filter(Boolean).join(' ').trim();
        
        // Récupérer l'ID de l'établissement depuis la map
        let etablissement_id = null;
        if (demande.etablissement_nom) {
          const etab = etablissementMap.get(demande.etablissement_nom.toLowerCase());
          if (etab) etablissement_id = etab.id;
        }
        
        // Récupérer la classe_id depuis la map de promotions
        let classe_id = null;
        if (demande.classe && etablissement_id) {
          const promo = promotionMap.get(`${demande.classe.toLowerCase()}_${etablissement_id}`);
          if (promo) classe_id = promo.id;
        }
        
        dataToSync = {
          prenom: demande.prenom || '',
          nom: demande.nom || '',
          post_nom: demande.post_nom || '',
          full_name: fullName,
          matricule: demande.matricule || '',
          date_naissance: demande.date_naissance || '',
          sexe: demande.sexe || '',
          nationalite: demande.nationalite || '',
          lieu_naissance: demande.lieu_naissance || '',
          etat_civil: demande.etat_civil || '',
          etablissement_nom: demande.etablissement_nom || '',
          etablissement_id: etablissement_id,
          faculte: demande.faculte || '',
          departement: demande.departement || '',
          option: demande.option || '',
          orientation: demande.orientation || '',
          classe: demande.classe || '',
          classe_id: classe_id,
          role_archive: demande.type_utilisateur
        };
      } else if (demande.source === 'parent') {
        const fullName = [demande.prenom, demande.nom, demande.post_nom].filter(Boolean).join(' ').trim();
        
        // Récupérer l'ID de l'établissement depuis la map
        let etablissement_id = null;
        if (demande.etablissement_nom) {
          const etab = etablissementMap.get(demande.etablissement_nom.toLowerCase());
          if (etab) etablissement_id = etab.id;
        }
        
        dataToSync = {
          prenom: demande.prenom || '',
          nom: demande.nom || '',
          post_nom: demande.post_nom || '',
          full_name: fullName,
          telephone: demande.telephone || '',
          role_archive: 'parent',
          etablissement_nom: demande.etablissement_nom || '',
          etablissement_id: etablissement_id,
          enfant_matricule: demande.matricule_enfant || '',
          enfant_nom: demande.nom_enfant || ''
        };
      } else if (demande.source === 'etablissement') {
        const fullName = [demande.prenom_responsable, demande.nom_responsable].filter(Boolean).join(' ').trim();
        
        // Récupérer l'ID de l'établissement depuis la map
        let etablissement_id = null;
        if (demande.nom_etablissement) {
          const etab = etablissementMap.get(demande.nom_etablissement.toLowerCase());
          if (etab) etablissement_id = etab.id;
        }
        
        dataToSync = {
          prenom: demande.prenom_responsable || '',
          nom: demande.nom_responsable || '',
          post_nom: '',
          full_name: fullName,
          telephone: demande.telephone_responsable || '',
          role_archive: 'admin_etablissement',
          etablissement_nom: demande.nom_etablissement || '',
          etablissement_id: etablissement_id
        };
      }

      if (Object.keys(dataToSync).length > 0 && dataToSync.role_archive) {
        updates.push(
          base44.asServiceRole.entities.User.update(user.id, dataToSync)
        );
        syncCount++;
      }
    }

    // Exécuter toutes les mises à jour en parallèle
    await Promise.all(updates);

    return Response.json({ 
      success: true, 
      message: `${syncCount} utilisateur(s) synchronisé(s)`,
      syncCount 
    });

  } catch (error) {
    console.error('Erreur synchronisation:', error);
    return Response.json({ 
      error: error.message || 'Erreur lors de la synchronisation' 
    }, { status: 500 });
  }
});