import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Loader2,
  Search,
  UserCheck,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
} from "lucide-react";

export default function Professeurs() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfesseur, setSelectedProfesseur] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      if (!currentUser.role_archive || currentUser.role_archive !== 'admin_etablissement') {
        navigate(createPageUrl("Dashboard"));
      }
    } catch (error) {
      console.error("Erreur:", error);
      navigate(createPageUrl("Dashboard"));
    } finally {
      setLoading(false);
    }
  };

  // Charger les professeurs de l'établissement
  const { data: professeurs = [], isLoading: loadingProfs } = useQuery({
    queryKey: ['professeurs', user?.etablissement_id],
    queryFn: async () => {
      const allUsers = await dataService.query('User');
      return allUsers.filter(u => 
        u.role_archive === 'professeur' && 
        u.etablissement_id === user.etablissement_id
      );
    },
    enabled: !!user && user.role_archive === 'admin_etablissement',
  });

  // Charger les assignations pour chaque professeur
  const { data: assignations = [] } = useQuery({
    queryKey: ['assignations', user?.etablissement_id],
    queryFn: async () => {
      const all = await dataService.query('AssignationProfesseur');
      return all.filter(a => a.etablissement_id === user.etablissement_id);
    },
    enabled: !!user && user.role_archive === 'admin_etablissement',
  });

  const handleViewDetails = (professeur) => {
    setSelectedProfesseur(professeur);
    setShowDetailsDialog(true);
  };

  const filteredProfesseurs = professeurs.filter(prof =>
    prof.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAssignationsForProf = (profId) => {
    return assignations.filter(a => a.professeur_id === profId);
  };

  if (loading || loadingProfs) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-gray-700" />
              <h1 className="text-3xl font-bold text-gray-800">
                Liste des Professeurs
              </h1>
            </div>
            <Button
              onClick={() => navigate(createPageUrl("AssignationsProfesseurs"))}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Gérer les Assignations
            </Button>
          </div>
          <p className="text-gray-600">
            Consultez la liste des professeurs de votre établissement
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Professeurs</p>
                  <p className="text-3xl font-bold text-gray-800">{professeurs.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Assignations Actives</p>
                  <p className="text-3xl font-bold text-gray-800">{assignations.length}</p>
                </div>
                <BookOpen className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Profs avec Classes</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {professeurs.filter(p => getAssignationsForProf(p.id).length > 0).length}
                  </p>
                </div>
                <UserCheck className="w-12 h-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, email ou matricule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-gray-300"
            />
          </div>
        </div>

        {/* Liste des professeurs */}
        <Card className="border-gray-200">
          <CardHeader className="bg-gray-50">
            <CardTitle className="text-xl text-gray-800">
              Professeurs ({filteredProfesseurs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {filteredProfesseurs.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Aucun professeur trouvé</p>
                <p className="text-sm text-gray-500">
                  {searchTerm
                    ? "Essayez avec un autre terme de recherche"
                    : "Les professeurs apparaîtront ici après validation de leurs inscriptions"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Nom complet</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Matricule</TableHead>
                      <TableHead>Faculté</TableHead>
                      <TableHead>Assignations</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfesseurs.map((professeur) => {
                      const profAssignations = getAssignationsForProf(professeur.id);
                      return (
                        <TableRow key={professeur.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                {professeur.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '?'}
                              </div>
                              {professeur.full_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              {professeur.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-gray-600 text-white">
                              {professeur.matricule || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {professeur.faculte || '-'}
                          </TableCell>
                          <TableCell>
                            {profAssignations.length > 0 ? (
                              <Badge className="bg-green-600 text-white">
                                {profAssignations.length} classe{profAssignations.length > 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                Aucune
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(professeur)}
                              className="border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                              Détails
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog Détails Professeur */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-800 text-xl">
                Détails du Professeur
              </DialogTitle>
            </DialogHeader>

            {selectedProfesseur && (
              <div className="space-y-6 py-4">
                {/* Informations personnelles */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Informations Personnelles
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Nom complet</p>
                      <p className="font-medium text-gray-800">{selectedProfesseur.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="font-medium text-gray-800">{selectedProfesseur.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Matricule</p>
                      <p className="font-medium text-gray-800">{selectedProfesseur.matricule || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                      <p className="font-medium text-gray-800">{selectedProfesseur.telephone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Date de naissance</p>
                      <p className="font-medium text-gray-800">
                        {selectedProfesseur.date_naissance 
                          ? new Date(selectedProfesseur.date_naissance).toLocaleDateString()
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Faculté</p>
                      <p className="font-medium text-gray-800">{selectedProfesseur.faculte || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Assignations */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-green-600" />
                    Assignations ({getAssignationsForProf(selectedProfesseur.id).length})
                  </h3>
                  {getAssignationsForProf(selectedProfesseur.id).length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 mb-2">Aucune assignation</p>
                      <p className="text-sm text-gray-500">
                        Ce professeur n'est pas encore assigné é  une classe
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getAssignationsForProf(selectedProfesseur.id).map((assignation) => (
                        <div
                          key={assignation.id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <GraduationCap className="w-5 h-5 text-blue-600" />
                                <p className="font-semibold text-gray-800">
                                  {assignation.classe_nom}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Matière:</span>{' '}
                                  {assignation.matiere_nom}
                                </div>
                                <div>
                                  <span className="font-medium">Année:</span>{' '}
                                  {assignation.annee_scolaire}
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-purple-600 text-white">
                              {assignation.matiere_nom}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bouton Gérer les assignations */}
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => {
                      setShowDetailsDialog(false);
                      navigate(createPageUrl("AssignationsProfesseurs"));
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Gérer les Assignations
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
