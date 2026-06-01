import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Save, 
  Eye, 
  EyeOff, 
  Check, 
  Edit, 
  Trash2, 
  Download,
  Upload,
  Loader2,
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  GraduationCap,
  Send,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SaisieNotes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClasse, setSelectedClasse] = useState("");
  const [selectedMatiere, setSelectedMatiere] = useState("");
  const [selectedPeriode, setSelectedPeriode] = useState("");
  const [typeEvaluation, setTypeEvaluation] = useState("Devoir");
  const [titreEvaluation, setTitreEvaluation] = useState("");
  const [noteSur, setNoteSur] = useState("20");
  const [dateEvaluation, setDateEvaluation] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [notes, setNotes] = useState({});
const [editNoteValue, setEditNoteValue] = useState("");
const [editNoteSur, setEditNoteSur] = useState("20");
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [noteToDelete, setNoteToDelete] = useState(null);
const [deleteArchiveDialogOpen, setDeleteArchiveDialogOpen] = useState(false);
const [archiveToDelete, setArchiveToDelete] = useState(null);
const [consulterDialogOpen, setConsulterDialogOpen] = useState(false);
const [purgeArchiveDialogOpen, setPurgeArchiveDialogOpen] = useState(false);
const [expandedBulletins, setExpandedBulletins] = useState(new Set());
const [expandedClasses, setExpandedClasses] = useState(new Set());

  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser.role_archive === 'professeur') {
        const etablissements = await dataService.query('Etablissement');
        const etablissement = etablissements.find(e => e.id === currentUser.etablissement_id);
        
        if (etablissement) {
          currentUser.etablissement_nom = etablissement.nom || etablissement.name;
        }
      }
      
      setUser(currentUser);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les assignations du professeur via son email et demande d'inscription
  const { data: assignations = [] } = useQuery({
    queryKey: ['assignations-prof', user?.email],
    queryFn: async () => {
      // Trouver d'abord la demande d'inscription approuvée du professeur
      const demandes = await dataService.query('DemandeInscription', { filters: [{ 
        email: user.email,
        type_utilisateur: 'professeur',
        statut: 'approuvee'
       }],
  limit: 1000, offset: 0 });
      
      if (demandes.length === 0) return [];
      
      const demandeProf = demandes[0];
      
      // Charger les assignations avec le professeur_id correspondant
      return await dataService.query('AssignationProfesseur', { filters: [{ 
        professeur_id: demandeProf.id
       }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user?.email
  });

  // Récupérer les classes uniques
  const classes = [...new Map(assignations.map(a => [a.classe_id, { id: a.classe_id, nom: a.classe_nom }])).values()];

  // Récupérer les matières pour la classe sélectionnée
  const matieres = [...new Map(assignations
    .filter(a => !selectedClasse || a.classe_id === selectedClasse)
    .map(a => [a.matiere_id, { id: a.matiere_id, nom: a.matiere_nom }])
  ).values()];

  // Nom de la classe sélectionnée (depuis les assignations)
  const selectedClasseNom = assignations.find(a => a.classe_id === selectedClasse)?.classe_nom || '';

  // Charger les étudiants de la classe sélectionnée depuis User (même approche que MesClasses)
  const { data: etudiants = [] } = useQuery({
    queryKey: ['etudiants-classe-notes', selectedClasse, selectedClasseNom],
    queryFn: async () => {
      const norm = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const dc = norm(selectedClasseNom);
      if (!dc) return [];

      const users = await dataService.query('User', {
        filters: [{ role_archive: 'etudiant' }],
        limit: 5000, offset: 0
      });

      return users
        .filter((u) => norm(u.classe) === dc || norm(u.classe).includes(dc) || dc.includes(norm(u.classe)))
        .map((u) => ({
          id: u.id,
          nom: u.nom,
          prenom: u.prenom,
          post_nom: u.post_nom,
          matricule: u.matricule,
          email: u.email
        }))
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    },
    enabled: !!selectedClasse && !!selectedClasseNom
  });

  // Charger les notes de la période sélectionnée
  const { data: notesExistantes = [] } = useQuery({
    queryKey: ['notes', selectedClasse, selectedMatiere, selectedPeriode, user?.email],
    queryFn: async () => {
      // Trouver l'ID du professeur depuis DemandeInscription
      const demandes = await dataService.query('DemandeInscription', { filters: [{ 
        email: user.email,
        type_utilisateur: 'professeur',
        statut: 'approuvee'
       }],
  limit: 1000, offset: 0 });
      
      if (demandes.length === 0) return [];
      
      const profId = demandes[0].id;
      
      const filters = {
        professeur_id: profId,
        classe_id: selectedClasse,
        matiere_id: selectedMatiere,
        periode: selectedPeriode,
        statut: 'brouillon'
      };
      return await dataService.query('NoteEtudiant', { filters: [filters] , limit: 1000, offset: 0 });
    },
    enabled: !!selectedClasse && !!selectedMatiere && !!selectedPeriode && !!user?.email
  });

  // Charger toutes les notes (toutes périodes)
  const { data: notesToutes = [] } = useQuery({
    queryKey: ['notes-toutes', selectedClasse, selectedMatiere, user?.email],
    queryFn: async () => {
      const demandes = await dataService.query('DemandeInscription', { filters: [{ 
        email: user.email,
        type_utilisateur: 'professeur',
        statut: 'approuvee'
       }],
  limit: 1000, offset: 0 });
      
      if (demandes.length === 0) return [];
      
      const profId = demandes[0].id;
      
      return await dataService.query('NoteEtudiant', { filters: [{ 
        professeur_id: profId,
        classe_id: selectedClasse,
        matiere_id: selectedMatiere
       }],
  limit: 1000, offset: 0 });
    },
    enabled: !!selectedClasse && !!selectedMatiere && !!user?.email
  });

  // Archives des notes (copies)
  const { data: archives = [] } = useQuery({
    queryKey: ['archives', user?.email, selectedClasse || 'all', selectedMatiere || 'all'],
    queryFn: async () => {
      // Trouver l'ID du professeur depuis DemandeInscription
      const demandes = await dataService.query('DemandeInscription', { filters: [{ 
        email: user.email,
        type_utilisateur: 'professeur',
        statut: 'approuvee'
       }],
  limit: 1000, offset: 0 });
      
      if (demandes.length === 0) return [];
      
      const profId = demandes[0].id;
      
      const where = { professeur_id: profId, statut: 'publié' };
      if (selectedClasse) where.classe_id = selectedClasse;
      if (selectedMatiere) where.matiere_id = selectedMatiere;
      return await dataService.query('NoteArchive', { filters: [where], limit: 1000, offset: 0 });
    },
    enabled: !!user?.email
  });

  // Mutations
  const createNoteMutation = useMutation({
    mutationFn: (noteData) => dataService.create('NoteEtudiant', noteData),
    onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['notes'] });
              queryClient.invalidateQueries({ queryKey: ['notes-toutes'] });
              queryClient.invalidateQueries({ queryKey: ['archives'] });
            }
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('NoteEtudiant', id, data),
    onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['notes'] });
              queryClient.invalidateQueries({ queryKey: ['notes-toutes'] });
              queryClient.invalidateQueries({ queryKey: ['archives'] });
            }
  });

  const deleteNoteMutation = useMutation({
      mutationFn: (id) => dataService.delete('NoteEtudiant', id),
      onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['notes'] });
                queryClient.invalidateQueries({ queryKey: ['notes-toutes'] });
                queryClient.invalidateQueries({ queryKey: ['archives'] });
                setDeleteDialogOpen(false);
                setNoteToDelete(null);
              }
    });

    const deleteArchiveMutation = useMutation({
      mutationFn: (id) => dataService.delete('NoteArchive', id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['archives'] });
        setDeleteArchiveDialogOpen(false);
        setArchiveToDelete(null);
      }
    });

    const purgeArchivesMutation = useMutation({
      mutationFn: async () => {
        const toDelete = (archives || []).filter(a => a.statut === 'publié');
        await Promise.all(toDelete.map(a => dataService.delete('NoteArchive', a.id)));
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['archives'] });
        setPurgeArchiveDialogOpen(false);
      }
    });

  const handleDeleteNote = (note) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteNote = () => {
    if (noteToDelete) {
      deleteNoteMutation.mutate(noteToDelete.id);
    }
  };

  const handleDeleteArchive = (archive) => {
    setArchiveToDelete(archive);
    setDeleteArchiveDialogOpen(true);
  };

  const confirmDeleteArchive = () => {
    if (archiveToDelete) {
      deleteArchiveMutation.mutate(archiveToDelete.id);
    }
  };

  const handleNoteChange = (etudiantId, value) => {
    setNotes(prev => ({
      ...prev,
      [etudiantId]: value
    }));
  };

  const handleStartEdit = (note) => {
    setEditingNote(note);
    setEditNoteValue(String(note?.note ?? ""));
    setEditNoteSur(String(note?.note_sur ?? "20"));
    setOpenDialog(true);
  };

  const handleSubmitEdit = async () => {
    if (!editingNote) return;
    const val = parseFloat(editNoteValue);
    const sur = Math.max(1, parseFloat(editNoteSur) || (editingNote?.note_sur || 20));
    const pourcentage = Number.isFinite(val) ? +(((val || 0) / sur) * 100).toFixed(2) : editingNote.pourcentage;
    await updateNoteMutation.mutateAsync({ id: editingNote.id, data: { note: val, note_sur: sur, pourcentage } });
    setOpenDialog(false);
    setEditingNote(null);
  };

  const handleSaveAll = async () => {
    if (!selectedClasse || !selectedMatiere || !selectedPeriode) {
      alert("Veuillez sélectionner une classe, une matière et une période");
      return;
    }

    if (!titreEvaluation) {
      alert("Veuillez entrer un titre pour l'évaluation");
      return;
    }

    // Trouver l'ID du professeur depuis DemandeInscription
    const demandes = await dataService.query('DemandeInscription', { filters: [{ 
      email: user.email,
      type_utilisateur: 'professeur',
      statut: 'approuvee'
     }],
  limit: 1000, offset: 0 });
    
    if (demandes.length === 0) {
      alert("Impossible de trouver votre profil professeur. Contactez l'administrateur.");
      return;
    }
    
    const profId = demandes[0].id;

    // Préparer les métadonnées communes
    const matiere = matieres.find(m => m.id === selectedMatiere);
    const classe = classes.find(c => c.id === selectedClasse);
    const noteMax = Math.max(1, parseFloat(noteSur) || 20);

    // Récupérer un etablissement_id fiable (profil ou assignation courante)
    const etabId = user?.etablissement_id || (assignations.find(a => a.classe_id === selectedClasse)?.etablissement_id) || '';
    if (!etabId) {
      alert("Impossible de déterminer l'établissement. Vérifiez vos assignations ou votre profil.");
      return;
    }

    // Construire les payloads à partir des notes saisies (ignorer les champs vides/non numériques)
    const payloads = Object.entries(notes)
      .filter(([, n]) => n !== '' && !Number.isNaN(parseFloat(n)))
      .map(([etudiantId, note]) => {
        const etudiant = etudiants.find(e => e.id === etudiantId) || {};
        const noteValue = Math.max(0, Math.min(parseFloat(note) || 0, noteMax));
        const pourcentage = (noteValue / noteMax) * 100;

        return {
          key: etudiantId,
          data: {
            etudiant_id: etudiantId,
            etudiant_nom: `${etudiant.prenom || ''} ${etudiant.post_nom || ''} ${etudiant.nom || ''}`.trim(),
            etudiant_matricule: etudiant.matricule || '',
            classe_id: selectedClasse,
            classe_nom: classe?.nom || '',
            matiere_id: selectedMatiere,
            matiere_nom: matiere?.nom || '',
            professeur_id: profId,
            professeur_nom: user.full_name || '',
            etablissement_id: etabId,
            periode: selectedPeriode,
            annee_scolaire: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            type_evaluation: typeEvaluation,
            titre_evaluation: titreEvaluation,
            note: noteValue,
            note_sur: noteMax,
            pourcentage: parseFloat(pourcentage.toFixed(2)),
            date_evaluation: dateEvaluation,
            statut: "brouillon",
            visible_etudiant: false,
            visible_parent: false
          }
        };
      });

    if (!payloads.length) {
      alert("Aucune note valide à enregistrer");
      return;
    }

    // Upsert: met à jour si une note équivalente existe déjà, sinon crée
    const results = await Promise.allSettled(
      payloads.map(async ({ key, data }) => {
        const existing = (notesExistantes || []).find(n =>
          n.etudiant_id === key &&
          n.matiere_id === selectedMatiere &&
          n.classe_id === selectedClasse &&
          n.periode === selectedPeriode &&
          n.titre_evaluation === titreEvaluation &&
          n.type_evaluation === typeEvaluation
        );

        let noteObj = null;
        if (existing) {
          noteObj = await updateNoteMutation.mutateAsync({ id: existing.id, data });
          noteObj = noteObj || existing;
        } else {
          noteObj = await createNoteMutation.mutateAsync(data);
        }

        // Archiver une copie de la note à chaque enregistrement
        await dataService.create('NoteArchive', {
          source_note_id: noteObj?.id || existing?.id || '',
          etablissement_id: data.etablissement_id,
          professeur_id: data.professeur_id,
          professeur_nom: data.professeur_nom,
          classe_id: data.classe_id,
          classe_nom: data.classe_nom,
          matiere_id: data.matiere_id,
          matiere_nom: data.matiere_nom,
          etudiant_id: data.etudiant_id,
          etudiant_nom: data.etudiant_nom,
          etudiant_matricule: data.etudiant_matricule,
          periode: data.periode,
          annee_scolaire: data.annee_scolaire,
          type_evaluation: data.type_evaluation,
          titre_evaluation: data.titre_evaluation,
          note: data.note,
          note_sur: data.note_sur,
          pourcentage: data.pourcentage,
          date_evaluation: data.date_evaluation,
          statut: data.statut,
          archived_at: new Date().toISOString()
        });
      })
    );

    const ok = results.filter(r => r.status === 'fulfilled').length;
    const ko = results.filter(r => r.status === 'rejected').length;

    if (ok > 0 && ko === 0) {
      alert("Notes enregistrées avec succès !");
      setNotes({});
    } else if (ok > 0 && ko > 0) {
      alert(`Certaines notes ont été enregistrées (${ok}) mais ${ko} ont échoué.`);
    } else {
      alert("Échec de l'enregistrement des notes. Veuillez vérifier vos saisies.");
    }
  };

  const handlePublishNotes = async (periodeOverride) => {
    const items = periodeOverride
      ? (notesToutes || []).filter(n => n.periode === periodeOverride)
      : (notesExistantes || []);

    if (!items.length) {
      alert("Aucune note à envoyer pour cette sélection.");
      return;
    }

    try {
      await Promise.all(
        items.map(note =>
          updateNoteMutation.mutateAsync({
            id: note.id,
            data: { statut: "soumis", visible_etudiant: false, visible_parent: false }
          })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes-toutes'] });
      alert("Notes envoyées à l'admin de l'établissement pour validation.");
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de l'envoi pour validation");
    }
  };

  const q = (searchQuery || '').trim().toLowerCase();
  const filteredEtudiants = (etudiants || []).filter((e) => {
    const nom = (e.nom || '').toLowerCase();
    const prenom = (e.prenom || '').toLowerCase();
    const mat = (e.matricule || '').toLowerCase();
    return !q || nom.includes(q) || prenom.includes(q) || mat.includes(q);
  });

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
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="/assets/icons/e03aa2fb5_note1.png"
              alt="Saisie des Notes"
              className="w-12 h-12"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">Cahier de Cotation</h1>
              <p className="text-gray-300">Système professionnel de saisie des notes</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="saisie" className="space-y-6">
          <TabsList className="bg-[#3d3d3d]">
            <TabsTrigger value="saisie">Saisie des Notes</TabsTrigger>
            <TabsTrigger value="archive">Archive</TabsTrigger>
            <TabsTrigger value="guide">Guide Pédagogique</TabsTrigger>
          </TabsList>

          {/* TAB: Saisie */}
          <TabsContent value="saisie" className="space-y-6">
            {/* Filtres */}
            <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Sélection de l'évaluation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-white">Classe</Label>
                    <Select value={selectedClasse} onValueChange={setSelectedClasse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(classe => (
                          <SelectItem key={classe.id} value={classe.id}>
                            {classe.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Matière</Label>
                    <Select value={selectedMatiere} onValueChange={setSelectedMatiere} disabled={!selectedClasse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une matière" />
                      </SelectTrigger>
                      <SelectContent>
                        {matieres.map(matiere => (
                          <SelectItem key={matiere.id} value={matiere.id}>
                            {matiere.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Période</Label>
                    <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une période" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1er trimestre">1er Trimestre</SelectItem>
                        <SelectItem value="2ème trimestre">2ème Trimestre</SelectItem>
                        <SelectItem value="3ème trimestre">3ème Trimestre</SelectItem>
                        <SelectItem value="1er semestre">1er Semestre</SelectItem>
                        <SelectItem value="2ème semestre">2ème Semestre</SelectItem>
                        <SelectItem value="Session 1">Session 1</SelectItem>
                        <SelectItem value="Session 2">Session 2</SelectItem>
                        <SelectItem value="Examen final">Examen Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-white">Type d'évaluation</Label>
                    <Select value={typeEvaluation} onValueChange={setTypeEvaluation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Devoir">Devoir</SelectItem>
                        <SelectItem value="Interrogation">Interrogation</SelectItem>
                        <SelectItem value="Composition">Composition</SelectItem>
                        <SelectItem value="Examen">Examen</SelectItem>
                        <SelectItem value="Travail pratique">Travail pratique</SelectItem>
                        <SelectItem value="Projet">Projet</SelectItem>
                        <SelectItem value="Participation">Participation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Titre de l'évaluation</Label>
                    <Input 
                      placeholder="Ex: Devoir n°1"
                      value={titreEvaluation}
                      onChange={(e) => setTitreEvaluation(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-white">Note sur</Label>
                    <Input 
                      type="number"
                      value={noteSur}
                      onChange={(e) => setNoteSur(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-white">Date</Label>
                    <Input 
                      type="date"
                      value={dateEvaluation}
                      onChange={(e) => setDateEvaluation(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tableau de saisie */}
            {selectedClasse && selectedMatiere && selectedPeriode && (
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5" />
                      Grille de notation - {filteredEtudiants.length} étudiants
                    </CardTitle>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Rechercher un étudiant..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <Button onClick={handleSaveAll} className="bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                      <Button onClick={() => setConsulterDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700" disabled={!notesExistantes?.length}>
                        <Eye className="w-4 h-4 mr-2" />
                        Consulter
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#2d2d2d]">
                        <tr>
                          <th className="px-4 py-3 text-left text-white">N°</th>
                          <th className="px-4 py-3 text-left text-white">Matricule</th>
                          <th className="px-4 py-3 text-left text-white">Nom & Prénom</th>
                          <th className="px-4 py-3 text-center text-white">Date</th>
                          <th className="px-4 py-3 text-center text-white">Note / {noteSur}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEtudiants.map((etudiant, index) => {
                          const noteValue = notes[etudiant.id] || "";
                          
                          return (
                            <tr key={etudiant.id} className="border-t border-[#2d2d2d] hover:bg-[#474747]">
                              <td className="px-4 py-3 text-white">{index + 1}</td>
                              <td className="px-4 py-3 text-gray-300">{etudiant.matricule}</td>
                              <td className="px-4 py-3 text-white font-medium">
                                {etudiant.prenom} {etudiant.post_nom} {etudiant.nom}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-300">{dateEvaluation}</td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max={noteSur}
                                  value={noteValue}
                                  onChange={(e) => handleNoteChange(etudiant.id, e.target.value)}
                                  className="w-24 mx-auto text-center"
                                  placeholder="0"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB: Archive (bulletins approuvés uniquement) */}
          <TabsContent value="archive">
            {archives?.length > 0 && (
              <div style={{display:'flex', justifyContent:'flex-end', marginBottom:12}}>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setPurgeArchiveDialogOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Purger les archives
                </Button>
              </div>
            )}
            {(() => {
              if (!archives?.length) {
                return (
                  <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                    <CardHeader>
                      <CardTitle className="text-white">Aucune archive</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12">
                        <FileSpreadsheet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Aucun bulletin approuvé par l'administration pour cette sélection.</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // Grouper par classe d'abord, puis par matière • période
              const byClasse = new Map();
              archives.forEach(a => {
                const cls = a.classe_nom || 'Sans classe';
                if (!byClasse.has(cls)) byClasse.set(cls, []);
                byClasse.get(cls).push(a);
              });

              const thS = { padding:'6px 10px', textAlign:'left', color:'#9ca3af', fontWeight:600, fontSize:11, borderBottom:'1px solid rgba(255,255,255,0.08)' };
              const thC = { ...thS, textAlign:'center' };
              const toggleSet = (setter, key) => setter(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

              return Array.from(byClasse.entries()).map(([classeNom, classeItems]) => {
                const classeOpen = expandedClasses.has(classeNom);
                const totalNotes = classeItems.length;

                // Sous-grouper par matière • période
                const byBulletin = new Map();
                classeItems.forEach(a => {
                  const bKey = `${a.matiere_nom||''}__${a.periode||''}`;
                  if (!byBulletin.has(bKey)) byBulletin.set(bKey, []);
                  byBulletin.get(bKey).push(a);
                });

                return (
                  <div key={classeNom} style={{marginBottom:16}}>
                    {/* En-tête classe */}
                    <button onClick={() => toggleSet(setExpandedClasses, classeNom)}
                      style={{width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:8, cursor:'pointer', marginBottom: classeOpen ? 8 : 0}}>
                      {classeOpen ? <ChevronDown className="w-4 h-4 text-blue-400"/> : <ChevronRight className="w-4 h-4 text-blue-400"/>}
                      <GraduationCap className="w-4 h-4 text-blue-400"/>
                      <span style={{color:'#fff', fontWeight:600, fontSize:14}}>{classeNom}</span>
                      <Badge className="bg-[#2d2d2d]">{totalNotes} notes</Badge>
                      <Badge className="bg-blue-700">{byBulletin.size} bulletin{byBulletin.size > 1 ? 's' : ''}</Badge>
                    </button>

                    {classeOpen && Array.from(byBulletin.entries()).map(([bKey, items]) => {
                      const [matNom, periode] = bKey.split('__');
                      const moy = items.length ? (items.reduce((s,n) => s + (typeof n.pourcentage === 'number' ? n.pourcentage : ((n.note||0)/(n.note_sur||20))*100), 0) / items.length).toFixed(1) : '0';
                      const bulletinKey = `${classeNom}__${bKey}`;
                      const isOpen = expandedBulletins.has(bulletinKey);
                      return (
                        <Card key={bulletinKey} style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d', marginBottom: 8, marginLeft: 20}}>
                          <CardHeader style={{cursor:'pointer', userSelect:'none', padding:'10px 16px'}} onClick={() => toggleSet(setExpandedBulletins, bulletinKey)}>
                            <div className="flex items-center gap-3">
                              {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400"/> : <ChevronRight className="w-4 h-4 text-gray-400"/>}
                              <BookOpen className="w-3 h-3 text-green-400"/>
                              <span style={{color:'#e0e0e0', fontWeight:500, fontSize:13}}>{matNom} • {periode}</span>
                              <Badge className="bg-[#2d2d2d]" style={{fontSize:10}}>{items.length} notes</Badge>
                              <Badge className="bg-green-700" style={{fontSize:10}}>Moy {moy}%</Badge>
                            </div>
                          </CardHeader>
                          {isOpen && <CardContent style={{paddingTop:0}}>
                            <div style={{textAlign:'center', marginBottom:16, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                              <div style={{fontSize:16, fontWeight:700, color:'#fff'}}>BULLETIN DE NOTES</div>
                              <div style={{display:'flex', justifyContent:'center', gap:24, marginTop:6, fontSize:12, color:'#9ca3af'}}>
                                <span><strong style={{color:'#ccc'}}>Matière :</strong> {matNom}</span>
                                <span><strong style={{color:'#ccc'}}>Classe :</strong> {classeNom}</span>
                                <span><strong style={{color:'#ccc'}}>Période :</strong> {periode}</span>
                              </div>
                              <div style={{fontSize:12, color:'#9ca3af', marginTop:4}}>
                                <strong style={{color:'#ccc'}}>Professeur :</strong> {items[0]?.professeur_nom || ''}
                              </div>
                            </div>
                            <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                              <thead>
                                <tr style={{background:'rgba(255,255,255,0.06)'}}>
                                  <th style={thS}>N°</th>
                                  <th style={thS}>Étudiant</th>
                                  <th style={thS}>Matricule</th>
                                  <th style={thC}>Note</th>
                                  <th style={thC}>%</th>
                                  <th style={thC}>Archivé le</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.sort((a,b) => (a.etudiant_nom||'').localeCompare(b.etudiant_nom||'')).map((a, idx) => (
                                  <tr key={a.id} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}
                                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                    <td style={{padding:'6px 10px', color:'#6b7280', fontFamily:'monospace', fontSize:11}}>{idx+1}</td>
                                    <td style={{padding:'6px 10px', color:'#fff', fontWeight:500}}>{a.etudiant_nom}</td>
                                    <td style={{padding:'6px 10px', color:'#9ca3af'}}>{a.etudiant_matricule||'-'}</td>
                                    <td style={{padding:'6px 10px', textAlign:'center', color:'#fff', fontWeight:700}}>{a.note}/{a.note_sur}</td>
                                    <td style={{padding:'6px 10px', textAlign:'center', color:'#9ca3af'}}>{typeof a.pourcentage==='number' ? a.pourcentage.toFixed(1)+'%' : '-'}</td>
                                    <td style={{padding:'6px 10px', textAlign:'center', color:'#9ca3af', fontSize:11}}>{a.archived_at ? new Date(a.archived_at).toLocaleDateString() : '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </CardContent>}
                        </Card>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </TabsContent>

          {/* TAB: Guide Pédagogique */}
          <TabsContent value="guide">
            <div className="grid gap-6">
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardHeader>
                  <CardTitle className="text-white">📚 Guide Pédagogique - Cahier de Cotation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-gray-300">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Introduction</h3>
                    <p>Ce cahier de cotation vous permet de saisir, gérer et publier les notes de vos étudiants de manière professionnelle et pédagogique.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">🎯 Objectifs</h3>
                    <ul className="list-disc list-inside space-y-2">
                      <li>Faciliter la saisie rapide et précise des notes</li>
                      <li>Suivre les progrès des étudiants</li>
                      <li>Garantir la transparence avec les étudiants et parents</li>
                      <li>Générer des statistiques de performance</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">📋 Étapes de saisie</h3>
                    <ol className="list-decimal list-inside space-y-2">
                      <li><strong className="text-white">Sélectionner la classe et la matière</strong> - Choisissez parmi vos assignations</li>
                      <li><strong className="text-white">Définir la période</strong> - Trimestre, semestre ou session</li>
                      <li><strong className="text-white">Préciser le type d'évaluation</strong> - Devoir, interrogation, examen, etc.</li>
                      <li><strong className="text-white">Saisir les notes</strong> - Remplissez le tableau pour chaque étudiant</li>
                      <li><strong className="text-white">Enregistrer</strong> - Les notes sont sauvegardées en brouillon</li>
                      <li><strong className="text-white">Envoyer pour validation</strong> - L'admin d'établissement approuve puis publie pour rendre les notes visibles aux étudiants et parents</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">💡 Conseils pédagogiques</h3>
                    <ul className="list-disc list-inside space-y-2">
                      <li>Variez les types d'évaluations pour une meilleure appréciation des compétences</li>
                      <li>Ajoutez des commentaires constructifs pour guider les étudiants</li>
                      <li>Publiez les notes rapidement pour un meilleur suivi pédagogique</li>
                      <li>Utilisez le système de pourcentage pour faciliter la comparaison</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">🔒 Confidentialité</h3>
                    <p>Les notes en brouillon ne sont visibles que par vous. Une fois publiées, elles deviennent accessibles aux étudiants et à leurs parents selon les paramètres définis.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <DraggableDialog open={openDialog} onOpenChange={(v) => { setOpenDialog(v); if (!v) setEditingNote(null); }} title="Modifier la note" subtitle={editingNote ? `${editingNote.etudiant_nom} • ${editingNote.titre_evaluation || ''}` : ''}>
            <DraggableDialogBody>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Note</Label>
                    <Input type="number" value={editNoteValue} onChange={(e) => setEditNoteValue(e.target.value)} style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />
                  </div>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Note sur</Label>
                    <Input type="number" value={editNoteSur} onChange={(e) => setEditNoteSur(e.target.value)} style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />
                  </div>
                </div>
              </div>
            </DraggableDialogBody>
            <DraggableDialogFooter>
              <Button variant="outline" onClick={() => { setOpenDialog(false); setEditingNote(null); }} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG}}>Annuler</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" style={CG} onClick={handleSubmitEdit}>Enregistrer</Button>
            </DraggableDialogFooter>
          </DraggableDialog>

          {/* Dialog Consulter les notes enregistrées */}
          <DraggableDialog open={consulterDialogOpen} onOpenChange={setConsulterDialogOpen} title={
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Notes enregistrées</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>{matieres.find(m => m.id === selectedMatiere)?.nom || ''} • {selectedPeriode || ''}</span>
            </span>
          } maxWidth="max-w-2xl">
            <DraggableDialogBody>
              {(!notesExistantes || notesExistantes.length === 0) ? (
                <div className="text-center py-8">
                  <FileSpreadsheet className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400" style={CG}>Aucune note enregistrée pour cette sélection.</p>
                </div>
              ) : (
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  {/* En-tête style QuestionnaireViewer */}
                  <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #4d4d4d', paddingBottom: 16, ...CG }}>
                    <h2 style={{ fontSize: 18, fontWeight: 'bold', margin: '0 0 4px 0', color: '#fff' }}>NOTES ENREGISTRÉES</h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, fontSize: 13, color: '#aaa' }}>
                      <span><strong>Type :</strong> {typeEvaluation}</span>
                      {titreEvaluation && <span><strong>Titre :</strong> {titreEvaluation}</span>}
                      <span><strong>Matière :</strong> {matieres.find(m => m.id === selectedMatiere)?.nom || ''}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4, fontSize: 13, color: '#aaa' }}>
                      <span><strong>Classe :</strong> {classes.find(c => c.id === selectedClasse)?.nom || ''}</span>
                      <span><strong>Période :</strong> {selectedPeriode}</span>
                      <span><strong>Note sur :</strong> {notesExistantes[0]?.note_sur || noteSur} pts</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
                      <strong>Professeur :</strong> {user?.full_name || ''}
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, ...CG }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>N°</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Étudiant</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Évaluation</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Note</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Statut</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notesExistantes.map((note, idx) => (
                        <tr key={note.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '6px 10px', color: '#6b7280', fontFamily: 'monospace', fontSize: 11 }}>{idx + 1}</td>
                          <td style={{ padding: '6px 10px', color: '#fff', fontWeight: 500 }}>{note.etudiant_nom}</td>
                          <td style={{ padding: '6px 10px', color: '#9ca3af' }}>{note.titre_evaluation}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', color: '#fff', fontWeight: 700 }}>{note.note}/{note.note_sur}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <span style={{
                              color: note.statut === 'publié' ? '#16a34a' : note.statut === 'soumis' ? '#eab308' : note.statut === 'validé' ? '#2563eb' : '#9ca3af',
                              fontSize: 11, fontWeight: 600, ...CG
                            }}>{note.statut || 'brouillon'}</span>
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              <button onClick={() => { setConsulterDialogOpen(false); handleStartEdit(note); }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 2 }} title="Modifier">
                                <Edit style={{ width: 14, height: 14 }} />
                              </button>
                              <button onClick={async () => {
                                try {
                                  await updateNoteMutation.mutateAsync({ id: note.id, data: { statut: 'soumis', visible_etudiant: false, visible_parent: false } });
                                  queryClient.invalidateQueries({ queryKey: ['notes'] });
                                  queryClient.invalidateQueries({ queryKey: ['notes-toutes'] });
                                } catch (e) { console.error(e); }
                              }} style={{ background: 'transparent', border: 'none', color: note.statut === 'soumis' ? '#6b7280' : '#16a34a', cursor: note.statut === 'soumis' ? 'default' : 'pointer', padding: 2 }} title="Envoyer à l'admin" disabled={note.statut === 'soumis'}>
                                <Send style={{ width: 14, height: 14 }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DraggableDialogBody>
            <DraggableDialogFooter>
              <Button variant="outline" onClick={() => setConsulterDialogOpen(false)} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG }}>Fermer</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" style={CG} disabled={!notesExistantes?.length || notesExistantes.every(n => n.statut === 'soumis')} onClick={() => handlePublishNotes()}>
                <Send className="w-4 h-4 mr-2" /> Tout envoyer à l'admin
              </Button>
            </DraggableDialogFooter>
          </DraggableDialog>

          {/* Dialog de confirmation de suppression de note */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gray-800">Supprimer cette note ?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  Cette action est irréversible. La note de <strong>{noteToDelete?.etudiant_nom}</strong> pour <strong>{noteToDelete?.titre_evaluation}</strong> sera définitivement supprimée.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel style={{backgroundColor: '#2d2d2d', color: '#ffffff', borderColor: '#5a5a5a'}}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteNote}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dialog de confirmation de suppression d'archive */}
          <AlertDialog open={deleteArchiveDialogOpen} onOpenChange={setDeleteArchiveDialogOpen}>
            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gray-800">Supprimer cette archive ?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  Cette action est irréversible. L'archive de <strong>{archiveToDelete?.etudiant_nom}</strong> pour <strong>{archiveToDelete?.titre_evaluation}</strong> sera définitivement supprimée.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel style={{backgroundColor: '#2d2d2d', color: '#ffffff', borderColor: '#5a5a5a'}}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteArchive}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dialog de confirmation de purge des archives */}
          <AlertDialog open={purgeArchiveDialogOpen} onOpenChange={setPurgeArchiveDialogOpen}>
            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gray-800">Purger toutes les archives ?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  Cette action est irréversible. Toutes les archives approuvées seront définitivement supprimées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel style={{backgroundColor: '#2d2d2d', color: '#ffffff', borderColor: '#5a5a5a'}}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => purgeArchivesMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Purger
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Tabs>
      </div>
    </div>
  );
}
