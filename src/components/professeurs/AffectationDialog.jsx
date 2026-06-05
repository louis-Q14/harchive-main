import React, { useState, useMemo, useEffect } from "react";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataService } from "@/api";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function AffectationDialog({ 
  open, 
  onClose, 
  professeur, 
  etablissementId,
  etablissementNom 
}) {
  if (!professeur) return null;
  const queryClient = useQueryClient();
  const [selectedMatiereId, setSelectedMatiereId] = useState("");
  const [selectedFacultes, setSelectedFacultes] = useState([]);
  const [selectedDepartements, setSelectedDepartements] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [selectedOrientations, setSelectedOrientations] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]); // IDs des classes sélectionnées

  // Charger les matières de l'établissement
  const { data: matieres = [], isLoading: loadingMatieres } = useQuery({
    queryKey: ['matieres', etablissementId],
    queryFn: async () => {
      const mats = await dataService.query('Matiere', { filters: [{
        etablissement_id: etablissementId,
      }] });
      return mats;
    },
    enabled: open && !!etablissementId,
  });

  // Charger la structure académique
  const { data: facultes = [] } = useQuery({
    queryKey: ['facultes', etablissementId],
    queryFn: async () => {
      return await dataService.query('EtablissementFaculte', { filters: [{
        etablissement_id: etablissementId,
      }] });
    },
    enabled: open && !!etablissementId,
  });

  const { data: departements = [] } = useQuery({
    queryKey: ['departements', etablissementId],
    queryFn: async () => {
      return await dataService.query('EtablissementDepartement', { filters: [{
        etablissement_id: etablissementId,
      }] });
    },
    enabled: open && !!etablissementId,
  });

  const { data: options = [] } = useQuery({
    queryKey: ['options', etablissementId],
    queryFn: async () => {
      return await dataService.query('EtablissementOption', { filters: [{
        etablissement_id: etablissementId,
      }] });
    },
    enabled: open && !!etablissementId,
  });

  const { data: orientations = [] } = useQuery({
    queryKey: ['orientations', etablissementId],
    queryFn: async () => {
      return await dataService.query('EtablissementOrientation', { filters: [{
        etablissement_id: etablissementId,
      }] });
    },
    enabled: open && !!etablissementId,
  });

  // Charger toutes les promotions de l'établissement
  const { data: toutesLesClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['promotions', etablissementId],
    queryFn: async () => {
      const promotions = await dataService.query('Promotion', { filters: [{
        etablissement_id: etablissementId,
      }] });
      
      // Fonction pour extraire le niveau et l'ordre d'une promotion (système LMD)
      const extraireOrdre = (nom) => {
        if (!nom) return { cycle: 999, niveau: 999 };
        
        // Licence (L-1, L-2, L-3) = cycle 1
        if (nom.includes('Licence')) {
          if (nom.startsWith('1ere') || nom.startsWith('1ère')) return { cycle: 1, niveau: 1 };
          if (nom.startsWith('2eme') || nom.startsWith('2ème')) return { cycle: 1, niveau: 2 };
          if (nom.startsWith('3eme') || nom.startsWith('3ème')) return { cycle: 1, niveau: 3 };
        }
        
        // Master/Maitrise (M-1, M-2, M-3) = cycle 2
        if (nom.includes('Maitrise') || nom.includes('Maîtrise') || nom.includes('Master')) {
          if (nom.startsWith('1ere') || nom.startsWith('1ère')) return { cycle: 2, niveau: 1 };
          if (nom.startsWith('2eme') || nom.startsWith('2ème')) return { cycle: 2, niveau: 2 };
          if (nom.startsWith('3eme') || nom.startsWith('3ème')) return { cycle: 2, niveau: 3 };
        }
        
        // Doctorat (D-1, D-2, D-3) = cycle 3
        if (nom.includes('Doctorat')) {
          if (nom.startsWith('1ere') || nom.startsWith('1ère')) return { cycle: 3, niveau: 1 };
          if (nom.startsWith('2eme') || nom.startsWith('2ème')) return { cycle: 3, niveau: 2 };
          if (nom.startsWith('3eme') || nom.startsWith('3ème')) return { cycle: 3, niveau: 3 };
        }
        
        return { cycle: 999, niveau: 999 };
      };
      
      // Trier les promotions par cycle puis par niveau
      return promotions.sort((a, b) => {
        const ordreA = extraireOrdre(a.nom);
        const ordreB = extraireOrdre(b.nom);
        
        if (ordreA.cycle !== ordreB.cycle) {
          return ordreA.cycle - ordreB.cycle;
        }
        
        if (ordreA.niveau !== ordreB.niveau) {
          return ordreA.niveau - ordreB.niveau;
        }
        
        return a.nom?.localeCompare(b.nom) || 0;
      });
    },
    enabled: open && !!etablissementId,
  });

  // Obtenir la matière sélectionnée
  const matiereSelectionnee = useMemo(() => {
    return matieres.find(m => m.id === selectedMatiereId);
  }, [matieres, selectedMatiereId]);

  // Réinitialiser les sélections quand la matière change
  useEffect(() => {
    if (selectedMatiereId && matiereSelectionnee) {
      setSelectedFacultes([]);
      setSelectedDepartements([]);
      setSelectedOptions([]);
      setSelectedOrientations([]);
      setSelectedClassIds([]);
    }
  }, [selectedMatiereId]);

  // Filtrer les départements selon les facultés sélectionnées
  const departementsDisponibles = useMemo(() => {
    if (selectedFacultes.length === 0) return [];
    return departements.filter(d => selectedFacultes.includes(d.faculte_id));
  }, [departements, selectedFacultes]);

  // Filtrer les options selon les départements sélectionnés
  const optionsDisponibles = useMemo(() => {
    if (selectedDepartements.length === 0) return options;
    return options.filter(o => selectedDepartements.includes(o.departement_id));
  }, [options, selectedDepartements]);

  // Filtrer les orientations selon les départements sélectionnés
  const orientationsDisponibles = useMemo(() => {
    if (selectedDepartements.length === 0) return orientations;
    return orientations.filter(o => selectedDepartements.includes(o.departement_id));
  }, [orientations, selectedDepartements]);

  // Filtrer les salles/niveaux académiques pour l'affichage selon toute la hiérarchie
  const filteredClassesForDisplay = useMemo(() => {
    if (!matiereSelectionnee) return [];

    let currentFiltered = toutesLesClasses;

    // Filtrer par facultés sélectionnées si applicables
    if (selectedFacultes.length > 0) {
      currentFiltered = currentFiltered.filter(salle => 
        selectedFacultes.includes(salle.faculte_id)
      );
    }

    // Filtrer par départements sélectionnés si applicables
    if (selectedDepartements.length > 0) {
      currentFiltered = currentFiltered.filter(salle => 
        selectedDepartements.includes(salle.departement_id)
      );
    }

    // Si des options sont sélectionnées, filtrer par ces options
    if (selectedOptions.length > 0) {
      currentFiltered = currentFiltered.filter(salle => 
        selectedOptions.includes(salle.option_id) || !salle.option_id
      );
    }

    // Si des orientations sont sélectionnées, filtrer par ces orientations
    if (selectedOrientations.length > 0) {
      currentFiltered = currentFiltered.filter(salle => 
        selectedOrientations.includes(salle.orientation_id) || !salle.orientation_id
      );
    }

    return currentFiltered;
  }, [
    toutesLesClasses,
    selectedFacultes,
    selectedDepartements,
    selectedOptions,
    selectedOrientations,
    matiereSelectionnee
  ]);



  // Mutation pour créer l'affectation
  const createAffectationMutation = useMutation({
    mutationFn: async (data) => {
      const affectations = [];
      
      // Itérer directement sur les IDs des salles/classes sélectionnées
      for (const classId of selectedClassIds) {
        const salle = toutesLesClasses.find(c => c.id === classId);
        if (!salle) continue; 

        affectations.push({
          professeur_id: professeur.id,
          professeur_nom: `${professeur.prenom} ${professeur.post_nom || ''} ${professeur.nom}`.trim(),
          professeur_email: professeur.email,
          faculte: salle.faculte_nom,
          departement: salle.departement_nom,
          option: salle.option_nom || null,
          orientation: salle.orientation_nom || null,
          classe_id: salle.id,
          classe_nom: salle.nom,
          matiere_id: matiereSelectionnee.id,
          matiere_nom: matiereSelectionnee.nom,
          etablissement_id: etablissementId,
          annee_scolaire: "2024-2025",
        });
      }
      
      for (const affectation of affectations) {
        await dataService.create('AssignationProfesseur', affectation);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignations'] });
      toast.success("Affectation(s) créée(s) avec succès");
      handleClose();
    },
    onError: (error) => {
      toast.error("Erreur lors de la création de l'affectation");
      console.error(error);
    },
  });

  const handleClose = () => {
    setSelectedMatiereId("");
    setSelectedFacultes([]);
    setSelectedDepartements([]);
    setSelectedOptions([]);
    setSelectedOrientations([]);
    setSelectedClassIds([]);
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedMatiereId) {
      toast.error("Veuillez sélectionner une matière");
      return;
    }
    if (selectedFacultes.length === 0) {
      toast.error("Veuillez sélectionner au moins une faculté");
      return;
    }
    if (selectedDepartements.length === 0) {
      toast.error("Veuillez sélectionner au moins un département");
      return;
    }
    if (selectedClassIds.length === 0) {
      toast.error("Veuillez sélectionner au moins une promotion");
      return;
    }
    createAffectationMutation.mutate();
  };

  const toggleFaculte = (faculteId) => {
    setSelectedFacultes(prev => {
      const isRemoving = prev.includes(faculteId);
      
      if (isRemoving) {
        const deptsToRemove = departements
          .filter(d => d.faculte_id === faculteId)
          .map(d => d.id);
        
        setSelectedDepartements(prevDepts => 
          prevDepts.filter(id => !deptsToRemove.includes(id))
        );
        
        // Désélectionner les classes liées aux départements supprimés
        setSelectedClassIds(prevClasses => {
          const classesToKeep = toutesLesClasses.filter(cls => {
            const classDept = departements.find(d => d.nom === cls.departement);
            return classDept && !deptsToRemove.includes(classDept.id);
          });
          return prevClasses.filter(classId => classesToKeep.some(cls => cls.id === classId));
        });
      }
      
      return isRemoving 
        ? prev.filter(id => id !== faculteId)
        : [...prev, faculteId];
    });
  };

  const toggleDepartement = (deptId) => {
    setSelectedDepartements(prev => {
      const isRemoving = prev.includes(deptId);
      
      if (isRemoving) {
        // Désélectionner les classes liées à ce département
        setSelectedClassIds(prevClasses => {
          const classesToKeep = toutesLesClasses.filter(cls => {
            const classDept = departements.find(d => d.nom === cls.departement);
            return classDept && classDept.id !== deptId;
          });
          return prevClasses.filter(classId => classesToKeep.some(cls => cls.id === classId));
        });
      }
      
      return isRemoving 
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId];
    });
  };

  const toggleOption = (optId) => {
    setSelectedOptions(prev => 
      prev.includes(optId) 
        ? prev.filter(id => id !== optId)
        : [...prev, optId]
    );
  };

  const toggleOrientation = (oriId) => {
    setSelectedOrientations(prev => 
      prev.includes(oriId) 
        ? prev.filter(id => id !== oriId)
        : [...prev, oriId]
    );
  };

  const toggleClasse = (classId) => {
    setSelectedClassIds(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };





  return (
    <DraggableDialog
      open={open}
      onOpenChange={handleClose}
      title={<span className="text-white font-semibold" style={CG}>Nouvelle Affectation</span>}
      maxWidth="max-w-5xl"
      resizable={false}
    >
      <DraggableDialogBody>
        <p className="text-sm text-gray-400 mb-4 -mt-2" style={CG}>Attribuez une matière et des classes au professeur</p>
        <div className="space-y-6" style={CG}>
            {/* Professeur */}
            <div>
              <Label className="text-white">Professeur</Label>
              <div className="mt-2 p-4 rounded-lg" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)', border: '1px solid'}}>
                <p className="font-semibold text-lg text-white">
                  {professeur.prenom} {professeur.post_nom || ''} {professeur.nom}
                </p>
                <p className="text-sm text-gray-400 mt-1">{professeur.email}</p>
                {professeur.faculte && (
                  <Badge className="mt-2 bg-blue-600">{professeur.faculte}</Badge>
                )}
              </div>
            </div>

            {/* Sélection de la matière */}
            <div>
              <Label className="text-white">Matière *</Label>
              <Select value={selectedMatiereId} onValueChange={setSelectedMatiereId}>
                <SelectTrigger className="mt-2" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)', color: 'var(--ha-text)'}}>
                  <SelectValue placeholder="Sélectionnez une matière" />
                </SelectTrigger>
                <SelectContent style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
                  {loadingMatieres ? (
                    <div className="p-4 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-white" />
                    </div>
                  ) : matieres.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      Aucune matière disponible
                    </div>
                  ) : (
                    matieres.map(matiere => (
                      <SelectItem key={matiere.id} value={matiere.id} style={{color: 'var(--ha-text)'}}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{backgroundColor: matiere.couleur || '#1e40af'}}
                          />
                          <span>{matiere.nom}</span>
                          <span className="text-gray-400 text-xs ml-2">({matiere.code})</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Sélection avec hiérarchie selon l'image de référence */}
            {selectedMatiereId && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Facultés (sélection multiple)</Label>
                    <div className="border rounded-md p-2 max-h-40 overflow-y-auto" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                      {facultes.length === 0 ? (
                        <p className="text-sm text-gray-400">Aucune faculté disponible</p>
                      ) : (
                        facultes.map((f) => (
                          <label key={f.id} className="flex items-center gap-2 p-1 hover:bg-[#3d3d3d] rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedFacultes.includes(f.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFacultes([...selectedFacultes, f.id]);
                                } else {
                                  toggleFaculte(f.id);
                                }
                              }}
                            />
                            <span className="text-sm text-white">{f.nom}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Départements (sélection multiple)</Label>
                    <div className="border rounded-md p-2 max-h-40 overflow-y-auto" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                      {selectedFacultes.length === 0 ? (
                        <p className="text-sm text-gray-400">Sélectionnez d'abord une faculté</p>
                      ) : departementsDisponibles.length === 0 ? (
                        <p className="text-sm text-gray-400">Aucun département disponible</p>
                      ) : (
                        departementsDisponibles.map((d) => (
                          <label key={d.id} className="flex items-center gap-2 p-1 hover:bg-[#3d3d3d] rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedDepartements.includes(d.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDepartements([...selectedDepartements, d.id]);
                                } else {
                                  toggleDepartement(d.id);
                                }
                              }}
                            />
                            <span className="text-sm text-white">{d.nom}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Orientations (sélection multiple)</Label>
                    <div className="border rounded-md p-2 max-h-40 overflow-y-auto" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                      {orientationsDisponibles.length === 0 ? (
                        <p className="text-sm text-gray-400">Aucune orientation disponible</p>
                      ) : (
                        orientationsDisponibles.map((o) => (
                          <label key={o.id} className="flex items-center gap-2 p-1 hover:bg-[#3d3d3d] rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedOrientations.includes(o.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOrientations([...selectedOrientations, o.id]);
                                } else {
                                  toggleOrientation(o.id);
                                }
                              }}
                            />
                            <span className="text-sm text-white">{o.nom}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Options (sélection multiple)</Label>
                    <div className="border rounded-md p-2 max-h-40 overflow-y-auto" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                      {optionsDisponibles.length === 0 ? (
                        <p className="text-sm text-gray-400">Aucune option disponible</p>
                      ) : (
                        optionsDisponibles.map((o) => (
                          <label key={o.id} className="flex items-center gap-2 p-1 hover:bg-[#3d3d3d] rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedOptions.includes(o.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOptions([...selectedOptions, o.id]);
                                } else {
                                  toggleOption(o.id);
                                }
                              }}
                            />
                            <span className="text-sm text-white">{o.nom}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Structure Académique - même style que Nouvelle matière */}
                <div className="space-y-2">
                  <Label className="text-white">Structure Académique</Label>
                  <div className="border rounded-md p-2 h-96 overflow-y-auto" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                    {selectedFacultes.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">
                        Sélectionnez d'abord une ou plusieurs facultés ci-dessus
                      </p>
                    ) : selectedDepartements.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">
                        Sélectionnez ensuite un ou plusieurs départements
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {selectedFacultes.map(facId => {
                          const faculte = facultes.find(f => f.id === facId);
                          if (!faculte) return null;

                          const depts = departementsDisponibles.filter(d => d.faculte_id === facId);

                          return (
                            <div key={facId} className="mb-2">
                              <div className="flex items-center gap-2 p-2 bg-purple-600/20 rounded">
                                <Badge className="bg-purple-600 text-white text-xs">Faculté</Badge>
                                <span className="text-white text-sm font-semibold">{faculte.nom}</span>
                              </div>
                              <div className="ml-4 mt-1 space-y-1">
                                {depts.filter(d => selectedDepartements.includes(d.id)).map(dept => {
                                  const promotionsForDept = filteredClassesForDisplay.filter(promo => {
                                    return promo.departement_id === dept.id;
                                  });

                                  if (promotionsForDept.length === 0) return null;

                                  return (
                                    <div key={dept.id} className="mb-2">
                                      <div className="flex items-center gap-2 p-2 bg-blue-600/20 rounded">
                                        <Badge className="bg-blue-600 text-white text-xs">Département</Badge>
                                        <span className="text-white text-sm">{dept.nom}</span>
                                      </div>
                                      <div className="ml-4 mt-1 space-y-1">
                                                <div className="text-xs text-gray-400 uppercase font-semibold">Promotions</div>
                                                {promotionsForDept.map(promo => (
                                                  <label key={promo.id} className="flex items-center gap-2 p-1.5 hover:bg-[#3d3d3d] rounded cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      checked={selectedClassIds.includes(promo.id)}
                                                      onChange={(e) => {
                                                        if (e.target.checked) {
                                                          setSelectedClassIds([...selectedClassIds, promo.id]);
                                                        } else {
                                                          setSelectedClassIds(selectedClassIds.filter(id => id !== promo.id));
                                                        }
                                                      }}
                                                      className="rounded"
                                                    />
                                                    <span className="text-sm text-white">{promo.nom}</span>
                                                  </label>
                                                ))}
                                              </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {selectedClassIds.length > 0 && (
                    <p className="text-xs text-blue-400 mt-1">
                      {selectedClassIds.length} promotion(s) sélectionnée(s)
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
      </DraggableDialogBody>
      <DraggableDialogFooter>
        <Button
          variant="outline"
          onClick={handleClose}
          className="bg-[#2d2d2d] text-white border-[#4d4d4d]"
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createAffectationMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {createAffectationMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Création...
            </>
          ) : (
            'Créer l\'affectation'
          )}
        </Button>
      </DraggableDialogFooter>
    </DraggableDialog>
  );
}