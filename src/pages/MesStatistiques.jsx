import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar,
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function MesStatistiques() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState({});

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

  // Récupérer l'ID de l'étudiant depuis DemandeInscription
  const { data: etudiantData } = useQuery({
    queryKey: ['etudiant-data', user?.email],
    queryFn: async () => {
      const demandes = await dataService.query('DemandeInscription', { filters: [{
        email: user.email,
        statut: 'approuvee'
      }] });
      console.log("DemandeInscription trouvée:", demandes.length > 0 ? demandes[0] : null);
      return demandes.length > 0 ? demandes[0] : null;
    },
    enabled: !!user
  });

  // Récupérer les statistiques de présence de l'étudiant
  const { data: mesStatistiques = [] } = useQuery({
    queryKey: ['mes-statistiques-presence', etudiantData?.id],
    queryFn: async () => {
      console.log("Recherche statistiques pour etudiant_id:", etudiantData.id);
      const stats = await dataService.query('StatistiquePresence', { filters: [{
        type: 'etudiant',
        etudiant_id: etudiantData.id
      }] });
      console.log("Statistiques trouvées:", stats);
      return stats.sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut));
    },
    enabled: !!etudiantData,
    refetchInterval: 30000
  });

  // Récupérer les notes de l'étudiant
  const { data: mesNotes = [] } = useQuery({
    queryKey: ['mes-notes', etudiantData?.id],
    queryFn: async () => {
      const notes = await dataService.query('NoteEtudiant', { filters: [{
        etudiant_id: etudiantData.id,
        statut: 'publié'
      }] });
      return notes.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!etudiantData,
    refetchInterval: 30000
  });

  const toggleWeek = (weekId) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekId]: !prev[weekId]
    }));
  };

  // Calculer les statistiques globales
  const statsGlobales = mesStatistiques.reduce((acc, stat) => {
    acc.totalCours += stat.total_cours || 0;
    acc.totalPresents += stat.total_presents || 0;
    acc.totalAbsents += stat.total_absents || 0;
    acc.totalRetards += stat.total_retards || 0;
    return acc;
  }, { totalCours: 0, totalPresents: 0, totalAbsents: 0, totalRetards: 0 });

  const tauxPresenceGlobal = statsGlobales.totalCours > 0 
    ? Math.round((statsGlobales.totalPresents / statsGlobales.totalCours) * 100) 
    : 0;
  const tauxAbsenceGlobal = statsGlobales.totalCours > 0 
    ? Math.round((statsGlobales.totalAbsents / statsGlobales.totalCours) * 100) 
    : 0;
  const tauxRetardGlobal = statsGlobales.totalCours > 0 
    ? Math.round((statsGlobales.totalRetards / statsGlobales.totalCours) * 100) 
    : 0;

  // Calculer les statistiques de réussite
  const statsReussite = mesNotes.reduce((acc, note) => {
    const moyenne = note.cote_finale || 0;
    if (moyenne >= 60) acc.reussi++;
    else if (moyenne >= 50) acc.rattrapage++;
    else acc.echec++;
    acc.total++;
    acc.somme += moyenne;
    return acc;
  }, { reussi: 0, rattrapage: 0, echec: 0, total: 0, somme: 0 });

  const moyenneGenerale = statsReussite.total > 0 
    ? (statsReussite.somme / statsReussite.total).toFixed(2) 
    : 0;
  const tauxReussite = statsReussite.total > 0 
    ? Math.round((statsReussite.reussi / statsReussite.total) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#4d4d4d'}}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{backgroundColor: '#4d4d4d'}}>
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mes Statistiques</h1>
          <p className="text-gray-400">Suivez vos performances académiques et votre assiduité</p>
        </div>

        {/* Tabs pour les différentes sections */}
        <Tabs defaultValue="presence" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6" style={{backgroundColor: '#3d3d3d'}}>
            <TabsTrigger value="presence" className="data-[state=active]:bg-blue-600">
              Statistiques de Présence
            </TabsTrigger>
            <TabsTrigger value="reussite" className="data-[state=active]:bg-blue-600">
              Statistiques de Réussite
            </TabsTrigger>
          </TabsList>

          {/* Tab Statistiques de Présence */}
          <TabsContent value="presence"  className="space-y-6">

            {/* Résumé Global */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Cours</p>
                  <p className="text-3xl font-bold text-white">{statsGlobales.totalCours}</p>
                </div>
                <div className="p-3 bg-blue-600 rounded-xl">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Taux de Présence</p>
                  <p className="text-3xl font-bold text-green-500">{tauxPresenceGlobal}%</p>
                  <p className="text-xs text-gray-500 mt-1">{statsGlobales.totalPresents} présences</p>
                </div>
                <div className="p-3 bg-green-600 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Taux d'Absence</p>
                  <p className="text-3xl font-bold text-red-500">{tauxAbsenceGlobal}%</p>
                  <p className="text-xs text-gray-500 mt-1">{statsGlobales.totalAbsents} absences</p>
                </div>
                <div className="p-3 bg-red-600 rounded-xl">
                  <XCircle className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Taux de Retard</p>
                  <p className="text-3xl font-bold text-orange-500">{tauxRetardGlobal}%</p>
                  <p className="text-xs text-gray-500 mt-1">{statsGlobales.totalRetards} retards</p>
                </div>
                <div className="p-3 bg-orange-600 rounded-xl">
                  <Clock className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
            </div>

            {/* Graphique de progression */}
            <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Vue d'ensemble
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400">Présences</span>
                  <span className="text-sm font-bold text-green-500">{tauxPresenceGlobal}%</span>
                </div>
                <Progress value={tauxPresenceGlobal} className="h-3 bg-gray-700" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400">Absences</span>
                  <span className="text-sm font-bold text-red-500">{tauxAbsenceGlobal}%</span>
                </div>
                <Progress value={tauxAbsenceGlobal} className="h-3 bg-gray-700" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-400">Retards</span>
                  <span className="text-sm font-bold text-orange-500">{tauxRetardGlobal}%</span>
                </div>
                <Progress value={tauxRetardGlobal} className="h-3 bg-gray-700" />
              </div>
            </div>
          </CardContent>
            </Card>

            {/* Historique des statistiques par semaine */}
            <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Historique par semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mesStatistiques.length > 0 ? (
              <div className="space-y-4">
                {mesStatistiques.map((stat) => (
                  <div key={stat.id}>
                    <Button
                      variant="ghost"
                      onClick={() => toggleWeek(stat.id)}
                      className="w-full justify-between p-4 h-auto hover:bg-[#2d2d2d]"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-left">
                          <p className="font-semibold text-white text-lg">Semaine {stat.semaine}</p>
                          <p className="text-sm text-gray-400">
                            {format(new Date(stat.date_debut), 'dd MMM', { locale: fr })} - {format(new Date(stat.date_fin), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                        <div className="flex gap-3 ml-auto mr-4">
                          <Badge className="bg-green-600 text-white">
                            {stat.taux_presence}% Présent
                          </Badge>
                          <Badge className="bg-red-600 text-white">
                            {stat.taux_absence}% Absent
                          </Badge>
                          <Badge className="bg-orange-600 text-white">
                            {stat.taux_retard}% Retard
                          </Badge>
                        </div>
                      </div>
                      {expandedWeeks[stat.id] ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </Button>

                    {expandedWeeks[stat.id] && (
                      <div className="mt-3 p-4 rounded-lg" style={{backgroundColor: '#2d2d2d'}}>
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 rounded" style={{backgroundColor: '#3d3d3d'}}>
                            <p className="text-2xl font-bold text-white">{stat.total_cours}</p>
                            <p className="text-xs text-gray-400">Total Cours</p>
                          </div>
                          <div className="text-center p-3 rounded bg-green-600">
                            <p className="text-2xl font-bold text-white">{stat.total_presents}</p>
                            <p className="text-xs text-white">Présences</p>
                          </div>
                          <div className="text-center p-3 rounded bg-red-600">
                            <p className="text-2xl font-bold text-white">{stat.total_absents}</p>
                            <p className="text-xs text-white">Absences</p>
                          </div>
                          <div className="text-center p-3 rounded bg-orange-600">
                            <p className="text-2xl font-bold text-white">{stat.total_retards}</p>
                            <p className="text-xs text-white">Retards</p>
                          </div>
                        </div>

                        {/* Détails jour par jour */}
                        {stat.details_par_jour && stat.details_par_jour.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-white mb-3">Détails jour par jour:</p>
                            <div className="grid grid-cols-7 gap-2">
                              {stat.details_par_jour.map((jour, idx) => {
                                const statusConfig = {
                                  present: { bg: 'bg-green-600', label: 'Présent' },
                                  absent: { bg: 'bg-red-600', label: 'Absent' },
                                  retard: { bg: 'bg-orange-600', label: 'Retard' },
                                  justifie: { bg: 'bg-blue-600', label: 'Justifié' }
                                };
                                const config = statusConfig[jour.statut] || { bg: 'bg-gray-600', label: 'N/A' };
                                
                                return (
                                  <div 
                                    key={idx} 
                                    className={`p-3 rounded text-center ${config.bg}`}
                                    title={`${format(new Date(jour.date), 'dd/MM/yyyy', { locale: fr })} - ${config.label}`}
                                  >
                                    <p className="text-xs text-white font-bold">
                                      {format(new Date(jour.date), 'EEE', { locale: fr })}
                                    </p>
                                    <p className="text-lg font-bold text-white">
                                      {format(new Date(jour.date), 'dd', { locale: fr })}
                                    </p>
                                    <p className="text-xs text-white mt-1">
                                      {config.label}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Aucune statistique de présence disponible</p>
                <p className="text-gray-500 text-sm mt-2">
                  Les statistiques seront générées par vos professeurs
                </p>
              </div>
            )}
          </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Statistiques de Réussite */}
          <TabsContent value="reussite" className="space-y-6">
            {/* Résumé Global Réussite */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Moyenne Générale</p>
                      <p className="text-3xl font-bold text-white">{moyenneGenerale}</p>
                      <p className="text-xs text-gray-500 mt-1">/ 100</p>
                    </div>
                    <div className="p-3 bg-purple-600 rounded-xl">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Taux de Réussite</p>
                      <p className="text-3xl font-bold text-green-500">{tauxReussite}%</p>
                      <p className="text-xs text-gray-500 mt-1">{statsReussite.reussi} cours réussis</p>
                    </div>
                    <div className="p-3 bg-green-600 rounded-xl">
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">é€ Rattraper</p>
                      <p className="text-3xl font-bold text-orange-500">{statsReussite.rattrapage}</p>
                      <p className="text-xs text-gray-500 mt-1">cours</p>
                    </div>
                    <div className="p-3 bg-orange-600 rounded-xl">
                      <Clock className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Échecs</p>
                      <p className="text-3xl font-bold text-red-500">{statsReussite.echec}</p>
                      <p className="text-xs text-gray-500 mt-1">cours</p>
                    </div>
                    <div className="p-3 bg-red-600 rounded-xl">
                      <XCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Graphique de répartition */}
            <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Répartition des résultats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-400">Réussi (≥ 60%)</span>
                      <span className="text-sm font-bold text-green-500">
                        {statsReussite.total > 0 ? Math.round((statsReussite.reussi / statsReussite.total) * 100) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={statsReussite.total > 0 ? (statsReussite.reussi / statsReussite.total) * 100 : 0} 
                      className="h-3 bg-gray-700" 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-400">é€ Rattraper (50-59%)</span>
                      <span className="text-sm font-bold text-orange-500">
                        {statsReussite.total > 0 ? Math.round((statsReussite.rattrapage / statsReussite.total) * 100) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={statsReussite.total > 0 ? (statsReussite.rattrapage / statsReussite.total) * 100 : 0} 
                      className="h-3 bg-gray-700" 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-400">Échec (&lt; 50%)</span>
                      <span className="text-sm font-bold text-red-500">
                        {statsReussite.total > 0 ? Math.round((statsReussite.echec / statsReussite.total) * 100) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={statsReussite.total > 0 ? (statsReussite.echec / statsReussite.total) * 100 : 0} 
                      className="h-3 bg-gray-700" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liste détaillée des notes */}
            <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Détail des notes par matière
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mesNotes.length > 0 ? (
                  <div className="space-y-3">
                    {mesNotes.map((note) => {
                      const moyenne = note.cote_finale || 0;
                      let statusColor = 'bg-red-600';
                      let statusText = 'Échec';
                      if (moyenne >= 60) {
                        statusColor = 'bg-green-600';
                        statusText = 'Réussi';
                      } else if (moyenne >= 50) {
                        statusColor = 'bg-orange-600';
                        statusText = 'Rattrapage';
                      }

                      return (
                        <div 
                          key={note.id} 
                          className="p-4 rounded-lg flex items-center justify-between"
                          style={{backgroundColor: '#2d2d2d'}}
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{note.matiere_nom}</h4>
                            <p className="text-sm text-gray-400">{note.type_evaluation} - {note.periode}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-white">{moyenne}</p>
                              <p className="text-xs text-gray-400">/ 100</p>
                            </div>
                            <Badge className={`${statusColor} text-white`}>
                              {statusText}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">Aucune note disponible</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Les notes seront publiées par vos professeurs
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
