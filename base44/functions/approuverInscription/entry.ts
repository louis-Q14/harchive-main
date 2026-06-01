import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Vérifier l'authentification
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Autoriser admin_systeme ET admin_etablissement
    if (user.role_archive !== 'admin_systeme' && user.role_archive !== 'admin_etablissement') {
      return Response.json({ error: 'Unauthorized - admin access required' }, { status: 403 });
    }

    // Récupérer les données de la requête
    const { demande, type } = await req.json();
    const currentUser = user;
    
    if (type === 'etablissement') {
      // Créer l'établissement
      await base44.asServiceRole.entities.Etablissement.create({
        nom: demande.nom_etablissement,
        code: demande.code_etablissement,
        type: demande.type || "universite",
        adresse: demande.adresse || "",
        ville: demande.ville,
        telephone: demande.telephone_responsable || "",
        email: demande.email_etablissement || demande.email_responsable,
        admin_id: null,
        admin_nom: demande.nom_responsable,
        admin_prenom: demande.prenom_responsable,
        admin_post_nom: "",
        admin_email: demande.email_responsable,
        admin_telephone: demande.telephone_responsable || ""
      });
      
      await base44.asServiceRole.entities.DemandeInscriptionEtablissement.update(demande.id, {
        statut: "approuvee",
        approuve_par: currentUser.id,
        date_traitement: new Date().toISOString()
      });

      const fullName = [demande.prenom_responsable, demande.nom_responsable].filter(Boolean).join(' ').trim();
      const usersEtab = await base44.asServiceRole.entities.User.filter({ email: demande.email_responsable });
      const targetUser = usersEtab[0] || null;
      
      const userData = {
        prenom: demande.prenom_responsable,
        nom: demande.nom_responsable,
        post_nom: "",
        full_name: fullName,
        role_archive: 'admin_etablissement',
        telephone: demande.telephone_responsable || "",
        etablissement_nom: demande.nom_etablissement
      };
      
      if (targetUser) {
        await base44.asServiceRole.entities.User.update(targetUser.id, userData);
      } else {
        await base44.asServiceRole.entities.User.create({ ...userData, email: demande.email_responsable });
      }

    } else if (type === 'parent') {
      await base44.asServiceRole.entities.DemandeInscriptionParent.update(demande.id, {
        statut: "approuvee",
        approuve_par: currentUser.id,
        date_traitement: new Date().toISOString()
      });

      const fullName = [demande.prenom, demande.nom, demande.post_nom].filter(Boolean).join(' ').trim();
      const usersParent = await base44.asServiceRole.entities.User.filter({ email: demande.email });
      const targetUser = usersParent[0] || null;
      
      const userData = {
        prenom: demande.prenom,
        nom: demande.nom,
        post_nom: demande.post_nom,
        full_name: fullName,
        role_archive: 'parent',
        telephone: demande.telephone,
        etablissement_nom: demande.etablissement_nom,
        enfant_matricule: demande.matricule_enfant,
        enfant_nom: demande.nom_enfant
      };
      
      if (targetUser) {
        await base44.asServiceRole.entities.User.update(targetUser.id, userData);
      } else {
        await base44.asServiceRole.entities.User.create({ ...userData, email: demande.email });
      }

    } else {
      // Étudiant ou Professeur
      await base44.asServiceRole.entities.DemandeInscription.update(demande.id, {
        statut: "approuvee",
        approuve_par: currentUser.id,
        date_traitement: new Date().toISOString()
      });

      const fullName = [demande.prenom, demande.nom, demande.post_nom].filter(Boolean).join(' ').trim();
      const usersFound = await base44.asServiceRole.entities.User.filter({ email: demande.email });
      const targetUser = usersFound[0] || null;
      
      const userData = {
        prenom: demande.prenom,
        nom: demande.nom,
        post_nom: demande.post_nom,
        full_name: fullName,
        role_archive: demande.type_utilisateur,
        matricule: demande.matricule,
        date_naissance: demande.date_naissance,
        etablissement_nom: demande.etablissement_nom,
        faculte: demande.faculte,
        classe: demande.classe
      };
      
      if (targetUser) {
        await base44.asServiceRole.entities.User.update(targetUser.id, userData);
      } else {
        await base44.asServiceRole.entities.User.create({ ...userData, email: demande.email });
      }

      // Lier automatiquement l'étudiant à sa promotion
      if (demande.type_utilisateur === 'etudiant' && demande.classe) {
        try {
          const allEtab = await base44.asServiceRole.entities.Etablissement.filter({ nom: demande.etablissement_nom });
          const etab = allEtab[0];

          if (etab) {
            const norm = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            const dc = norm(demande.classe);

            const promotionsEtab = await base44.asServiceRole.entities.Promotion.filter({ etablissement_id: etab.id });
            const promotion = promotionsEtab.find((c) => {
              const nNom = norm(c.nom);
              return nNom === dc || nNom.includes(dc) || dc.includes(nNom);
            });

            if (promotion) {
              let etu = null;
              if (demande.email) {
                const foundByEmail = await base44.asServiceRole.entities.Etudiant.filter({ email: demande.email });
                etu = foundByEmail[0] || null;
              }
              if (!etu && demande.matricule) {
                const foundByMat = await base44.asServiceRole.entities.Etudiant.filter({ matricule: demande.matricule });
                etu = foundByMat[0] || null;
              }

              const etuPayload = {
                nom: demande.nom,
                prenom: demande.prenom,
                matricule: demande.matricule || '',
                email: demande.email || '',
                date_naissance: demande.date_naissance || '',
                sexe: demande.sexe || 'M',
                telephone: demande.telephone || '',
                etablissement_id: etab.id,
                classe_id: promotion.id,
                statut: 'actif',
                photo_url: '',
                departement: demande.departement || '',
                orientation: demande.orientation || '',
                option: demande.option || '',
                nationalite: demande.nationalite || '',
                lieu_naissance: demande.lieu_naissance || '',
                etat_civil: demande.etat_civil || '',
              };

              if (etu) {
                await base44.asServiceRole.entities.Etudiant.update(etu.id, etuPayload);
              } else {
                await base44.asServiceRole.entities.Etudiant.create(etuPayload);
              }
            }
          }
        } catch (linkError) {
          console.error('Erreur liaison étudiant-promotion:', linkError);
        }
      }

      // Créer le dossier d'inscription pour les étudiants
      if (demande.type_utilisateur === 'etudiant') {
        try {
          await base44.asServiceRole.functions.invoke('creerDossierEtudiant', {
            demande_id: demande.id
          });
        } catch (folderError) {
          console.error('Erreur création dossier étudiant:', folderError);
        }
      }
    }

    // Envoyer l'email d'approbation
    const userEmail = type === 'etablissement' ? demande.email_responsable : demande.email;
    
    let emailBody = "";
    if (type === 'etablissement') {
      emailBody = `Bonjour,\n\nExcellente nouvelle ! Votre demande d'inscription pour l'établissement ${demande.nom_etablissement} sur la plateforme Harchive a été APPROUVÉE.\n\n🎉 PROCHAINES ÉTAPES :\n\n1. Connectez-vous sur la plateforme Harchive\n2. Utilisez l'email : ${demande.email_responsable}\n3. Si vous n'avez pas encore de compte, créez-en un avec cet email\n\nUne fois connecté, votre compte sera automatiquement configuré avec les permissions d'administrateur d'établissement.\n\nCordialement,\nL'équipe Harchive`;
    } else if (type === 'parent') {
      emailBody = `Bonjour ${demande.prenom} ${demande.nom},\n\nExcellente nouvelle ! Votre demande d'inscription parent sur Harchive a été APPROUVÉE.\n\n🎉 PROCHAINES ÉTAPES :\n\n1. Connectez-vous sur la plateforme Harchive\n2. Utilisez l'email : ${demande.email}\n3. Si vous n'avez pas encore de compte, créez-en un avec cet email\n\nUne fois connecté, vous pourrez suivre la scolarité de ${demande.nom_enfant}.\n\nCordialement,\nL'équipe Harchive`;
    } else {
      const typeLabel = demande.type_utilisateur === 'etudiant' ? 'étudiant' : 'professeur';
      emailBody = `Bonjour ${demande.prenom} ${demande.nom},\n\nExcellente nouvelle ! Votre demande d'inscription ${typeLabel} sur Harchive a été APPROUVÉE.\n\n🎉 PROCHAINES ÉTAPES :\n\n1. Connectez-vous sur la plateforme Harchive\n2. Utilisez l'email : ${demande.email}\n3. Si vous n'avez pas encore de compte, créez-en un avec cet email\n\nUne fois connecté, votre profil sera automatiquement configuré avec vos informations académiques.\n\nCordialement,\nL'équipe Harchive`;
    }

    await base44.integrations.Core.SendEmail({
      to: userEmail,
      subject: "✅ Demande approuvée - Harchive",
      body: emailBody
    });

    return Response.json({ 
      success: true,
      message: `✅ Demande approuvée ! Un email a été envoyé à : ${userEmail}\n\nL'utilisateur devra se connecter à la plateforme pour activer son compte.`
    });

  } catch (error) {
    console.error("Erreur approuverInscription:", error);
    return Response.json({ 
      success: false,
      error: error.message
    }, { status: 500 });
  }
});