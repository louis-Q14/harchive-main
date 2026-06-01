import React, { useState, useEffect } from "react";
import { authService, dataService } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";


import { BookOpen, User, ChevronRight, Loader2, Layers, GraduationCap, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export default function Etablissement() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedFacultes, setExpandedFacultes] = useState(new Set());
  const [expandedDepartements, setExpandedDepartements] = useState(new Set());
  const [expandedClasses, setExpandedClasses] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");



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

  // Charger l'établissement approuvé
  const { data: etablissementData = null, isLoading: loadingEtab } = useQuery({
    queryKey: ['etablissement-data', user?.etablissement_nom],
    queryFn: async () => {
      const demandes = await dataService.query('DemandeInscriptionEtablissement', {
        filters: [{ statut: 'approuvee', nom_etablissement: user.etablissement_nom }],
        limit: 1
      });
      return demandes[0] || null;
    },
    enabled: !!user?.etablissement_nom
  });

  // Charger toutes les demandes approuvées pour l'établissement de l'admin
  const { data: demandesUtilisateurs = [], isLoading: loadingDemandes } = useQuery({
    queryKey: ['demandes-utilisateurs-etablissement', user?.etablissement_nom],
    queryFn: () => dataService.query('DemandeInscription', {
      filters: [{ statut: 'approuvee', etablissement_nom: user.etablissement_nom }],
      limit: 10000
    }),
    enabled: !!user?.etablissement_nom
  });



  const toggleFaculte = (faculte) => {
    const newExpanded = new Set(expandedFacultes);
    if (newExpanded.has(faculte)) {
      newExpanded.delete(faculte);
    } else {
      newExpanded.add(faculte);
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

  const getStatutBadge = (statut) => {
    const config = {
      approuvee: { label: "Approuvée", className: "bg-green-600" }
    };
    return config[statut] || config.approuvee;
  };

  // Organiser par faculté > département > classe
  const facultesAvecDemandes = {};

  demandesUtilisateurs.forEach((demande) => {
    const faculteNom = demande.faculte || "Non spécifié";
    
    if (!facultesAvecDemandes[faculteNom]) {
      facultesAvecDemandes[faculteNom] = {
        professeurs: [],
        departements: {}
      };
    }

    if (demande.type_utilisateur === "professeur") {
      facultesAvecDemandes[faculteNom].professeurs.push(demande);
    } else {
      // Étudiants - grouper par département puis par classe
      const deptNom = demande.departement || "Non spécifié";
      if (!facultesAvecDemandes[faculteNom].departements[deptNom]) {
        facultesAvecDemandes[faculteNom].departements[deptNom] = { classes: {} };
      }
      const classeNom = demande.classe || "Non spécifiée";
      if (!facultesAvecDemandes[faculteNom].departements[deptNom].classes[classeNom]) {
        facultesAvecDemandes[faculteNom].departements[deptNom].classes[classeNom] = [];
      }
      facultesAvecDemandes[faculteNom].departements[deptNom].classes[classeNom].push(demande);
    }
  });

  // Fonction pour filtrer une demande selon la recherche
  const matchesSearch = (d) => {
    if (!searchQuery) return true;
    return (
      d.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.matricule?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (loading || loadingDemandes || loadingEtab) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#4d4d4d'}}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!user?.etablissement_nom) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: '#4d4d4d'}}>
        <div className="w-full px-4">
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">Vous n'êtes pas lié à un établissement</p>
              <p className="text-gray-400 text-sm mb-4">
                Votre compte admin ({user?.email}) n'est pas associé à un établissement.
              </p>
              <p className="text-gray-500 text-xs">
                Contactez l'administrateur système pour lier votre compte é  un établissement.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalProfesseurs = demandesUtilisateurs.filter(d => d.type_utilisateur === 'professeur').length;
  const totalEtudiants = demandesUtilisateurs.filter(d => d.type_utilisateur === 'etudiant').length;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: '#4d4d4d'}}>
      <div className="w-full px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src="/assets/icons/c768a51e8_class.png"
              alt="Etablissement"
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">Gestion de l'établissement</h1>
              <p className="text-gray-300">Vue d'ensemble de votre établissement</p>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Facultés</p>
                  <p className="text-3xl font-bold text-white">{Object.keys(facultesAvecDemandes).length}</p>
                </div>
                <BookOpen className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Professeurs</p>
                  <p className="text-3xl font-bold text-white">{totalProfesseurs}</p>
                </div>
                <User className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Étudiants</p>
                  <p className="text-3xl font-bold text-white">{totalEtudiants}</p>
                </div>
                <GraduationCap className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barre de recherche */}
        <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, prénom, matricule ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Arborescence - Établissement en tête */}
        <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
          <CardContent className="pt-6">
            {Object.keys(facultesAvecDemandes).length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Aucune donnée trouvée</p>
              </div>
            ) : (
              <div className="border border-[#2d2d2d] rounded-lg overflow-hidden">
                {/* En-tête de l'établissement */}
                <div className="bg-[#2d2d2d] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-blue-500" />
                    <div>
                      <h3 className="font-bold text-white text-lg">{user.etablissement_nom}</h3>
                      <p className="text-sm text-gray-400">
                        Code: {etablissementData?.code_etablissement || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600">
                      {demandesUtilisateurs.length} demande{demandesUtilisateurs.length > 1 ? 's' : ''}
                    </Badge>
                    <Badge className="bg-blue-600">
                      {Object.keys(facultesAvecDemandes).length} faculté{Object.keys(facultesAvecDemandes).length > 1 ? 's' : ''}
                    </Badge>
                    <Badge className="bg-green-600 text-white">Approuvée</Badge>
                  </div>
                </div>

                {/* Facultés sous l'établissement */}
                <div className="p-4 space-y-4">
                {Object.entries(facultesAvecDemandes).map(([nomFaculte, faculteData]) => {
                  const isFaculteExpanded = expandedFacultes.has(nomFaculte);
                  const totalClasseEtuds = Object.values(faculteData.departements).reduce((s, dept) =>
                    s + Object.values(dept.classes).reduce((s2, cl) => s2 + cl.length, 0), 0);
                  const totalFacItems = faculteData.professeurs.length + totalClasseEtuds;

                  // Filtrer les données selon la recherche
                  const profsFiltered = faculteData.professeurs.filter(matchesSearch);

                  const deptsFiltered = {};
                  Object.entries(faculteData.departements).forEach(([deptName, deptData]) => {
                    const filteredClasses = {};
                    Object.entries(deptData.classes).forEach(([className, students]) => {
                      const filtered = students.filter(matchesSearch);
                      if (filtered.length > 0) {
                        filteredClasses[className] = filtered;
                      }
                    });
                    if (Object.keys(filteredClasses).length > 0) {
                      deptsFiltered[deptName] = { classes: filteredClasses };
                    }
                  });

                  if (searchQuery && profsFiltered.length === 0 && Object.keys(deptsFiltered).length === 0) {
                    return null;
                  }

                  const filteredEtudCount = Object.values(deptsFiltered).reduce((s, dept) =>
                    s + Object.values(dept.classes).reduce((s2, cl) => s2 + cl.length, 0), 0);

                  return (
                    <div key={nomFaculte} className="border border-[#2d2d2d] rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaculte(nomFaculte)}
                        className="w-full bg-[#474747] hover:bg-[#5a5a5a] p-3 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isFaculteExpanded ? 'rotate-90' : ''}`} />
                          <BookOpen className="w-4 h-4 text-blue-400" />
                          <div className="text-left">
                            <h4 className="font-semibold text-white text-sm">{nomFaculte}</h4>
                            <p className="text-xs text-gray-400">
                              {totalFacItems} demande{totalFacItems > 1 ? 's' : ''} • {Object.keys(faculteData.departements).length} département{Object.keys(faculteData.departements).length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-blue-600 text-xs">
                          {searchQuery ? 
                            `${profsFiltered.length} prof • ${filteredEtudCount} étud` : 
                            `${faculteData.professeurs.length} prof • ${totalClasseEtuds} étud`
                          }
                        </Badge>
                      </button>

                      {isFaculteExpanded && (
                        <div className="p-4 space-y-4">
                          {/* Professeurs */}
                          {(searchQuery ? profsFiltered : faculteData.professeurs).length > 0 && (
                            <div>
                              <h5 className="font-semibold text-white mb-2 flex items-center gap-2">
                                <User className="w-4 h-4 text-purple-500" />
                                Professeurs ({(searchQuery ? profsFiltered : faculteData.professeurs).length})
                              </h5>
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-[#2d2d2d]">
                                    <TableHead className="text-white">Nom</TableHead>
                                    <TableHead className="text-white">Email</TableHead>
                                    <TableHead className="text-white">Matricule</TableHead>
                                    <TableHead className="text-white">Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(searchQuery ? profsFiltered : faculteData.professeurs).map((prof) => (
                                    <TableRow key={prof.id} className="hover:bg-[#474747]">
                                      <TableCell className="text-white">{prof.prenom} {prof.post_nom} {prof.nom}</TableCell>
                                      <TableCell className="text-gray-300">{prof.email}</TableCell>
                                      <TableCell className="text-gray-300">{prof.matricule}</TableCell>
                                      <TableCell className="text-gray-400 text-sm">
                                        {format(new Date(prof.date_traitement || prof.created_date || prof.createdAt || new Date()), 'dd/MM/yyyy', { locale: fr })}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}

                          {/* Départements */}
                          {Object.keys(searchQuery ? deptsFiltered : faculteData.departements).length > 0 && (
                            <div>
                              <h5 className="font-semibold text-white mb-2 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" />
                                Départements ({Object.keys(searchQuery ? deptsFiltered : faculteData.departements).length})
                              </h5>
                              {Object.entries(searchQuery ? deptsFiltered : faculteData.departements).map(([nomDept, deptData]) => {
                                const deptKey = `${nomFaculte}-${nomDept}`;
                                const isDeptExpanded = expandedDepartements.has(deptKey);
                                const totalDeptEtuds = Object.values(deptData.classes).reduce((s, cl) => s + cl.length, 0);

                                return (
                                  <div key={deptKey} className="mb-3">
                                    <button
                                      onClick={() => toggleDepartement(deptKey)}
                                      className="w-full bg-[#555555] hover:bg-[#606060] p-2 pl-4 rounded-lg flex items-center justify-between transition-colors mb-1"
                                    >
                                      <div className="flex items-center gap-2">
                                        <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isDeptExpanded ? 'rotate-90' : ''}`} />
                                        <Layers className="w-4 h-4 text-indigo-400" />
                                        <span className="font-semibold text-white text-sm">{nomDept}</span>
                                      </div>
                                      <Badge variant="outline" className="text-gray-300 border-gray-500 text-xs">
                                        {Object.keys(deptData.classes).length} classe{Object.keys(deptData.classes).length > 1 ? 's' : ''} • {totalDeptEtuds} étud
                                      </Badge>
                                    </button>

                                    {isDeptExpanded && (
                                      <div className="pl-4 space-y-2">
                                        {Object.entries(deptData.classes).map(([nomClasse, etudiants]) => {
                                          const classeKey = `${deptKey}-${nomClasse}`;
                                          const isClasseExpanded = expandedClasses.has(classeKey);

                                          return (
                                           <div key={classeKey} className="border border-[#2d2d2d] rounded-lg overflow-hidden">
                                             <button
                                               onClick={() => toggleClasse(classeKey)}
                                               className="w-full bg-[#5a5a5a] hover:bg-[#666666] p-2 flex items-center justify-between transition-colors"
                                             >
                                               <div className="flex items-center gap-2">
                                                 <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isClasseExpanded ? 'rotate-90' : ''}`} />
                                                 <Layers className="w-3 h-3 text-green-400" />
                                                 <span className="font-semibold text-white text-sm">{nomClasse}</span>
                                               </div>
                                               <Badge className="bg-green-600 text-xs">
                                                 {etudiants.length} étudiant{etudiants.length > 1 ? 's' : ''}
                                               </Badge>
                                             </button>

                                              {isClasseExpanded && (
                                                <div className="p-3">
                                                  <Table>
                                                    <TableHeader>
                                                      <TableRow className="bg-[#2d2d2d]">
                                                        <TableHead className="text-white">Nom</TableHead>
                                                        <TableHead className="text-white">Email</TableHead>
                                                        <TableHead className="text-white">Matricule</TableHead>
                                                        <TableHead className="text-white">Date</TableHead>
                                                      </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                      {etudiants.map((etud) => (
                                                        <TableRow key={etud.id} className="hover:bg-[#474747]">
                                                          <TableCell className="text-white">{etud.prenom} {etud.post_nom} {etud.nom}</TableCell>
                                                          <TableCell className="text-gray-300">{etud.email}</TableCell>
                                                          <TableCell className="text-gray-300">{etud.matricule}</TableCell>
                                                          <TableCell className="text-gray-400 text-sm">
                                                            {format(new Date(etud.date_traitement || etud.created_date || etud.createdAt || new Date()), 'dd/MM/yyyy', { locale: fr })}
                                                          </TableCell>
                                                        </TableRow>
                                                      ))}
                                                    </TableBody>
                                                  </Table>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
