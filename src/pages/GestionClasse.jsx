import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
  Eye,
  Loader2,
  UserCheck,
  ClipboardList,
  Shield,
  Target,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  Shuffle,
  UserPlus,
  BarChart3,
  Send,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatUserName } from "@/components/utils/nameUtils";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

export default function GestionClasse() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClasse, setSelectedClasse] = useState("");
  const [selectedMatiere, setSelectedMatiere] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialogs
  const [openObservationDialog, setOpenObservationDialog] = useState(false);
  const [openRegleDialog, setOpenRegleDialog] = useState(false);
  const [openGroupeDialog, setOpenGroupeDialog] = useState(false);
  const [openPresenceDialog, setOpenPresenceDialog] = useState(false);
  
  const [editingObservation, setEditingObservation] = useState(null);
  const [editingRegle, setEditingRegle] = useState(null);
  const [editingGroupe, setEditingGroupe] = useState(null);
  const [selectedEtudiant, setSelectedEtudiant] = useState(null);
  const [expandedPromotions, setExpandedPromotions] = useState({});

  // Forms
  const [observationForm, setObservationForm] = useState({
    type: "comportement",
    categorie: "neutre",
    description: "",
    contexte: "",
    actions_menees: "",
    suivi_necessaire: false,
    visible_parents: false
  });

  const [regleForm, setRegleForm] = useState({
    titre: "",
    description: "",
    categorie: "comportement",
    niveau_importance: "moyen",
    consequences: "",
    active: true
  });

  const [groupeForm, setGroupeForm] = useState({
    nom: "",
    description: "",
    type: "travail",
    critere_formation: "",
    membres: []
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les assignations
  const { data: assignations = [] } = useQuery({
    queryKey: ['assignations-prof', user?.email],
    queryFn: async () => {
      // Trouver d'abord la demande d'inscription approuvée du professeur
      const demandes = await dataService.query('DemandeInscription', { filters: [{
        email: user.email,
        type_utilisateur: 'professeur',
        statut: 'approuvee'
      }]});
      
      if (demandes.length === 0) return [];
      
      const demandeProf = demandes[0];
      
      // Charger les assignations avec le professeur_id correspondant
      return await dataService.query('AssignationProfesseur', { filters: [{
        professeur_id: demandeProf.id
      }]});
    },
    enabled: !!user?.email
  });

  const classes = [...new Map(assignations.map(a => [a.classe_id, { id: a.classe_id, nom: a.classe_nom }])).values()];

  // Récupérer les matières de la classe sélectionnée
  const matieresClasse = selectedClasse 
    ? assignations.filter(a => a.classe_id === selectedClasse)
    : [];

  // Récupérer le nom de la classe sélectionnée
  const selectedClasseNom = classes.find(c => c.id === selectedClasse)?.nom;
  const selectedAssignation = selectedClasse && selectedMatiere
    ? assignations.find(a => a.classe_id === selectedClasse && a.matiere_id === selectedMatiere)
    : null;
  const selectedProfesseurId = selectedAssignation?.professeur_id || user?.id;
  const selectedProfesseurNom = selectedAssignation?.professeur_nom || formatUserName(user);

  // Charger tous les étudiants de l'établissement
  const { data: allEtudiants = [] } = useQuery({
    queryKey: ['etudiants-inscriptions', user?.etablissement_nom],
    queryFn: async () => {
      return await dataService.query('DemandeInscription', { filters: [{
        type_utilisateur: 'etudiant',
        statut: 'approuvee',
        etablissement_nom: user.etablissement_nom,
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user?.etablissement_nom
  });

  // Filtrer les étudiants de la classe sélectionnée
  const etudiants = selectedClasseNom 
    ? allEtudiants.filter(e => e.classe === selectedClasseNom)
    : [];

  // Charger les observations
  const { data: observations = [] } = useQuery({
    queryKey: ['observations', selectedClasse],
    queryFn: async () => {
      return await dataService.query('ObservationEleve', { filters: [{
        classe_id: selectedClasse,
        professeur_id: user.id
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!selectedClasse && !!user
  });

  // Charger la rotation du cours sélectionné pour récupérer les bonnes heures
  const { data: rotationsCoursSelectionne = [] } = useQuery({
    queryKey: ['rotations-presence', selectedClasse, selectedMatiere, selectedDate],
    queryFn: async () => {
      const rotations = await dataService.query('CalendrierAcademique', { filters: [{
        type: 'cours',
        classe_id: selectedClasse,
        matiere_id: selectedMatiere
      }],
  limit: 1000, offset: 0 });

      // Jour de la semaine de la date sélectionnée (0=Dim, 1=Lun, ..., 6=Sam)
      const selectedDayOfWeek = new Date(selectedDate).getDay();

      // 1. Chercher une rotation dont la date_debut correspond exactement
      const exactMatch = rotations.filter(r => r.date_debut?.split('T')[0] === selectedDate);
      if (exactMatch.length > 0) {
        return exactMatch.sort((a, b) => String(a.heure_debut || '').localeCompare(String(b.heure_debut || '')));
      }

      // 2. Sinon, chercher les rotations récurrentes dont le jour de semaine correspond
      const recurring = rotations.filter(r => {
        if (!r.recurrence?.active) return false;
        const jours = r.recurrence?.jours_semaine || [];
        if (!jours.includes(selectedDayOfWeek)) return false;
        // Vérifier que selectedDate est après date_debut
        const debutDate = r.date_debut?.split('T')[0];
        if (!debutDate || debutDate > selectedDate) return false;
        // Vérifier que selectedDate est avant date_fin_recurrence si défini
        const finDate = r.recurrence?.date_fin_recurrence;
        if (finDate && selectedDate > finDate) return false;
        return true;
      });

      return recurring.sort((a, b) => String(a.heure_debut || '').localeCompare(String(b.heure_debut || '')));
    },
    enabled: !!selectedClasse && !!selectedMatiere && !!selectedDate
  });

  const heureDebutCours = rotationsCoursSelectionne[0]?.heure_debut || '';
  const heureFinCours = rotationsCoursSelectionne[rotationsCoursSelectionne.length - 1]?.heure_fin || '';
  const calendrierIdCours = rotationsCoursSelectionne[0]?.id || '';

  // Charger les listes de présence envoyées pour ce cours précis
  const { data: listesPresenceEnvoyees = [] } = useQuery({
    queryKey: ['listes-presence-envoyees', selectedClasse, selectedMatiere, selectedDate, selectedProfesseurId],
    queryFn: async () => {
      return await dataService.query('ListePresence', { filters: [{
        classe_id: selectedClasse,
        matiere_id: selectedMatiere,
        date: selectedDate,
        professeur_id: selectedProfesseurId
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!selectedClasse && !!selectedMatiere && !!selectedDate && !!selectedProfesseurId
  });

  // Charger les présences du jour pour ce cours précis
  const { data: presences = [] } = useQuery({
    queryKey: ['presences', selectedClasse, selectedMatiere, selectedDate, selectedProfesseurId],
    queryFn: async () => {
      return await dataService.query('Presence', { filters: [{
        classe_id: selectedClasse,
        matiere_id: selectedMatiere,
        date: selectedDate,
        professeur_id: selectedProfesseurId
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!selectedClasse && !!selectedMatiere && !!selectedDate && !!selectedProfesseurId
  });

  // Charger les règles
  const { data: regles = [] } = useQuery({
    queryKey: ['regles', selectedClasse],
    queryFn: async () => {
      return await dataService.query('RegleClasse', { filters: [{
        classe_id: selectedClasse,
        professeur_id: user.id
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!selectedClasse && !!user
  });

  // Charger les groupes
  const { data: groupes = [] } = useQuery({
    queryKey: ['groupes', selectedClasse],
    queryFn: async () => {
      return await dataService.query('GroupeClasse', { filters: [{
        classe_id: selectedClasse,
        professeur_id: user.id,
        actif: true
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!selectedClasse && !!user
  });

  // Charger les statistiques de présence
  const { data: statistiquesPresence = [] } = useQuery({
    queryKey: ['stats-presence', selectedClasse],
    queryFn: async () => {
      return await dataService.query('StatistiquePresence', { filters: [{
        classe_id: selectedClasse
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!selectedClasse
  });

  // Mutations observations
  const createObservationMutation = useMutation({
    mutationFn: (data) => dataService.create('ObservationEleve', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] });
      setOpenObservationDialog(false);
      resetObservationForm();
    }
  });

  const updateObservationMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('ObservationEleve', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] });
      setOpenObservationDialog(false);
      resetObservationForm();
    }
  });

  const deleteObservationMutation = useMutation({
    mutationFn: (id) => dataService.delete('ObservationEleve', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] });
    }
  });

  // Mutations règles
  const createRegleMutation = useMutation({
    mutationFn: (data) => dataService.create('RegleClasse', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regles'] });
      setOpenRegleDialog(false);
      resetRegleForm();
    }
  });

  const updateRegleMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('RegleClasse', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regles'] });
      setOpenRegleDialog(false);
      resetRegleForm();
    }
  });

  const deleteRegleMutation = useMutation({
    mutationFn: (id) => dataService.delete('RegleClasse', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regles'] });
    }
  });

  // Mutations groupes
  const createGroupeMutation = useMutation({
    mutationFn: (data) => dataService.create('GroupeClasse', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupes'] });
      setOpenGroupeDialog(false);
      resetGroupeForm();
    }
  });

  const deleteGroupeMutation = useMutation({
    mutationFn: (id) => dataService.delete('GroupeClasse', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupes'] });
    }
  });



  // Mutations présences
  const savePresenceMutation = useMutation({
    mutationFn: (data) => dataService.create('Presence', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presences'] });
    }
  });

  const updatePresenceMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('Presence', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presences'] });
    }
  });

  const deletePresenceMutation = useMutation({
    mutationFn: (id) => dataService.delete('Presence', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presences'] });
    }
  });

  const updateListePresenceMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('ListePresence', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listes-presence-envoyees'] });
      queryClient.invalidateQueries({ queryKey: ['listes-presence'] });
    }
  });

  const resetObservationForm = () => {
    setObservationForm({
      type: "comportement",
      categorie: "neutre",
      description: "",
      contexte: "",
      actions_menees: "",
      suivi_necessaire: false,
      visible_parents: false
    });
    setEditingObservation(null);
    setSelectedEtudiant(null);
  };

  const resetRegleForm = () => {
    setRegleForm({
      titre: "",
      description: "",
      categorie: "comportement",
      niveau_importance: "moyen",
      consequences: "",
      active: true
    });
    setEditingRegle(null);
  };

  const resetGroupeForm = () => {
    setGroupeForm({
      nom: "",
      description: "",
      type: "travail",
      critere_formation: "",
      membres: []
    });
    setEditingGroupe(null);
  };

  const handleSaveObservation = async () => {
    if (!selectedEtudiant || !observationForm.description) {
      alert("Veuillez sélectionner un étudiant et remplir la description");
      return;
    }

    const data = {
      ...observationForm,
      etudiant_id: selectedEtudiant.id,
      etudiant_nom: `${selectedEtudiant.prenom} ${selectedEtudiant.nom}`,
      professeur_id: user.id,
      classe_id: selectedClasse,
      etablissement_id: user.etablissement_id,
      date_observation: new Date().toISOString()
    };

    if (editingObservation) {
      await updateObservationMutation.mutateAsync({ id: editingObservation.id, data });
    } else {
      await createObservationMutation.mutateAsync(data);
    }
  };

  const handleSaveRegle = async () => {
    if (!regleForm.titre) {
      alert("Veuillez remplir le titre");
      return;
    }

    const data = {
      ...regleForm,
      classe_id: selectedClasse,
      professeur_id: user.id,
      etablissement_id: user.etablissement_id,
      ordre: regles.length + 1
    };

    if (editingRegle) {
      await updateRegleMutation.mutateAsync({ id: editingRegle.id, data });
    } else {
      await createRegleMutation.mutateAsync(data);
    }
  };

  const handleGenerateGroups = async (type, nombreGroupes) => {
    if (etudiants.length === 0) return;

    const etudiantsList = [...etudiants];
    
    // Mélanger les étudiants
    for (let i = etudiantsList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [etudiantsList[i], etudiantsList[j]] = [etudiantsList[j], etudiantsList[i]];
    }

    const groupSize = Math.ceil(etudiantsList.length / nombreGroupes);
    const newGroups = [];

    for (let i = 0; i < nombreGroupes; i++) {
      const membres = etudiantsList
        .slice(i * groupSize, (i + 1) * groupSize)
        .map(e => ({
          etudiant_id: e.id,
          etudiant_nom: `${e.prenom} ${e.nom}`,
          role: "membre"
        }));

      if (membres.length > 0) {
        newGroups.push({
          nom: `Groupe ${i + 1}`,
          description: `Groupe de travail généré automatiquement`,
          type: type,
          critere_formation: "Aléatoire",
          classe_id: selectedClasse,
          professeur_id: user.id,
          etablissement_id: user.etablissement_id,
          membres: membres,
          date_creation: new Date().toISOString().split('T')[0],
          actif: true
        });
      }
    }

    await Promise.all(newGroups.map(g => createGroupeMutation.mutateAsync(g)));
    alert(`${newGroups.length} groupes créés avec succès !`);
  };

  const handleMarquerPresence = async (etudiant, statut) => {
    const existing = presences.find(p => p.etudiant_id === etudiant.id);
    
    if (existing) {
      await updatePresenceMutation.mutateAsync({ id: existing.id, data: { statut } });
    } else {
      await savePresenceMutation.mutateAsync({
        etudiant_id: etudiant.id,
        etudiant_nom: `${etudiant.prenom} ${etudiant.nom}`,
        classe_id: selectedClasse,
        matiere_id: selectedMatiere,
        professeur_id: selectedProfesseurId,
        etablissement_id: user.etablissement_id,
        date: selectedDate,
        heure_debut: heureDebutCours,
        heure_fin: heureFinCours,
        statut: statut
      });
    }

    // Mettre é  jour la liste de présence déjé  envoyée si elle existe
    const listeExistante = listesPresenceEnvoyees[0];
    if (listeExistante) {
      const presencesUpdated = listeExistante.presences.map(p => 
        p.etudiant_id === etudiant.id 
          ? { ...p, statut } 
          : p
      );

      const stats = {
        total_etudiants: etudiants.length,
        total_presents: presencesUpdated.filter(p => p.statut === 'present').length,
        total_absents: presencesUpdated.filter(p => p.statut === 'absent').length,
        total_retards: presencesUpdated.filter(p => p.statut === 'retard').length
      };

      await updateListePresenceMutation.mutateAsync({
        id: listeExistante.id,
        data: {
          presences: presencesUpdated,
          ...stats
        }
      });
    }
  };

  const handleRetirerPresence = async (etudiant) => {
    const existing = presences.find(p => p.etudiant_id === etudiant.id);
    
    if (existing) {
      await deletePresenceMutation.mutateAsync(existing.id);
      
      // Mettre é  jour la liste de présence déjé  envoyée si elle existe
      const listeExistante = listesPresenceEnvoyees[0];
      if (listeExistante) {
        const presencesUpdated = listeExistante.presences.filter(p => 
          p.etudiant_id !== etudiant.id
        );

        const stats = {
          total_etudiants: etudiants.length,
          total_presents: presencesUpdated.filter(p => p.statut === 'present').length,
          total_absents: presencesUpdated.filter(p => p.statut === 'absent').length,
          total_retards: presencesUpdated.filter(p => p.statut === 'retard').length
        };

        await updateListePresenceMutation.mutateAsync({
          id: listeExistante.id,
          data: {
            presences: presencesUpdated,
            ...stats
          }
        });
      }
    }
  };

  const getPresenceStatus = (etudiantId) => {
    const p = presences.find(pr => pr.etudiant_id === etudiantId);
    return p?.statut || null;
  };

  const getCategorieColor = (categorie) => {
    const colors = {
      positif: "bg-green-600",
      neutre: "bg-blue-600",
      a_ameliorer: "bg-orange-600",
      alerte: "bg-red-600"
    };
    return colors[categorie] || "bg-gray-600";
  };

  const filteredEtudiants = etudiants.filter(e => 
    `${e.prenom} ${e.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.matricule.toLowerCase().includes(searchQuery.toLowerCase())
  );



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#4d4d4d'}}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: '#4d4d4d'}}>
      <div className="w-full px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('MesClasses'))}
              className="bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white border-[#3d3d3d]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Users className="w-10 h-10 text-green-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Gestion des Promotions</h1>
              <p className="text-gray-300">Suivi, présences, règles et groupes</p>
            </div>
          </div>

          {/* Sélection classe et matière */}
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <Label className="text-white">Sélectionner une promotion:</Label>
                  <Select value={selectedClasse} onValueChange={(value) => {
                    setSelectedClasse(value);
                    setSelectedMatiere("");
                  }}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Choisir une promotion" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedClasse && (
                  <div className="flex items-center gap-4">
                    <Label className="text-white">Sélectionner une matière:</Label>
                    <Select value={selectedMatiere} onValueChange={setSelectedMatiere}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Choisir une matière" />
                      </SelectTrigger>
                      <SelectContent>
                        {matieresClasse.map(m => (
                          <SelectItem key={m.matiere_id} value={m.matiere_id}>
                            {m.matiere_nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {!selectedClasse ? (
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Veuillez sélectionner une promotion pour commencer</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Statistiques */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Étudiants</p>
                      <p className="text-3xl font-bold text-white">{etudiants.length}</p>
                    </div>
                    <UserCheck className="w-12 h-12 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Observations</p>
                      <p className="text-3xl font-bold text-white">{observations.length}</p>
                    </div>
                    <Eye className="w-12 h-12 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Règles actives</p>
                      <p className="text-3xl font-bold text-white">
                        {regles.filter(r => r.active).length}
                      </p>
                    </div>
                    <Shield className="w-12 h-12 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Groupes</p>
                      <p className="text-3xl font-bold text-white">{groupes.length}</p>
                    </div>
                    <Users className="w-12 h-12 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="presences" className="space-y-6">
              <TabsList className="bg-[#3d3d3d]">
                <TabsTrigger value="presences">Présences</TabsTrigger>
                <TabsTrigger value="statistiques">Statistiques de présence</TabsTrigger>
                <TabsTrigger value="observations">Observations</TabsTrigger>
                <TabsTrigger value="regles">Règles de Classe</TabsTrigger>
                <TabsTrigger value="groupes">Groupes</TabsTrigger>
              </TabsList>

              {/* TAB: Présences */}
              <TabsContent value="presences" className="space-y-6">
                <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">
                          Feuille de Présence {selectedMatiere && assignations.find(a => a.matiere_id === selectedMatiere)?.matiere_nom ? `- ${assignations.find(a => a.matiere_id === selectedMatiere)?.matiere_nom}` : ''}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          {etudiants.length} étudiants
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-48"
                        />
                        <Button
                          onClick={async () => {
                            if (!selectedClasse) {
                              alert('Veuillez sélectionner une classe');
                              return;
                            }

                            if (!selectedMatiere) {
                              alert('Veuillez sélectionner une matière');
                              return;
                            }
                            
                            const selectedClasseData = classes.find(c => c.id === selectedClasse);
                            const assignation = selectedAssignation;

                            const presencesData = etudiants.map(etudiant => {
                              const status = getPresenceStatus(etudiant.id);
                              return {
                                etudiant_id: etudiant.id,
                                etudiant_nom: `${etudiant.prenom} ${etudiant.nom}`,
                                etudiant_matricule: etudiant.matricule,
                                statut: status || 'absent'
                              };
                            });
                            
                            const stats = {
                              total_etudiants: etudiants.length,
                              total_presents: presencesData.filter(p => p.statut === 'present').length,
                              total_absents: presencesData.filter(p => p.statut === 'absent').length,
                              total_retards: presencesData.filter(p => p.statut === 'retard').length
                            };
                            
                            // Vérifier si une liste existe déjé  pour cette date
                            const listeExistante = listesPresenceEnvoyees[0];
                            
                            if (listeExistante) {
                              await dataService.update('ListePresence', listeExistante.id, {
                                calendrier_id: calendrierIdCours,
                                heure_debut: heureDebutCours,
                                heure_fin: heureFinCours,
                                professeur_id: selectedProfesseurId,
                                professeur_nom: selectedProfesseurNom,
                                matiere_id: assignation?.matiere_id || '',
                                matiere_nom: assignation?.matiere_nom || '',
                                presences: presencesData,
                                ...stats
                              });
                              alert('Liste de présence enregistrée avec succès !');
                            } else {
                              await dataService.create('ListePresence', {
                                calendrier_id: calendrierIdCours,
                                date: selectedDate,
                                heure_debut: heureDebutCours,
                                heure_fin: heureFinCours,
                                classe_id: selectedClasse,
                                classe_nom: selectedClasseData?.nom || '',
                                faculte: assignation?.faculte || '',
                                departement: assignation?.departement || '',
                                option: assignation?.option || '',
                                orientation: assignation?.orientation || '',
                                professeur_id: selectedProfesseurId,
                                professeur_nom: selectedProfesseurNom,
                                matiere_id: assignation?.matiere_id || '',
                                matiere_nom: assignation?.matiere_nom || '',
                                etablissement_id: user.etablissement_id,
                                etablissement_nom: user.etablissement_nom,
                                presences: presencesData,
                                ...stats
                              });
                              alert('Liste de présence enregistrée avec succès !');
                            }

                            queryClient.invalidateQueries({ queryKey: ['listes-presence-envoyees'] });
                          }}
                          className="bg-green-600 hover:bg-green-700 hidden"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer
                        </Button>
                        <Button
                          onClick={() => setOpenPresenceDialog(true)}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={listesPresenceEnvoyees.length === 0}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Consulter la liste de présence
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!selectedClasse) {
                              alert('Veuillez sélectionner une classe');
                              return;
                            }

                            if (!selectedMatiere) {
                              alert('Veuillez sélectionner une matière');
                              return;
                            }
                            
                            const selectedClasseData = classes.find(c => c.id === selectedClasse);
                            const assignation = selectedAssignation;

                            const presencesData = etudiants.map(etudiant => {
                              const status = getPresenceStatus(etudiant.id);
                              return {
                                etudiant_id: etudiant.id,
                                etudiant_nom: `${etudiant.prenom} ${etudiant.nom}`,
                                etudiant_matricule: etudiant.matricule,
                                statut: status || 'absent'
                              };
                            });
                            
                            const stats = {
                              total_etudiants: etudiants.length,
                              total_presents: presencesData.filter(p => p.statut === 'present').length,
                              total_absents: presencesData.filter(p => p.statut === 'absent').length,
                              total_retards: presencesData.filter(p => p.statut === 'retard').length
                            };
                            
                            // Vérifier si une liste existe déjé 
                            const listeExistante = listesPresenceEnvoyees[0];
                            
                            if (listeExistante) {
                              await dataService.update('ListePresence', listeExistante.id, {
                                calendrier_id: calendrierIdCours,
                                heure_debut: heureDebutCours,
                                heure_fin: heureFinCours,
                                professeur_id: selectedProfesseurId,
                                professeur_nom: selectedProfesseurNom,
                                matiere_id: assignation?.matiere_id || '',
                                matiere_nom: assignation?.matiere_nom || '',
                                presences: presencesData,
                                ...stats
                              });
                            } else {
                              await dataService.create('ListePresence', {
                                calendrier_id: calendrierIdCours,
                                date: selectedDate,
                                heure_debut: heureDebutCours,
                                heure_fin: heureFinCours,
                                classe_id: selectedClasse,
                                classe_nom: selectedClasseData?.nom || '',
                                faculte: assignation?.faculte || '',
                                departement: assignation?.departement || '',
                                option: assignation?.option || '',
                                orientation: assignation?.orientation || '',
                                professeur_id: selectedProfesseurId,
                                professeur_nom: selectedProfesseurNom,
                                matiere_id: assignation?.matiere_id || '',
                                matiere_nom: assignation?.matiere_nom || '',
                                etablissement_id: user.etablissement_id,
                                etablissement_nom: user.etablissement_nom,
                                presences: presencesData,
                                ...stats
                              });
                            }

                            queryClient.invalidateQueries({ queryKey: ['listes-presence-envoyees'] });
                            alert('Liste de présence envoyée avec succès !');
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Envoyer la liste
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#2d2d2d]">
                            <TableHead className="text-white">N°</TableHead>
                            <TableHead className="text-white">Matricule</TableHead>
                            <TableHead className="text-white">Nom & Prénom</TableHead>
                            <TableHead className="text-center text-white">Statut</TableHead>
                            <TableHead className="text-center text-white">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {etudiants.map((etudiant, idx) => {
                            const status = getPresenceStatus(etudiant.id);
                            return (
                              <TableRow key={etudiant.id} className="hover:bg-[#474747]">
                                <TableCell className="text-white">{idx + 1}</TableCell>
                                <TableCell className="text-gray-300">{etudiant.matricule}</TableCell>
                                <TableCell className="text-white">
                                  {etudiant.prenom} {etudiant.nom}
                                </TableCell>
                                <TableCell className="text-center">
                                  {status === "present" && (
                                    <Badge className="bg-green-600">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Présent
                                    </Badge>
                                  )}
                                  {status === "absent" && (
                                    <Badge className="bg-red-600">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Absent
                                    </Badge>
                                  )}
                                  {status === "retard" && (
                                    <Badge className="bg-orange-600">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Retard
                                    </Badge>
                                  )}
                                  {status === "absent_justifie" && (
                                    <Badge className="bg-blue-600">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Absent justifié
                                    </Badge>
                                  )}
                                  {!status && (
                                    <Badge className="bg-gray-600">Non marqué</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1 justify-center flex-wrap">
                                    <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => {
                                         if (!selectedMatiere) {
                                           alert('Veuillez sélectionner une matière');
                                           return;
                                         }
                                         handleMarquerPresence(etudiant, "present");
                                       }}
                                       className={status === "present" ? "bg-green-600 text-white" : ""}
                                       title="Marquer présent"
                                     >
                                       <CheckCircle2 className="w-4 h-4" />
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => {
                                         if (!selectedMatiere) {
                                           alert('Veuillez sélectionner une matière');
                                           return;
                                         }
                                         handleMarquerPresence(etudiant, "absent");
                                       }}
                                       className={status === "absent" ? "bg-red-600 text-white" : ""}
                                       title="Marquer absent"
                                     >
                                       <XCircle className="w-4 h-4" />
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => {
                                         if (!selectedMatiere) {
                                           alert('Veuillez sélectionner une matière');
                                           return;
                                         }
                                         handleMarquerPresence(etudiant, "retard");
                                       }}
                                       className={status === "retard" ? "bg-orange-600 text-white" : ""}
                                       title="Marquer en retard"
                                     >
                                       <Clock className="w-4 h-4" />
                                     </Button>
                                    {status && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRetirerPresence(etudiant)}
                                        className="bg-gray-600 hover:bg-gray-700 text-white"
                                        title="Retirer le statut"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB: Statistiques de présence */}
              <TabsContent value="statistiques" className="space-y-6">
                {/* Statistiques par Promotion */}
                <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Statistiques par Promotion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statistiquesPresence.filter(s => s.type === 'promotion').length === 0 ? (
                      <div className="text-center py-12">
                        <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg mb-2">Aucune statistique disponible</p>
                        <p className="text-gray-500 text-sm">
                          Les statistiques seront générées par l'administrateur de l'établissement
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(
                          statistiquesPresence
                            .filter(s => s.type === 'promotion')
                            .reduce((acc, stat) => {
                              const key = stat.classe_nom;
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(stat);
                              return acc;
                            }, {})
                        ).map(([className, stats]) => (
                          <div key={className} className="rounded-lg overflow-hidden" style={{backgroundColor: '#2d2d2d'}}>
                            <button
                              onClick={() => setExpandedPromotions(prev => ({
                                ...prev,
                                [className]: !prev[className]
                              }))}
                              className="w-full p-4 flex items-center justify-between hover:bg-[#3d3d3d] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {expandedPromotions[className] ? (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                )}
                                <h3 className="text-white font-semibold text-lg">{className}</h3>
                                <Badge className="bg-[#4d4d4d] text-gray-300">
                                  {stats.length} semaine{stats.length > 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </button>

                            {expandedPromotions[className] && (
                              <div className="px-4 pb-4 space-y-3">
                                {stats.map(stat => (
                                  <div key={stat.id} className="p-3 rounded-lg" style={{backgroundColor: '#3d3d3d'}}>
                                    <p className="text-sm text-gray-400 mb-3">
                                      Semaine {stat.semaine} • {format(new Date(stat.date_debut), 'dd/MM')} - {format(new Date(stat.date_fin), 'dd/MM/yyyy')}
                                    </p>
                                    <div className="grid grid-cols-4 gap-3">
                                      <div className="text-center p-2 rounded" style={{backgroundColor: '#2d2d2d'}}>
                                        <p className="text-xl font-bold text-white">{stat.total_cours}</p>
                                        <p className="text-xs text-gray-400">Cours</p>
                                      </div>
                                      <div className="text-center p-2 rounded bg-green-600">
                                        <p className="text-xl font-bold text-white">{stat.taux_presence}%</p>
                                        <p className="text-xs text-white">Présence</p>
                                      </div>
                                      <div className="text-center p-2 rounded bg-red-600">
                                        <p className="text-xl font-bold text-white">{stat.taux_absence}%</p>
                                        <p className="text-xs text-white">Absence</p>
                                      </div>
                                      <div className="text-center p-2 rounded bg-orange-600">
                                        <p className="text-xl font-bold text-white">{stat.taux_retard}%</p>
                                        <p className="text-xs text-white">Retard</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

              </TabsContent>

              {/* TAB: Observations */}
              <TabsContent value="observations" className="space-y-6">
                <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Rechercher un étudiant..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        onClick={() => {
                          resetObservationForm();
                          setOpenObservationDialog(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Nouvelle Observation
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4">
                  {observations.length === 0 ? (
                    <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                      <CardContent className="py-12 text-center">
                        <Eye className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Aucune observation enregistrée</p>
                      </CardContent>
                    </Card>
                  ) : (
                    observations.map(obs => (
                      <Card key={obs.id} style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-white text-base">{obs.etudiant_nom}</CardTitle>
                                <Badge className={getCategorieColor(obs.categorie)}>
                                  {obs.categorie}
                                </Badge>
                                <Badge className="bg-[#2d2d2d]">{obs.type}</Badge>
                              </div>
                              <p className="text-xs text-gray-400">
                                {format(new Date(obs.created_date), 'dd MMM yyyy é  HH:mm', { locale: fr })}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm('Supprimer cette observation ?')) {
                                  deleteObservationMutation.mutate(obs.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-300 mb-2">{obs.description}</p>
                          {obs.contexte && (
                            <p className="text-sm text-gray-400 mb-2">
                              <span className="font-semibold">Contexte:</span> {obs.contexte}
                            </p>
                          )}
                          {obs.actions_menees && (
                            <p className="text-sm text-gray-400">
                              <span className="font-semibold">Actions:</span> {obs.actions_menees}
                            </p>
                          )}
                          {obs.suivi_necessaire && (
                            <Badge className="bg-orange-600 mt-2">Suivi nécessaire</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* TAB: Règles */}
              <TabsContent value="regles" className="space-y-6">
                <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                  <CardContent className="pt-6">
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          resetRegleForm();
                          setOpenRegleDialog(true);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Nouvelle Règle
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4">
                  {regles.filter(r => r.active).map((regle, idx) => (
                    <Card key={regle.id} style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold">{idx + 1}</span>
                            </div>
                            <div>
                              <CardTitle className="text-white text-lg">{regle.titre}</CardTitle>
                              <div className="flex gap-2 mt-1">
                                <Badge className="bg-[#2d2d2d] text-xs">{regle.categorie}</Badge>
                                <Badge 
                                  className={`text-xs ${
                                    regle.niveau_importance === 'critique' ? 'bg-red-600' :
                                    regle.niveau_importance === 'eleve' ? 'bg-orange-600' :
                                    regle.niveau_importance === 'moyen' ? 'bg-blue-600' :
                                    'bg-gray-600'
                                  }`}
                                >
                                  {regle.niveau_importance}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('Supprimer cette règle ?')) {
                                deleteRegleMutation.mutate(regle.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300 mb-2">{regle.description}</p>
                        {regle.consequences && (
                          <div className="mt-3 p-3 rounded-lg" style={{backgroundColor: '#2d2d2d'}}>
                            <p className="text-sm font-semibold text-white mb-1">Conséquences:</p>
                            <p className="text-sm text-gray-400">{regle.consequences}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* TAB: Groupes */}
              <TabsContent value="groupes" className="space-y-6">
                <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleGenerateGroups('travail', 4)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <Shuffle className="w-4 h-4 mr-2" />
                          Générer 4 groupes
                        </Button>
                        <Button
                          onClick={() => handleGenerateGroups('travail', 6)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <Shuffle className="w-4 h-4 mr-2" />
                          Générer 6 groupes
                        </Button>
                      </div>
                      <Button
                        onClick={() => {
                          resetGroupeForm();
                          setOpenGroupeDialog(true);
                        }}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Créer Groupe Manuel
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  {groupes.map(groupe => (
                    <Card key={groupe.id} style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-white">{groupe.nom}</CardTitle>
                            <p className="text-sm text-gray-400 mt-1">
                              {groupe.membres.length} membre(s) • {groupe.type}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('Supprimer ce groupe ?')) {
                                deleteGroupeMutation.mutate(groupe.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {groupe.membres.map((membre, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded" style={{backgroundColor: '#2d2d2d'}}>
                              <UserPlus className="w-4 h-4 text-gray-400" />
                              <span className="text-white text-sm">{membre.etudiant_nom}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Dialog Observation */}
        <DraggableDialog open={openObservationDialog} onOpenChange={setOpenObservationDialog} title="Nouvelle Observation" subtitle="Ajouter une observation">
          <DraggableDialogBody>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Étudiant *</Label>
                <Select 
                  value={selectedEtudiant?.id || ""} 
                  onValueChange={(id) => setSelectedEtudiant(etudiants.find(e => e.id === id))}
                >
                  <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                    <SelectValue placeholder="Sélectionner un étudiant" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEtudiants.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.prenom} {e.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Type</Label>
                  <Select value={observationForm.type} onValueChange={(v) => setObservationForm({...observationForm, type: v})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comportement">Comportement</SelectItem>
                      <SelectItem value="participation">Participation</SelectItem>
                      <SelectItem value="comprehension">Compréhension</SelectItem>
                      <SelectItem value="travail">Travail</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Catégorie</Label>
                  <Select value={observationForm.categorie} onValueChange={(v) => setObservationForm({...observationForm, categorie: v})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positif">Positif</SelectItem>
                      <SelectItem value="neutre">Neutre</SelectItem>
                      <SelectItem value="a_ameliorer">À améliorer</SelectItem>
                      <SelectItem value="alerte">Alerte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Description *</Label>
                <Textarea
                  value={observationForm.description}
                  onChange={(e) => setObservationForm({...observationForm, description: e.target.value})}
                  placeholder="Description de l'observation..."
                  rows={3}
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Contexte</Label>
                <Input
                  value={observationForm.contexte}
                  onChange={(e) => setObservationForm({...observationForm, contexte: e.target.value})}
                  placeholder="Ex: Pendant le cours de mathématiques"
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Actions menées</Label>
                <Input
                  value={observationForm.actions_menees}
                  onChange={(e) => setObservationForm({...observationForm, actions_menees: e.target.value})}
                  placeholder="Actions entreprises..."
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={observationForm.suivi_necessaire}
                  onChange={(e) => setObservationForm({...observationForm, suivi_necessaire: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label className="text-white text-xs font-medium" style={CG}>Nécessite un suivi</Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={observationForm.visible_parents}
                  onChange={(e) => setObservationForm({...observationForm, visible_parents: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label className="text-white text-xs font-medium" style={CG}>Visible par les parents</Label>
              </div>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
              <Button variant="outline" onClick={() => setOpenObservationDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG}}>
                Annuler
              </Button>
              <Button onClick={handleSaveObservation} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
          </DraggableDialogFooter>
        </DraggableDialog>

        {/* Dialog Règle */}
        <DraggableDialog open={openRegleDialog} onOpenChange={setOpenRegleDialog} title="Nouvelle Règle" subtitle="Ajouter une règle de classe">
          <DraggableDialogBody>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
                <Input
                  value={regleForm.titre}
                  onChange={(e) => setRegleForm({...regleForm, titre: e.target.value})}
                  placeholder="Ex: Respecter ses camarades"
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
                <Textarea
                  value={regleForm.description}
                  onChange={(e) => setRegleForm({...regleForm, description: e.target.value})}
                  placeholder="Description détaillée..."
                  rows={3}
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Catégorie</Label>
                  <Select value={regleForm.categorie} onValueChange={(v) => setRegleForm({...regleForm, categorie: v})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comportement">Comportement</SelectItem>
                      <SelectItem value="travail">Travail</SelectItem>
                      <SelectItem value="respect">Respect</SelectItem>
                      <SelectItem value="ponctualite">Ponctualité</SelectItem>
                      <SelectItem value="materiel">Matériel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Importance</Label>
                  <Select value={regleForm.niveau_importance} onValueChange={(v) => setRegleForm({...regleForm, niveau_importance: v})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faible">Faible</SelectItem>
                      <SelectItem value="moyen">Moyen</SelectItem>
                      <SelectItem value="eleve">Élevé</SelectItem>
                      <SelectItem value="critique">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Conséquences</Label>
                <Textarea
                  value={regleForm.consequences}
                  onChange={(e) => setRegleForm({...regleForm, consequences: e.target.value})}
                  placeholder="Conséquences en cas de non-respect..."
                  rows={2}
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
              <Button variant="outline" onClick={() => setOpenRegleDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG}}>
                Annuler
              </Button>
              <Button onClick={handleSaveRegle} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
          </DraggableDialogFooter>
        </DraggableDialog>

        {/* Dialog: Consulter la liste de présence */}
        <DraggableDialog
          open={openPresenceDialog}
          onOpenChange={setOpenPresenceDialog}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, ...CG }}>
              <ClipboardList style={{ width: 16, height: 16, color: '#4ade80', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                Liste de présence — {selectedDate ? format(new Date(selectedDate), 'EEEE dd/MM/yyyy', { locale: fr }) : ''}
              </span>
            </span>
          }
          maxWidth="max-w-3xl"
        >
          <DraggableDialogBody>
            {listesPresenceEnvoyees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                <ClipboardList style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ fontSize: 14, ...CG }}>Aucune liste de présence enregistrée pour cette date</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {listesPresenceEnvoyees.map((liste) => (
                  <div key={liste.id}>
                    {/* En-tête de la liste */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.07)', borderRadius: '8px 8px 0 0', ...CG }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {liste.matiere_nom && (
                          <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: 12 }}>{liste.matiere_nom}</span>
                        )}
                        <span style={{ color: '#fb923c', fontSize: 11, fontFamily: 'monospace' }}>
                          {liste.heure_debut || '--:--'} - {liste.heure_fin || '--:--'}
                        </span>
                        {liste.professeur_nom && (
                          <span style={{ background: '#2563eb', color: '#fff', borderRadius: 9999, padding: '1px 8px', fontSize: 11 }}>
                            {liste.professeur_nom}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#d1d5db' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <CheckCircle2 style={{ width: 11, height: 11, color: '#4ade80' }} />{liste.total_presents ?? 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <XCircle style={{ width: 11, height: 11, color: '#f87171' }} />{liste.total_absents ?? 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock style={{ width: 11, height: 11, color: '#fb923c' }} />{liste.total_retards ?? 0}
                        </span>
                      </div>
                    </div>
                    {/* Liste des étudiants - tableau */}
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '0 0 8px 8px', border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, ...CG }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <th style={{ padding: '6px 10px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>N°</th>
                            <th style={{ padding: '6px 10px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Nom</th>
                            <th style={{ padding: '6px 10px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Matricule</th>
                            <th style={{ padding: '6px 10px', textAlign: 'center', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(liste.presences || []).map((presence, pidx) => (
                            <tr key={pidx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '6px 10px', color: '#6b7280', fontFamily: 'monospace', fontSize: 11 }}>{pidx + 1}</td>
                              <td style={{ padding: '6px 10px', color: '#fff', fontWeight: 500 }}>{presence.etudiant_nom}</td>
                              <td style={{ padding: '6px 10px', color: '#9ca3af' }}>{presence.etudiant_matricule}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                <span style={{
                                  color: presence.statut === 'present' ? '#16a34a' : presence.statut === 'absent' ? '#dc2626' : presence.statut === 'retard' ? '#ea580c' : '#2563eb',
                                  fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, ...CG
                                }}>
                                  {presence.statut === 'present' && <CheckCircle2 style={{ width: 12, height: 12 }} />}
                                  {presence.statut === 'absent' && <XCircle style={{ width: 12, height: 12 }} />}
                                  {presence.statut === 'retard' && <Clock style={{ width: 12, height: 12 }} />}
                                  {presence.statut}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DraggableDialogBody>
        </DraggableDialog>
      </div>
    </div>
  );
}
