import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dataService } from "@/api/dataService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { School, Users, GraduationCap, TrendingUp, ClipboardList, BarChart3, Newspaper, Settings, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminSystemeDashboard({ user }) {
  const queryClient = useQueryClient();

  const { data: etablissements = [], refetch: refetchEtablissements } = useQuery({
    queryKey: ['etablissements'],
    queryFn: () => dataService.query('Etablissement', { filters: [] }),
  });

  const handleResetEtablissements = () => {
    refetchEtablissements();
  };

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => dataService.query('User', { filters: [] }),
  });

  const { data: etudiants = [] } = useQuery({
    queryKey: ['etudiants'],
    queryFn: () => dataService.query('Etudiant', { filters: [] }),
  });

  const { data: demandes = [] } = useQuery({
    queryKey: ['demandes-inscription'],
    queryFn: () => dataService.query('DemandeInscription', { filters: [] }),
  });

  const { data: demandesEtablissements = [] } = useQuery({
    queryKey: ['demandes-etablissements'],
    queryFn: () => dataService.query('DemandeInscriptionEtablissement', { filters: [] }),
  });

  const { data: demandesParents = [] } = useQuery({
    queryKey: ['demandes-parents'],
    queryFn: () => dataService.query('DemandeInscriptionParent', { filters: [] }),
  });

  const demandesEnAttente = [
    ...demandes.filter((d) => d.statut === "en_attente"),
    ...demandesEtablissements.filter((d) => d.statut === "en_attente"),
    ...demandesParents.filter((d) => d.statut === "en_attente")
  ].length;

  const stats = [
    {
      title: "Établissements",
      value: etablissements.length,
      icon: School,
      bgColor: "bg-gray-500",
      textColor: "text-white"
    },
    {
      title: "Utilisateurs",
      value: users.length,
      icon: Users,
      bgColor: "bg-gray-500",
      textColor: "text-white"
    },
    {
      title: "Étudiants",
      value: etudiants.length,
      icon: GraduationCap,
      bgColor: "bg-gray-500",
      textColor: "text-white"
    },
    {
      title: "Taux Activité",
      value: "94%",
      icon: TrendingUp,
      bgColor: "bg-gray-500",
      textColor: "text-white"
    }
  ];

  const quickActions = [
    {
      title: "Inscriptions",
      description: `${demandesEnAttente} demande(s) en attente`,
      icon: ClipboardList,
      url: "GestionInscriptions",
      color: "bg-orange-500 hover:bg-orange-600",
      badge: demandesEnAttente > 0 ? demandesEnAttente : null
    },
    {
      title: "Établissements",
      description: "Gérer les établissements",
      icon: School,
      url: "Etablissements",
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "Utilisateurs",
      description: "Gérer les utilisateurs",
      icon: Users,
      url: "Users",
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "Statistiques",
      description: "Voir les analyses",
      icon: BarChart3,
      url: "Statistiques",
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "Journal",
      description: "Publications communautaires",
      icon: Newspaper,
      url: "Journal",
      color: "bg-indigo-500 hover:bg-indigo-600"
    }
  ];

  return (
    <div className="p-4 md:p-8 bg-gray-50">
      <div className="w-full px-4 space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Tableau de Bord Système
          </h1>
          <p className="text-gray-600">
            Vue d'ensemble de la plateforme Archive
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Actions Rapides */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600" />
              Actions Rapides
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <Link key={index} to={createPageUrl(action.url)}>
                  <Card className="border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                    <CardContent className="pt-6 p-6" style={{backgroundColor: '#484848'}}>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 ${action.color} rounded-xl transition-colors relative`}>
                          <action.icon className="w-6 h-6 text-white" />
                          {action.badge && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                              {action.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">
                            {action.title}
                          </h3>
                          <p className="text-sm text-gray-100">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <School className="w-5 h-5 text-gray-600" />
                Établissements Récents
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetEtablissements}
                  className="ml-auto h-8 w-8 p-0"
                  title="Rafraîchir la liste"
                >
                  <RotateCcw className="w-4 h-4 text-gray-600 hover:text-gray-800" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {etablissements.slice(0, 5).map((etab) => (
                  <div key={etab.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="font-semibold text-gray-800">{etab.nom}</p>
                      <p className="text-sm text-gray-600">{etab.ville}</p>
                    </div>
                    <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">
                      {etab.type}
                    </span>
                  </div>
                ))}
                {etablissements.length === 0 && (
                  <p className="text-gray-600 text-center py-8">Aucun établissement</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Users className="w-5 h-5 text-gray-600" />
                Répartition des Utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['admin_etablissement', 'professeur', 'etudiant', 'parent'].map((role) => {
                  const count = users.filter((u) => u.role_archive === role).length;
                  const labels = {
                    admin_etablissement: "Admins Établissement",
                    professeur: "Professeurs",
                    etudiant: "Étudiants",
                    parent: "Parents"
                  };
                  return (
                    <div key={role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">{labels[role]}</span>
                      <span className="text-2xl font-bold text-gray-800">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}