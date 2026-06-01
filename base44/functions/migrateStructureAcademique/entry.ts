import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role_archive !== 'admin_systeme') {
            return Response.json({ error: 'Accès refusé. Admin système requis.' }, { status: 403 });
        }

        // Récupérer tous les établissements
        const etablissements = await base44.asServiceRole.entities.Etablissement.list();
        
        let totalFacultes = 0;
        let totalDepartements = 0;
        let totalOptions = 0;
        let totalOrientations = 0;

        for (const etablissement of etablissements) {
            console.log(`Traitement de l'établissement: ${etablissement.nom}`);

            // Récupérer toutes les demandes d'inscription et classes pour cet établissement
            const demandes = await base44.asServiceRole.entities.DemandeInscription.filter({
                etablissement_nom: etablissement.nom,
                statut: 'approuvee'
            }, '-created_date', 1000);

            const classes = await base44.asServiceRole.entities.Classe.filter({
                etablissement_id: etablissement.id
            });

            // Maps pour stocker les données uniques
            const facultesMap = new Map();
            const departementsMap = new Map();
            const optionsMap = new Map();
            const orientationsMap = new Map();

            // Extraire les données des demandes
            for (const demande of demandes) {
                if (demande.faculte && demande.faculte.trim()) {
                    const facKey = demande.faculte.trim().toLowerCase();
                    if (!facultesMap.has(facKey)) {
                        facultesMap.set(facKey, {
                            nom: demande.faculte.trim(),
                            etablissement_id: etablissement.id,
                            etablissement_nom: etablissement.nom
                        });
                    }
                }

                if (demande.departement && demande.departement.trim() && demande.faculte) {
                    const depKey = `${demande.faculte.trim().toLowerCase()}_${demande.departement.trim().toLowerCase()}`;
                    if (!departementsMap.has(depKey)) {
                        departementsMap.set(depKey, {
                            nom: demande.departement.trim(),
                            faculte_nom: demande.faculte.trim(),
                            etablissement_id: etablissement.id,
                            etablissement_nom: etablissement.nom
                        });
                    }
                }

                if (demande.option && demande.option.trim() && demande.departement && demande.faculte) {
                    const optKey = `${demande.faculte.trim().toLowerCase()}_${demande.departement.trim().toLowerCase()}_${demande.option.trim().toLowerCase()}`;
                    if (!optionsMap.has(optKey)) {
                        optionsMap.set(optKey, {
                            nom: demande.option.trim(),
                            departement_nom: demande.departement.trim(),
                            faculte_nom: demande.faculte.trim(),
                            etablissement_id: etablissement.id,
                            etablissement_nom: etablissement.nom
                        });
                    }
                }

                if (demande.orientation && demande.orientation.trim() && demande.option && demande.departement && demande.faculte) {
                    const oriKey = `${demande.faculte.trim().toLowerCase()}_${demande.departement.trim().toLowerCase()}_${demande.option.trim().toLowerCase()}_${demande.orientation.trim().toLowerCase()}`;
                    if (!orientationsMap.has(oriKey)) {
                        orientationsMap.set(oriKey, {
                            nom: demande.orientation.trim(),
                            option_nom: demande.option.trim(),
                            departement_nom: demande.departement.trim(),
                            faculte_nom: demande.faculte.trim(),
                            etablissement_id: etablissement.id,
                            etablissement_nom: etablissement.nom
                        });
                    }
                }
            }

            // Extraire les données des classes
            for (const classe of classes) {
                if (classe.faculte && classe.faculte.trim()) {
                    const facKey = classe.faculte.trim().toLowerCase();
                    if (!facultesMap.has(facKey)) {
                        facultesMap.set(facKey, {
                            nom: classe.faculte.trim(),
                            etablissement_id: etablissement.id,
                            etablissement_nom: etablissement.nom
                        });
                    }
                }

                if (classe.departement && classe.departement.trim() && classe.faculte) {
                    const depKey = `${classe.faculte.trim().toLowerCase()}_${classe.departement.trim().toLowerCase()}`;
                    if (!departementsMap.has(depKey)) {
                        departementsMap.set(depKey, {
                            nom: classe.departement.trim(),
                            faculte_nom: classe.faculte.trim(),
                            etablissement_id: etablissement.id,
                            etablissement_nom: etablissement.nom
                        });
                    }
                }

                if (classe.option && classe.option.trim() && classe.departement && classe.faculte) {
                    const optKey = `${classe.faculte.trim().toLowerCase()}_${classe.departement.trim().toLowerCase()}_${classe.option.trim().toLowerCase()}`;
                    if (!optionsMap.has(optKey)) {
                        optionsMap.set(optKey, {
                            nom: classe.option.trim(),
                            departement_nom: classe.departement.trim(),
                            faculte_nom: classe.faculte.trim(),
                            etablissement_id: etablissement.id,
                            etablissement_nom: etablissement.nom
                        });
                    }
                }

                if (classe.orientation && classe.orientation.trim() && classe.option && classe.departement && classe.faculte) {
                    const oriKey = `${classe.faculte.trim().toLowerCase()}_${classe.departement.trim().toLowerCase()}_${classe.option.trim().toLowerCase()}_${classe.orientation.trim().toLowerCase()}`;
                    if (!orientationsMap.has(oriKey)) {
                        orientationsMap.set(oriKey, {
                            nom: classe.orientation.trim(),
                            option_nom: classe.option.trim(),
                            departement_nom: classe.departement.trim(),
                            faculte_nom: classe.faculte.trim(),
                            etablissement_id: etablissement.id,
                            etablissement_nom: etablissement.nom
                        });
                    }
                }
            }

            // Créer les facultés et récupérer leurs IDs
            const facultesCreees = new Map();
            for (const [key, faculte] of facultesMap) {
                // Vérifier si existe déjà
                const existantes = await base44.asServiceRole.entities.EtablissementFaculte.filter({
                    nom: faculte.nom,
                    etablissement_id: etablissement.id
                });

                let faculteId;
                if (existantes.length > 0) {
                    faculteId = existantes[0].id;
                } else {
                    const created = await base44.asServiceRole.entities.EtablissementFaculte.create(faculte);
                    faculteId = created.id;
                    totalFacultes++;
                }
                facultesCreees.set(faculte.nom.toLowerCase(), faculteId);
            }

            // Créer les départements et récupérer leurs IDs
            const departementsCreees = new Map();
            for (const [key, departement] of departementsMap) {
                const faculteId = facultesCreees.get(departement.faculte_nom.toLowerCase());
                if (!faculteId) continue;

                const existants = await base44.asServiceRole.entities.EtablissementDepartement.filter({
                    nom: departement.nom,
                    etablissement_id: etablissement.id,
                    faculte_id: faculteId
                });

                let departementId;
                if (existants.length > 0) {
                    departementId = existants[0].id;
                } else {
                    const created = await base44.asServiceRole.entities.EtablissementDepartement.create({
                        ...departement,
                        faculte_id: faculteId
                    });
                    departementId = created.id;
                    totalDepartements++;
                }
                departementsCreees.set(`${departement.faculte_nom.toLowerCase()}_${departement.nom.toLowerCase()}`, departementId);
            }

            // Créer les options et récupérer leurs IDs
            const optionsCreees = new Map();
            for (const [key, option] of optionsMap) {
                const faculteId = facultesCreees.get(option.faculte_nom.toLowerCase());
                const departementId = departementsCreees.get(`${option.faculte_nom.toLowerCase()}_${option.departement_nom.toLowerCase()}`);
                
                if (!faculteId || !departementId) continue;

                const existantes = await base44.asServiceRole.entities.EtablissementOption.filter({
                    nom: option.nom,
                    etablissement_id: etablissement.id,
                    faculte_id: faculteId,
                    departement_id: departementId
                });

                let optionId;
                if (existantes.length > 0) {
                    optionId = existantes[0].id;
                } else {
                    const created = await base44.asServiceRole.entities.EtablissementOption.create({
                        ...option,
                        faculte_id: faculteId,
                        departement_id: departementId
                    });
                    optionId = created.id;
                    totalOptions++;
                }
                optionsCreees.set(`${option.faculte_nom.toLowerCase()}_${option.departement_nom.toLowerCase()}_${option.nom.toLowerCase()}`, optionId);
            }

            // Créer les orientations
            for (const [key, orientation] of orientationsMap) {
                const faculteId = facultesCreees.get(orientation.faculte_nom.toLowerCase());
                const departementId = departementsCreees.get(`${orientation.faculte_nom.toLowerCase()}_${orientation.departement_nom.toLowerCase()}`);
                const optionId = optionsCreees.get(`${orientation.faculte_nom.toLowerCase()}_${orientation.departement_nom.toLowerCase()}_${orientation.option_nom.toLowerCase()}`);
                
                if (!faculteId || !departementId || !optionId) continue;

                const existantes = await base44.asServiceRole.entities.EtablissementOrientation.filter({
                    nom: orientation.nom,
                    etablissement_id: etablissement.id,
                    faculte_id: faculteId,
                    departement_id: departementId,
                    option_id: optionId
                });

                if (existantes.length === 0) {
                    await base44.asServiceRole.entities.EtablissementOrientation.create({
                        ...orientation,
                        faculte_id: faculteId,
                        departement_id: departementId,
                        option_id: optionId
                    });
                    totalOrientations++;
                }
            }

            console.log(`Terminé pour ${etablissement.nom}`);
        }

        return Response.json({
            success: true,
            message: 'Migration terminée avec succès',
            stats: {
                etablissements: etablissements.length,
                facultes: totalFacultes,
                departements: totalDepartements,
                options: totalOptions,
                orientations: totalOrientations
            }
        });

    } catch (error) {
        console.error('Erreur migration:', error);
        return Response.json({ 
            error: 'Erreur lors de la migration',
            details: error.message 
        }, { status: 500 });
    }
});