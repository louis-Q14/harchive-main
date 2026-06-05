import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { School, Search, Loader2, Building, ChevronRight, BookOpen, User, GraduationCap, Layers, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Etablissements() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEtablissements, setExpandedEtablissements] = useState(new Set());
  const [expandedFacultes, setExpandedFacultes] = useState(new Set());
  const [expandedDepartements, setExpandedDepartements] = useState(new Set());
  const [expandedClasses, setExpandedClasses] = useState(new Set());

  // Dialogs
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [selectedEtablissement, setSelectedEtablissement] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    nom: "",
    code: "",
    type: "universite",
    adresse: "",
    ville: "",
    telephone: "",
    email: "",
    admin_nom: "",
    admin_prenom: "",
    admin_post_nom: "",
    admin_email: "",
    admin_telephone: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Erreur chargement utilisateur:", error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les établissements
  const { data: etablissements = [], isLoading: loadingEtab } = useQuery({
    queryKey: ['etablissements'],
    queryFn: () => dataService.query('Etablissement', { limit: 10000 })
  });

  // Charger les demandes traitées d'établissement
  const { data: demandesEtablissements = [] } = useQuery({
    queryKey: ['demandes-etablissements'],
    queryFn: () => dataService.query('DemandeInscriptionEtablissement', { filters: [{  statut: "approuvee"  }] })
  });

  // Charger les demandes utilisateurs traitées
  const { data: demandesUtilisateurs = [] } = useQuery({
    queryKey: ['demandes-utilisateurs'],
    queryFn: () => dataService.query('DemandeInscription', { filters: [{  statut: "approuvee"  }] })
  });

  // Mutations
  const updateEtablissementMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('Etablissement', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etablissements'] });
      setShowEditDialog(false);
      setSelectedEtablissement(null);
      resetForm();
    }
  });

  const deleteEtablissementMutation = useMutation({
    mutationFn: async (id) => {
      // Supprimer l'établissement
      await dataService.delete('Etablissement', id);
      
      // Trouver et supprimer la demande d'établissement associée
      const demandesEtab = await dataService.query('DemandeInscriptionEtablissement', { filters: [{ 
        nom_etablissement: selectedEtablissement?.name || selectedEtablissement?.nom
       }],
  limit: 1000, offset: 0 });
      
      if (demandesEtab.length > 0) {
        await Promise.all(demandesEtab.map(d => dataService.delete('DemandeInscriptionEtablissement', d.id)));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etablissements'] });
      queryClient.invalidateQueries({ queryKey: ['demandes-etablissements'] });
      setShowDeleteDialog(false);
      setSelectedEtablissement(null);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => dataService.delete('DemandeInscription', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes-utilisateurs'] });
      setShowDeleteUserDialog(false);
      setSelectedUser(null);
    }
  });

  const resetForm = () => {
    setFormData({
      nom: "",
      code: "",
      type: "universite",
      adresse: "",
      ville: "",
      telephone: "",
      email: "",
      admin_nom: "",
      admin_prenom: "",
      admin_post_nom: "",
      admin_email: "",
      admin_telephone: ""
    });
  };

  const handleEdit = (etablissement) => {
    setSelectedEtablissement(etablissement);
    setFormData({
      nom: etablissement.name || etablissement.nom || "",
      code: etablissement.code || "",
      type: etablissement.type || "universite",
      adresse: etablissement.adresse || "",
      ville: etablissement.ville || "",
      telephone: etablissement.telephone || "",
      email: etablissement.email || "",
      admin_nom: etablissement.admin_nom || "",
      admin_prenom: etablissement.admin_prenom || "",
      admin_post_nom: etablissement.admin_post_nom || "",
      admin_email: etablissement.admin_email || "",
      admin_telephone: etablissement.admin_telephone || ""
    });
    setShowEditDialog(true);
  };

  const handleDelete = (etablissement) => {
    setSelectedEtablissement(etablissement);
    setShowDeleteDialog(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteUserDialog(true);
  };

  const handleSubmitEdit = () => {
    if (selectedEtablissement) {
      updateEtablissementMutation.mutate({
        id: selectedEtablissement.id,
        data: { ...formData, name: formData.nom }
      });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedEtablissement) {
      deleteEtablissementMutation.mutate(selectedEtablissement.id);
    }
  };

  const handleConfirmDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
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

  const toggleClasse = (key) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedClasses(newExpanded);
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

  // Organiser hiérarchiquement
  const etablissementsAvecDonnees = {};

  etablissements.forEach((etab) => {
    const etabNom = etab.name || etab.nom;
    etablissementsAvecDonnees[etabNom] = {
      etablissement: etab,
      facultes: {}
    };
  });

  demandesUtilisateurs.forEach((demande) => {
    if (!etablissementsAvecDonnees[demande.etablissement_nom]) {
      etablissementsAvecDonnees[demande.etablissement_nom] = {
        etablissement: null,
        facultes: {}
      };
    }

    const faculteNom = demande.faculte || "Non spécifié";
    if (!etablissementsAvecDonnees[demande.etablissement_nom].facultes[faculteNom]) {
      etablissementsAvecDonnees[demande.etablissement_nom].facultes[faculteNom] = {
        professeurs: [],
        departements: {}
      };
    }

    if (demande.type_utilisateur === "professeur") {
      etablissementsAvecDonnees[demande.etablissement_nom].facultes[faculteNom].professeurs.push(demande);
    } else {
      const deptNom = demande.departement || "Non spécifié";
      if (!etablissementsAvecDonnees[demande.etablissement_nom].facultes[faculteNom].departements[deptNom]) {
        etablissementsAvecDonnees[demande.etablissement_nom].facultes[faculteNom].departements[deptNom] = {
          classes: {}
        };
      }
      const classeNom = demande.classe || "Non spécifiée";
      if (!etablissementsAvecDonnees[demande.etablissement_nom].facultes[faculteNom].departements[deptNom].classes[classeNom]) {
        etablissementsAvecDonnees[demande.etablissement_nom].facultes[faculteNom].departements[deptNom].classes[classeNom] = [];
      }
      etablissementsAvecDonnees[demande.etablissement_nom].facultes[faculteNom].departements[deptNom].classes[classeNom].push(demande);
    }
  });

  const filteredEtablissements = Object.entries(etablissementsAvecDonnees).filter(([nom]) =>
  nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdminSysteme = user?.role_archive === 'admin_systeme' || user?.role_archive === 'super_admin';

  if (loading || loadingEtab) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <School className="w-8 h-8 text-gray-700" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Établissements</h1>
            <p className="text-gray-600">Vue hiérarchique des établissements et leurs membres</p>
          </div>
        </div>

        {/* Message d'avertissement admin */}
        {isAdminSysteme &&
        <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-orange-800 font-semibold mb-1">
                    Mode Administrateur Système - Contrôle Total
                  </p>
                  <p className="text-xs text-orange-700">
                    Vous avez accès é  toutes les fonctionnalités de modification et suppression des établissements et des utilisateurs (professeurs et étudiants).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        }

        {/* Statistiques */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Établissements</p>
                  <p className="text-3xl font-bold text-gray-800">{etablissements.length}</p>
                </div>
                <Building className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Professeurs</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {demandesUtilisateurs.filter((d) => d.type_utilisateur === "professeur").length}
                  </p>
                </div>
                <User className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Étudiants</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {demandesUtilisateurs.filter((d) => d.type_utilisateur === "etudiant").length}
                  </p>
                </div>
                <GraduationCap className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Facultés</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {Object.values(etablissementsAvecDonnees).reduce((sum, e) =>
                    sum + Object.keys(e.facultes).length, 0
                    )}
                  </p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recherche */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher un établissement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300" />

            </div>
          </CardHeader>
        </Card>

        {/* Vue hiérarchique */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-800">
              Hiérarchie Établissements ({filteredEtablissements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {filteredEtablissements.length === 0 ?
            <div className="text-center py-12">
                <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Aucun établissement trouvé</p>
              </div> :

            <div className="space-y-6">
                {filteredEtablissements.map(([nomEtab, data]) => {
                const isExpanded = expandedEtablissements.has(nomEtab);
                const totalProfs = Object.values(data.facultes).reduce((sum, fac) => sum + fac.professeurs.length, 0);
                const totalEtuds = Object.values(data.facultes).reduce((sum, fac) =>
                sum + Object.values(fac.departements).reduce((s, dept) =>
                  s + Object.values(dept.classes).reduce((sc, cl) => sc + cl.length, 0), 0),
                0);

                return (
                  <div key={nomEtab} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* En-tête Établissement */}
                      <div className="w-full bg-gray-100 p-4 flex items-center justify-between">
                        <button
                        onClick={() => toggleEtablissement(nomEtab)}
                        className="flex items-center gap-3 flex-1">

                          <ChevronRight className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          <Building className="w-5 h-5 text-gray-700" />
                          <div className="text-left">
                            <h3 className="font-bold text-gray-800">{nomEtab}</h3>
                            <p className="text-sm text-gray-600">
                              {Object.keys(data.facultes).length} faculté{Object.keys(data.facultes).length > 1 ? 's' : ''} • 
                              {totalProfs} prof • {totalEtuds} étud
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          {data.etablissement &&
                        <Badge className="bg-gray-600 text-white">
                              Code: {data.etablissement.code}
                            </Badge>
                        }
                          {isAdminSysteme && data.etablissement &&
                        <>
                              <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(data.etablissement)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">

                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(data.etablissement)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50">

                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                        }
                        </div>
                      </div>

                      {/* Contenu développable */}
                      {isExpanded &&
                    <div className="border-t border-gray-200">
                          {/* Info établissement */}
                          {data.etablissement &&
                      <div className="bg-[#333333] p-4 border-b border-gray-200">
                              <div className="space-y-4">
                                <div>
                                  <h5 className="font-semibold text-white mb-2">Informations de l'établissement</h5>
                                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-400">Ville</p>
                                      <p className="font-semibold text-white">{data.etablissement.ville || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400">Email</p>
                                      <p className="font-semibold text-white">{data.etablissement.email || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400">Téléphone</p>
                                      <p className="font-semibold text-white">{data.etablissement.telephone || "-"}</p>
                                    </div>
                                  </div>
                                </div>
                                {(data.etablissement.admin_nom || data.etablissement.admin_prenom) &&
                                <div>
                                  <h5 className="font-semibold text-white mb-2">Administrateur</h5>
                                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-400">Nom complet</p>
                                      <p className="font-semibold text-white">
                                        {data.etablissement.admin_prenom} {data.etablissement.admin_post_nom} {data.etablissement.admin_nom}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400">Email</p>
                                      <p className="font-semibold text-white">{data.etablissement.admin_email || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400">Téléphone</p>
                                      <p className="font-semibold text-white">{data.etablissement.admin_telephone || "-"}</p>
                                    </div>
                                  </div>
                                </div>
                                }
                              </div>
                            </div>
                      }

                          {/* Facultés */}
                          {Object.entries(data.facultes).map(([nomFaculte, faculteData]) => {
                        const faculteKey = `${nomEtab}-${nomFaculte}`;
                        const isFaculteExpanded = expandedFacultes.has(faculteKey);
                        const totalClasseEtuds = Object.values(faculteData.departements).reduce((s, dept) =>
                          s + Object.values(dept.classes).reduce((sc, cl) => sc + cl.length, 0), 0);

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
                                        {Object.keys(faculteData.departements).length} département{Object.keys(faculteData.departements).length > 1 ? 's' : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-gray-700">
                                    {faculteData.professeurs.length} prof • {totalClasseEtuds} étud
                                  </Badge>
                                </button>

                                {isFaculteExpanded &&
                            <div className="pl-12 pr-4 py-4 space-y-4">
                                    {/* Professeurs */}
                                    {faculteData.professeurs.length > 0 &&
                              <div>
                                        <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                          <User className="w-4 h-4 text-purple-600" />
                                          Professeurs ({faculteData.professeurs.length})
                                        </h5>
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-purple-50">
                                              <TableHead className="bg-[#333333] text-muted-foreground px-2 font-semibold text-left h-10 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Nom</TableHead>
                                              <TableHead className="bg-[#333333] text-muted-foreground px-2 font-semibold text-left h-10 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Email</TableHead>
                                              <TableHead className="bg-[#333333] text-muted-foreground px-2 font-semibold text-left h-10 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Matricule</TableHead>
                                              <TableHead className="bg-[#333333] text-muted-foreground px-2 font-semibold text-left h-10 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Date inscription</TableHead>
                                              {isAdminSysteme && <TableHead className="bg-[#333333] text-muted-foreground px-2 font-semibold text-left h-10 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] w-20">Actions</TableHead>}
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {faculteData.professeurs.map((prof) =>
                                    <TableRow key={prof.id} className="hover:bg-gray-50">
                                                <TableCell className="font-medium">
                                                  {prof.prenom} {prof.post_nom} {prof.nom}
                                                </TableCell>
                                                <TableCell>{prof.email}</TableCell>
                                                <TableCell>{prof.matricule}</TableCell>
                                                <TableCell className="text-sm">
                                                  {format(new Date(prof.created_date || prof.createdAt || new Date()), 'dd/MM/yyyy', { locale: fr })}
                                                </TableCell>
                                                {isAdminSysteme &&
                                      <TableCell>
                                                    <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleDeleteUser(prof)}
                                          className="text-red-600 hover:text-red-700">

                                                      <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                  </TableCell>
                                      }
                                              </TableRow>
                                    )}
                                          </TableBody>
                                        </Table>
                                      </div>
                              }

                                    {/* Départements */}
                                    {Object.keys(faculteData.departements).length > 0 &&
                              <div>
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
                                                          <TableHead className="font-semibold">Date inscription</TableHead>
                                                          {isAdminSysteme && <TableHead className="font-semibold w-20">Actions</TableHead>}
                                                        </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                        {etudiants.map((etud) =>
                                              <TableRow key={etud.id} className="hover:bg-gray-50">
                                                            <TableCell className="font-medium">
                                                              {etud.prenom} {etud.post_nom} {etud.nom}
                                                            </TableCell>
                                                            <TableCell>{etud.email}</TableCell>
                                                            <TableCell>{etud.matricule}</TableCell>
                                                            <TableCell className="text-sm">
                                                              {format(new Date(etud.created_date || etud.createdAt || new Date()), 'dd/MM/yyyy', { locale: fr })}
                                                            </TableCell>
                                                            {isAdminSysteme &&
                                                <TableCell>
                                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteUser(etud)}
                                                    className="text-red-600 hover:text-red-700">

                                                                  <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                              </TableCell>
                                                }
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
          </CardContent>
        </Card>
      </div>

      {/* Dialog Modifier */}
      <DraggableDialog open={showEditDialog} onOpenChange={setShowEditDialog} title="Modifier l'établissement" subtitle="Modifiez les informations de l'établissement" resizable={false}>
        <DraggableDialogBody>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white text-xs font-medium" style={CG}>Nom *</Label>
                <Input
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Nom de l'établissement"
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />

              </div>
              <div className="space-y-2">
                <Label className="text-white text-xs font-medium" style={CG}>Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Code unique"
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />

              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white text-xs font-medium" style={CG}>Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primaire">Primaire</SelectItem>
                  <SelectItem value="college">Collège</SelectItem>
                  <SelectItem value="lycee">Lycée</SelectItem>
                  <SelectItem value="universite">Université</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white text-xs font-medium" style={CG}>Adresse</Label>
              <Input
                value={formData.adresse}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                placeholder="Adresse complète"
                style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />

            </div>
            <div className="space-y-2">
              <Label className="text-white text-xs font-medium" style={CG}>Ville</Label>
              <Input
                value={formData.ville}
                onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                placeholder="Ville"
                style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />

            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white text-xs font-medium" style={CG}>Téléphone</Label>
                <Input
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  placeholder="+243 XXX XXX XXX"
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />

              </div>
              <div className="space-y-2">
                <Label className="text-white text-xs font-medium" style={CG}>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemple.com"
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />

              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-600">
              <h4 className="font-semibold text-white mb-3" style={CG}>Informations de l'Administrateur</h4>
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-xs font-medium" style={CG}>Prénom</Label>
                    <Input
                      value={formData.admin_prenom}
                      onChange={(e) => setFormData({ ...formData, admin_prenom: e.target.value })}
                      placeholder="Prénom"
                      style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-xs font-medium" style={CG}>Post-nom</Label>
                    <Input
                      value={formData.admin_post_nom}
                      onChange={(e) => setFormData({ ...formData, admin_post_nom: e.target.value })}
                      placeholder="Post-nom"
                      style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-xs font-medium" style={CG}>Nom</Label>
                    <Input
                      value={formData.admin_nom}
                      onChange={(e) => setFormData({ ...formData, admin_nom: e.target.value })}
                      placeholder="Nom"
                      style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-xs font-medium" style={CG}>Email Administrateur</Label>
                    <Input
                      type="email"
                      value={formData.admin_email}
                      onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                      placeholder="admin@exemple.com"
                      style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-xs font-medium" style={CG}>Téléphone Administrateur</Label>
                    <Input
                      value={formData.admin_telephone}
                      onChange={(e) => setFormData({ ...formData, admin_telephone: e.target.value })}
                      placeholder="+243 XXX XXX XXX"
                      style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>Annuler</Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={!formData.nom || !formData.code || updateEtablissementMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>

              {updateEtablissementMutation.isPending ?
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Modification...</> :

              "Enregistrer"
              }
            </Button>
        </DraggableDialogFooter>
      </DraggableDialog>

      {/* Dialog Supprimer Établissement */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800">Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer l'établissement <strong>{selectedEtablissement?.name || selectedEtablissement?.nom}</strong> ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 text-gray-700">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteEtablissementMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white">

              {deleteEtablissementMutation.isPending ?
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Suppression...</> :

              "Supprimer"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Supprimer Utilisateur */}
      <AlertDialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800">Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer <strong>{selectedUser?.prenom} {selectedUser?.nom}</strong> 
              ({selectedUser?.type_utilisateur === "professeur" ? "Professeur" : "Étudiant"}) ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 text-gray-700">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white">

              {deleteUserMutation.isPending ?
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Suppression...</> :

              "Supprimer"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}

