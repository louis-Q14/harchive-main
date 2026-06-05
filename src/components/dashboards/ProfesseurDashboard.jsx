import React from "react";
import { useQuery } from "@tanstack/react-query";
import { dataService } from "@/api/dataService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  GraduationCap, 
  FileText, 
  Calendar, 
  Users, 
  ClipboardList,
  Target,
  Eye,
  TrendingUp,
  Brain,
  BookMarked,
  BarChart3,
  MessageSquare,
  Lightbulb
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function ProfesseurDashboard({ user }) {
  // Charger les assignations du professeur
  const { data: assignations = [] } = useQuery({
    queryKey: ['assignations-prof', user.id],
    queryFn: async () => {
      return await dataService.query('AssignationProfesseur', {
        filters: [{ professeur_id: user.id, etablissement_id: user.etablissement_id }]
      });
    },
  });

  // Classes uniques
  const classes = [...new Map(assignations.map(a => [a.classe_id, { id: a.classe_id, nom: a.classe_nom }])).values()];

  // Matières enseignées
  const matieres = [...new Map(assignations.map(a => [a.matiere_id, { id: a.matiere_id, nom: a.matiere_nom }])).values()];

  // Charger les étudiants
  const { data: etudiants = [] } = useQuery({
    queryKey: ['etudiants-prof', user.etablissement_id],
    queryFn: async () => {
      const allEtudiants = await dataService.query('Etudiant', { filters: [] });
      const classeIds = classes.map(c => c.id);
      return allEtudiants.filter(e => classeIds.includes(e.classe_id));
    },
    enabled: classes.length > 0
  });

  // Charger les notes du professeur
  const { data: notes = [] } = useQuery({
    queryKey: ['notes-prof', user.id],
    queryFn: async () => {
      return await dataService.query('NoteEtudiant', { filters: [{ professeur_id: user.id }] });
    },
  });

  // Charger les séquences pédagogiques
  const { data: sequences = [] } = useQuery({
    queryKey: ['sequences-prof', user.id],
    queryFn: async () => {
      return await dataService.query('SequencePedagogique', { filters: [{ professeur_id: user.id }] });
    },
  });

  // Charger les observations
  const { data: observations = [] } = useQuery({
    queryKey: ['observations-prof', user.id],
    queryFn: async () => {
      return await dataService.query('ObservationEleve', { filters: [{ professeur_id: user.id }] });
    },
  });

  // Charger les groupes de classe
  const { data: groupes = [] } = useQuery({
    queryKey: ['groupes-classe-prof', user.id],
    queryFn: async () => {
      return await dataService.query('GroupeClasse', { filters: [{ professeur_id: user.id }] });
    },
  });

  // Statistiques
  const notesPubliees = notes.filter(n => n.statut === 'publié').length;
  const notesEnAttente = notes.filter(n => n.statut === 'brouillon').length;
  const sequencesEnCours = sequences.filter(s => s.statut === 'en_cours').length;
  const observationsRecentes = observations.filter(o => {
    const dateObs = new Date(o.date_observation || o.created_date);
    const maintenant = new Date();
    const diffJours = (maintenant - dateObs) / (1000 * 60 * 60 * 24);
    return diffJours <= 7;
  }).length;

  const stats = [
    {
      title: "Mes Classes",
      value: classes.length,
      icon: BookOpen,
      bgColor: "bg-blue-600",
      description: `${matieres.length} matière(s)`,
      link: createPageUrl("MesClasses")
    },
    {
      title: "Mes Étudiants",
      value: etudiants.length,
      icon: GraduationCap,
      bgColor: "bg-green-600",
      description: `${etudiants.filter(e => e.statut === 'actif').length} actifs`,
      link: createPageUrl("ListeEtudiants")
    },
    {
      title: "Notes Saisies",
      value: notes.length,
      icon: FileText,
      bgColor: "bg-purple-600",
      description: `${notesPubliees} publiées`,
      link: createPageUrl("SaisieNotes")
    },
    {
      title: "Séquences",
      value: sequences.length,
      icon: Target,
      bgColor: "bg-orange-600",
      description: `${sequencesEnCours} en cours`,
      link: createPageUrl("PlanificationPedagogique")
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--ha-bg)'}}>
      <div className="w-full px-4 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Bonjour, {user.full_name}
          </h1>
          <p className="text-gray-300">
            Tableau de bord professeur • {user.etablissement_nom}
          </p>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Link key={index} to={stat.link}>
              <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}} className="hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 ${stat.bgColor} rounded-xl`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {stat.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Alertes et Notifications */}
        {(notesEnAttente > 0 || observationsRecentes > 0) && (
          <div className="grid md:grid-cols-2 gap-6">
            {notesEnAttente > 0 && (
              <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-yellow-500" />
                    <CardTitle className="text-white">Notes en attente</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Vous avez <strong className="text-yellow-500">{notesEnAttente}</strong> note(s) en brouillon à publier
                  </p>
                  <Link to={createPageUrl("SaisieNotes")}>
                    <Button className="bg-yellow-600 hover:bg-yellow-700">
                      <Eye className="w-4 h-4 mr-2" />
                      Voir les notes
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {observationsRecentes > 0 && (
              <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-white">Observations récentes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    <strong className="text-blue-500">{observationsRecentes}</strong> observation(s) cette semaine
                  </p>
                  <Link to={createPageUrl("GestionClasse")}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Voir les observations
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Vue d'ensemble pédagogique */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Mes Classes et Matières */}
          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BookOpen className="w-5 h-5 text-blue-500" />
                Mes Classes & Matières
              </CardTitle>
              <CardDescription className="text-gray-400">
                {classes.length} classe(s) • {matieres.length} matière(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {classes.length > 0 ? (
                <div className="space-y-3">
                  {classes.slice(0, 4).map((classe) => {
                    const matieresClasse = assignations
                      .filter(a => a.classe_id === classe.id)
                      .map(a => a.matiere_nom);
                    const etudiantsClasse = etudiants.filter(e => e.classe_id === classe.id);
                    
                    return (
                      <div key={classe.id} className="p-4 rounded-lg hover:bg-[#474747] transition-colors" style={{backgroundColor: 'var(--ha-surface2)'}}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-white mb-1">{classe.nom}</p>
                            <p className="text-sm text-gray-400">{etudiantsClasse.length} étudiants</p>
                          </div>
                          <Badge className="bg-blue-600">{matieresClasse.length} matière(s)</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {matieresClasse.slice(0, 3).map((matiere, idx) => (
                            <Badge key={idx} className="bg-[#3d3d3d] text-xs">{matiere}</Badge>
                          ))}
                          {matieresClasse.length > 3 && (
                            <Badge className="bg-[#3d3d3d] text-xs">+{matieresClasse.length - 3}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {classes.length > 4 && (
                    <Link to={createPageUrl("MesClasses")}>
                      <Button variant="outline" className="w-full mt-2">
                        Voir toutes les classes ({classes.length})
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">Aucune classe assignée</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modules pédagogiques */}
          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Outils Pédagogiques
              </CardTitle>
              <CardDescription className="text-gray-400">
                Accès rapide aux fonctionnalités
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={createPageUrl("PlanificationPedagogique")}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 justify-start">
                  <Target className="w-4 h-4 mr-2" />
                  Planification Pédagogique
                  {sequencesEnCours > 0 && (
                    <Badge className="ml-auto bg-white text-blue-600">{sequencesEnCours}</Badge>
                  )}
                </Button>
              </Link>

              <Link to={createPageUrl("GestionClasse")}>
                <Button className="w-full bg-green-600 hover:bg-green-700 justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Gestion de Classe
                  {groupes.length > 0 && (
                    <Badge className="ml-auto bg-white text-green-600">{groupes.length} groupe(s)</Badge>
                  )}
                </Button>
              </Link>

              <Link to={createPageUrl("SaisieNotes")}>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Cahier de Cotation
                  {notesEnAttente > 0 && (
                    <Badge className="ml-auto bg-white text-purple-600">{notesEnAttente} brouillon</Badge>
                  )}
                </Button>
              </Link>


            </CardContent>
          </Card>
        </div>

        {/* Activité récente */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total</span>
                  <span className="text-white font-bold text-xl">{notes.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Publiées</span>
                  <Badge className="bg-green-600">{notesPubliees}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Brouillons</span>
                  <Badge className="bg-yellow-600">{notesEnAttente}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-orange-500" />
                Pédagogie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Séquences</span>
                  <span className="text-white font-bold text-xl">{sequences.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">En cours</span>
                  <Badge className="bg-blue-600">{sequencesEnCours}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Groupes</span>
                  <Badge className="bg-green-600">{groupes.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                Observations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total</span>
                  <span className="text-white font-bold text-xl">{observations.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Cette semaine</span>
                  <Badge className="bg-blue-600">{observationsRecentes}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Suivi nécessaire</span>
                  <Badge className="bg-red-600">
                    {observations.filter(o => o.suivi_necessaire).length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}