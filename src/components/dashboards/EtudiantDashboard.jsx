import React from "react";
import { useQuery } from "@tanstack/react-query";
import { dataService } from "@/api/dataService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  FileText, 
  TrendingUp, 
  BookOpen, 
  CheckCircle2, 
  Calendar,
  Bell,
  Newspaper,
  Users,
  Clock,
  Award,
  Target,
  Activity,
  BookMarked,
  MessageSquare,
  Image as ImageIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
export default function EtudiantDashboard({ user }) {
  // Charger toutes les données
  const { data: notesEtudiant = [] } = useQuery({
    queryKey: ['mes-notes-etudiant', user.id],
    queryFn: async () => {
      const demandesInscription = await dataService.query('DemandeInscription', {
        filters: [{ email: user.email, type_utilisateur: 'etudiant', statut: 'approuvee' }]
      });
      
      if (demandesInscription.length === 0) return [];
      
      const demandeId = demandesInscription[0].id;
      return await dataService.query('NoteEtudiant', {
        filters: [{ etudiant_id: demandeId, statut: 'publie' }]
      });
    },
    enabled: !!user.email
  });

  const { data: mesStatistiquesPresence = [] } = useQuery({
    queryKey: ['mes-stats-presence', user.email],
    queryFn: async () => {
      const demandesInscription = await dataService.query('DemandeInscription', {
        filters: [{ email: user.email, type_utilisateur: 'etudiant', statut: 'approuvee' }]
      });
      
      if (demandesInscription.length === 0) return [];
      
      const demandeId = demandesInscription[0].id;
      
      const stats = await dataService.query('StatistiquePresence', {
        filters: [{ etudiant_id: demandeId, type: 'etudiant' }]
      });
      
      return stats.sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut));
    },
    enabled: !!user.email,
    refetchInterval: 10000, // Actualiser toutes les 10 secondes
  });

  const { data: rotationsCours = [] } = useQuery({
    queryKey: ['mes-rotations-cours', user.classe_id],
    queryFn: async () => {
      if (!user.classe_id) return [];
      const rotations = await dataService.query('CalendrierAcademique', {
        filters: [{ classe_id: user.classe_id, type: 'cours', statut_publication: 'publie' }]
      });
      
      const now = new Date();
      return rotations.filter(r => new Date(r.date_debut) >= now);
    },
    enabled: !!user.classe_id
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['mes-notifications', user.id],
    queryFn: () => dataService.query('Notification', {
      filters: [{ destinataire_id: user.id, lue: false }]
    }),
    enabled: !!user.id
  });

  const { data: publications = [] } = useQuery({
    queryKey: ['publications-recentes'],
    queryFn: () => dataService.query('Publication', {
      filters: [{ statut: 'actif' }]
    }),
  });

  const { data: observations = [] } = useQuery({
    queryKey: ['mes-observations', user.id],
    queryFn: () => dataService.query('ObservationEleve', {
      filters: [{ etudiant_id: user.id, visible_parents: true }]
    }),
    enabled: !!user.id
  });

  // Calculs
  const moyenneGenerale = notesEtudiant.length > 0
    ? notesEtudiant.reduce((acc, note) => acc + (parseFloat(note.note) || 0), 0) / notesEtudiant.length
    : 0;

  const derniereStat = mesStatistiquesPresence[0];
  const tauxPresence = derniereStat?.taux_presence || 0;
  const tauxAbsence = derniereStat?.taux_absence || 0;
  const tauxRetard = derniereStat?.taux_retard || 0;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: '#4d4d4d'}}>
      <div className="w-full space-y-6">
        {/* Header avec photo de profil */}
        <div className="flex items-center gap-4 p-6 rounded-xl shadow-lg" style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
          {user.photo_url ? (
            <img 
              src={user.photo_url} 
              alt={user.full_name}
              className="w-20 h-20 rounded-full object-cover border-4"
              style={{borderColor: '#4d4d4d'}}
            />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl border-4" style={{backgroundColor: '#2d2d2d', borderColor: '#4d4d4d'}}>
              {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'E'}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">
              Bienvenue, {user.prenom || user.full_name}
            </h1>
            <div className="flex items-center gap-3 text-gray-300">
              <Badge className="bg-blue-600 text-white">
                {user.classe || 'Non assigné'}
              </Badge>
              <span>•</span>
              <span>{user.matricule || 'Matricule non défini'}</span>
            </div>
          </div>
          {notifications.length > 0 && (
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" className="relative">
                <Bell className="w-5 h-5" />
                <Badge className="absolute -top-2 -right-2 bg-red-600 text-white px-2 py-1 text-xs">
                  {notifications.length}
                </Badge>
              </Button>
            </Link>
          )}
        </div>

        {/* Stats principales - Réorganisées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="hover:shadow-lg transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-blue-600 rounded-xl">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1">Moyenne Générale</p>
                  <p className="text-4xl font-bold text-white">{moyenneGenerale.toFixed(1)}<span className="text-2xl text-gray-400">/20</span></p>
                </div>
              </div>
              <Progress value={(moyenneGenerale / 20) * 100} className="h-2 bg-[#2d2d2d]" />
            </CardContent>
          </Card>

          <Link to={createPageUrl("MesStatistiques")}>
            <Card 
              style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} 
              className="hover:shadow-lg transition-all cursor-pointer hover:scale-105"
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-green-600 rounded-xl">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400 mb-1">Taux de Présence</p>
                    <p className="text-4xl font-bold text-green-500">{tauxPresence}<span className="text-2xl">%</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-center p-2 rounded bg-red-600/20 border border-red-600">
                    <p className="text-xs text-gray-400">Absence</p>
                    <p className="text-sm font-bold text-red-400">{tauxAbsence}%</p>
                  </div>
                  <div className="text-center p-2 rounded bg-orange-600/20 border border-orange-600">
                    <p className="text-xs text-gray-400">Retard</p>
                    <p className="text-sm font-bold text-orange-400">{tauxRetard}%</p>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-500 mt-2">Cliquez pour voir les détails</p>
              </CardContent>
            </Card>
          </Link>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="hover:shadow-lg transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-purple-600 rounded-xl">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1">Notes Publiées</p>
                  <p className="text-4xl font-bold text-white">{notesEtudiant.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="hover:shadow-lg transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-orange-600 rounded-xl">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1">Prochains Cours</p>
                  <p className="text-4xl font-bold text-white">{rotationsCours.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Colonne gauche */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statistiques de présence détaillées */}
            {mesStatistiquesPresence.length > 0 && (
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Mes Statistiques de Présence
                  </CardTitle>
                  <CardDescription className="text-gray-400">Évolution hebdomadaire</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mesStatistiquesPresence.map((stat) => (
                      <div key={stat.id} className="p-4 rounded-lg" style={{backgroundColor: '#2d2d2d'}}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-white">Semaine {stat.semaine}</h3>
                          <p className="text-xs text-gray-400">
                            {format(new Date(stat.date_debut), 'dd MMM', { locale: fr })} - {format(new Date(stat.date_fin), 'dd MMM', { locale: fr })}
                          </p>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center p-2 rounded" style={{backgroundColor: '#3d3d3d'}}>
                            <p className="text-lg font-bold text-white">{stat.total_cours}</p>
                            <p className="text-xs text-gray-400">Cours</p>
                          </div>
                          <div className="text-center p-2 rounded bg-green-600">
                            <p className="text-lg font-bold text-white">{stat.taux_presence}%</p>
                            <p className="text-xs text-white">Présent</p>
                          </div>
                          <div className="text-center p-2 rounded bg-red-600">
                            <p className="text-lg font-bold text-white">{stat.taux_absence}%</p>
                            <p className="text-xs text-white">Absent</p>
                          </div>
                          <div className="text-center p-2 rounded bg-orange-600">
                            <p className="text-lg font-bold text-white">{stat.taux_retard}%</p>
                            <p className="text-xs text-white">Retard</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dernières notes */}
            <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Dernières Notes
                  </CardTitle>
                  <Link to={createPageUrl("MesCotes")}>
                    <Button size="sm" variant="outline">Voir tout</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {notesEtudiant.length > 0 ? (
                  <div className="space-y-3">
                    {notesEtudiant.slice(0, 5).map((note) => (
                      <div key={note.id} className="flex items-center justify-between p-3 rounded-lg" style={{backgroundColor: '#2d2d2d'}}>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{note.matiere_nom}</p>
                          <p className="text-sm text-gray-400">{note.type_evaluation} • {note.periode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">
                            {note.note}/20
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">Aucune note publiée</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Publications récentes */}
            {publications.length > 0 && (
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Newspaper className="w-5 h-5" />
                      Publications Récentes
                    </CardTitle>
                    <Link to={createPageUrl("Journal")}>
                      <Button size="sm" variant="outline">Voir tout</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {publications.map((pub) => (
                      <div key={pub.id} className="p-3 rounded-lg border" style={{backgroundColor: '#2d2d2d', borderColor: '#4d4d4d'}}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{backgroundColor: '#4d4d4d'}}>
                            {pub.auteur_nom?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-white">{pub.auteur_nom}</p>
                            <p className="text-sm text-gray-400 mb-2">
                              {format(new Date(pub.created_date), 'dd MMM à HH:mm', { locale: fr })}
                            </p>
                            <p className="text-gray-300 text-sm">{pub.contenu}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Colonne droite */}
          <div className="space-y-6">
            {/* Prochains cours */}
            <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Prochains Cours
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rotationsCours.length > 0 ? (
                  <div className="space-y-3">
                    {rotationsCours.map((cours) => (
                      <div key={cours.id} className="p-3 rounded-lg border-l-4" style={{backgroundColor: '#2d2d2d', borderColor: cours.couleur || '#3b82f6'}}>
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-gray-400 mt-1" />
                          <div className="flex-1">
                            <p className="font-semibold text-white text-sm">{cours.matiere_nom}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {format(new Date(cours.date_debut), 'dd MMM à HH:mm', { locale: fr })}
                            </p>
                            {cours.salle && (
                              <p className="text-xs text-gray-500 mt-1">Salle: {cours.salle}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Aucun cours à venir</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Observations */}
            {observations.length > 0 && (
              <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Observations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {observations.map((obs) => {
                      const colors = {
                        positif: 'bg-green-600',
                        neutre: 'bg-blue-600',
                        a_ameliorer: 'bg-orange-600',
                        alerte: 'bg-red-600'
                      };
                      return (
                        <div key={obs.id} className="p-3 rounded-lg" style={{backgroundColor: '#2d2d2d'}}>
                          <div className="flex items-start gap-2 mb-2">
                            <Badge className={colors[obs.categorie]}>{obs.categorie}</Badge>
                            <Badge className="bg-[#4d4d4d]">{obs.type}</Badge>
                          </div>
                          <p className="text-sm text-gray-300">{obs.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {format(new Date(obs.created_date), 'dd MMM', { locale: fr })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions rapides */}
            <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
              <CardHeader>
                <CardTitle className="text-white">Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={createPageUrl("MaPromotion")}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Ma Promotion
                  </Button>
                </Link>
                <Link to={createPageUrl("RotationCours")}>
                  <Button variant="outline" className="w-full justify-start">
                    <BookMarked className="w-4 h-4 mr-2" />
                    Rotation des Cours
                  </Button>
                </Link>
                <Link to={createPageUrl("Messagerie")}>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Messagerie
                  </Button>
                </Link>
                <Link to={createPageUrl("GaleriePhotos")}>
                  <Button variant="outline" className="w-full justify-start">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Galerie Photos
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}