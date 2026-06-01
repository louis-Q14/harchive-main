import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ClasseElevesList from "../components/classes/ClasseElevesList";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  Loader2,
  Calendar,
  FileText,
  Target,
  TrendingUp,
  MessageSquare,
  Settings,
  BarChart3,
  Lightbulb,
  ClipboardList,
  BookMarked,
  UserCheck,
  Brain,
  Award,
  ChevronRight
} from "lucide-react";

export default function MesClasses() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openClasses, setOpenClasses] = useState({});
  const [selectedClasse, setSelectedClasse] = useState(null);

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

  // Charger les classes et assignations du professeur
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
      }] });
    },
    enabled: !!user?.email
  });

  const { data: allEtudiants = [] } = useQuery({
    queryKey: ['etudiants-inscriptions', user?.etablissement_id],
    queryFn: async () => {
      const users = await dataService.query('User', { filters: [{
        role_archive: 'etudiant',
        etablissement_id: user.etablissement_id,
      }],
  limit: 1000, offset: 0 });
      return users;
    },
    enabled: !!user?.etablissement_id
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ['sequences', user?.id],
    queryFn: async () => {
      return await dataService.query('SequencePedagogique', { filters: [{
        professeur_id: user.id
      }]});
    },
    enabled: !!user
  });

  const { data: observations = [] } = useQuery({
    queryKey: ['observations', user?.id],
    queryFn: async () => {
      return await dataService.query('ObservationEleve', { filters: [{
        professeur_id: user.id
      }]});
    },
    enabled: !!user
  });

  const classes = [...new Map(assignations.map(a => [a.classe_id, { id: a.classe_id, nom: a.classe_nom }])).values()];
  const matieres = [...new Map(assignations.map(a => [a.matiere_id, { id: a.matiere_id, nom: a.matiere_nom }])).values()];

  // Modules du système
  const modules = [
    {
      id: "planification",
      titre: "Planification Pédagogique",
      description: "Créez des séquences, progressions et planifiez vos cours",
      icon: Calendar,
      color: "bg-blue-600",
      stats: { label: "Séquences", value: sequences.length },
      features: [
        "Séquenceur intelligent",
        "Banque de ressources",
        "Générateur de progression",
        "Calendrier pédagogique"
      ]
    },
    {
      id: "gestion-classe",
      titre: "Gestion de Classe",
      description: "Gérez votre classe, observations et comportements",
      icon: Users,
      color: "bg-green-600",
      stats: { label: "Observations", value: observations.length },
      features: [
        "Tableau de bord classe",
        "Suivi comportemental",
        "Gestion des règles",
        "Générateur de groupes"
      ]
    },
    {
      id: "differenciation",
      titre: "Différenciation",
      description: "Adaptez votre enseignement aux besoins de chacun",
      icon: Brain,
      color: "bg-purple-600",
      stats: { label: "Parcours", value: 0 },
      features: [
        "Parcours personnalisés",
        "Exercices multi-niveaux",
        "Profils d'apprentissage",
        "Activités variées"
      ]
    },
    {
      id: "evaluation",
      titre: "Évaluation & Suivi",
      description: "Évaluez et suivez la progression de vos élèves",
      icon: BarChart3,
      color: "bg-orange-600",
      stats: { label: "Évaluations", value: 0 },
      features: [
        "Évaluation formative",
        "Évaluations sommatives",
        "Analyse de résultats",
        "Bulletins automatiques"
      ]
    }
  ];

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
              src="/assets/icons/984a1d72f_class.png"
              alt="Mes Classes"
              className="w-12 h-12"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">Mes Classes</h1>
              <p className="text-gray-300">Système complet de gestion pédagogique</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="vue-ensemble" className="space-y-6">
          <TabsList className="bg-[#3d3d3d]">
            <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="classes">Mes Classes</TabsTrigger>
          </TabsList>

          {/* TAB: Vue d'ensemble */}
          <TabsContent value="vue-ensemble" className="space-y-6">
            {/* Statistiques principales */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Classes</p>
                      <p className="text-3xl font-bold text-white">{classes.length}</p>
                    </div>
                    <BookOpen className="w-12 h-12 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Étudiants</p>
                      <p className="text-3xl font-bold text-white">{allEtudiants.length}</p>
                    </div>
                    <GraduationCap className="w-12 h-12 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Matières</p>
                      <p className="text-3xl font-bold text-white">{matieres.length}</p>
                    </div>
                    <FileText className="w-12 h-12 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Séquences</p>
                      <p className="text-3xl font-bold text-white">{sequences.length}</p>
                    </div>
                    <Target className="w-12 h-12 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Guide de démarrage */}
            <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Lightbulb className="w-6 h-6 text-yellow-500" />
                  Guide de démarrage rapide
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Découvrez les fonctionnalités principales du système
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg" style={{backgroundColor: '#2d2d2d'}}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">1</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Planifiez vos séquences</h4>
                        <p className="text-sm text-gray-400">Créez des progressions pédagogiques avec objectifs et activités</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg" style={{backgroundColor: '#2d2d2d'}}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Observez vos élèves</h4>
                        <p className="text-sm text-gray-400">Notez comportements et progrès en temps réel</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg" style={{backgroundColor: '#2d2d2d'}}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">3</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Différenciez</h4>
                        <p className="text-sm text-gray-400">Créez des parcours adaptés é  chaque profil d'élève</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg" style={{backgroundColor: '#2d2d2d'}}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">4</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Évaluez efficacement</h4>
                        <p className="text-sm text-gray-400">Utilisez les outils d'évaluation formative et sommative</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Modules */}
          <TabsContent value="modules" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {modules.map(module => {
                const Icon = module.icon;
                return (
                  <Card key={module.id} style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <Badge className="bg-[#2d2d2d]">
                          {module.stats.value} {module.stats.label}
                        </Badge>
                      </div>
                      <CardTitle className="text-white text-lg">{module.titre}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {module.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 mb-4">
                        {module.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className={`w-full ${module.color} hover:opacity-90`}
                        onClick={() => {
                           if (module.id === 'planification') {
                             navigate(createPageUrl('PlanificationPedagogique'));
                           } else if (module.id === 'gestion-classe') {
                             navigate(createPageUrl('GestionClasse'));
                           } else if (module.id === 'differenciation') {
                             navigate(createPageUrl('DifferenciationModule'));
                           } else if (module.id === 'evaluation') {
                             navigate(createPageUrl('EvaluationModule'));
                           }
                         }}
                      >
                        Accéder au module
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB: Mes Classes */}
          <TabsContent value="classes" className="space-y-6">
            {classes.length === 0 ? (
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">Aucune classe assignée</p>
                  <p className="text-sm text-gray-500">Contactez votre administrateur pour obtenir des assignations</p>
                </CardContent>
              </Card>
            ) : (
                            <div className="flex flex-col gap-6">
                              {classes.map((classe) => {
                  const etudiants = allEtudiants.filter((e) => e.classe === classe.nom);
                  const matieresClasse = assignations
                    .filter((a) => a.classe_id === classe.id)
                    .map((a) => a.matiere_nom);

                  const isOpen = !!openClasses[classe.id];

                  return (
                    <Card key={classe.id} style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-white">{classe.nom}</CardTitle>
                            <p className="text-sm text-gray-400">{etudiants.length} étudiants</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-400 mb-2">Matières enseignées:</p>
                            <div className="flex flex-wrap gap-2">
                              {matieresClasse.map((matiere, idx) => (
                                <Badge key={idx} className="bg-[#2d2d2d]">{matiere}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              onClick={() => setOpenClasses((prev) => ({ ...prev, [classe.id]: !prev[classe.id] }))}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              {isOpen ? 'Masquer' : 'Voir'}
                            </Button>
                          </div>
                          {isOpen && (
                            <div className="mt-4">
                              <ClasseElevesList classe={classe} />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
