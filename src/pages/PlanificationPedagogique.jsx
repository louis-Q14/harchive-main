import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Save,
  Eye,
  Share2,
  Download,
  Upload,
  Search,
  Filter,
  Loader2,
  BookOpen,
  Target,
  Clock,
  FileText,
  Lightbulb,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FolderOpen,
  Link as LinkIcon,
  ArrowLeft,
  FileDown } from
"lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FileViewer from "@/components/documents/FileViewer";
import FichePreparationDialog from "@/components/planification/FichePreparationDialog";
import FichePreparationViewer from "@/components/planification/FichePreparationViewer";
import QuestionnaireDialog from "@/components/planification/QuestionnaireDialog";
import QuestionnaireViewer from "@/components/planification/QuestionnaireViewer";
import RessourceDialog from "@/components/planification/RessourceDialog";
import { uploadFile } from "@/api/uploadService";

export default function PlanificationPedagogique() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatut, setSelectedStatut] = useState("tous");
  const [openSequenceDialog, setOpenSequenceDialog] = useState(false);
  const [openRessourceDialog, setOpenRessourceDialog] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);
  const [editingRessource, setEditingRessource] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [viewingRessource, setViewingRessource] = useState(null);
  const [openFicheDialog, setOpenFicheDialog] = useState(false);
  const [editingFiche, setEditingFiche] = useState(null);
  const [expandedFiches, setExpandedFiches] = useState({});
  const [viewingFiche, setViewingFiche] = useState(null);
  const [openQuestionnaireDialog, setOpenQuestionnaireDialog] = useState(false);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState(null);
  const [typeQuestionnaire, setTypeQuestionnaire] = useState("examen");
  const [viewingQuestionnaire, setViewingQuestionnaire] = useState(null);
  const [questionnaireForm, setQuestionnaireForm] = useState({
    titre: "",
    classe_id: "",
    matiere_id: "",
    date_examen: "",
    duree: "",
    bareme_total: "",
    consignes: "",
    numero_identification: "",
    questions: []
  });

  const queryClient = useQueryClient();

  // État formulaire séquence
  const [sequenceForm, setSequenceForm] = useState({
    titre: "",
    description: "",
    classe_id: "",
    matiere_id: "",
    duree_prevue: "",
    date_debut: "",
    date_fin: "",
    objectifs: [],
    competences: [],
    seances: [],
    statut: "brouillon"
  });

  // État formulaire ressource
  const [ressourceForm, setRessourceForm] = useState({
    titre: "",
    description: "",
    type: "fiche",
    matiere_id: "",
    niveau: "",
    competences: [],
    tags: [],
    public: false,
    fichier_url: "",
    lien_externe: "",
    vignette_url: ""
  });

  // État formulaire fiche de préparation
  const [ficheForm, setFicheForm] = useState({
    date_seance: "",
    duree_seance: "",
    filiere: "",
    annee: "",
    groupe: "",
    module: "",
    titre_seance: "",
    objectifs_seance: "",
    espace_formation: "Salle de cours",
    introduction: {
      rappel: { contenu: "", duree: 10 },
      elements_motivation: { contenu: "", duree: 10 },
      plan_seance: { contenu: "", duree: 15 }
    },
    developpement: {
      strategies_pedagogiques: "",
      methodes_pedagogiques: "",
      supports_pedagogiques: "",
      activites: []
    },
    conclusion: {
      synthese: { contenu: "", duree: 10 }
    },
    evaluation: {
      prochaine_seance: { contenu: "", duree: 10 }
    },
    remarques: "",
    classe_id: "",
    matiere_id: ""
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

  // Charger assignations - chercher par email ET par id car professeur_id = ID de DemandeInscription
  const { data: assignations = [] } = useQuery({
    queryKey: ['assignations-prof', user?.id, user?.email],
    queryFn: async () => {
      const [byEmail, byId] = await Promise.all([
        dataService.query('AssignationProfesseur', { filters: [{ professeur_email: user.email }] }),
        dataService.query('AssignationProfesseur', { filters: [{ professeur_id: user.id }] }),
      ]);
      // Dédupliquer par id
      const all = [...byEmail, ...byId];
      const seen = new Set();
      return all.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
    },
    enabled: !!user
  });

  // Charger les promotions depuis l'établissement
  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', user?.etablissement_id],
    queryFn: async () => {
      if (!user?.etablissement_id) return [];
      return await dataService.query('Promotion', { filters: [{
        etablissement_id: user.etablissement_id
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user?.etablissement_id
  });

  // Charger les matières depuis Matiere
  const { data: matieresData = [] } = useQuery({
    queryKey: ['matieres', user?.etablissement_id],
    queryFn: async () => {
      if (!user?.etablissement_id) return [];
      return await dataService.query('Matiere', { filters: [{
        etablissement_id: user.etablissement_id
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user?.etablissement_id
  });

  // Charger séquences
  const { data: sequences = [] } = useQuery({
    queryKey: ['sequences', user?.id],
    queryFn: async () => {
      return await dataService.query('SequencePedagogique', { filters: [{
        professeur_id: user.id
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user
  });

  // Charger ressources
  const { data: ressources = [] } = useQuery({
    queryKey: ['ressources', user?.etablissement_id],
    queryFn: async () => {
      const allRessources = await dataService.query('RessourcePedagogique');
      return allRessources.filter((r) =>
      r.professeur_id === user.id || r.public
      );
    },
    enabled: !!user
  });

  // Charger fiches de préparation (non masquées par le professeur)
  const { data: fiches = [] } = useQuery({
    queryKey: ['fiches-preparation', user?.id],
    queryFn: async () => {
      const allFiches = await dataService.query('FichePreparation', { filters: [{
        professeur_id: user.id
      }],
  limit: 1000, offset: 0 });
      // Filtrer celles qui ne sont pas masquées par le professeur
      return allFiches.filter(f => !f.masque_par_professeur);
    },
    enabled: !!user
  });

  // Charger questionnaires (non masqués par le professeur)
  const { data: questionnaires = [] } = useQuery({
    queryKey: ['questionnaires', user?.id],
    queryFn: async () => {
      const allQuestionnaires = await dataService.query('QuestionnaireExamen', { filters: [{
        professeur_id: user.id
      }],
  limit: 1000, offset: 0 });
      // Filtrer ceux qui ne sont pas masqués par le professeur
      return allQuestionnaires.filter(q => !q.masque_par_professeur);
    },
    enabled: !!user
  });

  // Mutations séquences
  const createSequenceMutation = useMutation({
    mutationFn: (data) => dataService.create('SequencePedagogique', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      setOpenSequenceDialog(false);
      resetSequenceForm();
    }
  });

  const updateSequenceMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('SequencePedagogique', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      setOpenSequenceDialog(false);
      resetSequenceForm();
    }
  });

  const deleteSequenceMutation = useMutation({
    mutationFn: (id) => dataService.delete('SequencePedagogique', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    }
  });

  // Mutations ressources
  const createRessourceMutation = useMutation({
    mutationFn: (data) => dataService.create('RessourcePedagogique', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ressources'] });
      setOpenRessourceDialog(false);
      resetRessourceForm();
    }
  });

  const updateRessourceMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('RessourcePedagogique', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ressources'] });
      setOpenRessourceDialog(false);
      resetRessourceForm();
    }
  });

  const deleteRessourceMutation = useMutation({
    mutationFn: (id) => dataService.delete('RessourcePedagogique', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ressources'] });
    }
  });

  // Mutations fiches de préparation
  const createFicheMutation = useMutation({
    mutationFn: (data) => dataService.create('FichePreparation', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiches-preparation'] });
      setOpenFicheDialog(false);
      resetFicheForm();
    }
  });

  const updateFicheMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('FichePreparation', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiches-preparation'] });
      setOpenFicheDialog(false);
      resetFicheForm();
    }
  });

  const deleteFicheMutation = useMutation({
    mutationFn: (id) => dataService.update('FichePreparation', id, { masque_par_professeur: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiches-preparation'] });
    }
  });

  // Mutations questionnaires
  const createQuestionnaireMutation = useMutation({
    mutationFn: (data) => dataService.create('QuestionnaireExamen', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      setOpenQuestionnaireDialog(false);
    }
  });

  const updateQuestionnaireMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('QuestionnaireExamen', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      setOpenQuestionnaireDialog(false);
    }
  });

  const deleteQuestionnaireMutation = useMutation({
    mutationFn: (id) => dataService.update('QuestionnaireExamen', id, { masque_par_professeur: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
    }
  });

  // Filtrer uniquement les promotions et matières assignées au professeur
  const assignedClasseIds = [...new Set(assignations.map(a => a.classe_id).filter(Boolean))];
  const assignedMatiereIds = [...new Set(assignations.map(a => a.matiere_id).filter(Boolean))];

  const classes = assignedClasseIds.map(id => {
    const found = promotions.find(p => p.id === id);
    if (found) return { id: found.id, nom: found.nom };
    const assign = assignations.find(a => a.classe_id === id);
    return assign ? { id: assign.classe_id, nom: assign.classe_nom } : null;
  }).filter(Boolean);

  const matieres = assignedMatiereIds.map(id => {
    const found = matieresData.find(m => m.id === id);
    if (found) return { id: found.id, nom: found.nom };
    const assign = assignations.find(a => a.matiere_id === id);
    return assign ? { id: assign.matiere_id, nom: assign.matiere_nom } : null;
  }).filter(Boolean);

  const resetSequenceForm = () => {
    setSequenceForm({
      titre: "",
      description: "",
      classe_id: "",
      matiere_id: "",
      duree_prevue: "",
      date_debut: "",
      date_fin: "",
      objectifs: [],
      competences: [],
      seances: [],
      statut: "brouillon"
    });
    setEditingSequence(null);
  };

  const resetRessourceForm = () => {
    setRessourceForm({
      titre: "",
      description: "",
      type: "fiche",
      matiere_id: "",
      niveau: "",
      competences: [],
      tags: [],
      public: false,
      fichier_url: "",
      lien_externe: "",
      vignette_url: ""
    });
    setEditingRessource(null);
  };

  const resetFicheForm = () => {
    setFicheForm({
      date_seance: "",
      duree_seance: "",
      filiere: "",
      annee: "",
      groupe: "",
      module: "",
      titre_seance: "",
      objectifs_seance: "",
      espace_formation: "Salle de cours",
      introduction: {
        rappel: { contenu: "", duree: 10 },
        elements_motivation: { contenu: "", duree: 10 },
        plan_seance: { contenu: "", duree: 15 }
      },
      developpement: {
        strategies_pedagogiques: "",
        methodes_pedagogiques: "",
        supports_pedagogiques: "",
        activites: []
      },
      conclusion: {
        synthese: { contenu: "", duree: 10 }
      },
      evaluation: {
        prochaine_seance: { contenu: "", duree: 10 }
      },
      remarques: "",
      classe_id: "",
      matiere_id: ""
    });
    setEditingFiche(null);
  };

  const handleEditSequence = (sequence) => {
    setEditingSequence(sequence);
    setSequenceForm(sequence);
    setOpenSequenceDialog(true);
  };

  const handleEditRessource = (ressource) => {
    setEditingRessource(ressource);
    setRessourceForm(ressource);
    setOpenRessourceDialog(true);
  };

  const handleEditFiche = (fiche) => {
    setEditingFiche(fiche);
    setFicheForm(fiche);
    setOpenFicheDialog(true);
  };

  const handleEditQuestionnaire = (questionnaire) => {
    setEditingQuestionnaire(questionnaire);
    setTypeQuestionnaire(questionnaire.type_evaluation);
    let parsedQuestions = [];
    const raw = questionnaire.contenu_questions;
    if (Array.isArray(raw)) { parsedQuestions = raw; }
    else if (typeof raw === 'string' && raw.length > 0) { try { parsedQuestions = JSON.parse(raw); } catch { parsedQuestions = []; } }
    setQuestionnaireForm({
      titre: questionnaire.titre,
      classe_id: questionnaire.classe_id,
      matiere_id: questionnaire.matiere_id,
      date_examen: questionnaire.date_examen || "",
      duree: questionnaire.duree || "",
      bareme_total: questionnaire.bareme_total || "",
      consignes: questionnaire.consignes || "",
      numero_identification: questionnaire.numero_identification || "",
      questions: parsedQuestions
    });
    setOpenQuestionnaireDialog(true);
  };

  const handleSaveQuestionnaire = async () => {
    if (!questionnaireForm.titre || !questionnaireForm.classe_id || !questionnaireForm.matiere_id) {
      alert("Veuillez remplir les champs obligatoires");
      return;
    }

    if ((questionnaireForm.questions || []).length === 0) {
      alert("Veuillez ajouter au moins une question");
      return;
    }

    if (!user.etablissement_id) {
      alert("Erreur: Votre compte n'est pas associé é  un établissement.");
      return;
    }

    const classe = classes.find(c => c.id === questionnaireForm.classe_id);
    const matiere = matieres.find(m => m.id === questionnaireForm.matiere_id);

    const { questions, ...formFields } = questionnaireForm;
    const data = {
      ...formFields,
      contenu_questions: JSON.stringify(questions),
      type_evaluation: typeQuestionnaire,
      professeur_id: user.id,
      professeur_nom: user.full_name,
      etablissement_id: user.etablissement_id,
      classe_nom: classe?.nom || "",
      matiere_nom: matiere?.nom || ""
    };

    if (editingQuestionnaire) {
      await updateQuestionnaireMutation.mutateAsync({ id: editingQuestionnaire.id, data });
    } else {
      await createQuestionnaireMutation.mutateAsync(data);
    }
    
    setQuestionnaireForm({
      titre: "",
      classe_id: "",
      matiere_id: "",
      date_examen: "",
      duree: "",
      bareme_total: "",
      consignes: "",
      numero_identification: "",
      questions: []
    });
    setEditingQuestionnaire(null);
  };

  const handleSaveFiche = async () => {
    if (!ficheForm.date_seance || !ficheForm.titre_seance) {
      alert("Veuillez remplir les champs obligatoires");
      return;
    }

    if (!user.etablissement_id) {
      alert("Erreur: Votre compte n'est pas associé é  un établissement.");
      return;
    }

    const data = {
      ...ficheForm,
      professeur_id: user.id,
      professeur_nom: user.full_name,
      etablissement_id: user.etablissement_id
    };

    if (editingFiche) {
      await updateFicheMutation.mutateAsync({ id: editingFiche.id, data });
    } else {
      await createFicheMutation.mutateAsync(data);
    }
  };

  const addActivite = () => {
    setFicheForm({
      ...ficheForm,
      developpement: {
        ...ficheForm.developpement,
        activites: [...ficheForm.developpement.activites, { contenu: "", duree: 0 }]
      }
    });
  };

  const updateActivite = (index, field, value) => {
    const newActivites = [...ficheForm.developpement.activites];
    newActivites[index][field] = value;
    setFicheForm({
      ...ficheForm,
      developpement: {
        ...ficheForm.developpement,
        activites: newActivites
      }
    });
  };

  const removeActivite = (index) => {
    setFicheForm({
      ...ficheForm,
      developpement: {
        ...ficheForm.developpement,
        activites: ficheForm.developpement.activites.filter((_, i) => i !== index)
      }
    });
  };

  const exportToPDF = async (ficheId) => {
    try {
      const fiche = fiches.find(f => f.id === ficheId);
      if (!fiche) return;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = margin;

      // Titre principal - 14pt gras
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Fiche de préparation pédagogique', pageWidth / 2, yPos, { align: 'center' });
      yPos += 7;

      // Numéro d'identification - 11pt normal
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text(`N° identification: ${fiche.numero_identification || '-'}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // En-tête en deux colonnes - 11pt normal
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      
      const col1X = margin;
      const col2X = pageWidth / 2 + 5;
      
      pdf.text(`Date de la séance: ${fiche.date_seance ? format(new Date(fiche.date_seance), 'dd/MM/yyyy') : '-'}`, col1X, yPos);
      pdf.text(`Filière: ${fiche.filiere || '-'}`, col2X, yPos);
      yPos += 5;
      
      pdf.text(`Module: ${fiche.module || '-'}`, col1X, yPos);
      pdf.text(`Année: ${fiche.annee || '-'}`, col2X, yPos);
      yPos += 5;
      
      pdf.text(`Titre de la séance: ${fiche.titre_seance}`, col1X, yPos);
      pdf.text(`Groupe: ${fiche.groupe || '-'}`, col2X, yPos);
      yPos += 8;

      // Objectifs de la séance - 11pt
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text('Objectifs de la séance:', col1X, yPos);
      yPos += 4;
      
      pdf.setFontSize(9);
      const objText = pdf.splitTextToSize(fiche.objectifs_seance || 'Non définis', pageWidth - 2 * margin);
      pdf.text(objText, col1X, yPos);
      yPos += objText.length * 4 + 4;

      // Espace de la formation - 11pt
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text('Espace de la formation:', col1X, yPos);
      yPos += 4;
      pdf.setFontSize(9);
      
      const espaceCases = ['Salle de cours', 'Salle spécialisée', 'Atelier'];
      let xPos = col1X;
      espaceCases.forEach(espace => {
        const checked = fiche.espace_formation === espace ? '☑' : '☐';
        pdf.text(`${checked} ${espace}`, xPos, yPos);
        xPos += 55;
      });
      yPos += 10;

      // Tableau Introduction
      pdf.autoTable({
        head: [['', 'Introduction', 'Durée en minutes']],
        body: [
          ['Rappel', fiche.introduction?.rappel?.contenu || '', fiche.introduction?.rappel?.duree || '0'],
          ['Éléments de motivation', fiche.introduction?.elements_motivation?.contenu || '', fiche.introduction?.elements_motivation?.duree || '0'],
          ['Plan de la séance', fiche.introduction?.plan_seance?.contenu || '', fiche.introduction?.plan_seance?.duree || '0']
        ],
        startY: yPos,
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 11, halign: 'center', font: 'helvetica' },
        bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'top', font: 'helvetica' },
        columnStyles: {
          0: { cellWidth: 35, halign: 'left' },
          1: { cellWidth: pageWidth - 2 * margin - 60, halign: 'left' },
          2: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: margin, right: margin },
        didDrawPage: () => {}
      });
      yPos = pdf.lastAutoTable.finalY + 5;

      // Tableau Développement
      const devActivities = [];
      if (fiche.developpement?.activites?.length > 0) {
        fiche.developpement.activites.forEach(act => {
          devActivities.push(`■ ${act.contenu} (${act.duree}min)`);
        });
      }

      pdf.autoTable({
        head: [['Stratégies pédagogiques', 'Développement', 'Durée']],
        body: [
          [
            `Méthodes pédagogiques:\n${fiche.developpement?.methodes_pedagogiques || '-'}\n\nSupports pédagogiques:\n${fiche.developpement?.supports_pedagogiques || '-'}`,
            `${fiche.developpement?.strategies_pedagogiques || ''}\n${devActivities.length > 0 ? '\n' + devActivities.join('\n') : ''}`,
            devActivities.length > 0 ? devActivities.map(a => a.split('(')[1]?.replace(')', '') || '').join('\n') : ''
          ]
        ],
        startY: yPos,
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 11, halign: 'center', font: 'helvetica' },
        bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'top', font: 'helvetica' },
        columnStyles: {
          0: { cellWidth: 40, halign: 'left' },
          1: { cellWidth: pageWidth - 2 * margin - 65, halign: 'left' },
          2: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: margin, right: margin }
      });
      yPos = pdf.lastAutoTable.finalY + 5;

      // Tableau Conclusion
      pdf.autoTable({
        head: [['', 'Conclusion', 'Durée en minutes']],
        body: [
          ['Synthèse', fiche.conclusion?.synthese?.contenu || '', fiche.conclusion?.synthese?.duree || '0']
        ],
        startY: yPos,
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 11, halign: 'center', font: 'helvetica' },
        bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'top', font: 'helvetica' },
        columnStyles: {
          0: { cellWidth: 35, halign: 'left' },
          1: { cellWidth: pageWidth - 2 * margin - 60, halign: 'left' },
          2: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: margin, right: margin }
      });
      yPos = pdf.lastAutoTable.finalY + 5;

      // Tableau Évaluation
      pdf.autoTable({
        head: [['', 'Évaluation', 'Durée en minutes']],
        body: [
          ['Prochaine séance', fiche.evaluation?.prochaine_seance?.contenu || '', fiche.evaluation?.prochaine_seance?.duree || '0']
        ],
        startY: yPos,
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 11, halign: 'center', font: 'helvetica' },
        bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'top', font: 'helvetica' },
        columnStyles: {
          0: { cellWidth: 35, halign: 'left' },
          1: { cellWidth: pageWidth - 2 * margin - 60, halign: 'left' },
          2: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: margin, right: margin }
      });
      yPos = pdf.lastAutoTable.finalY + 5;

      // Remarques
      if (fiche.remarques) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.text('Remarque sur le déroulement de la séance:', margin, yPos);
        yPos += 5;
        
        pdf.setFontSize(9);
        const remarqueText = pdf.splitTextToSize(fiche.remarques, pageWidth - 2 * margin);
        pdf.text(remarqueText, margin, yPos);
      }

      const fileName = `Fiche_Preparation_${fiche.titre_seance.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de l\'export PDF');
    }
  };

  const toggleFicheExpand = (ficheId) => {
    setExpandedFiches(prev => ({
      ...prev,
      [ficheId]: !prev[ficheId]
    }));
  };

  const handleSaveSequence = async () => {
    if (!sequenceForm.titre || !sequenceForm.classe_id || !sequenceForm.matiere_id) {
      alert("Veuillez remplir les champs obligatoires");
      return;
    }

    if (!user.etablissement_id) {
      alert("Erreur: Votre compte n'est pas associé é  un établissement. Veuillez contacter un administrateur.");
      return;
    }

    const data = {
      ...sequenceForm,
      professeur_id: user.id,
      professeur_nom: user.full_name,
      etablissement_id: user.etablissement_id
    };

    if (editingSequence) {
      await updateSequenceMutation.mutateAsync({ id: editingSequence.id, data });
    } else {
      await createSequenceMutation.mutateAsync(data);
    }
  };

  const handleSaveRessource = async () => {
    if (!ressourceForm.titre || !ressourceForm.type) {
      alert("Veuillez remplir les champs obligatoires");
      return;
    }

    if (!user.etablissement_id) {
      alert("Erreur: Votre compte n'est pas associé é  un établissement. Veuillez contacter un administrateur.");
      return;
    }

    const data = {
      ...ressourceForm,
      professeur_id: user.id,
      professeur_nom: user.full_name,
      etablissement_id: user.etablissement_id,
      nombre_utilisations: ressourceForm.nombre_utilisations || 0
    };

    try {
      if (editingRessource) {
        await updateRessourceMutation.mutateAsync({ id: editingRessource.id, data });
      } else {
        await createRessourceMutation.mutateAsync(data);
      }
      alert("Ressource enregistrée avec succès !");
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err);
      alert("Erreur lors de l'enregistrement: " + (err?.message || "Erreur inconnue"));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const result = await uploadFile(file, 'documents');
      setRessourceForm({ ...ressourceForm, fichier_url: result.url });
    } catch (error) {
      console.error("Erreur upload:", error);
      alert("Erreur lors de l'upload du fichier");
    } finally {
      setUploadingFile(false);
    }
  };

  const addObjectif = () => {
    setSequenceForm({
      ...sequenceForm,
      objectifs: [...sequenceForm.objectifs, { type: "connaissance", description: "" }]
    });
  };

  const updateObjectif = (index, field, value) => {
    const newObjectifs = [...sequenceForm.objectifs];
    newObjectifs[index][field] = value;
    setSequenceForm({ ...sequenceForm, objectifs: newObjectifs });
  };

  const removeObjectif = (index) => {
    setSequenceForm({
      ...sequenceForm,
      objectifs: sequenceForm.objectifs.filter((_, i) => i !== index)
    });
  };

  const addSeance = () => {
    setSequenceForm({
      ...sequenceForm,
      seances: [...sequenceForm.seances, {
        numero: sequenceForm.seances.length + 1,
        titre: "",
        duree: 0,
        objectifs: [],
        activites: [],
        supports: [],
        evaluation: ""
      }]
    });
  };

  const updateSeance = (index, field, value) => {
    const newSeances = [...sequenceForm.seances];
    newSeances[index][field] = value;
    setSequenceForm({ ...sequenceForm, seances: newSeances });
  };

  const removeSeance = (index) => {
    setSequenceForm({
      ...sequenceForm,
      seances: sequenceForm.seances.filter((_, i) => i !== index)
    });
  };

  const filteredSequences = sequences.filter((s) => {
    const matchSearch = s.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatut = selectedStatut === "tous" || s.statut === selectedStatut;
    return matchSearch && matchStatut;
  });

  const getStatutColor = (statut) => {
    const colors = {
      brouillon: "bg-gray-600",
      en_cours: "bg-blue-600",
      terminé: "bg-green-600",
      archivé: "bg-orange-600"
    };
    return colors[statut] || "bg-gray-600";
  };

  const getTypeRessourceIcon = (type) => {
    const icons = {
      fiche: FileText,
      exercice: Target,
      diaporama: BookOpen,
      video: Clock,
      document: FileText,
      lien: LinkIcon
    };
    return icons[type] || FileText;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#4d4d4d' }}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>);

  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#4d4d4d' }}>
      <div className="w-full px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl('MesClasses'))} className="bg-[#333333] mr-2 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-9">


                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Calendar className="w-10 h-10 text-blue-500" />
              <div>
                <h1 className="text-3xl font-bold text-white">Planification Pédagogique</h1>
                <p className="text-gray-300">Gérez vos séquences, progressions et ressources</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Séquences actives</p>
                  <p className="text-3xl font-bold text-white">
                    {sequences.filter((s) => s.statut === 'en_cours').length}
                  </p>
                </div>
                <Target className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Brouillons</p>
                  <p className="text-3xl font-bold text-white">
                    {sequences.filter((s) => s.statut === 'brouillon').length}
                  </p>
                </div>
                <Edit className="w-12 h-12 text-gray-500" />
              </div>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Ressources</p>
                  <p className="text-3xl font-bold text-white">{ressources.length}</p>
                </div>
                <BookOpen className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Classes</p>
                  <p className="text-3xl font-bold text-white">{classes.length}</p>
                </div>
                <Users className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="fiches" className="space-y-6">
          <TabsList className="bg-[#3d3d3d]">
            <TabsTrigger value="fiches">Fiche de Préparation Pédagogique</TabsTrigger>
            <TabsTrigger value="questionnaires">Composition des Questionnaire</TabsTrigger>
            <TabsTrigger value="sequences">Séquences & Progressions</TabsTrigger>
            <TabsTrigger value="ressources">Banque de Ressources</TabsTrigger>
            <TabsTrigger value="calendrier">Calendrier</TabsTrigger>
          </TabsList>

          {/* TAB: Fiche de Préparation */}
          <TabsContent value="fiches" className="space-y-6">
            <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <p className="text-gray-300">{fiches.length} fiche(s) de préparation</p>
                  <Button
                    onClick={() => {
                      resetFicheForm();
                      setOpenFicheDialog(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle Fiche
                  </Button>
                </div>
              </CardContent>
            </Card>

            {fiches.length === 0 ? (
              <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">Aucune fiche de préparation</p>
                  <p className="text-sm text-gray-500">Créez votre première fiche de préparation pédagogique</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {fiches.map((fiche) => {
                  const classe = classes.find((c) => c.id === fiche.classe_id);
                  const matiere = matieres.find((m) => m.id === fiche.matiere_id);

                  const isExpanded = expandedFiches[fiche.id];
                  return (
                    <Card key={fiche.id} style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
                      <CardHeader 
                        className="border-b cursor-pointer hover:opacity-80 transition-opacity" 
                        style={{ borderColor: '#2d2d2d' }}
                        onClick={() => setViewingFiche(fiche)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <h2 className="text-xl font-bold text-white">
                              <span className="text-blue-400 font-bold">{fiche.numero_identification}</span> - Fiche de préparation pédagogique - {fiche.titre_seance}
                            </h2>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => setViewingFiche(fiche)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditFiche(fiche)} title="Modifier">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => exportToPDF(fiche.id)}>
                              <FileDown className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              if (confirm('Voulez-vous supprimer cette fiche ?')) {
                                deleteFicheMutation.mutate(fiche.id);
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB: Composition des Questionnaires */}
          <TabsContent value="questionnaires" className="space-y-6">
            <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-gray-300">Créer et gérer vos questionnaires d'examens et d'interrogations</p>
                </div>
                
                <div className="space-y-8">
                  {/* Section Questionnaires d'Examen */}
                  <div>
                    <Card 
                      className="cursor-pointer hover:shadow-lg transition-shadow mb-4" 
                      style={{ backgroundColor: '#2d2d2d', borderColor: '#4d4d4d' }}
                      onClick={() => {
                        setTypeQuestionnaire("examen");
                        setEditingQuestionnaire(null);
                        setQuestionnaireForm({ titre: "", classe_id: "", matiere_id: "", date_examen: "", duree: "", bareme_total: "", consignes: "", numero_identification: "", questions: [] });
                        setOpenQuestionnaireDialog(true);
                      }}
                    >
                      <CardContent className="pt-6 text-center">
                        <FileText className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Questionnaire d'Examen</h3>
                        <p className="text-gray-400 text-sm mb-4">Créer un questionnaire pour un examen</p>
                        <Badge className="bg-blue-600">
                          {questionnaires.filter(q => q.type_evaluation === 'examen').length} questionnaire(s)
                        </Badge>
                      </CardContent>
                    </Card>

                    {questionnaires.filter(q => q.type_evaluation === 'examen').length > 0 && (
                      <div className="space-y-4">
                        {questionnaires.filter(q => q.type_evaluation === 'examen').map((q) => (
                          <div key={q.id} className="p-4 rounded-lg cursor-pointer hover:bg-[#3d3d3d] transition-colors" style={{ backgroundColor: '#2d2d2d' }} onClick={() => setViewingQuestionnaire(q)}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-white">{q.titre}</h4>
                                  {q.approuve_admin ? (
                                    <Badge className="bg-green-600 text-xs">Approuvé</Badge>
                                  ) : q.transmis_admin ? (
                                    <Badge className="bg-yellow-600 text-xs">En attente</Badge>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                  <span>{classes.find(c => c.id === q.classe_id)?.nom}</span>
                                  <span>→</span>
                                  <span>{matieres.find(m => m.id === q.matiere_id)?.nom}</span>
                                  {q.date_examen && (
                                    <>
                                      <span>→</span>
                                      <span>{format(new Date(q.date_examen), 'dd/MM/yyyy')}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="outline" onClick={() => setViewingQuestionnaire(q)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleEditQuestionnaire(q)} title="Modifier">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => {
                                  if (confirm('Voulez-vous supprimer ce questionnaire ?')) {
                                    deleteQuestionnaireMutation.mutate(q.id);
                                  }
                                }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section Questionnaires d'Interrogation */}
                  <div>
                    <Card 
                      className="cursor-pointer hover:shadow-lg transition-shadow mb-4" 
                      style={{ backgroundColor: '#2d2d2d', borderColor: '#4d4d4d' }}
                      onClick={() => {
                        setTypeQuestionnaire("interrogation");
                        setEditingQuestionnaire(null);
                        setQuestionnaireForm({ titre: "", classe_id: "", matiere_id: "", date_examen: "", duree: "", bareme_total: "", consignes: "", numero_identification: "", questions: [] });
                        setOpenQuestionnaireDialog(true);
                      }}
                    >
                      <CardContent className="pt-6 text-center">
                        <FileText className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Questionnaire d'Interrogation</h3>
                        <p className="text-gray-400 text-sm mb-4">Créer un questionnaire pour une interrogation</p>
                        <Badge className="bg-green-600">
                          {questionnaires.filter(q => q.type_evaluation === 'interrogation').length} questionnaire(s)
                        </Badge>
                      </CardContent>
                    </Card>

                    {questionnaires.filter(q => q.type_evaluation === 'interrogation').length > 0 && (
                      <div className="space-y-4">
                        {questionnaires.filter(q => q.type_evaluation === 'interrogation').map((q) => (
                          <div key={q.id} className="p-4 rounded-lg cursor-pointer hover:bg-[#3d3d3d] transition-colors" style={{ backgroundColor: '#2d2d2d' }} onClick={() => setViewingQuestionnaire(q)}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-white">{q.titre}</h4>
                                  {q.approuve_admin ? (
                                    <Badge className="bg-green-600 text-xs">Approuvé</Badge>
                                  ) : q.transmis_admin ? (
                                    <Badge className="bg-yellow-600 text-xs">En attente</Badge>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                  <span>{classes.find(c => c.id === q.classe_id)?.nom}</span>
                                  <span>→</span>
                                  <span>{matieres.find(m => m.id === q.matiere_id)?.nom}</span>
                                  {q.date_examen && (
                                    <>
                                      <span>→</span>
                                      <span>{format(new Date(q.date_examen), 'dd/MM/yyyy')}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="outline" onClick={() => setViewingQuestionnaire(q)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleEditQuestionnaire(q)} title="Modifier">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => {
                                  if (confirm('Voulez-vous supprimer ce questionnaire ?')) {
                                    deleteQuestionnaireMutation.mutate(q.id);
                                  }
                                }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Séquences */}
          <TabsContent value="sequences" className="space-y-6">
            {/* Filtres et actions */}
            <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher une séquence..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10" />

                  </div>
                  <Select value={selectedStatut} onValueChange={setSelectedStatut}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous les statuts</SelectItem>
                      <SelectItem value="brouillon">Brouillons</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="terminé">Terminées</SelectItem>
                      <SelectItem value="archivé">Archivées</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      resetSequenceForm();
                      setOpenSequenceDialog(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700">

                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle Séquence
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Liste des séquences */}
            {filteredSequences.length === 0 ?
            <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
                <CardContent className="py-12 text-center">
                  <Target className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">Aucune séquence trouvée</p>
                  <p className="text-sm text-gray-500">Créez votre première séquence pédagogique</p>
                </CardContent>
              </Card> :

            <div className="grid gap-6">
                {filteredSequences.map((sequence) => {
                const classe = classes.find((c) => c.id === sequence.classe_id);
                const matiere = matieres.find((m) => m.id === sequence.matiere_id);

                return (
                  <Card key={sequence.id} style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-white text-xl">{sequence.titre}</CardTitle>
                              <Badge className={getStatutColor(sequence.statut)}>
                                {sequence.statut}
                              </Badge>
                              {sequence.partage &&
                            <Badge className="bg-purple-600">
                                  <Share2 className="w-3 h-3 mr-1" />
                                  Partagé
                                </Badge>
                            }
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>{classe?.nom}</span>
                              <span>→</span>
                              <span>{matiere?.nom}</span>
                              {sequence.date_debut &&
                            <>
                                  <span>→</span>
                                  <span>{format(new Date(sequence.date_debut), 'dd MMM yyyy', { locale: fr })}</span>
                                </>
                            }
                              {sequence.duree_prevue &&
                            <>
                                  <span>→</span>
                                  <span>{sequence.duree_prevue}h</span>
                                </>
                            }
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditSequence(sequence)}>

                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('Supprimer cette séquence ?')) {
                                deleteSequenceMutation.mutate(sequence.id);
                              }
                            }}>

                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300 mb-4">{sequence.description}</p>
                        
                        <div className="grid md:grid-cols-3 gap-4">
                          {sequence.objectifs?.length > 0 &&
                        <div>
                              <p className="text-sm font-semibold text-white mb-2">Objectifs ({sequence.objectifs.length})</p>
                              <div className="space-y-1">
                                {sequence.objectifs.slice(0, 3).map((obj, idx) =>
                            <p key={idx} className="text-sm text-gray-400">• {obj.description}</p>
                            )}
                              </div>
                            </div>
                        }
                          
                          {sequence.seances?.length > 0 &&
                        <div>
                              <p className="text-sm font-semibold text-white mb-2">Séances ({sequence.seances.length})</p>
                              <p className="text-sm text-gray-400">
                                {sequence.seances.length} séance(s) planifiée(s)
                              </p>
                            </div>
                        }
                          
                          {sequence.competences?.length > 0 &&
                        <div>
                              <p className="text-sm font-semibold text-white mb-2">Compétences</p>
                              <div className="flex flex-wrap gap-2">
                                {sequence.competences.slice(0, 3).map((comp, idx) =>
                            <Badge key={idx} className="bg-[#2d2d2d] text-xs">{comp}</Badge>
                            )}
                              </div>
                            </div>
                        }
                        </div>
                      </CardContent>
                    </Card>);

              })}
              </div>
            }
          </TabsContent>

          {/* TAB: Ressources */}
          <TabsContent value="ressources" className="space-y-6">
            <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <p className="text-gray-300">{ressources.length} ressource(s) disponible(s)</p>
                  <Button
                    onClick={() => {
                      resetRessourceForm();
                      setOpenRessourceDialog(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700">

                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle Ressource
                  </Button>
                </div>
              </CardContent>
            </Card>

            {ressources.length > 0 && (
              <div className="space-y-4">
                {ressources.map((ressource) => {
                  const Icon = getTypeRessourceIcon(ressource.type);
                  const hasFile = ressource.fichier_url && ressource.fichier_url.length > 0;
                  return (
                    <div key={ressource.id} className="p-4 rounded-lg cursor-pointer hover:bg-[#3d3d3d] transition-colors" style={{ backgroundColor: '#2d2d2d' }} onClick={() => hasFile && setViewingRessource(ressource)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Icon className="w-5 h-5 text-purple-400 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-white">{ressource.titre}</h4>
                              {ressource.public ? (
                                <Badge className="bg-green-600 text-xs">Public</Badge>
                              ) : (
                                <Badge className="bg-gray-600 text-xs">Privé</Badge>
                              )}
                              <Badge className="bg-purple-600 text-xs">{ressource.type}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                              {ressource.description && <span className="line-clamp-1">{ressource.description}</span>}
                              {hasFile && <span className="text-blue-400">📎 Fichier joint</span>}
                              {ressource.lien_externe && <span className="text-blue-400">🔗 Lien externe</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {hasFile && (
                            <Button size="sm" variant="outline" onClick={() => setViewingRessource(ressource)} title="Ouvrir">
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleEditRessource(ressource)} title="Modifier">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            if (confirm('Supprimer cette ressource ?')) {
                              deleteRessourceMutation.mutate(ressource.id);
                            }
                          }} title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB: Calendrier */}
          <TabsContent value="calendrier">
            <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
              <CardHeader>
                <CardTitle className="text-white">Calendrier des Séquences</CardTitle>
                <CardDescription className="text-gray-400">
                  Vue chronologique de vos planifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sequences.
                  filter((s) => s.date_debut).
                  sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut)).
                  map((sequence) => {
                    const classe = classes.find((c) => c.id === sequence.classe_id);
                    return (
                      <div key={sequence.id} className="flex gap-4 p-4 rounded-lg" style={{ backgroundColor: '#2d2d2d' }}>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-white">
                              {format(new Date(sequence.date_debut), 'dd')}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(sequence.date_debut), 'MMM', { locale: fr })}
                            </p>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white">{sequence.titre}</h4>
                              <Badge className={`${getStatutColor(sequence.statut)} text-xs`}>
                                {sequence.statut}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400">{classe?.nom}</p>
                            {sequence.date_fin &&
                          <p className="text-xs text-gray-500 mt-1">
                                Jusqu'au {format(new Date(sequence.date_fin), 'dd MMM yyyy', { locale: fr })}
                              </p>
                          }
                          </div>
                        </div>);

                  })}
                  {sequences.filter((s) => s.date_debut).length === 0 &&
                  <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">Aucune séquence planifiée</p>
                    </div>
                  }
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog Séquence - simplified */}

        <RessourceDialog
          open={openRessourceDialog}
          onOpenChange={setOpenRessourceDialog}
          ressourceForm={ressourceForm}
          setRessourceForm={setRessourceForm}
          editingRessource={editingRessource}
          handleSaveRessource={handleSaveRessource}
          handleFileUpload={handleFileUpload}
          uploadingFile={uploadingFile}
        />

        <QuestionnaireDialog
          open={openQuestionnaireDialog}
          onOpenChange={(v) => { setOpenQuestionnaireDialog(v); if (!v) setEditingQuestionnaire(null); }}
          questionnaireForm={questionnaireForm}
          setQuestionnaireForm={setQuestionnaireForm}
          classes={classes}
          matieres={matieres}
          editingQuestionnaire={editingQuestionnaire}
          typeQuestionnaire={typeQuestionnaire}
          handleSaveQuestionnaire={handleSaveQuestionnaire}
          isSaving={createQuestionnaireMutation.isPending || updateQuestionnaireMutation.isPending}
        />

        <FichePreparationViewer
          fiche={viewingFiche}
          classes={classes}
          matieres={matieres}
          onClose={() => setViewingFiche(null)}
          onEdit={() => { handleEditFiche(viewingFiche); setViewingFiche(null); }}
          onExportPDF={exportToPDF}
          onTransmettre={async (fiche) => {
            if (!confirm("Voulez-vous transmettre ce document é  l'admin établissement ?")) return;
            await dataService.update('FichePreparation', fiche.id, { transmise_admin: true, masque_par_admin: false });
            const etablissements = await dataService.query('Etablissement', { filters: [{ id: user.etablissement_id }] });
            if (etablissements.length > 0) {
              const etab = etablissements[0];
              const adminEmail = etab.admin_email?.toLowerCase();
              if (adminEmail) {
                const allUsers = await dataService.query('User');
                const adminUser = allUsers.find(u => u.email?.toLowerCase() === adminEmail);
                if (adminUser) {
                  await dataService.create('Notification', {
                    destinataire_id: adminUser.id, type: 'systeme',
                    titre: 'Nouvelle fiche de préparation',
                    contenu: `${user.full_name} a transmis une fiche: ${fiche.titre_seance}`,
                    lien: createPageUrl('Documents'), emetteur_id: user.id, emetteur_nom: user.full_name
                  });
                }
              }
            }
            queryClient.invalidateQueries({ queryKey: ['fiches-preparation'] });
            setViewingFiche(null);
            alert("Fiche transmise é  l'admin établissement");
          }}
        />

        <FichePreparationDialog
          open={openFicheDialog}
          onOpenChange={setOpenFicheDialog}
          ficheForm={ficheForm}
          setFicheForm={setFicheForm}
          classes={classes}
          matieres={matieres}
          editingFiche={editingFiche}
          handleSaveFiche={handleSaveFiche}
          isSaving={createFicheMutation.isPending}
        />

        {/* Visionneuse PDF Ressources */}
        {viewingRessource && viewingRessource.fichier_url && (
          <FileViewer
            url={viewingRessource.fichier_url}
            title={viewingRessource.titre}
            onClose={() => setViewingRessource(null)}
          />
        )}

        {/* Visionneuse Questionnaires */}
        <QuestionnaireViewer
          questionnaire={viewingQuestionnaire}
          isOpen={!!viewingQuestionnaire}
          onClose={() => setViewingQuestionnaire(null)}
          userRole={user?.role_archive}
          onTransmit={async (q) => {
            if (!confirm('Voulez-vous transmettre ce questionnaire à l\'admin établissement ?')) return;
            await dataService.update('QuestionnaireExamen', q.id, { transmis_admin: true, masque_par_admin: false });
            const etablissements = await dataService.query('Etablissement', { filters: [{ id: user.etablissement_id }] });
            if (etablissements.length > 0) {
              const etab = etablissements[0];
              const adminEmail = etab.admin_email?.toLowerCase();
              if (adminEmail) {
                const allUsers = await dataService.query('User');
                const adminUser = allUsers.find(u => u.email?.toLowerCase() === adminEmail);
                if (adminUser) {
                  await dataService.create('Notification', {
                    destinataire_id: adminUser.id, type: 'systeme',
                    titre: 'Nouveau questionnaire transmis',
                    contenu: `${user.full_name} a transmis un questionnaire: ${q.titre}`,
                    lien: createPageUrl('PlanificationPedagogique'),
                    emetteur_id: user.id, emetteur_nom: user.full_name
                  });
                }
              }
            }
            queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
            setViewingQuestionnaire(null);
            alert('Questionnaire transmis à l\'admin');
          }}
          onApprove={async (q) => {
            if (!confirm('Approuver ce questionnaire ?')) return;
            await dataService.update('QuestionnaireExamen', q.id, { 
              approuve_admin: true, 
              date_approbation: new Date().toLocaleDateString('fr-FR') 
            });
            // Notify prof
            if (q.professeur_id) {
              await dataService.create('Notification', {
                destinataire_id: q.professeur_id, type: 'systeme',
                titre: 'Questionnaire approuvé',
                contenu: `Votre questionnaire "${q.titre}" a été approuvé par l'administration.`,
                lien: createPageUrl('PlanificationPedagogique'),
                emetteur_id: user.id, emetteur_nom: user.full_name
              });
            }
            queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
            setViewingQuestionnaire(null);
            alert('Questionnaire approuvé');
          }}
          onReject={async (q) => {
            const motif = prompt('Motif du rejet (optionnel):');
            await dataService.update('QuestionnaireExamen', q.id, { transmis_admin: false, approuve_admin: false });
            if (q.professeur_id) {
              await dataService.create('Notification', {
                destinataire_id: q.professeur_id, type: 'systeme',
                titre: 'Questionnaire rejeté',
                contenu: `Votre questionnaire "${q.titre}" a été rejeté.${motif ? ' Motif: ' + motif : ''}`,
                lien: createPageUrl('PlanificationPedagogique'),
                emetteur_id: user.id, emetteur_nom: user.full_name
              });
            }
            queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
            setViewingQuestionnaire(null);
            alert('Questionnaire rejeté');
          }}
        />
      </div>
    </div>);

}
