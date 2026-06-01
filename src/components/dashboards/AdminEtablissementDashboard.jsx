import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dataService } from "@/api/dataService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  AlertCircle, 
  UserCheck,
  CheckCircle,
  FileText,
  Building2,
  TrendingUp,
  Calendar,
  ClipboardList,
  Eye,
  Settings,
  BarChart3,
  BookMarked,
  Network,
  MapPin,
  UserCog,
  FileCheck,
  Bell,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function AdminEtablissementDashboard({ user }) {
  // Charger les étudiants
  const { data: etudiants = [] } = useQuery({
    queryKey: ['etudiants', user.etablissement_id],
    queryFn: () => dataService.query('Etudiant', { filters: [{ etablissement_id: user.etablissement_id }] }),
    enabled: !!user.etablissement_id,
  });

  // Charger les notes en attente de validation
  const { data: notesEnAttente = [] } = useQuery({
    queryKey: ['notes-attente', user.etablissement_id],
    queryFn: async () => {
      const allNotes = await dataService.query('NoteEtudiant', { filters: [] });
      return allNotes.filter(n => 
        n.etablissement_id === user.etablissement_id && 
        n.statut === 'brouillon'
      );
    },
    enabled: !!user.etablissement_id,
  });

  // Charger les assignations
  const { data: assignations = [] } = useQuery({
    queryKey: ['assignations', user.etablissement_id],
    queryFn: () => dataService.query('AssignationProfesseur', { filters: [{ etablissement_id: user.etablissement_id }] }),
    enabled: !!user.etablissement_id,
  });

  // Charger les matières
  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres', user.etablissement_id],
    queryFn: () => dataService.query('Matiere', { filters: [{ etablissement_id: user.etablissement_id }] }),
    enabled: !!user.etablissement_id,
  });

  // Charger toutes les notes publiées
  const { data: toutesNotes = [] } = useQuery({
    queryKey: ['toutes-notes', user.etablissement_id],
    queryFn: async () => {
      const allNotes = await dataService.query('NoteEtudiant', { filters: [] });
      return allNotes.filter(n => n.etablissement_id === user.etablissement_id);
    },
    enabled: !!user.etablissement_id,
  });

  // Charger les rotations de cours
  const { data: rotations = [] } = useQuery({
    queryKey: ['rotations', user.etablissement_id],
    queryFn: async () => {
      const allRotations = await dataService.query('CalendrierAcademique', { filters: [] });
      return allRotations.filter(r => r.etablissement_id === user.etablissement_id);
    },
    enabled: !!user.etablissement_id,
  });

  // Charger les instructions de cours
  const { data: instructions = [] } = useQuery({
    queryKey: ['instructions', user.etablissement_id],
    queryFn: async () => {
      const allInstructions = await dataService.query('InstructionCours', { filters: [] });
      return allInstructions.filter(i => i.etablissement_id === user.etablissement_id);
    },
    enabled: !!user.etablissement_id,
  });

  // Charger les demandes d'inscription en attente
  const { data: demandesInscription = [] } = useQuery({
    queryKey: ['demandes-inscription', user.etablissement_nom],
    queryFn: async () => {
      const allDemandes = await dataService.query('DemandeInscription', { filters: [] });
      return allDemandes.filter(d => 
        d.etablissement_nom === user.etablissement_nom && 
        d.statut === 'en_attente'
      );
    },
    enabled: !!user.etablissement_nom,
  });

  // Charger la structure académique
  const { data: facultes = [] } = useQuery({
    queryKey: ['facultes', user.etablissement_id],
    queryFn: async () => {
      const allFacultes = await dataService.query('EtablissementFaculte', {
        filters: [{ etablissement_id: user.etablissement_id }]
      });
      return allFacultes;
    },
    enabled: !!user.etablissement_id,
  });

  const { data: departements = [] } = useQuery({
    queryKey: ['departements', user.etablissement_id],
    queryFn: async () => {
      const allDepts = await dataService.query('EtablissementDepartement', {
        filters: [{ etablissement_id: user.etablissement_id }]
      });
      return allDepts;
    },
    enabled: !!user.etablissement_id,
  });

  const { data: options = [] } = useQuery({
    queryKey: ['options', user.etablissement_id],
    queryFn: async () => {
      const allOptions = await dataService.query('EtablissementOption', {
        filters: [{ etablissement_id: user.etablissement_id }]
      });
      return allOptions;
    },
    enabled: !!user.etablissement_id,
  });

  const { data: orientations = [] } = useQuery({
    queryKey: ['orientations', user.etablissement_id],
    queryFn: async () => {
      const allOrientations = await dataService.query('EtablissementOrientation', {
        filters: [{ etablissement_id: user.etablissement_id }]
      });
      return allOrientations;
    },
    enabled: !!user.etablissement_id,
  });

  // Construire les niveaux académiques depuis la structure officielle
  const niveauxAcademiques = useMemo(() => {
    const niveaux = [];
    
    // Si on a des orientations, créer des niveaux basés sur les orientations
    if (orientations.length > 0) {
      orientations.forEach(orientation => {
        const etudiantsNiveau = etudiants.filter(e => 
          e.faculte === orientation.faculte_nom &&
          e.departement === orientation.departement_nom &&
          e.orientation === orientation.nom
        );
        
        niveaux.push({
          niveau: orientation.nom,
          faculte: orientation.faculte_nom,
          departement: orientation.departement_nom,
          option: orientation.option_nom,
          orientation: orientation.nom,
          nombre_etudiants: etudiantsNiveau.length
        });
      });
    }
    // Sinon si on a des options, créer des niveaux basés sur les options
    else if (options.length > 0) {
      options.forEach(option => {
        const etudiantsNiveau = etudiants.filter(e => 
          e.faculte === option.faculte_nom &&
          e.departement === option.departement_nom &&
          e.option === option.nom
        );
        
        niveaux.push({
          niveau: option.nom,
          faculte: option.faculte_nom,
          departement: option.departement_nom,
          option: option.nom,
          orientation: null,
          nombre_etudiants: etudiantsNiveau.length
        });
      });
    }
    // Sinon si on a des départements, créer des niveaux basés sur les départements
    else if (departements.length > 0) {
      departements.forEach(dept => {
        const etudiantsNiveau = etudiants.filter(e => 
          e.faculte === dept.faculte_nom &&
          e.departement === dept.nom
        );
        
        niveaux.push({
          niveau: dept.nom,
          faculte: dept.faculte_nom,
          departement: dept.nom,
          option: null,
          orientation: null,
          nombre_etudiants: etudiantsNiveau.length
        });
      });
    }
    // Sinon si on a des facultés, créer des niveaux basés sur les facultés
    else if (facultes.length > 0) {
      facultes.forEach(faculte => {
        const etudiantsNiveau = etudiants.filter(e => e.faculte === faculte.nom);
        
        niveaux.push({
          niveau: faculte.nom,
          faculte: faculte.nom,
          departement: null,
          option: null,
          orientation: null,
          nombre_etudiants: etudiantsNiveau.length
        });
      });
    }
    // En dernier recours, utiliser les classes des étudiants
    else {
      const niveauxUniques = [...new Set(etudiants.map(e => e.classe).filter(Boolean))];
      niveauxUniques.forEach(niveau => {
        const etudiantsNiveau = etudiants.filter(e => e.classe === niveau);
        const premierEtudiant = etudiantsNiveau[0];
        niveaux.push({
          niveau,
          faculte: premierEtudiant?.faculte,
          departement: premierEtudiant?.departement,
          option: premierEtudiant?.option,
          orientation: premierEtudiant?.orientation,
          nombre_etudiants: etudiantsNiveau.length
        });
      });
    }
    
    return niveaux;
  }, [etudiants, facultes, departements, options, orientations]);

  // Statistiques
  const etudiantsActifs = etudiants.filter(e => e.statut === 'actif').length;
  const professeursUniques = [...new Set(assignations.map(a => a.professeur_id))].length;
  const notesPubliees = toutesNotes.filter(n => n.statut === 'publié').length;
  const rotationsPubliees = rotations.filter(r => r.statut_publication === 'publie').length;
  const rotationsBrouillon = rotations.filter(r => r.statut_publication === 'brouillon').length;
  const instructionsImportantes = instructions.filter(i => i.important).length;



  const stats = [
    {
      title: "Étudiants",
      value: etudiants.length,
      icon: GraduationCap,
      bgColor: "bg-blue-600",
      description: `${etudiantsActifs} actifs`,
      subInfo: `${etudiants.filter(e => !e.classe).length} non assignés`,
      link: createPageUrl("EtudiantsEtablissement")
    },
    {
      title: "Niveaux",
      value: niveauxAcademiques.length,
      icon: BookOpen,
      bgColor: "bg-green-600",
      description: `${matieres.length} matières`,
      subInfo: `${facultes.length} facultés`,
      link: createPageUrl("GestionStructureAcademique")
    },
    {
      title: "Professeurs",
      value: professeursUniques,
      icon: UserCheck,
      bgColor: "bg-purple-600",
      description: `${assignations.length} assignations`,
      subInfo: `${matieres.length} matières enseignées`,
      link: createPageUrl("AffectationProfesseurs")
    },
    {
      title: "Notes",
      value: toutesNotes.length,
      icon: FileText,
      bgColor: "bg-orange-600",
      description: `${notesPubliees} publiées`,
      subInfo: `${notesEnAttente.length} en attente`,
      link: createPageUrl("ValidationNotes")
    },
    {
      title: "Rotations",
      value: rotations.length,
      icon: Calendar,
      bgColor: "bg-indigo-600",
      description: `${rotationsPubliees} publiées`,
      subInfo: `${rotationsBrouillon} brouillons`,
      link: createPageUrl("RotationCours")
    },
    {
      title: "Instructions",
      value: instructions.length,
      icon: Bell,
      bgColor: "bg-red-600",
      description: `${instructionsImportantes} importantes`,
      subInfo: `Communication profs`,
      link: createPageUrl("RotationCours")
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: '#4d4d4d'}}>
      <div className="w-full px-4 space-y-8">
        {/* Header avec nom établissement */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-10 h-10 text-blue-500" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {user?.etablissement_nom || "Mon Établissement"}
              </h1>
              <p className="text-gray-300">
                Administration et gestion de l'établissement
              </p>
            </div>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <Link key={index} to={stat.link}>
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 ${stat.bgColor} rounded-xl shadow-lg`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-white">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">
                      {stat.title}
                    </p>
                    <p className="text-xs text-gray-300 mb-1">
                      {stat.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {stat.subInfo}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Alertes et Actions Prioritaires */}
        {(notesEnAttente.length > 0 || demandesInscription.length > 0 || rotationsBrouillon > 0) && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notesEnAttente.length > 0 && (
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      <CardTitle className="text-white text-sm">Notes à Valider</CardTitle>
                    </div>
                    <Badge className="bg-yellow-600">{notesEnAttente.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm mb-3">
                    {notesEnAttente.length} note(s) en attente
                  </p>
                  <Link to={createPageUrl("ValidationNotes")}>
                    <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 w-full">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Valider
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {demandesInscription.length > 0 && (
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-5 h-5 text-blue-500" />
                      <CardTitle className="text-white text-sm">Inscriptions</CardTitle>
                    </div>
                    <Badge className="bg-blue-600">{demandesInscription.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm mb-3">
                    {demandesInscription.length} demande(s) en attente
                  </p>
                  <Link to={createPageUrl("GestionInscriptions")}>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      Gérer
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {rotationsBrouillon > 0 && (
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="border-l-4 border-l-purple-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-500" />
                      <CardTitle className="text-white text-sm">Rotations</CardTitle>
                    </div>
                    <Badge className="bg-purple-600">{rotationsBrouillon}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm mb-3">
                    {rotationsBrouillon} brouillon(s) non publiés
                  </p>
                  <Link to={createPageUrl("RotationCours")}>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 w-full">
                      <FileCheck className="w-4 h-4 mr-2" />
                      Publier
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Accès rapide */}
        <div className="grid lg:grid-cols-4 gap-6">
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <Users className="w-5 h-5 text-blue-500" />
                Étudiants
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs">
                {etudiants.length} total • {etudiantsActifs} actifs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to={createPageUrl("EtudiantsEtablissement")}>
                <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 justify-start">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Voir Étudiants
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <BookOpen className="w-5 h-5 text-green-500" />
                Académique
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs">
                {niveauxAcademiques.length} niveaux • {matieres.length} matières
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to={createPageUrl("GestionStructureAcademique")}>
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 justify-start">
                  <Network className="w-4 h-4 mr-2" />
                  Structure
                </Button>
              </Link>
              <Link to={createPageUrl("Matieres")}>
                <Button size="sm" variant="outline" className="w-full justify-start">
                  <BookMarked className="w-4 h-4 mr-2" />
                  Matières
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <UserCheck className="w-5 h-5 text-purple-500" />
                Professeurs
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs">
                {professeursUniques} profs • {assignations.length} assignations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to={createPageUrl("AffectationProfesseurs")}>
                <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 justify-start">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Affectations
                </Button>
              </Link>
              <Link to={createPageUrl("ListeProfesseurs")}>
                <Button size="sm" variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Liste Profs
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Rotations
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs">
                {rotations.length} total • {rotationsPubliees} publiées
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to={createPageUrl("RotationCours")}>
                <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Gérer Rotations
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Vue d'ensemble détaillée */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Niveaux Académiques */}
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <BookOpen className="w-5 h-5 text-green-500" />
                  Niveaux Académiques
                </CardTitle>
                <Badge className="bg-green-600">{niveauxAcademiques.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {niveauxAcademiques.length > 0 ? (
                <div className="space-y-3">
                  {niveauxAcademiques.slice(0, 5).map((niveau, idx) => {
                    const etudiantsNiveau = etudiants.filter(e => e.classe === niveau.niveau);
                    return (
                      <div key={idx} className="p-3 rounded-lg hover:bg-[#474747] transition-colors" style={{backgroundColor: '#2d2d2d'}}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-white">{niveau.niveau}</p>
                            <div className="flex gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                              {niveau.faculte && <span>• {niveau.faculte}</span>}
                              {niveau.departement && <span>• {niveau.departement}</span>}
                              {niveau.option && <span>• {niveau.option}</span>}
                              {niveau.orientation && <span>• {niveau.orientation}</span>}
                            </div>
                          </div>
                          <Badge className="bg-blue-600 ml-2">
                            {etudiantsNiveau.length} étudiants
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {niveauxAcademiques.length > 5 && (
                    <Link to={createPageUrl("GestionStructureAcademique")}>
                      <Button variant="outline" className="w-full mt-2">
                        Voir tous les niveaux ({niveauxAcademiques.length})
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">Aucun niveau académique créé</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Étudiants récents */}
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <GraduationCap className="w-5 h-5 text-blue-500" />
                  Étudiants Récents
                </CardTitle>
                <Badge className="bg-blue-600">{etudiants.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {etudiants.length > 0 ? (
                <div className="space-y-3">
                  {etudiants.slice(0, 6).map((etudiant) => {
                    return (
                      <div key={etudiant.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#474747] transition-colors" style={{backgroundColor: '#2d2d2d'}}>
                        {etudiant.photo_url ? (
                          <img
                            src={etudiant.photo_url}
                            alt={etudiant.nom}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {etudiant.prenom?.[0]}{etudiant.nom?.[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">
                            {etudiant.prenom} {etudiant.nom}
                          </p>
                          <div className="flex gap-2 text-xs text-gray-400 flex-wrap">
                            <span>{etudiant.matricule}</span>
                            {etudiant.classe && (
                              <>
                                <span>•</span>
                                <span className="truncate">{etudiant.classe}</span>
                              </>
                            )}
                            {etudiant.faculte && (
                              <>
                                <span>•</span>
                                <span className="truncate">{etudiant.faculte}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge className={
                          etudiant.statut === 'actif' ? 'bg-green-600' : 'bg-gray-600'
                        }>
                          {etudiant.statut}
                        </Badge>
                      </div>
                    );
                  })}
                  {etudiants.length > 6 && (
                    <Link to={createPageUrl("EtudiantsEtablissement")}>
                      <Button variant="outline" className="w-full mt-2">
                        Voir tous les étudiants ({etudiants.length})
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GraduationCap className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">Aucun étudiant inscrit</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statistiques détaillées */}
        <div className="grid lg:grid-cols-4 gap-6">
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Étudiants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="text-white font-bold text-xl">{etudiants.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Actifs</span>
                  <Badge className="bg-green-600">{etudiantsActifs}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Non assignés</span>
                  <Badge className="bg-orange-600">
                    {etudiants.filter(e => !e.classe).length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <FileText className="w-5 h-5 text-purple-500" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="text-white font-bold text-xl">{toutesNotes.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Publiées</span>
                  <Badge className="bg-green-600">{notesPubliees}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">En attente</span>
                  <Badge className="bg-yellow-600">{notesEnAttente.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <Users className="w-5 h-5 text-orange-500" />
                Professeurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="text-white font-bold text-xl">{professeursUniques}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Assignations</span>
                  <Badge className="bg-purple-600">{assignations.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Matières</span>
                  <Badge className="bg-blue-600">{matieres.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <Network className="w-5 h-5 text-green-500" />
                Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Facultés</span>
                  <span className="text-white font-bold text-xl">{facultes.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Départements</span>
                  <Badge className="bg-green-600">{departements.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Niveaux</span>
                  <Badge className="bg-blue-600">{niveauxAcademiques.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}