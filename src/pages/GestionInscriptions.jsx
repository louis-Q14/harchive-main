import React, { useState } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, User, Mail, Calendar, Hash, School, Loader2, Phone, MapPin, Users, GraduationCap, Building, CheckCheck, ChevronRight, Trash2, BookOpen, Edit, Layers } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";

export default function GestionInscriptions() {
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [action, setAction] = useState(null);
  const [motifRejet, setMotifRejet] = useState("");
  const [processing, setProcessing] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [expandedEtablissements, setExpandedEtablissements] = useState(new Set());
  const [expandedFacultes, setExpandedFacultes] = useState(new Set());
  const [expandedDepartements, setExpandedDepartements] = useState(new Set());
  const [expandedClasses, setExpandedClasses] = useState(new Set());
  const [demandeToDelete, setDemandeToDelete] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const queryClient = useQueryClient();

  // Charger toutes les demandes via l'API d'authentification
  const { data: inscriptionsData, isLoading: loadingInscriptions } = useQuery({
    queryKey: ['all-inscriptions'],
    queryFn: async () => {
      const result = await authService.listInscriptions('all');
      return result.data || { etudiants: [], parents: [], etablissements: [] };
    }
  });

  const demandesUtilisateurs = inscriptionsData?.etudiants || [];
  const demandesEtablissements = inscriptionsData?.etablissements || [];
  const demandesParents = inscriptionsData?.parents || [];
  const loadingUsers = loadingInscriptions;
  const loadingEtab = loadingInscriptions;
  const loadingParents = loadingInscriptions;

  const refreshInscriptions = () => {
    queryClient.invalidateQueries({ queryKey: ['all-inscriptions'] });
    setSelectedDemande(null);
    setAction(null);
    setMotifRejet("");
    setSelectedType(null);
    setEditFormData(null);
  };



  const handleApprouver = async (demande, type) => {
    setProcessing(true);
    try {
      const response = await authService.approveInscription(demande.id, type);
      setErrorMsg("Inscription approuvee avec succes !");
      setTimeout(() => setErrorMsg(""), 3000);
      refreshInscriptions();
    } catch (error) {
      console.error("Erreur:", error);
      setErrorMsg("Erreur lors de l'approbation : " + (error.message || 'Erreur inconnue'));
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejeter = async () => {
    if (!motifRejet.trim()) return;
    setProcessing(true);
    try {
      await authService.rejectInscription(selectedDemande.id, selectedType, motifRejet);
      setErrorMsg("Demande rejetee avec succes");
      setTimeout(() => setErrorMsg(""), 3000);
      refreshInscriptions();
    } catch (error) {
      console.error("Erreur:", error);
      setErrorMsg("Erreur lors du rejet : " + (error.message || 'Erreur inconnue'));
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!demandeToDelete) return;
    setProcessing(true);
    try {
      await authService.deleteInscription(demandeToDelete.id, demandeToDelete.type);
      setErrorMsg("Demande supprimée avec succès");
      setTimeout(() => setErrorMsg(""), 3000);
      setDemandeToDelete(null);
      refreshInscriptions();
    } catch (error) {
      console.error("Erreur:", error);
      setErrorMsg("Erreur lors de la suppression : " + (error.message || 'Erreur inconnue'));
      setTimeout(() => setErrorMsg(""), 3000);
      setDemandeToDelete(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (demande, type) => {
    setSelectedDemande(demande);
    setSelectedType(type);
    setEditFormData({ ...demande });
    setAction("modifier");
  };

  const handleSaveEdit = async () => {
    if (!selectedDemande || !editFormData) return;
    setProcessing(true);
    try {
      await authService.updateInscription(selectedDemande.id, selectedType, editFormData);
      setErrorMsg("Demande modifiée avec succès");
      setTimeout(() => setErrorMsg(""), 3000);
      setAction(null);
      setEditFormData(null);
      refreshInscriptions();
    } catch (error) {
      console.error("Erreur:", error);
      setErrorMsg("Erreur lors de la modification : " + (error.message || 'Erreur inconnue'));
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setProcessing(false);
    }
  };

  const getStatutBadge = (statut) => {
    const config = {
      en_attente: { label: "En attente", className: "bg-yellow-100 text-yellow-800" },
      approuve: { label: "Approuvée", className: "bg-green-100 text-green-800" },
      approuvee: { label: "Approuvée", className: "bg-green-100 text-green-800" },
      rejete: { label: "Rejetée", className: "bg-red-100 text-red-800" },
      rejetee: { label: "Rejetée", className: "bg-red-100 text-red-800" }
    };
    return config[statut] || config.en_attente;
  };

  const toggleEtablissement = (etabName) => {
    const newExpanded = new Set(expandedEtablissements);
    if (newExpanded.has(etabName)) {
      newExpanded.delete(etabName);
    } else {
      newExpanded.add(etabName);
    }
    setExpandedEtablissements(newExpanded);
  };

  const toggleFaculte = (key) => {
    const newExpanded = new Set(expandedFacultes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedFacultes(newExpanded);
  };

  const toggleDepartement = (key) => {
    const newExpanded = new Set(expandedDepartements);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDepartements(newExpanded);
  };

  const toggleClasse = (key) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedClasses(newExpanded);
  };

  // Filtrer par statut
  const demandesEtudiantsEnAttente = demandesUtilisateurs.filter((d) => d.statut === "en_attente" && d.type_utilisateur === "etudiant");
  const demandesProfesseursEnAttente = demandesUtilisateurs.filter((d) => d.statut === "en_attente" && d.type_utilisateur === "professeur");
  const demandesEtablissementsEnAttente = demandesEtablissements.filter((d) => d.statut === "en_attente");
  const demandesParentsEnAttente = demandesParents.filter((d) => d.statut === "en_attente");

  const demandesEtudiantsTraitees = demandesUtilisateurs.filter((d) => d.statut !== "en_attente" && d.type_utilisateur === "etudiant");
  const demandesProfesseursTraitees = demandesUtilisateurs.filter((d) => d.statut !== "en_attente" && d.type_utilisateur === "professeur");
  const demandesEtablissementsTraitees = demandesEtablissements.filter((d) => d.statut !== "en_attente");
  const demandesParentsTraitees = demandesParents.filter((d) => d.statut !== "en_attente");

  const totalTraitees = demandesEtudiantsTraitees.length + demandesProfesseursTraitees.length +
  demandesEtablissementsTraitees.length + demandesParentsTraitees.length;

  // Organiser par établissement > faculté > classe (pour étudiants)
  const etablissementsAvecDemandes = {};

  // Grouper les établissements traités
  demandesEtablissementsTraitees.forEach((etab) => {
    etablissementsAvecDemandes[etab.nom_etablissement] = {
      etablissement: etab,
      facultes: {}
    };
  });

  // Ajouter les professeurs et étudiants par faculté puis par classe
  [...demandesProfesseursTraitees, ...demandesEtudiantsTraitees].forEach((demande) => {
    if (!etablissementsAvecDemandes[demande.etablissement_nom]) {
      etablissementsAvecDemandes[demande.etablissement_nom] = {
        etablissement: null,
        facultes: {}
      };
    }

    const faculteNom = demande.faculte || "Non spécifié";
    if (!etablissementsAvecDemandes[demande.etablissement_nom].facultes[faculteNom]) {
      etablissementsAvecDemandes[demande.etablissement_nom].facultes[faculteNom] = {
        professeurs: [],
        departements: {}
      };
    }

    if (demande.type_utilisateur === "professeur") {
      etablissementsAvecDemandes[demande.etablissement_nom].facultes[faculteNom].professeurs.push(demande);
    } else {
      // Étudiants - grouper par département puis par classe
      const deptNom = demande.departement || "Non spécifié";
      if (!etablissementsAvecDemandes[demande.etablissement_nom].facultes[faculteNom].departements[deptNom]) {
        etablissementsAvecDemandes[demande.etablissement_nom].facultes[faculteNom].departements[deptNom] = { classes: {} };
      }
      const classeNom = demande.classe || "Non spécifiée";
      if (!etablissementsAvecDemandes[demande.etablissement_nom].facultes[faculteNom].departements[deptNom].classes[classeNom]) {
        etablissementsAvecDemandes[demande.etablissement_nom].facultes[faculteNom].departements[deptNom].classes[classeNom] = [];
      }
      etablissementsAvecDemandes[demande.etablissement_nom].facultes[faculteNom].departements[deptNom].classes[classeNom].push(demande);
    }
  });

  if (loadingUsers || loadingEtab || loadingParents) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
      </div>);

  }

  const renderDemandeCard = (demande, type) =>
  <Card key={demande.id} className="border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="bg-[#333333] pt-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 grid md:grid-cols-2 gap-4">
            {type === 'etablissement' ?
          <>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Établissement</p>
                    <p className="font-semibold text-gray-800">{demande.nom_etablissement}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Code</p>
                    <p className="text-sm text-gray-800">{demande.code_etablissement}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Responsable</p>
                    <p className="font-semibold text-gray-800">
                      {demande.prenom_responsable} {demande.nom_responsable}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-800">{demande.email_responsable}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Ville</p>
                    <p className="text-sm text-gray-800">{demande.ville}</p>
                  </div>
                </div>
              </> :
          type === 'parent' ?
          <>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Parent</p>
                    <p className="font-semibold text-gray-800">
                      {demande.prenom} {demande.post_nom} {demande.nom}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-800">{demande.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Téléphone</p>
                    <p className="text-sm text-gray-800">{demande.telephone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Enfant</p>
                    <p className="text-sm text-gray-800">{demande.nom_enfant}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Matricule enfant</p>
                    <p className="text-sm text-gray-800">{demande.matricule_enfant}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Établissement</p>
                    <p className="text-sm text-gray-800">{demande.etablissement_nom}</p>
                  </div>
                </div>
              </> :

          <>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Nom complet</p>
                    <p className="font-semibold text-gray-800">
                      {demande.prenom} {demande.post_nom} {demande.nom}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-800">{demande.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Matricule</p>
                    <p className="text-sm text-gray-800">{demande.matricule}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Date de naissance</p>
                    <p className="text-sm text-gray-800">
                      {format(new Date(demande.date_naissance), 'PP', { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Établissement</p>
                    <p className="text-sm text-gray-800">{demande.etablissement_nom}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Faculté / Option</p>
                    <p className="text-sm text-gray-800">{demande.faculte}</p>
                  </div>
                </div>
                {demande.type_utilisateur === "etudiant" && demande.classe &&
            <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Classe</p>
                      <p className="text-sm text-gray-800">{demande.classe}</p>
                    </div>
                  </div>
            }
              </>
          }
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500 mb-1">Date de demande</p>
              <p className="text-sm text-gray-700">
                {format(new Date(demande.createdAt), 'PPp', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
            onClick={() => handleApprouver(demande, type)}
            disabled={processing}
            className="bg-green-600 hover:bg-green-700 text-white">

              <CheckCircle className="w-4 h-4 mr-2" />
              Approuver
            </Button>
            <Button
            variant="outline"
            onClick={() => {
              setSelectedDemande(demande);
              setSelectedType(type);
              setAction("rejeter");
            }}
            className="border-red-300 text-red-600 hover:bg-red-50">

              <XCircle className="w-4 h-4 mr-2" />
              Rejeter
            </Button>
            <Button
            variant="outline"
            onClick={() => handleEdit(demande, type)}
            className="border-blue-300 text-blue-600 hover:bg-blue-50">

              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
            <Button
            variant="outline"
            onClick={() => setDemandeToDelete({ id: demande.id, type })}
            className="border-red-300 text-red-600 hover:bg-red-50">

              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>;


  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 bg-[#3d3d3d] text-white px-4 py-3 rounded-lg shadow-lg border border-[#4d4d4d] flex items-center gap-2">
          <span className="text-sm">{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-white hover:opacity-70">
            ✕
          </button>
        </div>
      )}
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion des Inscriptions</h1>
          <p className="text-gray-600">Approuvez ou rejetez les demandes d'inscription par catégorie</p>
        </div>

        <Tabs defaultValue="etudiants" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white border border-gray-200">
            <TabsTrigger value="etudiants" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              <GraduationCap className="w-4 h-4 mr-2" />
              Étudiants ({demandesEtudiantsEnAttente.length})
            </TabsTrigger>
            <TabsTrigger value="professeurs" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              Professeurs ({demandesProfesseursEnAttente.length})
            </TabsTrigger>
            <TabsTrigger value="parents" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Parents ({demandesParentsEnAttente.length})
            </TabsTrigger>
            <TabsTrigger value="etablissements" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              <Building className="w-4 h-4 mr-2" />
              Établissements ({demandesEtablissementsEnAttente.length})
            </TabsTrigger>
            <TabsTrigger value="traitees" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              <CheckCheck className="w-4 h-4 mr-2" />
              Traitées ({totalTraitees})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="etudiants" className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  Demandes Étudiants en Attente ({demandesEtudiantsEnAttente.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {demandesEtudiantsEnAttente.length === 0 ?
                <p className="text-gray-600 text-center py-8">Aucune demande en attente</p> :

                <div className="space-y-4">
                    {demandesEtudiantsEnAttente.map((d) => renderDemandeCard(d, 'etudiant'))}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professeurs" className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  Demandes Professeurs en Attente ({demandesProfesseursEnAttente.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {demandesProfesseursEnAttente.length === 0 ?
                <p className="text-gray-600 text-center py-8">Aucune demande en attente</p> :

                <div className="space-y-4">
                    {demandesProfesseursEnAttente.map((d) => renderDemandeCard(d, 'professeur'))}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parents" className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  Demandes Parents en Attente ({demandesParentsEnAttente.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {demandesParentsEnAttente.length === 0 ?
                <p className="text-gray-600 text-center py-8">Aucune demande en attente</p> :

                <div className="space-y-4">
                    {demandesParentsEnAttente.map((d) => renderDemandeCard(d, 'parent'))}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="etablissements" className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  Demandes Établissements en Attente ({demandesEtablissementsEnAttente.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {demandesEtablissementsEnAttente.length === 0 ?
                <p className="text-gray-600 text-center py-8">Aucune demande en attente</p> :

                <div className="space-y-4">
                    {demandesEtablissementsEnAttente.map((d) => renderDemandeCard(d, 'etablissement'))}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traitees" className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-gray-800">
                  Demandes Traitées par Établissement, Faculté et Classe ({totalTraitees})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {totalTraitees === 0 ?
                <p className="text-gray-600 text-center py-8">Aucune demande traitée</p> :

                <div className="space-y-6">
                    {Object.entries(etablissementsAvecDemandes).map(([nomEtab, data]) => {
                    const isExpanded = expandedEtablissements.has(nomEtab);
                    const totalProfs = Object.values(data.facultes).reduce((sum, fac) => sum + fac.professeurs.length, 0);
                    const totalEtuds = Object.values(data.facultes).reduce((sum, fac) =>
                    sum + Object.values(fac.departements).reduce((s, dept) =>
                    Object.values(dept.classes).reduce((s2, cl) => s2 + cl.length, 0) + s, 0),
                    0);
                    const totalItems = (data.etablissement ? 1 : 0) + totalProfs + totalEtuds;

                    return (
                      <div key={nomEtab} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                          onClick={() => toggleEtablissement(nomEtab)}
                          className="w-full bg-gray-100 hover:bg-gray-200 p-4 flex items-center justify-between transition-colors">

                            <div className="flex items-center gap-3">
                              <ChevronRight className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <Building className="w-5 h-5 text-gray-700" />
                              <div className="text-left">
                                <h3 className="font-bold text-gray-800">{nomEtab}</h3>
                                <p className="text-sm text-gray-600">
                                  {totalItems} demande{totalItems > 1 ? 's' : ''} • {Object.keys(data.facultes).length} faculté{Object.keys(data.facultes).length > 1 ? 's' : ''}
                                </p>
                            </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-gray-600 text-white">
                                {totalProfs} prof • {totalEtuds} étud
                              </Badge>
                            </div>
                          </button>

                          {isExpanded &&
                        <div className="border-t border-gray-200">
                              {data.etablissement &&
                          <div className="bg-[#333333] p-4 border-b border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Building className="w-5 h-5 text-blue-600" />
                                      <div>
                                        <p className="font-semibold text-gray-800">{data.etablissement.nom_etablissement}</p>
                                        <p className="text-sm text-gray-600">Code: {data.etablissement.code_etablissement}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={getStatutBadge(data.etablissement.statut).className}>
                                        {getStatutBadge(data.etablissement.statut).label}
                                      </Badge>
                                      <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(data.etablissement, 'etablissement')}
                                  className="text-blue-600 hover:bg-blue-50">

                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDemandeToDelete({ id: data.etablissement.id, type: 'etablissement' })}
                                  className="text-red-600 hover:bg-red-50">

                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  {data.etablissement.motif_rejet &&
                            <p className="text-sm text-red-600 mt-2">
                                      <strong>Motif:</strong> {data.etablissement.motif_rejet}
                                    </p>
                            }
                                </div>
                          }

                              {Object.entries(data.facultes).map(([nomFaculte, faculteData]) => {
                            const faculteKey = `${nomEtab}-${nomFaculte}`;
                            const isFaculteExpanded = expandedFacultes.has(faculteKey);
                            const totalClasseEtuds = Object.values(faculteData.departements).reduce((s, dept) =>
                            s + Object.values(dept.classes).reduce((s2, cl) => s2 + cl.length, 0), 0);
                            const totalFacItems = faculteData.professeurs.length + totalClasseEtuds;

                            return (
                              <div key={faculteKey} className="border-b border-gray-200 last:border-b-0">
                                    <button
                                  onClick={() => toggleFaculte(faculteKey)}
                                  className="w-full bg-gray-50 hover:bg-gray-100 p-3 pl-8 flex items-center justify-between transition-colors">

                                      <div className="flex items-center gap-3">
                                        <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${isFaculteExpanded ? 'rotate-90' : ''}`} />
                                        <BookOpen className="w-4 h-4 text-gray-600" />
                                        <div className="text-left">
                                          <h4 className="font-semibold text-gray-800">{nomFaculte}</h4>
                                          <p className="text-xs text-gray-600">
                                            {totalFacItems} demande{totalFacItems > 1 ? 's' : ''} • {Object.keys(faculteData.departements).length} département{Object.keys(faculteData.departements).length > 1 ? 's' : ''}
                                          </p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-gray-700">
                                        {faculteData.professeurs.length} prof • {totalClasseEtuds} étud
                                      </Badge>
                                    </button>

                                    {isFaculteExpanded &&
                                <div className="pl-12 pr-4 py-4 space-y-4">
                                        {faculteData.professeurs.length > 0 &&
                                  <div>
                                            <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                              <User className="w-4 h-4 text-purple-600" />
                                              Professeurs ({faculteData.professeurs.length})
                                            </h5>
                                            <Table>
                                              <TableHeader>
                                                <TableRow style={{ backgroundColor: 'var(--ha-surface2)' }}>
                                                  <TableHead className="font-semibold text-gray-300">Nom</TableHead>
                                                  <TableHead className="font-semibold text-gray-300">Email</TableHead>
                                                  <TableHead className="font-semibold text-gray-300">Matricule</TableHead>
                                                  <TableHead className="font-semibold text-gray-300">Date</TableHead>
                                                  <TableHead className="font-semibold text-gray-300">Statut</TableHead>
                                                  <TableHead className="font-semibold text-gray-300">Actions</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {faculteData.professeurs.map((prof) =>
                                        <TableRow key={prof.id} className="hover:bg-gray-50">
                                                    <TableCell className="font-medium">{prof.prenom} {prof.post_nom} {prof.nom}</TableCell>
                                                    <TableCell>{prof.email}</TableCell>
                                                    <TableCell>{prof.matricule}</TableCell>
                                                    <TableCell className="text-sm">
                                                      {format(new Date(prof.updatedAt || prof.createdAt), 'dd/MM/yyyy', { locale: fr })}
                                                    </TableCell>
                                                    <TableCell>
                                                      <Badge className={getStatutBadge(prof.statut).className}>
                                                        {getStatutBadge(prof.statut).label}
                                                      </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                      <div className="flex gap-1">
                                                        <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEdit(prof, 'professeur')}
                                                className="text-blue-600 hover:bg-blue-50">

                                                          <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setDemandeToDelete({ id: prof.id, type: 'professeur' })}
                                                className="text-red-600 hover:bg-red-50">

                                                          <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                      </div>
                                                    </TableCell>
                                                  </TableRow>
                                        )}
                                              </TableBody>
                                            </Table>
                                          </div>
                                  }

                                        {Object.keys(faculteData.departements).length > 0 &&
                                  <div>
                                            <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                              <Layers className="w-4 h-4 text-indigo-600" />
                                              Départements ({Object.keys(faculteData.departements).length})
                                            </h5>
                                            {Object.entries(faculteData.departements).map(([nomDept, deptData]) => {
                                        const deptKey = `${faculteKey}-${nomDept}`;
                                        const isDeptExpanded = expandedDepartements.has(deptKey);
                                        const totalDeptEtuds = Object.values(deptData.classes).reduce((s, cl) => s + cl.length, 0);

                                        return (
                                          <div key={deptKey} className="mb-3">
                                                    <button
                                              onClick={() => toggleDepartement(deptKey)}
                                              className="w-full bg-gray-100 hover:bg-gray-200 p-2 pl-4 rounded-lg flex items-center justify-between transition-colors mb-1">
                                                      <div className="flex items-center gap-2">
                                                        <ChevronRight className={`w-3 h-3 text-gray-600 transition-transform ${isDeptExpanded ? 'rotate-90' : ''}`} />
                                                        <Layers className="w-4 h-4 text-indigo-600" />
                                                        <span className="font-semibold text-gray-800">{nomDept}</span>
                                                      </div>
                                                      <Badge variant="outline" className="text-gray-600">
                                                        {Object.keys(deptData.classes).length} classe{Object.keys(deptData.classes).length > 1 ? 's' : ''} • {totalDeptEtuds} étud
                                                      </Badge>
                                                    </button>

                                                    {isDeptExpanded &&
                                            <div className="pl-4 space-y-2">
                                              {Object.entries(deptData.classes).map(([nomClasse, etudiants]) => {
                                        const classeKey = `${deptKey}-${nomClasse}`;
                                        const isClasseExpanded = expandedClasses.has(classeKey);

                                        return (
                                          <div key={classeKey} className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <button
                                              onClick={() => toggleClasse(classeKey)} className="bg-[#333333] p-2 w-full hover:bg-green-100 flex items-center justify-between transition-colors">


                                                      <div className="flex items-center gap-2">
                                                        <ChevronRight className={`w-3 h-3 text-gray-600 transition-transform ${isClasseExpanded ? 'rotate-90' : ''}`} />
                                                        <Layers className="w-3 h-3 text-green-600" />
                                                        <span className="font-semibold text-gray-800">{nomClasse}</span>
                                                      </div>
                                                      <Badge className="bg-green-600 text-white">
                                                        {etudiants.length} étudiant{etudiants.length > 1 ? 's' : ''}
                                                      </Badge>
                                                    </button>

                                                    {isClasseExpanded &&
                                            <div className="p-2">
                                                        <Table>
                                                          <TableHeader>
                                                            <TableRow className="bg-green-50">
                                                              <TableHead className="font-semibold">Nom</TableHead>
                                                              <TableHead className="font-semibold">Email</TableHead>
                                                              <TableHead className="font-semibold">Matricule</TableHead>
                                                              <TableHead className="font-semibold">Date</TableHead>
                                                              <TableHead className="font-semibold">Statut</TableHead>
                                                              <TableHead className="font-semibold">Actions</TableHead>
                                                            </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                            {etudiants.map((etud) =>
                                                  <TableRow key={etud.id} className="hover:bg-gray-50">
                                                                <TableCell className="font-medium">{etud.prenom} {etud.post_nom} {etud.nom}</TableCell>
                                                                <TableCell>{etud.email}</TableCell>
                                                                <TableCell>{etud.matricule}</TableCell>
                                                                <TableCell className="text-sm">
                                                                  {format(new Date(etud.updatedAt || etud.createdAt), 'dd/MM/yyyy', { locale: fr })}
                                                                </TableCell>
                                                                <TableCell>
                                                                  <Badge className={getStatutBadge(etud.statut).className}>
                                                                    {getStatutBadge(etud.statut).label}
                                                                  </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                  <div className="flex gap-1">
                                                                    <Button
                                                          size="sm"
                                                          variant="ghost"
                                                          onClick={() => handleEdit(etud, 'etudiant')}
                                                          className="text-blue-600 hover:bg-blue-50">

                                                                      <Edit className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                          size="sm"
                                                          variant="ghost"
                                                          onClick={() => setDemandeToDelete({ id: etud.id, type: 'etudiant' })}
                                                          className="text-red-600 hover:bg-red-50">

                                                                      <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                  </div>
                                                                </TableCell>
                                                              </TableRow>
                                                  )}
                                                          </TableBody>
                                                        </Table>
                                                      </div>
                                            }
                                                  </div>);

                                      })}
                                            </div>
                                            }
                                                  </div>);

                                      })}
                                          </div>
                                  }

                                        {[...faculteData.professeurs, ...Object.values(faculteData.departements).flatMap(dept => Object.values(dept.classes).flat())].
                                  filter((d) => d.motif_rejet).
                                  map((d) =>
                                  <div key={d.id} className="bg-red-50 border border-red-200 rounded p-3">
                                              <p className="text-sm text-red-800">
                                                <strong>Motif de rejet ({d.email}):</strong> {d.motif_rejet}
                                              </p>
                                            </div>
                                  )}
                                      </div>
                                }
                                  </div>);

                          })}
                            </div>
                        }
                        </div>);

                  })}

                    {demandesParentsTraitees.length > 0 &&
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                      onClick={() => toggleEtablissement('PARENTS')}
                      className="w-full bg-gray-100 hover:bg-gray-200 p-4 flex items-center justify-between transition-colors">

                          <div className="flex items-center gap-3">
                            <ChevronRight className={`w-5 h-5 text-gray-600 transition-transform ${expandedEtablissements.has('PARENTS') ? 'rotate-90' : ''}`} />
                            <Users className="w-5 h-5 text-gray-700" />
                            <div className="text-left">
                              <h3 className="font-bold text-gray-800">Parents</h3>
                              <p className="text-sm text-gray-600">
                                {demandesParentsTraitees.length} demande{demandesParentsTraitees.length > 1 ? 's' : ''} traitée{demandesParentsTraitees.length > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-gray-600 text-white">
                            {demandesParentsTraitees.length} parent{demandesParentsTraitees.length > 1 ? 's' : ''}
                          </Badge>
                        </button>

                        {expandedEtablissements.has('PARENTS') &&
                    <div className="border-t border-gray-200 p-4">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50">
                                  <TableHead className="font-semibold">Type</TableHead>
                                  <TableHead className="font-semibold">Nom Parent</TableHead>
                                  <TableHead className="font-semibold">Email</TableHead>
                                  <TableHead className="font-semibold">Enfant</TableHead>
                                  <TableHead className="font-semibold">Établissement</TableHead>
                                  <TableHead className="font-semibold">Date</TableHead>
                                  <TableHead className="font-semibold">Statut</TableHead>
                                  <TableHead className="font-semibold">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {demandesParentsTraitees.map((parent) =>
                          <TableRow key={parent.id} className="hover:bg-gray-50">
                                    <TableCell>
                                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                                        <Users className="w-3 h-3 mr-1" />
                                        Parent
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{parent.prenom} {parent.post_nom} {parent.nom}</TableCell>
                                    <TableCell>{parent.email}</TableCell>
                                    <TableCell>{parent.nom_enfant}</TableCell>
                                    <TableCell className="text-sm">{parent.etablissement_nom}</TableCell>
                                    <TableCell className="text-sm">
                                      {format(new Date(parent.updatedAt || parent.createdAt), 'dd/MM/yyyy', { locale: fr })}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={getStatutBadge(parent.statut).className}>
                                        {getStatutBadge(parent.statut).label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(parent, 'parent')}
                                  className="text-blue-600 hover:bg-blue-50">

                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDemandeToDelete({ id: parent.id, type: 'parent' })}
                                  className="text-red-600 hover:bg-red-50">

                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                          )}
                              </TableBody>
                            </Table>

                            {demandesParentsTraitees.
                      filter((p) => p.motif_rejet).
                      map((p) =>
                      <div key={p.id} className="bg-red-50 border border-red-200 rounded p-3 mt-3">
                                  <p className="text-sm text-red-800">
                                    <strong>Motif de rejet ({p.email}):</strong> {p.motif_rejet}
                                  </p>
                                </div>
                      )}
                          </div>
                    }
                      </div>
                  }
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DraggableDialog open={action === "rejeter"} onOpenChange={() => setAction(null)} title={<><span className="text-white text-base font-semibold" style={CG}>Rejeter la demande</span><span className="block text-xs text-gray-400 mt-1" style={CG}>Veuillez indiquer le motif du rejet. L'utilisateur recevra un email avec cette information.</span></>}>
        <DraggableDialogBody>
          <div className="py-2">
            <Label className="text-white text-xs font-medium" style={CG}>Motif du rejet</Label>
            <Textarea
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              placeholder="Motif du rejet..."
              className="min-h-[120px] mt-1"
              style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAction(null);
                setMotifRejet("");
              }}
              style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>
              Annuler
            </Button>
            <Button
              onClick={handleRejeter}
              disabled={!motifRejet.trim() || processing}
              className="bg-red-600 hover:bg-red-700 text-white"
              style={CG}>
              {processing ?
              <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </> :
              "Confirmer le Rejet"
              }
            </Button>
        </DraggableDialogFooter>
      </DraggableDialog>

      <DraggableDialog open={action === "modifier"} onOpenChange={() => setAction(null)} title={<><span className="text-white text-base font-semibold" style={CG}>Modifier la demande d'inscription</span><span className="block text-xs text-gray-400 mt-1" style={CG}>Corrigez les informations de la demande</span></>} maxWidth="max-w-3xl" resizable={false}>
        <DraggableDialogBody>
          {editFormData && (
            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
              {/* Étudiant / Professeur */}
              {(selectedType === 'etudiant' || selectedType === 'professeur') && (
                <div className="space-y-4">
                  {/* Identité */}
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                    <p className="text-xs text-gray-400 uppercase mb-3" style={CG}>Identité</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-white text-xs" style={CG}>Prénom</Label><Input value={editFormData.prenom || ''} onChange={e => setEditFormData({...editFormData, prenom: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Post-nom</Label><Input value={editFormData.post_nom || ''} onChange={e => setEditFormData({...editFormData, post_nom: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Nom</Label><Input value={editFormData.nom || ''} onChange={e => setEditFormData({...editFormData, nom: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div><Label className="text-white text-xs" style={CG}>Email</Label><Input value={editFormData.email || ''} onChange={e => setEditFormData({...editFormData, email: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Téléphone</Label><Input value={editFormData.telephone || ''} onChange={e => setEditFormData({...editFormData, telephone: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Matricule</Label><Input value={editFormData.matricule || ''} onChange={e => setEditFormData({...editFormData, matricule: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div><Label className="text-white text-xs" style={CG}>Date de naissance</Label><Input type="date" value={editFormData.date_naissance || ''} onChange={e => setEditFormData({...editFormData, date_naissance: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Lieu de naissance</Label><Input value={editFormData.lieu_naissance || ''} onChange={e => setEditFormData({...editFormData, lieu_naissance: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Sexe</Label>
                        <Select value={editFormData.sexe || ''} onValueChange={v => setEditFormData({...editFormData, sexe: v})}>
                          <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}}><SelectValue placeholder="Sexe" /></SelectTrigger>
                          <SelectContent><SelectItem value="M">Masculin</SelectItem><SelectItem value="F">Féminin</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div><Label className="text-white text-xs" style={CG}>Nationalité</Label><Input value={editFormData.nationalite || ''} onChange={e => setEditFormData({...editFormData, nationalite: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>État civil</Label><Input value={editFormData.etat_civil || ''} onChange={e => setEditFormData({...editFormData, etat_civil: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div>
                        <Label className="text-white text-xs" style={CG}>Type d'utilisateur</Label>
                        <Select value={editFormData.type_utilisateur || ''} onValueChange={v => setEditFormData({...editFormData, type_utilisateur: v})}>
                          <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}}><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent><SelectItem value="etudiant">Étudiant</SelectItem><SelectItem value="professeur">Professeur</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Filiation */}
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                    <p className="text-xs text-gray-400 uppercase mb-3" style={CG}>Filiation & Origine</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-white text-xs" style={CG}>Nom du père</Label><Input value={editFormData.nom_pere || ''} onChange={e => setEditFormData({...editFormData, nom_pere: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Nom de la mère</Label><Input value={editFormData.nom_mere || ''} onChange={e => setEditFormData({...editFormData, nom_mere: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div><Label className="text-white text-xs" style={CG}>Province d'origine</Label><Input value={editFormData.province_origine || ''} onChange={e => setEditFormData({...editFormData, province_origine: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>District</Label><Input value={editFormData.district || ''} onChange={e => setEditFormData({...editFormData, district: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Territoire</Label><Input value={editFormData.territoire || ''} onChange={e => setEditFormData({...editFormData, territoire: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="mt-3">
                      <Label className="text-white text-xs" style={CG}>Adresse du candidat</Label><Input value={editFormData.adresse_candidat || ''} onChange={e => setEditFormData({...editFormData, adresse_candidat: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} />
                    </div>
                  </div>

                  {/* Études secondaires */}
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                    <p className="text-xs text-gray-400 uppercase mb-3" style={CG}>Études secondaires</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-white text-xs" style={CG}>École secondaire</Label><Input value={editFormData.ecole_secondaire || ''} onChange={e => setEditFormData({...editFormData, ecole_secondaire: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Adresse école</Label><Input value={editFormData.adresse_ecole || ''} onChange={e => setEditFormData({...editFormData, adresse_ecole: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div><Label className="text-white text-xs" style={CG}>Centre EXETAT</Label><Input value={editFormData.centre_exetat || ''} onChange={e => setEditFormData({...editFormData, centre_exetat: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Section secondaire</Label><Input value={editFormData.section_secondaire || ''} onChange={e => setEditFormData({...editFormData, section_secondaire: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Année secondaire</Label><Input value={editFormData.annee_secondaire || ''} onChange={e => setEditFormData({...editFormData, annee_secondaire: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div><Label className="text-white text-xs" style={CG}>Pourcentage obtenu</Label><Input value={editFormData.pourcentage_obtenu || ''} onChange={e => setEditFormData({...editFormData, pourcentage_obtenu: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>N° diplôme secondaire</Label><Input value={editFormData.numero_diplome_secondaire || ''} onChange={e => setEditFormData({...editFormData, numero_diplome_secondaire: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Année obtention diplôme</Label><Input value={editFormData.annee_obtention_diplome || ''} onChange={e => setEditFormData({...editFormData, annee_obtention_diplome: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                  </div>

                  {/* Études universitaires */}
                  <div>
                    <p className="text-xs text-gray-400 uppercase mb-3" style={CG}>Études universitaires</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-white text-xs" style={CG}>Établissement</Label><Input value={editFormData.etablissement_nom || ''} onChange={e => setEditFormData({...editFormData, etablissement_nom: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Faculté</Label><Input value={editFormData.faculte || ''} onChange={e => setEditFormData({...editFormData, faculte: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div><Label className="text-white text-xs" style={CG}>Département</Label><Input value={editFormData.departement || ''} onChange={e => setEditFormData({...editFormData, departement: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Orientation</Label><Input value={editFormData.orientation || ''} onChange={e => setEditFormData({...editFormData, orientation: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Option / Filière</Label><Input value={editFormData.option_filiere || editFormData.option || ''} onChange={e => setEditFormData({...editFormData, option_filiere: e.target.value, option: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div><Label className="text-white text-xs" style={CG}>Classe</Label><Input value={editFormData.classe || ''} onChange={e => setEditFormData({...editFormData, classe: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>N° diplôme</Label><Input value={editFormData.numero_diplome || ''} onChange={e => setEditFormData({...editFormData, numero_diplome: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Spécialité</Label><Input value={editFormData.specialite || ''} onChange={e => setEditFormData({...editFormData, specialite: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Parent */}
              {selectedType === 'parent' && (
                <div className="space-y-4">
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                    <p className="text-xs text-gray-400 uppercase mb-3" style={CG}>Informations du parent</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-white text-xs" style={CG}>Prénom</Label><Input value={editFormData.prenom || ''} onChange={e => setEditFormData({...editFormData, prenom: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Post-nom</Label><Input value={editFormData.post_nom || ''} onChange={e => setEditFormData({...editFormData, post_nom: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Nom</Label><Input value={editFormData.nom || ''} onChange={e => setEditFormData({...editFormData, nom: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div><Label className="text-white text-xs" style={CG}>Email</Label><Input value={editFormData.email || ''} onChange={e => setEditFormData({...editFormData, email: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Téléphone</Label><Input value={editFormData.telephone || ''} onChange={e => setEditFormData({...editFormData, telephone: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="mt-3">
                      <Label className="text-white text-xs" style={CG}>Adresse</Label><Input value={editFormData.adresse || ''} onChange={e => setEditFormData({...editFormData, adresse: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase mb-3" style={CG}>Informations de l'enfant</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-white text-xs" style={CG}>Nom de l'enfant</Label><Input value={editFormData.nom_enfant || ''} onChange={e => setEditFormData({...editFormData, nom_enfant: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Matricule enfant</Label><Input value={editFormData.matricule_enfant || ''} onChange={e => setEditFormData({...editFormData, matricule_enfant: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Établissement</Label><Input value={editFormData.etablissement_nom || ''} onChange={e => setEditFormData({...editFormData, etablissement_nom: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Établissement */}
              {selectedType === 'etablissement' && (
                <div className="space-y-4">
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                    <p className="text-xs text-gray-400 uppercase mb-3" style={CG}>Informations de l'établissement</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-white text-xs" style={CG}>Nom de l'établissement</Label><Input value={editFormData.nom_etablissement || ''} onChange={e => setEditFormData({...editFormData, nom_etablissement: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Code</Label><Input value={editFormData.code_etablissement || ''} onChange={e => setEditFormData({...editFormData, code_etablissement: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div><Label className="text-white text-xs" style={CG}>Ville</Label><Input value={editFormData.ville || ''} onChange={e => setEditFormData({...editFormData, ville: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Adresse</Label><Input value={editFormData.adresse || ''} onChange={e => setEditFormData({...editFormData, adresse: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Téléphone</Label><Input value={editFormData.telephone || ''} onChange={e => setEditFormData({...editFormData, telephone: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="mt-3">
                      <Label className="text-white text-xs" style={CG}>Email établissement</Label><Input value={editFormData.email_etablissement || ''} onChange={e => setEditFormData({...editFormData, email_etablissement: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase mb-3" style={CG}>Responsable</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-white text-xs" style={CG}>Prénom responsable</Label><Input value={editFormData.prenom_responsable || ''} onChange={e => setEditFormData({...editFormData, prenom_responsable: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Nom responsable</Label><Input value={editFormData.nom_responsable || ''} onChange={e => setEditFormData({...editFormData, nom_responsable: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div><Label className="text-white text-xs" style={CG}>Email responsable</Label><Input value={editFormData.email_responsable || ''} onChange={e => setEditFormData({...editFormData, email_responsable: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                      <div><Label className="text-white text-xs" style={CG}>Téléphone responsable</Label><Input value={editFormData.telephone_responsable || ''} onChange={e => setEditFormData({...editFormData, telephone_responsable: e.target.value})} style={{backgroundColor:'#2d2d2d',color:'#fff',borderColor:'#4d4d4d',...CG}} /></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DraggableDialogBody>
        <DraggableDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAction(null);
                setEditFormData(null);
              }}
              style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={processing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              style={CG}>
              {processing ?
              <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </> :
              "Enregistrer les modifications"
              }
            </Button>
        </DraggableDialogFooter>
      </DraggableDialog>

      <AlertDialog open={!!demandeToDelete} onOpenChange={() => setDemandeToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800">Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 text-gray-700">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white">

              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}
