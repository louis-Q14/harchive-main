import React, { useState, useEffect } from "react";
import { dataService } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, UserPlus, Users } from "lucide-react";
import AffectationDialog from "../components/professeurs/AffectationDialog";
import AffectationViewDialog from "../components/professeurs/AffectationViewDialog";

export default function AffectationProfesseurs() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [affectationDialog, setAffectationDialog] = useState({ open: false, professeur: null });
  const [viewDialog, setViewDialog] = useState({ open: false, professeur: null });

  useEffect(() => {
    if (!authUser) return;
    loadUser();
  }, [authUser]);

  const loadUser = async () => {
    try {
      let currentUser = { ...authUser };

      if (currentUser.role_archive === 'admin_etablissement') {
        const etablissements = await dataService.query('Etablissement', { filters: [], limit: 1000, offset: 0 });
        const etab = etablissements.find(e => e.admin_id === currentUser.id || e.admin_email?.toLowerCase() === currentUser.email?.toLowerCase());
        if (etab) {
          currentUser = { 
            ...currentUser, 
            etablissement_id: etab.id, 
            etablissement_nom: etab.nom 
          };
        }
      }

      setUser(currentUser);
    } catch (error) {
      console.error("Erreur chargement utilisateur:", error);
      if (authUser) setUser({ ...authUser });
    } finally {
      setLoading(false);
    }
  };

  // Charger les professeurs depuis DemandeInscription
  const { data: professeurs = [], isLoading: loadingProfs } = useQuery({
    queryKey: ['profs-etab', user?.etablissement_nom],
    queryFn: async () => {
      const demandes = await dataService.query('DemandeInscription', { filters: [{
        type_utilisateur: 'professeur',
        statut: 'approuvee',
        etablissement_nom: user.etablissement_nom,
      }],
  limit: 1000, offset: 0 });
      return demandes;
    },
    enabled: !loading && !!user?.etablissement_nom && user.role_archive === 'admin_etablissement',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ha-bg)'}}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loadingProfs) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ha-bg)'}}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--ha-bg)'}}>
      <div className="w-full px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold text-white">
              Affectation des Professeurs
            </h1>
          </div>
          <p className="text-white">
            Gérez les affectations des professeurs aux classes et matières
          </p>
        </div>

        <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-400" />
              Liste des Professeurs
              <Badge className="ml-auto bg-blue-600">{professeurs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {professeurs.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Aucun professeur enregistré</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{backgroundColor: 'var(--ha-surface2)'}}>
                      <TableHead className="text-white">Nom</TableHead>
                      <TableHead className="text-white">Matricule</TableHead>
                      <TableHead className="text-white">Faculté</TableHead>
                      <TableHead className="text-white">Email</TableHead>
                      <TableHead className="text-center text-white">Statut</TableHead>
                      <TableHead className="text-right text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professeurs.map((prof) => (
                      <TableRow key={prof.id} style={{borderColor: 'var(--ha-border)'}} className="hover:bg-[#474747]">
                        <TableCell className="font-medium text-white">
                          {prof.prenom} {prof.post_nom || ''} {prof.nom}
                        </TableCell>
                        <TableCell className="text-gray-300">{prof.matricule || '–'}</TableCell>
                        <TableCell className="text-gray-300">{prof.faculte || '–'}</TableCell>
                        <TableCell className="text-gray-300">{prof.email}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-600">Approuvé</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => setAffectationDialog({ open: true, professeur: prof })}
                            >
                              Ajouter
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}}
                              onClick={() => setViewDialog({ open: true, professeur: prof })}
                            >
                              Voir l'affectation
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <AffectationDialog
          open={affectationDialog.open}
          onClose={() => setAffectationDialog({ open: false, professeur: null })}
          professeur={affectationDialog.professeur}
          etablissementId={user?.etablissement_id}
          etablissementNom={user?.etablissement_nom}
        />

        <AffectationViewDialog
          open={viewDialog.open}
          onClose={() => setViewDialog({ open: false, professeur: null })}
          professeur={viewDialog.professeur}
          etablissementId={user?.etablissement_id}
        />
      </div>
    </div>
  );
}
