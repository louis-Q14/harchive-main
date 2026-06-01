import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Appelé depuis automation entity ou directement
    const demande_id = payload?.demande_id || payload?.event?.entity_id;
    if (!demande_id) {
      return Response.json({ error: 'demande_id requis' }, { status: 400 });
    }

    // Si appelé via automation, vérifier que le statut est bien "approuvee"
    if (payload?.data && payload.data.statut !== 'approuvee') {
      return Response.json({ message: 'Statut pas encore approuvée, ignoré' });
    }

    // Récupérer la demande d'inscription
    const demandes = await base44.asServiceRole.entities.DemandeInscription.filter({ id: demande_id });
    if (demandes.length === 0) {
      return Response.json({ error: 'Demande introuvable' }, { status: 404 });
    }
    const demande = demandes[0];

    if (demande.type_utilisateur !== 'etudiant') {
      return Response.json({ message: 'Pas un étudiant, ignoré' });
    }

    // Récupérer l'établissement
    const etablissements = await base44.asServiceRole.entities.Etablissement.filter({ nom: demande.etablissement_nom });
    if (etablissements.length === 0) {
      return Response.json({ error: 'Établissement introuvable' }, { status: 404 });
    }
    const etablissement = etablissements[0];
    const etablissement_id = etablissement.id;
    const etablissement_nom = etablissement.nom;

    const nomComplet = [demande.prenom, demande.nom, demande.post_nom].filter(Boolean).join(' ').trim();

    // Helper: trouver ou créer un dossier
    async function findOrCreate(type, nom, parent_id, extra = {}) {
      const filter = { etablissement_id, type, nom, parent_id: parent_id || null };
      const existing = await base44.asServiceRole.entities.DossierInscription.filter(filter);
      if (existing.length > 0) return existing[0];
      return await base44.asServiceRole.entities.DossierInscription.create({
        type,
        nom,
        parent_id: parent_id || null,
        etablissement_id,
        etablissement_nom,
        ...extra
      });
    }

    // 1. Fiche d'inscription (niveau 1)
    const dossierFiche = await findOrCreate('fiche_inscription', "Fiche d'inscription", null);

    // 2. Faculté
    const dossierFaculte = await findOrCreate('faculte', demande.faculte || 'Non spécifié', dossierFiche.id, {
      faculte_nom: demande.faculte
    });

    // 3. Département
    const dossierDept = await findOrCreate('departement', demande.departement || 'Non spécifié', dossierFaculte.id, {
      faculte_nom: demande.faculte,
      departement_nom: demande.departement
    });

    // 4. Orientation (si présente)
    let dossierParentPromo = dossierDept;
    if (demande.orientation) {
      dossierParentPromo = await findOrCreate('orientation', demande.orientation, dossierDept.id, {
        faculte_nom: demande.faculte,
        departement_nom: demande.departement,
        orientation_nom: demande.orientation
      });
    }

    // 5. Option (si présente)
    if (demande.option) {
      dossierParentPromo = await findOrCreate('option', demande.option, dossierParentPromo.id, {
        faculte_nom: demande.faculte,
        departement_nom: demande.departement,
        orientation_nom: demande.orientation,
        option_nom: demande.option
      });
    }

    // 6. Promotion
    const dossierPromo = await findOrCreate('promotion', demande.classe || 'Non spécifié', dossierParentPromo.id, {
      faculte_nom: demande.faculte,
      departement_nom: demande.departement,
      orientation_nom: demande.orientation,
      option_nom: demande.option,
      promotion_nom: demande.classe
    });

    // 7. Dossier étudiant
    const dossierEtudiant = await findOrCreate('etudiant', nomComplet, dossierPromo.id, {
      etudiant_id: demande.id,
      etudiant_nom: nomComplet,
      faculte_nom: demande.faculte,
      departement_nom: demande.departement,
      promotion_nom: demande.classe
    });

    // 8. Sous-dossier "Pièces jointes"
    const dossierPJ = await findOrCreate('pieces_jointes', 'Pièces jointes', dossierEtudiant.id, {
      etudiant_id: demande.id,
      etudiant_nom: nomComplet
    });

    // 9. Ajouter les fichiers pièces jointes approuvés dans le dossier "Pièces jointes"
    if (demande.piece_jointe_diplome && demande.statut_diplome === 'approuve') {
      const existingDiplome = await base44.asServiceRole.entities.DossierInscription.filter({
        etablissement_id,
        parent_id: dossierPJ.id,
        fichier_type: 'diplome',
        etudiant_id: demande.id
      });
      if (existingDiplome.length === 0) {
        await base44.asServiceRole.entities.DossierInscription.create({
          type: 'etudiant',
          nom: `Diplôme - ${nomComplet}`,
          parent_id: dossierPJ.id,
          etablissement_id,
          etablissement_nom,
          etudiant_id: demande.id,
          etudiant_nom: nomComplet,
          fichier_url: demande.piece_jointe_diplome,
          fichier_type: 'diplome',
          is_fichier: true
        });
      }
    }

    if (demande.piece_jointe_bulletin && demande.statut_bulletin_1 === 'approuve') {
      const existingBulletin = await base44.asServiceRole.entities.DossierInscription.filter({
        etablissement_id,
        parent_id: dossierPJ.id,
        fichier_type: 'bulletin',
        etudiant_id: demande.id
      });
      if (existingBulletin.length === 0) {
        await base44.asServiceRole.entities.DossierInscription.create({
          type: 'etudiant',
          nom: `Bulletin 1 - ${nomComplet}`,
          parent_id: dossierPJ.id,
          etablissement_id,
          etablissement_nom,
          etudiant_id: demande.id,
          etudiant_nom: nomComplet,
          fichier_url: demande.piece_jointe_bulletin,
          fichier_type: 'bulletin',
          is_fichier: true
        });
      }
    }

    if (demande.piece_jointe_bulletin_2 && demande.statut_bulletin_2 === 'approuve') {
      const existingBulletin2 = await base44.asServiceRole.entities.DossierInscription.filter({
        etablissement_id,
        parent_id: dossierPJ.id,
        fichier_type: 'bulletin_2',
        etudiant_id: demande.id
      });
      if (existingBulletin2.length === 0) {
        await base44.asServiceRole.entities.DossierInscription.create({
          type: 'etudiant',
          nom: `Bulletin 2 - ${nomComplet}`,
          parent_id: dossierPJ.id,
          etablissement_id,
          etablissement_nom,
          etudiant_id: demande.id,
          etudiant_nom: nomComplet,
          fichier_url: demande.piece_jointe_bulletin_2,
          fichier_type: 'bulletin_2',
          is_fichier: true
        });
      }
    }

    if (demande.piece_jointe_attestation_naissance && demande.statut_attestation_naissance === 'approuve') {
      const existingAttestation = await base44.asServiceRole.entities.DossierInscription.filter({
        etablissement_id,
        parent_id: dossierPJ.id,
        fichier_type: 'attestation_naissance',
        etudiant_id: demande.id
      });
      if (existingAttestation.length === 0) {
        await base44.asServiceRole.entities.DossierInscription.create({
          type: 'etudiant',
          nom: `Attestation de naissance - ${nomComplet}`,
          parent_id: dossierPJ.id,
          etablissement_id,
          etablissement_nom,
          etudiant_id: demande.id,
          etudiant_nom: nomComplet,
          fichier_url: demande.piece_jointe_attestation_naissance,
          fichier_type: 'attestation_naissance',
          is_fichier: true
        });
      }
    }

    if (demande.piece_jointe_bonne_vie && demande.statut_bonne_vie === 'approuve') {
      const existingBonneVie = await base44.asServiceRole.entities.DossierInscription.filter({
        etablissement_id,
        parent_id: dossierPJ.id,
        fichier_type: 'bonne_vie',
        etudiant_id: demande.id
      });
      if (existingBonneVie.length === 0) {
        await base44.asServiceRole.entities.DossierInscription.create({
          type: 'etudiant',
          nom: `Certificat de bonne vie - ${nomComplet}`,
          parent_id: dossierPJ.id,
          etablissement_id,
          etablissement_nom,
          etudiant_id: demande.id,
          etudiant_nom: nomComplet,
          fichier_url: demande.piece_jointe_bonne_vie,
          fichier_type: 'bonne_vie',
          is_fichier: true
        });
      }
    }

    // 10. Formulaire d'inscription (dans le dossier étudiant, hors pièces jointes)
    const existingFormulaire = await base44.asServiceRole.entities.DossierInscription.filter({
      etablissement_id,
      parent_id: dossierEtudiant.id,
      fichier_type: 'formulaire_inscription',
      etudiant_id: demande.id
    });
    if (existingFormulaire.length === 0) {
      // Créer l'entrée du formulaire d'inscription
      const formulaireData = JSON.stringify({
        nom: demande.nom,
        post_nom: demande.post_nom,
        prenom: demande.prenom,
        matricule: demande.matricule,
        email: demande.email,
        date_naissance: demande.date_naissance,
        sexe: demande.sexe,
        nationalite: demande.nationalite,
        etat_civil: demande.etat_civil,
        nom_pere: demande.nom_pere,
        nom_mere: demande.nom_mere,
        province_origine: demande.province_origine,
        district: demande.district,
        territoire: demande.territoire,
        adresse_candidat: demande.adresse_candidat,
        ecole_secondaire: demande.ecole_secondaire,
        section_secondaire: demande.section_secondaire,
        annee_secondaire: demande.annee_secondaire,
        pourcentage_obtenu: demande.pourcentage_obtenu,
        numero_diplome_secondaire: demande.numero_diplome_secondaire,
        etablissement_nom: demande.etablissement_nom,
        faculte: demande.faculte,
        departement: demande.departement,
        orientation: demande.orientation,
        option: demande.option,
        classe: demande.classe
      });

      await base44.asServiceRole.entities.DossierInscription.create({
        type: 'etudiant',
        nom: `Formulaire inscription - ${nomComplet}`,
        parent_id: dossierEtudiant.id,
        etablissement_id,
        etablissement_nom,
        etudiant_id: demande.id,
        etudiant_nom: nomComplet,
        fichier_type: 'formulaire_inscription',
        is_fichier: true,
        chemin: formulaireData
      });
    }

    return Response.json({ success: true, message: `Dossier créé pour ${nomComplet}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});