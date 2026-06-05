import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function MesMatieres() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Erreur:", error);
      navigate(createPageUrl("Dashboard"));
    } finally {
      setLoading(false);
    }
  };

  // Charger les données selon le rôle
  const { data: etudiantProfile } = useQuery({
    queryKey: ['etudiant-profile', user?.email],
    queryFn: async () => {
      const etudiants = await dataService.query('Etudiant', { filters: [{  email: user.email  }],
  limit: 1000, offset: 0 });
      return etudiants[0];
    },
    enabled: !!user && user.role_archive === 'etudiant'
  });

  const { data: classe } = useQuery({
    queryKey: ['classe', etudiantProfile?.classe_id],
    queryFn: async () => {
      const classes = await dataService.query('SalleClasse', { filters: [{  id: etudiantProfile.classe_id  }],
  limit: 1000, offset: 0 });
      return classes[0];
    },
    enabled: !!etudiantProfile?.classe_id && user?.role_archive === 'etudiant'
  });

  const { data: matieres = [], isLoading } = useQuery({
    queryKey: ['matieres-etudiant', classe?.niveau, user?.etablissement_id, user?.role_archive],
    queryFn: async () => {
      if (user.role_archive === 'professeur') {
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
        const affecs = await dataService.query('AssignationProfesseur', { filters: [{
          professeur_id: demandeProf.id,
        }],
  limit: 1000, offset: 0 });
        return affecs;
      } else if (user.role_archive === 'etudiant' && classe?.niveau) {
        const allMatieres = await dataService.query('Matiere', { filters: [{ 
          etablissement_id: user.etablissement_id
         }],
  limit: 1000, offset: 0 });
        return allMatieres.filter(m => 
          !m.niveaux || m.niveaux.length === 0 || m.niveaux.includes(classe.niveau)
        );
      }
      return [];
    },
    enabled: !!user?.id && (user?.role_archive === 'professeur' || (user?.role_archive === 'etudiant' && !!classe))
  });



  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ha-bg)'}}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isProfesseur = user.role_archive === 'professeur';
  const isEtudiant = user.role_archive === 'etudiant';

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--ha-bg)'}}>
      <div className="w-full px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold text-white">
              Mes Matières
            </h1>
          </div>
          {classe && isEtudiant && (
            <div className="mb-4">
              <Badge className="bg-blue-600 text-lg px-4 py-2">{classe.nom}</Badge>
              <p className="text-gray-300 mt-2">Niveau: {classe.niveau}</p>
            </div>
          )}
          <p className="text-white">
            {matieres.length} {isProfesseur ? 'affectation(s)' : 'matière(s)'}
          </p>
        </div>

        <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
          <CardHeader>
            <CardTitle className="text-xl text-white">
              {isProfesseur ? 'Mes Affectations' : 'Programme de ma Classe'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matieres.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">
                  {isProfesseur ? 'Aucune affectation pour vous' : 'Aucune matière disponible pour votre classe'}
                </p>
              </div>
            ) : isProfesseur ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{backgroundColor: 'var(--ha-surface2)'}}>
                      <TableHead className="text-white">Matière</TableHead>
                      <TableHead className="text-white">Faculté</TableHead>
                      <TableHead className="text-white">Département</TableHead>
                      <TableHead className="text-white">Option</TableHead>
                      <TableHead className="text-white">Orientation</TableHead>
                      <TableHead className="text-white">Classe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matieres.map((aff, idx) => {
                      const prevAff = idx > 0 ? matieres[idx - 1] : null;
                      const showMatiere = !prevAff || prevAff.matiere_nom !== aff.matiere_nom;
                      const showFaculte = !prevAff || prevAff.faculte !== aff.faculte;
                      const showDept = !prevAff || prevAff.departement !== aff.departement;
                      const showOption = !prevAff || prevAff.option !== aff.option;
                      const showOrientation = !prevAff || prevAff.orientation !== aff.orientation;

                      const groupKey = `${aff.departement || 'Aucun'}-${aff.option || 'Aucun'}-${aff.orientation || 'Aucun'}`;
                      const savedColors = JSON.parse(localStorage.getItem('affectation-colors') || '{}');
                      const defaultColors = [
                        '#1e3a8a', '#15803d', '#6b21a8', '#c2410c', 
                        '#be185d', '#a16207', '#4338ca', '#b91c1c'
                      ];
                      const colorIndex = Math.abs(groupKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % defaultColors.length;
                      const classeColor = savedColors[groupKey] || defaultColors[colorIndex];

                      return (
                        <TableRow 
                          key={aff.id} 
                          style={{borderColor: 'var(--ha-border)'}} 
                          className="hover:bg-[#474747]"
                        >
                          <TableCell className={`text-white font-semibold ${showMatiere ? 'bg-[#2d2d2d]' : 'bg-[#1a1a1a] text-gray-500'}`}>
                            {showMatiere ? aff.matiere_nom : ''}
                          </TableCell>
                          <TableCell className={`text-white font-semibold ${showFaculte ? 'bg-[#3d2d2d]' : 'bg-[#1a1a1a] text-gray-500'}`}>
                            {showFaculte ? (aff.faculte || '–') : ''}
                          </TableCell>
                          <TableCell className={`text-white font-semibold ${showDept ? 'bg-[#2d3d2d]' : 'bg-[#1a1a1a] text-gray-500'}`}>
                            {showDept ? (aff.departement || '–') : ''}
                          </TableCell>
                          <TableCell className={`text-white font-semibold ${showOption ? 'bg-[#3d3d2d]' : 'bg-[#1a1a1a] text-gray-500'}`}>
                            {showOption ? (aff.option || '–') : ''}
                          </TableCell>
                          <TableCell className={`text-white font-semibold ${showOrientation ? 'bg-[#2d3d3d]' : 'bg-[#1a1a1a] text-gray-500'}`}>
                            {showOrientation ? (aff.orientation || '–') : ''}
                          </TableCell>
                          <TableCell className="text-white font-semibold" style={{backgroundColor: classeColor + '40'}}>{aff.classe_nom}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {matieres.map((matiere) => (
                  <Card key={matiere.id} style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-lg mb-2">{matiere.nom}</CardTitle>
                          {matiere.code && (
                            <Badge variant="outline" className="text-xs" style={{color: 'white', borderColor: 'var(--ha-border)'}}>
                              {matiere.code}
                            </Badge>
                          )}
                        </div>
                        {matiere.couleur && (
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{backgroundColor: matiere.couleur}}
                            title="Couleur de la matière"
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {matiere.faculte && (
                          <div className="text-gray-300">
                            <span className="text-gray-500">Faculté:</span> {matiere.faculte}
                          </div>
                        )}
                        {matiere.coefficient && (
                          <div className="text-gray-300">
                            <span className="text-gray-500">Coefficient:</span> {matiere.coefficient}
                          </div>
                        )}
                        {matiere.nombre_heures && (
                          <div className="text-gray-300">
                            <span className="text-gray-500">Heures:</span> {matiere.nombre_heures}h
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

