import React, { useState, useEffect } from "react";
import { dataService } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Loader2, Clock, User, Settings, MessageSquare, AlertCircle, Save, Send, Badge, ClipboardList } from "lucide-react";
import WeekPicker from "@/components/rotation/WeekPicker";
import { buildPresenceListPayload, getPresenceListMatch } from "@/lib/presenceListUtils";

export default function RotationCours() {
  const { user: authUser, isLoadingAuth } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [editingHeures, setEditingHeures] = useState(false);
  const [customHeures, setCustomHeures] = useState(() => {
    const saved = localStorage.getItem('customHeures');
    return saved ? JSON.parse(saved) : [
      "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
      "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
    ];
  });
  const [showInstructionDialog, setShowInstructionDialog] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [instructionForm, setInstructionForm] = useState({
    classe_id: "",
    matiere_id: "",
    type: "instruction",
    titre: "",
    contenu: "",
    date_cours: "",
    important: false
  });
  const [selectedFaculte, setSelectedFaculte] = useState("");
  const [selectedDepartement, setSelectedDepartement] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedOrientation, setSelectedOrientation] = useState("");
  const [selectedClasse, setSelectedClasse] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  
  const [formData, setFormData] = useState({
    jour: "lundi",
    date_cours: "",
    heure_debut: "",
    heure_fin: "",
    faculte: "",
    departement: "",
    option: "",
    orientation: "",
    classe_id: "",
    classe_nom: "",
    matiere_id: "",
    matiere_nom: "",
    professeur_id: "",
    professeur_nom: "",
    salle: ""
  });

  const queryClient = useQueryClient();

  const syncPresenceListForRotation = async (rotation) => {
    const promotion = promotions.find((item) => item.id === rotation.classe_id);
    const assignationForCourse = assignations.find(
      (item) => item.classe_id === rotation.classe_id && item.matiere_id === rotation.matiere_id
    );
    const normalizedRotation = {
      ...rotation,
      professeur_id: assignationForCourse?.professeur_id || "",
      professeur_nom: assignationForCourse?.professeur_nom || ""
    };
    const sameDayLists = await dataService.query('ListePresence', { 
      filters: [{
        classe_id: rotation.classe_id,
        date: rotation.date_debut.split('T')[0]
      }], 
      sort: '-created_date', 
      limit: 200 
    });
    const existingList = getPresenceListMatch(normalizedRotation, sameDayLists);
    const payload = buildPresenceListPayload({
      rotation: normalizedRotation,
      promotion,
      existingList,
      etablissementNom: user?.etablissement_nom || ""
    });

    if (existingList?.id) {
      return await dataService.update('ListePresence', existingList.id, payload);
    }

    return await dataService.create('ListePresence', payload);
  };

  const deletePresenceListForRotation = async (rotation) => {
    const sameDayLists = await dataService.query('ListePresence', { filters: [{
      classe_id: rotation.classe_id,
      date: rotation.date_debut.split('T')[0]
    }] });
    const existingList = getPresenceListMatch(rotation, sameDayLists);
    if (existingList?.id) {
      await dataService.delete('ListePresence', existingList.id);
    }
  };

  const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const heures = customHeures;

  useEffect(() => {
    if (!isLoadingAuth) {
      loadUser();
    }
  }, [authUser, isLoadingAuth]);

  // Auto-remplir les filtres pour les étudiants depuis leurs données utilisateur
  useEffect(() => {
    if (user && user.role_archive === 'etudiant') {
      if (user.faculte && !selectedFaculte) setSelectedFaculte(user.faculte);
      if (user.departement && !selectedDepartement) setSelectedDepartement(user.departement);
      if (user.classe_id && !selectedClasse) setSelectedClasse(user.classe_id);
    }
  }, [user]);

  const loadUser = async () => {
    try {
      if (!authUser) {
        setLoading(false);
        return;
      }

      let currentUser = { ...authUser };

      if (currentUser.role_archive === 'admin_etablissement') {
        // La table establishments utilise la colonne "email" (pas admin_id/admin_email)
        let etablissements = await dataService.query('Etablissement', { filters: [{  email: currentUser.email  }],
  limit: 1000, offset: 0 });
        if (etablissements.length > 0) {
          currentUser = {
            ...currentUser,
            etablissement_id: etablissements[0].id,
            etablissement_nom: etablissements[0].name || etablissements[0].nom
          };
        }
      }

      // Pour les étudiants et professeurs, résoudre l'etablissement_id correct
      // via la table establishments (par nom), car leur compte peut référencer
      // l'ID de etablissements_agrees au lieu de establishments
      if (currentUser.role_archive === 'etudiant' || currentUser.role_archive === 'professeur') {
        if (currentUser.etablissement_nom) {
          try {
            const etablissements = await dataService.query('Etablissement', { filters: [{ name: currentUser.etablissement_nom }], limit: 5, offset: 0 });
            if (etablissements.length > 0) {
              currentUser = {
                ...currentUser,
                etablissement_id: etablissements[0].id,
                etablissement_nom: etablissements[0].name || etablissements[0].nom
              };
            }
          } catch (e) {
            // garder l'etablissement_id existant en cas d'erreur
          }
        }
      }

      setUser(currentUser);
    } catch (error) {
      console.error("Erreur chargement utilisateur:", error);
      if (authUser) setUser({ ...authUser });
    } finally {
      setLoading(false);
    }
  };

  const { data: rotations = [] } = useQuery({
    queryKey: ['rotations', user?.etablissement_id],
    queryFn: async () => {
      const allRotations = await dataService.query('CalendrierAcademique');
      return allRotations.filter(r => {
        if (r.type !== 'cours') return false;
        if (user?.etablissement_id && r.etablissement_id !== user.etablissement_id) return false;
        
        // Si l'utilisateur est admin, il voit tout (brouillon + publié)
        if (user?.role_archive === 'admin_etablissement') return true;
        
        // Sinon, on ne montre que les rotations publiées
        return r.statut_publication === 'publie';
      });
    },
    enabled: !!user
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', user?.etablissement_id],
    queryFn: async () => {
      const allPromotions = await dataService.query('Promotion');
      return allPromotions.filter(c => !user?.etablissement_id || c.etablissement_id === user.etablissement_id);
    },
    enabled: !!user
  });

  const sortPromotions = (promotionsList) => {
    const order = [
      "1ère Licence", "1ere Licence",
      "2ème Licence", "2eme Licence",
      "3ème Licence", "3eme Licence",
      "1ère Maîtrise", "1ere Maîtrise", "1ère Maitrise", "1ere Maitrise",
      "2ème Maîtrise", "2eme Maîtrise", "2ème Maitrise", "2eme Maitrise",
      "3ème Maîtrise", "3eme Maîtrise", "3ème Maitrise", "3eme Maitrise",
      "1ère Doctorat", "1ere Doctorat",
      "2ème Doctorat", "2eme Doctorat",
      "3ème Doctorat", "3eme Doctorat"
    ];
    
    return promotionsList.sort((a, b) => {
      const indexA = order.findIndex(o => a.nom.includes(o));
      const indexB = order.findIndex(o => b.nom.includes(o));
      
      if (indexA === -1 && indexB === -1) return a.nom.localeCompare(b.nom);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
  };

  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres', user?.etablissement_id],
    queryFn: async () => {
      const allMatieres = await dataService.query('Matiere');
      return allMatieres.filter(m => !user?.etablissement_id || m.etablissement_id === user.etablissement_id);
    },
    enabled: !!user
  });

  const { data: assignations = [] } = useQuery({
    queryKey: ['assignations', user?.etablissement_id],
    queryFn: async () => {
      const allAssignations = await dataService.query('AssignationProfesseur');
      return allAssignations.filter(a => !user?.etablissement_id || a.etablissement_id === user.etablissement_id);
    },
    enabled: !!user
  });

  // Map professeur_id -> nom complet depuis DemandeInscription
  const { data: profsMap = {} } = useQuery({
    queryKey: ['profs-map', user?.etablissement_id],
    queryFn: async () => {
      const demandes = await dataService.query('DemandeInscription', { filters: [{  
        type_utilisateur: 'professeur',
        statut: 'approuvee'
       }],
  limit: 1000, offset: 0 });
      const map = {};
      for (const d of demandes) {
        const fullName = [d.prenom, d.nom, d.post_nom].filter(Boolean).join(' ').trim();
        if (d.email) map[d.email] = fullName;
      }
      return map;
    },
    enabled: !!user
  });

  const { data: instructions = [] } = useQuery({
    queryKey: ['instructions', user?.etablissement_id],
    queryFn: async () => {
      const allInstructions = await dataService.query('InstructionCours', { filters: [] });
      return allInstructions.filter(i => {
        if (user?.etablissement_id && i.etablissement_id !== user.etablissement_id) return false;
        // Admin voit tout, professeur voit tout pour son établissement
        if (user?.role_archive === 'admin_etablissement' || user?.role_archive === 'professeur') return true;
        // Étudiant/parent : seulement les instructions de leur promotion
        if (user?.classe_id) return i.classe_id === user.classe_id;
        return false;
      });
    },
    enabled: !!user
  });

  const createRotationMutation = useMutation({
    mutationFn: async (rotationData) => {
      const createdRotation = await dataService.create('CalendrierAcademique', rotationData);
      await syncPresenceListForRotation(createdRotation);
      return createdRotation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rotations']);
      setShowDialog(false);
      resetForm();
    }
  });

  const updateRotationMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedRotation = await dataService.update('CalendrierAcademique', id, data);
      await syncPresenceListForRotation({ id, ...updatedRotation, ...data });
      return updatedRotation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rotations']);
      setShowDialog(false);
      setEditingSlot(null);
      resetForm();
    }
  });

  const deleteRotationMutation = useMutation({
    mutationFn: async (rotation) => {
      return await dataService.delete('CalendrierAcademique', rotation.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rotations']);
    }
  });

  const createInstructionMutation = useMutation({
    mutationFn: (data) => dataService.create('InstructionCours', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['instructions']);
      setShowInstructionDialog(false);
      resetInstructionForm();
    }
  });

  const updateInstructionMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('InstructionCours', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['instructions']);
      setShowInstructionDialog(false);
      setEditingInstruction(null);
      resetInstructionForm();
    }
  });

  const deleteInstructionMutation = useMutation({
    mutationFn: (id) => dataService.delete('InstructionCours', id),
    onSuccess: () => {
      queryClient.invalidateQueries(['instructions']);
    }
  });

  const handlePublishRotations = useMutation({
    mutationFn: async () => {
      const allRotations = await dataService.query('CalendrierAcademique');
      const brouillons = allRotations.filter(r => 
        r.type === 'cours' && 
        r.etablissement_id === user?.etablissement_id &&
        r.statut_publication === 'brouillon'
      );
      const promises = brouillons.map(async (rotation) => {
        await syncPresenceListForRotation(rotation);
        return await dataService.update('CalendrierAcademique', rotation.id, { 
          statut_publication: 'publie' 
        });
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rotations']);
      alert("Rotations publiées avec succès !");
    }
  });

  const resetForm = () => {
    setFormData({
      jour: "lundi",
      date_cours: "",
      heure_debut: "",
      heure_fin: "",
      faculte: "",
      departement: "",
      option: "",
      orientation: "",
      classe_id: "",
      classe_nom: "",
      matiere_id: "",
      matiere_nom: "",
      professeur_id: "",
      professeur_nom: "",
      salle: ""
    });
  };

  const resetInstructionForm = () => {
    setInstructionForm({
      classe_id: "",
      matiere_id: "",
      type: "instruction",
      titre: "",
      contenu: "",
      date_cours: "",
      important: false
    });
  };

  const handleSubmit = () => {
    if (!formData.faculte || !formData.departement || !formData.heure_debut || !formData.heure_fin || !formData.classe_id || !formData.matiere_id || !formData.date_cours) {
      alert("Veuillez remplir tous les champs obligatoires (Faculté, Département, Classe, Matière, Date, Horaires)");
      return;
    }

    const dateStr = formData.date_cours;

    const rotationData = {
      titre: `${formData.matiere_nom} - ${formData.classe_nom}`,
      type: 'cours',
      etablissement_id: user.etablissement_id,
      classe_id: formData.classe_id,
      classe_nom: formData.classe_nom,
      matiere_id: formData.matiere_id,
      matiere_nom: formData.matiere_nom,
      professeur_id: formData.professeur_id,
      professeur_nom: formData.professeur_nom,
      date_debut: `${dateStr}T${formData.heure_debut}:00`,
      date_fin: `${dateStr}T${formData.heure_fin}:00`,
      heure_debut: formData.heure_debut,
      heure_fin: formData.heure_fin,
      salle: formData.salle || undefined,
      couleur: matieres.find(m => m.id === formData.matiere_id)?.couleur || "#3b82f6",
      annee_scolaire: "2024-2025",
      statut_publication: "brouillon"
    };

    if (editingSlot) {
      updateRotationMutation.mutate({ id: editingSlot.id, data: rotationData });
    } else {
      createRotationMutation.mutate(rotationData);
    }
  };

  const handleEdit = (rotation) => {
    setEditingSlot(rotation);
    const date = new Date(rotation.date_debut);
    const jour = jours[date.getDay() - 1] || "lundi";
    const classe = promotions.find(c => c.id === rotation.classe_id);
    
    setFormData({
      jour: jour,
      date_cours: rotation.date_debut ? rotation.date_debut.split('T')[0] : "",
      heure_debut: rotation.heure_debut,
      heure_fin: rotation.heure_fin,
      faculte: classe?.faculte_nom || "",
      departement: classe?.departement_nom || "",
      option: classe?.option_nom || "",
      orientation: classe?.orientation_nom || "",
      classe_id: rotation.classe_id,
      classe_nom: rotation.classe_nom,
      matiere_id: rotation.matiere_id,
      matiere_nom: rotation.matiere_nom,
      professeur_id: rotation.professeur_id,
      professeur_nom: rotation.professeur_nom,
      salle: rotation.salle || ""
    });
    setShowDialog(true);
  };

  const handleClasseChange = (classeId) => {
    const promotion = promotions.find(c => c.id === classeId);
    setFormData({
      ...formData,
      classe_id: classeId,
      classe_nom: promotion?.nom || ""
    });
  };

  const handleMatiereChange = (matiereId) => {
    const matiere = matieres.find(m => m.id === matiereId);
    const assignation = assignations.find(a => 
      a.matiere_id === matiereId && a.classe_id === formData.classe_id
    );
    
    setFormData({
      ...formData,
      matiere_id: matiereId,
      matiere_nom: matiere?.nom || "",
      professeur_id: assignation?.professeur_id || "",
      professeur_nom: assignation?.professeur_nom || ""
    });
  };

  const getRotationsForDayAndHour = (jour, heure) => {
    return rotations.filter(rotation => {
      const date = new Date(rotation.date_debut);
      const jourRotation = jours[date.getDay() - 1];
      
      if (jourRotation !== jour) return false;
      
      // Vérifier si l'heure courante est couverte par cette rotation (de heure_debut inclus é  heure_fin exclus)
      const matchJourHeure = heure >= rotation.heure_debut && heure < rotation.heure_fin;
      
      if (!matchJourHeure) return false;
      
      // Filtrer par semaine si sélectionnée
      if (selectedWeek) {
        // selectedWeek format: "2026-W10"
        const [yearStr, weekStr] = selectedWeek.split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekStr);
        // Calculer le lundi de la semaine ISO
        const jan4 = new Date(year, 0, 4);
        const startOfWeek = new Date(jan4);
        startOfWeek.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const rotationDate = new Date(rotation.date_debut.split('T')[0]);
        if (rotationDate < startOfWeek || rotationDate > endOfWeek) return false;
      }
      
      // Filtrer par faculté, département, option, orientation, promotion
      if (selectedFaculte) {
        const promotion = promotions.find(c => c.id === rotation.classe_id);
        if (!promotion || (!selectedFaculteIds.includes(promotion.faculte_id) && promotion.faculte_nom !== selectedFaculte)) return false;
      }
      
      if (selectedDepartement) {
        const promotion = promotions.find(c => c.id === rotation.classe_id);
        if (!promotion || (!selectedDepartementIds.includes(promotion.departement_id) && promotion.departement_nom !== selectedDepartement)) return false;
      }
      
      if (selectedOption) {
        const promotion = promotions.find(c => c.id === rotation.classe_id);
        if (!promotion || (!selectedOptionIds.includes(promotion.option_id) && promotion.option_nom !== selectedOption)) return false;
      }
      
      if (selectedOrientation) {
        const promotion = promotions.find(c => c.id === rotation.classe_id);
        if (!promotion || (!selectedOrientationIds.includes(promotion.orientation_id) && promotion.orientation_nom !== selectedOrientation)) return false;
      }
      
      if (selectedClasse && rotation.classe_id !== selectedClasse) {
        return false;
      }
      
      return true;
    });
  };

  // Obtenir les facultés, départements, options uniques depuis la structure académique
  const { data: facultesData = [] } = useQuery({
    queryKey: ['facultes', user?.etablissement_id],
    queryFn: async () => {
      const allFacultes = await dataService.query('EtablissementFaculte');
      return allFacultes.filter(f => !user?.etablissement_id || f.etablissement_id === user.etablissement_id);
    },
    enabled: !!user
  });

  const { data: departementsData = [] } = useQuery({
    queryKey: ['departements', user?.etablissement_id, selectedFaculte],
    queryFn: async () => {
      const allDept = await dataService.query('EtablissementDepartement');
      return allDept.filter(d => 
        (!user?.etablissement_id || d.etablissement_id === user.etablissement_id) &&
        (!selectedFaculte || d.faculte_nom === selectedFaculte)
      );
    },
    enabled: !!user && !!selectedFaculte
  });

  const { data: optionsData = [] } = useQuery({
    queryKey: ['options', user?.etablissement_id, selectedFaculte, selectedDepartement],
    queryFn: async () => {
      const allOpts = await dataService.query('EtablissementOption');
      return allOpts.filter(o => 
        (!user?.etablissement_id || o.etablissement_id === user.etablissement_id) &&
        (!selectedFaculte || o.faculte_nom === selectedFaculte) &&
        (!selectedDepartement || o.departement_nom === selectedDepartement)
      );
    },
    enabled: !!user && !!selectedDepartement
  });

  const { data: orientationsData = [] } = useQuery({
    queryKey: ['orientations', user?.etablissement_id, selectedFaculte, selectedDepartement, selectedOption],
    queryFn: async () => {
      const allOrients = await dataService.query('EtablissementOrientation');
      return allOrients.filter(o => 
        (!user?.etablissement_id || o.etablissement_id === user.etablissement_id) &&
        (!selectedFaculte || o.faculte_nom === selectedFaculte) &&
        (!selectedDepartement || o.departement_nom === selectedDepartement) &&
        (!selectedOption || o.option_nom === selectedOption)
      );
    },
    enabled: !!user && !!selectedDepartement
  });

  const facultes = facultesData.map(f => f.nom);
  const departements = departementsData.map(d => d.nom);
  const options = optionsData.map(o => o.nom);
  const orientations = orientationsData.map(o => o.nom);

  // Résoudre les IDs à partir des noms sélectionnés pour un filtrage fiable
  const selectedFaculteIds = selectedFaculte ? facultesData.filter(f => f.nom === selectedFaculte).map(f => f.id) : [];
  const selectedDepartementIds = selectedDepartement ? departementsData.filter(d => d.nom === selectedDepartement).map(d => d.id) : [];
  const selectedOptionIds = selectedOption ? optionsData.filter(o => o.nom === selectedOption).map(o => o.id) : [];
  const selectedOrientationIds = selectedOrientation ? orientationsData.filter(o => o.nom === selectedOrientation).map(o => o.id) : [];
  
  const filteredPromotions = sortPromotions(promotions.filter(c => 
    (!selectedFaculte || selectedFaculteIds.includes(c.faculte_id) || c.faculte_nom === selectedFaculte) &&
    (!selectedDepartement || selectedDepartementIds.includes(c.departement_id) || c.departement_nom === selectedDepartement) &&
    (!selectedOption || selectedOptionIds.includes(c.option_id) || c.option_nom === selectedOption) &&
    (!selectedOrientation || selectedOrientationIds.includes(c.orientation_id) || c.orientation_nom === selectedOrientation)
  ));

  // Résoudre les IDs pour le formulaire
  const formFaculteIds = formData.faculte ? facultesData.filter(f => f.nom === formData.faculte).map(f => f.id) : [];
  const formDepartementIds = formData.departement ? departementsData.filter(d => d.nom === formData.departement).map(d => d.id) : [];

  // Filtrer les promotions pour le formulaire selon les sélections
  const formFilteredPromotions = sortPromotions(promotions.filter(c => {
    // Filtrer selon faculté si sélectionnée (par ID ou nom)
    if (formData.faculte && !formFaculteIds.includes(c.faculte_id) && c.faculte_nom !== formData.faculte) return false;
    
    // Filtrer selon département si sélectionné (par ID ou nom)
    if (formData.departement && !formDepartementIds.includes(c.departement_id) && c.departement_nom !== formData.departement) return false;
    
    // Option et orientation sont optionnels - si sélectionnés, on filtre
    if (formData.option && c.option_nom !== formData.option) return false;
    if (formData.orientation && c.orientation_nom !== formData.orientation) return false;
    
    return true;
  }));

  // Départements pour le formulaire
  const { data: formDepartementsData = [] } = useQuery({
    queryKey: ['form-departements', user?.etablissement_id, formData.faculte],
    queryFn: async () => {
      const allDept = await dataService.query('EtablissementDepartement');
      return allDept.filter(d => 
        d.etablissement_id === user.etablissement_id &&
        d.faculte_nom === formData.faculte
      );
    },
    enabled: !!user?.etablissement_id && !!formData.faculte
  });

  const { data: formOptionsData = [] } = useQuery({
    queryKey: ['form-options', user?.etablissement_id, formData.faculte, formData.departement],
    queryFn: async () => {
      const allOpts = await dataService.query('EtablissementOption');
      return allOpts.filter(o => 
        o.etablissement_id === user.etablissement_id &&
        o.faculte_nom === formData.faculte &&
        o.departement_nom === formData.departement
      );
    },
    enabled: !!user?.etablissement_id && !!formData.faculte && !!formData.departement
  });

  const { data: formOrientationsData = [] } = useQuery({
    queryKey: ['form-orientations', user?.etablissement_id, formData.faculte, formData.departement, formData.option],
    queryFn: async () => {
      const allOrients = await dataService.query('EtablissementOrientation');
      return allOrients.filter(o => 
        o.etablissement_id === user.etablissement_id &&
        (!formData.faculte || o.faculte_nom === formData.faculte) &&
        (!formData.departement || o.departement_nom === formData.departement)
      );
    },
    enabled: !!user?.etablissement_id && !!formData.faculte && !!formData.departement
  });

  const handleInstructionSubmit = () => {
    if (!instructionForm.classe_id || !instructionForm.matiere_id || !instructionForm.titre || !instructionForm.contenu) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const classe = promotions.find(c => c.id === instructionForm.classe_id);
    const matiere = matieres.find(m => m.id === instructionForm.matiere_id);

    const nomProf = [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ').trim() || user.full_name;
    const data = {
      ...instructionForm,
      professeur_id: user.id,
      professeur_nom: nomProf,
      etablissement_id: user.etablissement_id,
      classe_nom: classe?.nom || "",
      matiere_nom: matiere?.nom || ""
    };

    if (editingInstruction) {
      updateInstructionMutation.mutate({ id: editingInstruction.id, data });
    } else {
      createInstructionMutation.mutate(data);
    }
  };

  const handleEditInstruction = (instruction) => {
    setEditingInstruction(instruction);
    setInstructionForm({
      classe_id: instruction.classe_id,
      matiere_id: instruction.matiere_id,
      type: instruction.type,
      titre: instruction.titre,
      contenu: instruction.contenu,
      date_cours: instruction.date_cours || "",
      important: instruction.important || false
    });
    setShowInstructionDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#4d4d4d'}}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const canEdit = user.role_archive === 'admin_etablissement';
  const isProfesseur = user.role_archive === 'professeur';

  const handleSaveRotations = async () => {
    if (confirm("Sauvegarder toutes les rotations en brouillon ?")) {
      alert("Les rotations sont sauvegardées en brouillon");
    }
  };

  const brouillonsCount = rotations.filter(r => r.statut_publication === 'brouillon').length;
  const publiesCount = rotations.filter(r => r.statut_publication === 'publie').length;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: '#4d4d4d'}}>
      <div className="w-full px-4">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-12 h-12 text-white" />
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Rotation des Cours
                </h1>
                <p className="text-gray-300">
                  {canEdit ? 'Gérez les programmes de cours et les instructions' : 'Consultez les programmes de cours et les instructions'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <>
                  <Button onClick={() => setEditingHeures(true)} variant="outline" style={{color: 'white', borderColor: '#4d4d4d', backgroundColor: '#3d3d3d'}}>
                    <Settings className="w-4 h-4 mr-2" />
                    Gérer les horaires
                  </Button>
                  <Button onClick={() => setShowDialog(true)} style={{backgroundColor: '#3b82f6', color: 'white'}}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un cours
                  </Button>
                </>
              )}

            </div>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-4" style={{backgroundColor: '#3d3d3d', borderColor: '#4d4d4d'}}>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <Label style={{color: 'white'}} className="mb-2 block">Faculté</Label>
                <Select value={selectedFaculte} onValueChange={(val) => {
                  setSelectedFaculte(val);
                  setSelectedDepartement("");
                  setSelectedOption("");
                  setSelectedOrientation("");
                  setSelectedClasse("");
                }}>
                  <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {facultes.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label style={{color: 'white'}} className="mb-2 block">Département</Label>
                <Select 
                  value={selectedDepartement} 
                  onValueChange={(val) => {
                    setSelectedDepartement(val);
                    setSelectedOption("");
                    setSelectedOrientation("");
                    setSelectedClasse("");
                  }}
                  disabled={!selectedFaculte}
                >
                  <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {departements.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label style={{color: 'white'}} className="mb-2 block">Option</Label>
                <Select 
                  value={selectedOption} 
                  onValueChange={(val) => {
                    setSelectedOption(val);
                    setSelectedOrientation("");
                    setSelectedClasse("");
                  }}
                  disabled={!selectedDepartement}
                >
                  <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label style={{color: 'white'}} className="mb-2 block">Orientation</Label>
                <Select 
                  value={selectedOrientation} 
                  onValueChange={(val) => {
                    setSelectedOrientation(val);
                    setSelectedClasse("");
                  }}
                  disabled={!selectedDepartement}
                >
                  <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {orientations.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label style={{color: 'white'}} className="mb-2 block">Promotion</Label>
                <Select value={selectedClasse} onValueChange={setSelectedClasse} disabled={!selectedDepartement}>
                  <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPromotions.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label style={{color: 'white'}} className="mb-2 block">Semaine</Label>
                <WeekPicker value={selectedWeek} onChange={setSelectedWeek} />
              </div>
            </div>
          </CardContent>
        </Card>

        {(!selectedFaculte || !selectedDepartement || !selectedClasse || !selectedWeek) && (
          <div className="mb-4 px-4 py-3 rounded-lg flex items-center gap-2" style={{backgroundColor: '#2d2d2d', borderLeft: '4px solid #f59e0b'}}>
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-300 text-sm">
              Veuillez sélectionner{[
                !selectedFaculte && "une Faculté",
                !selectedDepartement && "un Département",
                !selectedClasse && "une Promotion",
                !selectedWeek && "une Semaine"
              ].filter(Boolean).join(", ")} pour afficher la rotation des cours.
            </p>
          </div>
        )}

        <Card style={{backgroundColor: '#3d3d3d', borderColor: '#4d4d4d'}}>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{backgroundColor: '#3d3d3d'}}>
                <thead>
                  <tr style={{backgroundColor: '#2d2d2d'}}>
                    <th className="p-3 text-left text-white border" style={{borderColor: '#4d4d4d', minWidth: '100px'}}>
                      <Clock className="w-4 h-4 inline mr-2" />
                      Horaire
                    </th>
                    {jours.map(jour => (
                      <th key={jour} className="p-3 text-center text-white border capitalize" style={{borderColor: '#4d4d4d', minWidth: '150px'}}>
                        {jour}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heures.map(heure => (
                    <tr key={heure} style={{borderColor: '#4d4d4d'}}>
                      <td className="p-3 text-white font-semibold border" style={{borderColor: '#4d4d4d', backgroundColor: '#2d2d2d'}}>
                        {heure}
                      </td>
                      {jours.map(jour => {
                        const coursSlots = getRotationsForDayAndHour(jour, heure);
                        const canShowRotations = selectedFaculte && selectedDepartement && selectedClasse && selectedWeek;
                        return (
                          <td key={`${jour}-${heure}`} className="p-2 border align-top" style={{borderColor: '#4d4d4d'}}>
                            {canShowRotations && coursSlots.length > 0 ? (
                              <div className="space-y-1">
                                {coursSlots.map(cours => (
                                  <div
                                    key={cours.id}
                                    className="p-2 rounded-lg text-white text-sm relative group text-center"
                                    style={{backgroundColor: cours.couleur || '#3b82f6'}}
                                  >
                                    <div className="font-bold text-xs mb-1">{cours.matiere_nom}</div>
                                    <div className="text-xs opacity-90">
                                      {(() => {
                                        const idx = heures.indexOf(heure);
                                        const nextHeure = heures[idx + 1];
                                        const slotEnd = nextHeure || cours.heure_fin;
                                        return `${heure} - ${slotEnd}`;
                                      })()}
                                    </div>

                                    {canEdit && (
                                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleEdit(cours)}
                                          className="text-white hover:bg-white hover:bg-opacity-20 h-5 w-5 p-0"
                                          title="Modifier"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const message = cours.statut_publication === 'publie' 
                                              ? "Attention : Cette rotation est publiée. Voulez-vous vraiment la supprimer ?" 
                                              : "Supprimer cette rotation ?";
                                            if (confirm(message)) {
                                              deleteRotationMutation.mutate(cours);
                                            }
                                          }}
                                          className="text-white hover:bg-red-500 hover:bg-opacity-30 h-5 w-5 p-0"
                                          title="Supprimer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-500 text-xs italic text-center py-2">
                                {!canShowRotations ? "–" : "-"}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Boutons Enregistrer et Publier */}
            {canEdit && rotations.length > 0 && (
              <div className="mt-6 flex items-center justify-between p-4 rounded-lg" style={{backgroundColor: '#2d2d2d'}}>
                <div className="text-white">
                  <p className="text-sm mb-1">
                    <span className="font-semibold">{brouillonsCount}</span> rotation(s) en brouillon · 
                    <span className="font-semibold ml-2">{publiesCount}</span> rotation(s) publiée(s)
                  </p>
                  <p className="text-xs text-gray-400">
                    Les rotations en brouillon sont modifiables. Une fois publiées, elles seront visibles par tous.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={handleSaveRotations}
                    variant="outline"
                    style={{color: 'white', borderColor: '#4d4d4d', backgroundColor: '#3d3d3d'}}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </Button>
                  <Button 
                    onClick={() => handlePublishRotations.mutate()}
                    disabled={brouillonsCount === 0 || handlePublishRotations.isPending}
                    style={{backgroundColor: '#10b981', color: 'white'}}
                  >
                    {handlePublishRotations.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Publier ({brouillonsCount})
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section Instructions & Communiqués */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Instructions & Communiqués</h2>
            </div>
            {isProfesseur && (
              <Button onClick={() => setShowInstructionDialog(true)} style={{backgroundColor: '#10b981', color: 'white'}}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une instruction
              </Button>
            )}
          </div>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#4d4d4d'}}>
            <CardContent className="pt-6">
              {instructions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">Aucune instruction pour le moment</p>
                  <p className="text-sm text-gray-500">
                    {isProfesseur ? "Ajoutez des instructions pour vos cours" : "Les professeurs peuvent ajouter des instructions ici"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {instructions.map((instruction) => (
                    <div
                      key={instruction.id}
                      className="p-4 rounded-lg"
                      style={{
                        backgroundColor: instruction.important ? '#3b2f1f' : '#2d2d2d',
                        borderLeft: instruction.important ? '4px solid #f59e0b' : '4px solid #4d4d4d'
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-semibold">{instruction.titre}</h3>
                            {instruction.important && (
                              <Badge className="text-xs" style={{backgroundColor: '#f59e0b', color: 'white'}}>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Important
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs" style={{color: 'white', borderColor: '#4d4d4d'}}>
                              {instruction.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                            <span>{instruction.classe_nom}</span>
                            <span>·</span>
                            <span>{instruction.matiere_nom}</span>
                            <span>·</span>
                            <span>Par {
                              // Si professeur_nom ressemble é  un email, on cherche le vrai nom
                              (instruction.professeur_nom && instruction.professeur_nom.includes('@'))
                                ? (profsMap[instruction.professeur_nom] || instruction.professeur_nom)
                                : (instruction.professeur_nom || profsMap[instruction.professeur_id] || instruction.professeur_id)
                            }</span>
                            {instruction.date_cours && (
                              <>
                                <span>·</span>
                                <span>{new Date(instruction.date_cours).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {(isProfesseur && user.id === instruction.professeur_id) && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditInstruction(instruction)}
                              style={{color: 'white'}}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Supprimer cette instruction ?")) {
                                  deleteInstructionMutation.mutate(instruction.id);
                                }
                              }}
                              style={{color: '#ff4444'}}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap">{instruction.contenu}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(instruction.created_date).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DraggableDialog
          open={showDialog}
          onOpenChange={(open) => { if (!open) { setShowDialog(false); setEditingSlot(null); resetForm(); } }}
          title={
            <span style={{fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif", fontWeight: 600, color: '#ffffff'}}>
              {editingSlot ? "Modifier le cours" : "Ajouter un cours"}
            </span>
          }
          maxWidth="max-w-2xl"
        >
          <DraggableDialogBody>
            <div className="space-y-4 py-4" style={{fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"}}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label style={{color: 'white'}}>Matière *</Label>
                  <Select value={formData.matiere_id} onValueChange={handleMatiereChange}>
                    <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {matieres
                        .filter(matiere => {
                          // Si une promotion est sélectionnée, filtrer les matières par niveau
                          if (formData.classe_id) {
                            const promotion = promotions.find(c => c.id === formData.classe_id);
                            if (promotion && matiere.niveaux && matiere.niveaux.length > 0) {
                              return matiere.niveaux.includes(promotion.nom);
                            }
                          }
                          return true;
                        })
                        .map(matiere => {
                          const details = [
                            matiere.faculte,
                            matiere.code
                          ].filter(Boolean).join(' - ');
                          
                          return (
                            <SelectItem key={matiere.id} value={matiere.id}>
                              {matiere.nom}
                              {details && ` (${details})`}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label style={{color: 'white'}}>Faculté *</Label>
                  <Select 
                    value={formData.faculte} 
                    onValueChange={(val) => {
                      console.log("Faculté sélectionnée:", val);
                      setFormData({
                        ...formData, 
                        faculte: val,
                        departement: "",
                        option: "",
                        orientation: "",
                        classe_id: "",
                        classe_nom: ""
                      });
                    }}
                  >
                    <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                      <SelectValue placeholder="Sélectionner faculté" />
                    </SelectTrigger>
                    <SelectContent>
                      {facultesData.map(f => (
                        <SelectItem key={f.id} value={f.nom}>{f.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.faculte && <p className="text-xs text-gray-400 mt-1">Sélectionné: {formData.faculte}</p>}
                </div>

                <div>
                  <Label style={{color: 'white'}}>Département *</Label>
                  <Select 
                    value={formData.departement} 
                    onValueChange={(val) => {
                      console.log("Département sélectionné:", val);
                      setFormData({
                        ...formData, 
                        departement: val,
                        option: "",
                        orientation: "",
                        classe_id: "",
                        classe_nom: ""
                      });
                    }}
                    disabled={!formData.faculte}
                  >
                    <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                      <SelectValue placeholder={formData.faculte ? "Sélectionner département" : "Choisir faculté d'abord"} />
                    </SelectTrigger>
                    <SelectContent>
                      {formDepartementsData.length === 0 ? (
                        <div className="p-2 text-sm text-gray-400">Aucun département disponible</div>
                      ) : (
                        formDepartementsData.map(d => (
                          <SelectItem key={d.id} value={d.nom}>{d.nom}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formData.departement && <p className="text-xs text-gray-400 mt-1">Sélectionné: {formData.departement}</p>}
                </div>

                <div>
                  <Label style={{color: 'white'}}>Option</Label>
                  <Select 
                    value={formData.option} 
                    onValueChange={(val) => {
                      console.log("Option sélectionnée:", val);
                      setFormData({
                        ...formData, 
                        option: val,
                        orientation: "",
                        classe_id: "",
                        classe_nom: ""
                      });
                    }}
                    disabled={!formData.departement}
                  >
                    <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                      <SelectValue placeholder={formData.departement ? "Sélectionner option" : "Choisir département d'abord"} />
                    </SelectTrigger>
                    <SelectContent>
                      {formOptionsData.length === 0 ? (
                        <div className="p-2 text-sm text-gray-400">Aucune option disponible</div>
                      ) : (
                        formOptionsData.map(o => (
                          <SelectItem key={o.id} value={o.nom}>{o.nom}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formData.option && <p className="text-xs text-gray-400 mt-1">Sélectionné: {formData.option}</p>}
                </div>

                <div>
                  <Label style={{color: 'white'}}>Orientation</Label>
                  <Select 
                    value={formData.orientation} 
                    onValueChange={(val) => {
                      console.log("Orientation sélectionnée:", val);
                      setFormData({
                        ...formData, 
                        orientation: val,
                        classe_id: "",
                        classe_nom: ""
                      });
                    }}
                    disabled={!formData.departement}
                  >
                    <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                      <SelectValue placeholder="Sélectionner orientation (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {formOrientationsData.length === 0 ? (
                        <div className="p-2 text-sm text-gray-400">Aucune orientation disponible</div>
                      ) : (
                        formOrientationsData.map(o => (
                          <SelectItem key={o.id} value={o.nom}>{o.nom}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formData.orientation && <p className="text-xs text-gray-400 mt-1">Sélectionné: {formData.orientation}</p>}
                </div>

                <div>
                  <Label style={{color: 'white'}}>Promotion *</Label>
                  <Select value={formData.classe_id} onValueChange={handleClasseChange}>
                    <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {formFilteredPromotions.map(promotion => (
                        <SelectItem key={promotion.id} value={promotion.id}>
                          {promotion.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label style={{color: 'white'}}>Professeur</Label>
                  <Select 
                    value={formData.professeur_id} 
                    onValueChange={(val) => {
                      const assignation = assignations.find(a => a.professeur_id === val);
                      setFormData({
                        ...formData,
                        professeur_id: val,
                        professeur_nom: assignation?.professeur_nom || ""
                      });
                    }}
                  >
                    <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                      <SelectValue placeholder="Sélectionner un professeur" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignations
                        .filter((a, index, self) => 
                          index === self.findIndex(t => t.professeur_id === a.professeur_id)
                        )
                        .map(assignation => (
                          <SelectItem key={assignation.professeur_id} value={assignation.professeur_id}>
                            {assignation.professeur_nom}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label style={{color: 'white'}}>Jour *</Label>
                  <Select value={formData.jour} onValueChange={(val) => setFormData({...formData, jour: val})}>
                    <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {jours.map(jour => (
                        <SelectItem key={jour} value={jour} className="capitalize">{jour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label style={{color: 'white'}}>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date_cours}
                    onChange={(e) => setFormData({...formData, date_cours: e.target.value})}
                    style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}
                  />
                </div>

                <div>
                  <Label style={{color: 'white'}}>Heure début *</Label>
                  <Input
                    type="time"
                    value={formData.heure_debut}
                    onChange={(e) => setFormData({...formData, heure_debut: e.target.value})}
                    style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}
                  />
                </div>

                <div>
                  <Label style={{color: 'white'}}>Heure fin *</Label>
                  <Input
                    type="time"
                    value={formData.heure_fin}
                    onChange={(e) => setFormData({...formData, heure_fin: e.target.value})}
                    style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}
                  />
                </div>
              </div>
            </div>

          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowDialog(false); setEditingSlot(null); resetForm(); }}
              style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createRotationMutation.isPending || updateRotationMutation.isPending}
              style={{backgroundColor: '#3b82f6', color: 'white'}}
            >
              {(createRotationMutation.isPending || updateRotationMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingSlot ? "Modifier" : "Créer"}
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>

        <DraggableDialog
          open={editingHeures}
          onOpenChange={setEditingHeures}
          title={
            <span style={{fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif", fontWeight: 600, color: '#ffffff'}}>
              Gérer les Horaires
            </span>
          }
          maxWidth="max-w-md"
        >
          <DraggableDialogBody>
            <div className="space-y-4 py-4" style={{fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"}}>
              <div className="space-y-2">
                {customHeures.map((heure, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={heure}
                      onChange={(e) => {
                        const newHeures = [...customHeures];
                        newHeures[index] = e.target.value;
                        setCustomHeures(newHeures);
                      }}
                      style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newHeures = customHeures.filter((_, i) => i !== index);
                        setCustomHeures(newHeures);
                      }}
                      style={{color: '#ff4444'}}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button
                onClick={() => {
                  setCustomHeures([...customHeures, "19:00"]);
                }}
                variant="outline"
                className="w-full"
                style={{color: 'white', borderColor: '#4d4d4d', backgroundColor: '#2d2d2d', fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"}}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un horaire
              </Button>
            </div>

          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingHeures(false);
                const saved = localStorage.getItem('customHeures');
                if (saved) { setCustomHeures(JSON.parse(saved)); }
                else { setCustomHeures(["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"]); }
              }}
              style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d', fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"}}
            >
              Annuler
            </Button>
            <Button
              onClick={() => { localStorage.setItem('customHeures', JSON.stringify(customHeures)); setEditingHeures(false); alert("Horaires enregistrés avec succès !"); }}
              style={{backgroundColor: '#10b981', color: 'white', fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"}}
            >
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>

        <DraggableDialog
          open={showInstructionDialog}
          onOpenChange={(open) => { if (!open) { setShowInstructionDialog(false); setEditingInstruction(null); resetInstructionForm(); } }}
          title={editingInstruction ? "Modifier l'instruction" : "Ajouter une instruction"}
          maxWidth="max-w-2xl"
        >
          <DraggableDialogBody>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label style={{color: 'white'}}>Promotion *</Label>
                  <Select value={instructionForm.classe_id} onValueChange={(val) => setInstructionForm({...instructionForm, classe_id: val})}>
                    <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortPromotions(promotions).map(promotion => {
                        const details = [
                          promotion.faculte_nom,
                          promotion.departement_nom, 
                          promotion.option_nom,
                          promotion.orientation_nom
                        ].filter(Boolean).join(' - ');
                        
                        return (
                          <SelectItem key={promotion.id} value={promotion.id}>
                            {promotion.nom}
                            {details && ` (${details})`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label style={{color: 'white'}}>Matière *</Label>
                  <Select value={instructionForm.matiere_id} onValueChange={(val) => setInstructionForm({...instructionForm, matiere_id: val})}>
                    <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {matieres
                        .filter(matiere => {
                          // Si une promotion est sélectionnée, filtrer les matières par niveau
                          if (instructionForm.classe_id) {
                            const promotion = promotions.find(c => c.id === instructionForm.classe_id);
                            // Si la matière n'a pas de niveaux définis (ou tableau vide), elle est disponible pour toutes les promotions
                            if (!matiere.niveaux || matiere.niveaux.length === 0) {
                              return true;
                            }
                            // Si la promotion a un nom et la matière a des niveaux définis, vérifier la correspondance
                            if (promotion && promotion.nom) {
                              return matiere.niveaux.includes(promotion.nom);
                            }
                            // Si la promotion n'a pas de nom, afficher toutes les matières
                            return true;
                          }
                          return true;
                        })
                        .map(matiere => {
                          const details = [
                            matiere.faculte,
                            matiere.code
                          ].filter(Boolean).join(' - ');
                          
                          return (
                            <SelectItem key={matiere.id} value={matiere.id}>
                              {matiere.nom}
                              {details && ` (${details})`}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label style={{color: 'white'}}>Type *</Label>
                  <Select value={instructionForm.type} onValueChange={(val) => setInstructionForm({...instructionForm, type: val})}>
                    <SelectTrigger style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instruction">Instruction</SelectItem>
                      <SelectItem value="communique">Communiqué</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label style={{color: 'white'}}>Date du cours (optionnel)</Label>
                  <Input
                    type="date"
                    value={instructionForm.date_cours}
                    onChange={(e) => setInstructionForm({...instructionForm, date_cours: e.target.value})}
                    style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}
                  />
                </div>

                <div className="col-span-2">
                  <Label style={{color: 'white'}}>Titre *</Label>
                  <Input
                    value={instructionForm.titre}
                    onChange={(e) => setInstructionForm({...instructionForm, titre: e.target.value})}
                    placeholder="Ex: Devoirs pour la prochaine séance"
                    style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}
                  />
                </div>

                <div className="col-span-2">
                  <Label style={{color: 'white'}}>Contenu *</Label>
                  <Textarea
                    value={instructionForm.contenu}
                    onChange={(e) => setInstructionForm({...instructionForm, contenu: e.target.value})}
                    placeholder="Écrivez vos instructions ou communiqué..."
                    rows={6}
                    style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="important"
                    checked={instructionForm.important}
                    onChange={(e) => setInstructionForm({...instructionForm, important: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="important" style={{color: 'white'}}>
                    Marquer comme important
                  </Label>
                </div>
              </div>
            </div>

          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowInstructionDialog(false); setEditingInstruction(null); resetInstructionForm(); }}
              style={{backgroundColor: '#2d2d2d', color: 'white', borderColor: '#4d4d4d'}}
            >
              Annuler
            </Button>
            <Button
              onClick={handleInstructionSubmit}
              disabled={createInstructionMutation.isPending || updateInstructionMutation.isPending}
              style={{backgroundColor: '#10b981', color: 'white'}}
            >
              {(createInstructionMutation.isPending || updateInstructionMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingInstruction ? "Modifier" : "Créer"}
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>
      </div>
    </div>
  );
}

