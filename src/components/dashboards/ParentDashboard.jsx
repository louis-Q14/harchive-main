import React from "react";
import { useQuery } from "@tanstack/react-query";
import { dataService } from "@/api/dataService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, TrendingUp, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function ParentDashboard({ user }) {
  const { data: enfants = [] } = useQuery({
    queryKey: ['mes-enfants', user.enfants_ids],
    queryFn: async () => {
      if (!user.enfants_ids?.length) return [];
      const allEtudiants = await dataService.query('Etudiant', { filters: [] });
      return allEtudiants.filter(e => user.enfants_ids.includes(e.id));
    },
  });

  const { data: allNotes = [] } = useQuery({
    queryKey: ['notes-enfants', user.enfants_ids],
    queryFn: async () => {
      if (!user.enfants_ids?.length) return [];
      const allNotes = await dataService.query('Note', { filters: [] });
      return allNotes.filter(n => 
        user.enfants_ids.includes(n.etudiant_id) && n.statut === 'publie'
      );
    },
  });

  const { data: statsPresenceEnfants = [] } = useQuery({
    queryKey: ['stats-presence-enfants', user.id],
    queryFn: async () => {
      return await dataService.query('StatistiquePresence', {
        filters: [{ parent_id: user.id, type: 'etudiant' }]
      });
    },
    enabled: !!user.id,
  });

  const stats = [
    {
      title: "Mes Enfants",
      value: enfants.length,
      icon: Users,
      bgColor: "bg-gray-500",
      textColor: "text-white"
    },
    {
      title: "Notes Totales",
      value: allNotes.length,
      icon: FileText,
      bgColor: "bg-gray-500",
      textColor: "text-white"
    },
  ];

  return (
    <div className="p-4 md:p-8 bg-gray-50">
      <div className="w-full px-4 space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Espace Parent
          </h1>
          <p className="text-gray-600">
            Suivez la scolarité de vos enfants
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <CardTitle className="text-3xl font-bold text-gray-800">
                      {stat.value}
                    </CardTitle>
                  </div>
                  <div className={`p-3 ${stat.bgColor} rounded-xl`}>
                    <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Users className="w-5 h-5 text-gray-600" />
              Mes Enfants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enfants.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {enfants.map((enfant) => {
                  const notesEnfant = allNotes.filter(n => n.etudiant_id === enfant.id);
                  const moyenne = notesEnfant.length > 0
                    ? notesEnfant.reduce((acc, note) => acc + (note.valeur / note.note_sur) * 20, 0) / notesEnfant.length
                    : 0;

                  return (
                    <div key={enfant.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold">
                          {enfant.prenom[0]}{enfant.nom[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {enfant.prenom} {enfant.nom}
                          </p>
                          <p className="text-sm text-gray-600">{enfant.matricule}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-600">Moyenne générale</span>
                        <span className="text-xl font-bold text-gray-800">
                          {moyenne.toFixed(2)}/20
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">
                          {notesEnfant.length} notes publiées
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">
                Aucun enfant associé à votre compte
              </p>
            )}
          </CardContent>
        </Card>

        {enfants.length > 0 && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-800">Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl("NotesEnfants")}>
                <Button className="w-full md:w-auto bg-gray-700 hover:bg-gray-800 text-white">
                  Voir Toutes les Notes
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Statistiques de présence des enfants */}
        {statsPresenceEnfants.length > 0 && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <CheckCircle2 className="w-5 h-5 text-gray-600" />
                Statistiques de Présence de Mes Enfants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statsPresenceEnfants.map((stat) => (
                  <div key={stat.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">{stat.etudiant_nom}</h3>
                        <p className="text-sm text-gray-600">
                          Semaine {stat.semaine} • {format(new Date(stat.date_debut), 'dd/MM')} - {format(new Date(stat.date_fin), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="text-center">
                        <p className="text-xl font-bold text-gray-800">{stat.total_cours}</p>
                        <p className="text-xs text-gray-600">Cours</p>
                      </div>
                      <div className="text-center">
                        <Badge className="bg-green-600 text-white text-xs">
                          {stat.taux_presence}%
                        </Badge>
                        <p className="text-xs text-gray-600 mt-1">Présence</p>
                      </div>
                      <div className="text-center">
                        <Badge className="bg-red-600 text-white text-xs">
                          {stat.taux_absence}%
                        </Badge>
                        <p className="text-xs text-gray-600 mt-1">Absence</p>
                      </div>
                      <div className="text-center">
                        <Badge className="bg-orange-600 text-white text-xs">
                          {stat.taux_retard}%
                        </Badge>
                        <p className="text-xs text-gray-600 mt-1">Retard</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}