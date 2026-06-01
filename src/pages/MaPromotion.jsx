import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Users, Search, Mail, BookOpen } from "lucide-react";
import UserAvatarPopover from "@/components/ui/UserAvatarPopover";

export default function MaPromotion() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      navigate(createPageUrl("Dashboard"));
      return;
    }
    setUser(currentUser);
  };

  // Charger la promotion
  const { data: classe } = useQuery({
    queryKey: ['promotion', user?.classe_id],
    queryFn: async () => {
      const promotions = await dataService.query('Promotion', { filters: [{  id: user.classe_id  }],
  limit: 1000, offset: 0 });
      return promotions[0];
    },
    enabled: !!user?.classe_id
  });

  // Charger tous les étudiants de la même promotion
  const { data: etudiants = [] } = useQuery({
    queryKey: ['etudiants-promotion', user?.classe_id, user?.classe, user?.etablissement_id],
    queryFn: async () => {
      if (!user?.classe || !user?.etablissement_id) return [];
      
      // Récupérer les utilisateurs de la même classe et établissement
      const filters = [{ 
        role_archive: 'etudiant',
        etablissement_id: user.etablissement_id,
        classe: user.classe
      }];
      const classmates = await dataService.query('User', { filters, limit: 1000, offset: 0 });
      
      return classmates.map(u => ({
        id: u.id,
        email: u.email,
        nom: u.nom,
        prenom: u.prenom,
        post_nom: u.post_nom || '',
        full_name: u.full_name || [u.prenom, u.nom, u.post_nom].filter(Boolean).join(' '),
        matricule: u.matricule,
        sexe: u.sexe,
        created_date: u.createdAt || u.created_date,
        classe: u.classe,
        etablissement_nom: u.etablissement_nom,
        role_archive: 'etudiant',
        photo_url: u.photo_url,
        statut: 'actif'
      })).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    },
    enabled: !!(user?.classe && user?.etablissement_id)
  });

  // Filtrer les étudiants selon la recherche
  const etudiantsFiltres = etudiants.filter(etudiant =>
    (etudiant.nom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (etudiant.prenom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (etudiant.matricule || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (etudiant.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (etudiant.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#4d4d4d'}}>
        <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Afficher la page même sans classe_id si on a les infos de classe
  if (!user?.classe_id && !user?.classe) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: '#4d4d4d'}}>
        <div className="w-full px-4">
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Vous n'êtes pas assigné à une promotion</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: '#4d4d4d'}}>
      <div className="w-full px-4">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Ma Promotion</h1>
          <p className="text-gray-400">Liste des étudiants de votre promotion</p>
        </div>

        {/* Info classe */}
        <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{classe?.nom || user?.classe || 'Ma Classe'}</h2>
                <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                  {(classe?.faculte || user?.faculte) && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {classe?.faculte || user?.faculte}
                    </span>
                  )}
                  {(classe?.departement || user?.departement) && <span>• {classe?.departement || user?.departement}</span>}
                  {(classe?.option || user?.option) && <span>• {classe?.option || user?.option}</span>}
                  {(classe?.orientation || user?.orientation) && <span>• {classe?.orientation || user?.orientation}</span>}
                </div>
              </div>
              <Badge className="bg-blue-600 text-lg px-4 py-2">
                {etudiants.length} étudiant{etudiants.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
            <Input
              placeholder="Rechercher un étudiant (nom, prénom, matricule, email)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              style={{backgroundColor: '#2d2d2d', borderColor: '#4d4d4d', color: '#ffffff'}}
            />
          </div>
        </div>

        {/* Liste des étudiants */}
        <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Liste des Étudiants</span>
              <Badge className="bg-blue-600">
                {etudiantsFiltres.length} résultat{etudiantsFiltres.length > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {etudiantsFiltres.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Aucun étudiant trouvé</p>
              </div>
            ) : (
              <div className="rounded-lg border border-[#2d2d2d] overflow-hidden">
                <Table>
                  <TableHeader style={{backgroundColor: '#2d2d2d'}}>
                    <TableRow className="border-[#2d2d2d] hover:bg-[#2d2d2d]">
                      <TableHead className="text-gray-300 font-semibold">Nom</TableHead>
                      <TableHead className="text-gray-300 font-semibold">Email</TableHead>
                      <TableHead className="text-gray-300 font-semibold">Matricule</TableHead>
                      <TableHead className="text-gray-300 font-semibold">Date</TableHead>
                      <TableHead className="text-gray-300 font-semibold">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {etudiantsFiltres.map((etudiant) => {
                      const isCurrentUser = etudiant.email === user.email;
                      const displayName = [etudiant.prenom, etudiant.nom, etudiant.post_nom].filter(Boolean).join(' ') || 
                                          etudiant.full_name || 'Utilisateur';
                      return (
                        <TableRow 
                          key={etudiant.id}
                          className={`border-[#2d2d2d] ${
                            isCurrentUser ? 'bg-[#474747]' : ''
                          }`}
                        >
                          <TableCell className="text-white font-medium">
                            <div className="flex items-center gap-2">
                              <UserAvatarPopover
                                name={displayName}
                                role="etudiant"
                                photoUrl={etudiant.photo_url}
                                size="sm"
                              />
                              {displayName}
                              {isCurrentUser && (
                                <Badge className="bg-blue-600 text-xs">Vous</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300">{etudiant.email || '-'}</TableCell>
                          <TableCell className="text-gray-300 font-mono">{etudiant.matricule || '-'}</TableCell>
                          <TableCell className="text-gray-300">
                            {etudiant.created_date ? new Date(etudiant.created_date).toLocaleDateString('fr-FR') : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-600">Approuvée</Badge>
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
      </div>
    </div>
  );
}

