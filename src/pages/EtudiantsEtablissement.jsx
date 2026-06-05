import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  GraduationCap,
  Loader2,
  Edit,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  User
} from "lucide-react";
import UserAvatarPopover from "@/components/ui/UserAvatarPopover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function EtudiantsEtablissement() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFaculte, setSelectedFaculte] = useState("toutes");
  const [selectedClasse, setSelectedClasse] = useState("toutes");
  const [editingEtudiant, setEditingEtudiant] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  // Charger tous les étudiants approuvés depuis DemandeInscription
  const { data: etudiants = [], isLoading: loadingEtudiants } = useQuery({
    queryKey: ['etudiants-inscrits', user?.etablissement_nom],
    queryFn: async () => {
      const demandes = await dataService.query('DemandeInscription', {
        filters: [{
          statut: 'approuvee',
          type_utilisateur: 'etudiant',
          etablissement_nom: user.etablissement_nom,
        }],
        limit: 10000,
        offset: 0,
      });
      return (demandes || []).sort((a, b) => {
        const nomA = `${a.nom} ${a.prenom}`.toLowerCase();
        const nomB = `${b.nom} ${b.prenom}`.toLowerCase();
        return nomA.localeCompare(nomB);
      });
    },
    enabled: !!user?.etablissement_nom
  });

  // Mutation pour modifier un étudiant
  const updateEtudiantMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await dataService.update('DemandeInscription', id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etudiants-inscrits'] });
      setEditDialogOpen(false);
      setEditingEtudiant(null);
    }
  });

  // Extraire les facultés et classes uniques
  const facultes = [...new Set(etudiants.map(e => e.faculte).filter(Boolean))];
  const classes = [...new Set(etudiants.map(e => e.classe).filter(Boolean))];

  // Filtrer les étudiants
  const etudiantsFiltres = etudiants.filter(e => {
    const matchSearch = 
      e.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.post_nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.matricule?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchFaculte = selectedFaculte === "toutes" || e.faculte === selectedFaculte;
    const matchClasse = selectedClasse === "toutes" || e.classe === selectedClasse;
    
    return matchSearch && matchFaculte && matchClasse;
  });

  const handleEditEtudiant = (etudiant) => {
    setEditingEtudiant({ ...etudiant });
    setEditDialogOpen(true);
  };

  const handleSaveEtudiant = () => {
    if (!editingEtudiant) return;

    const { id, ...dataToUpdate } = editingEtudiant;
    
    updateEtudiantMutation.mutate({
      id,
      data: {
        email: dataToUpdate.email,
        faculte: dataToUpdate.faculte,
        classe: dataToUpdate.classe
      }
    });
  };

  if (loading || loadingEtudiants) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ha-bg)'}}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!user?.etablissement_nom) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--ha-bg)'}}>
        <div className="max-w-7xl mx-auto">
          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardContent className="py-12 text-center">
              <GraduationCap className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">Aucun établissement lié</p>
              <p className="text-gray-400 text-sm">
                Votre compte n'est pas associé é  un établissement.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--ha-bg)'}}>
      <div className="w-full px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="w-10 h-10 text-blue-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Étudiants Inscrits</h1>
              <p className="text-gray-300">{user.etablissement_nom}</p>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Étudiants</p>
                  <p className="text-3xl font-bold text-white">{etudiants.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Facultés</p>
                  <p className="text-3xl font-bold text-white">{facultes.length}</p>
                </div>
                <BookOpen className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Classes</p>
                  <p className="text-3xl font-bold text-white">{classes.length}</p>
                </div>
                <GraduationCap className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}} className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, prénom, matricule ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedFaculte} onValueChange={setSelectedFaculte}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="Toutes les facultés" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">Toutes les facultés</SelectItem>
                  {facultes.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedClasse} onValueChange={setSelectedClasse}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">Toutes les classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Liste des étudiants */}
        <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Liste des étudiants ({etudiantsFiltres.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {etudiantsFiltres.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Aucun étudiant trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[1100px]">
                  <TableHeader>
                    <TableRow className="bg-[#2d2d2d]">
                      <TableHead className="text-white whitespace-nowrap">#</TableHead>
                      <TableHead className="text-white whitespace-nowrap">Nom Complet</TableHead>
                      <TableHead className="text-white whitespace-nowrap">Matricule</TableHead>
                      <TableHead className="text-white whitespace-nowrap">Email</TableHead>
                      <TableHead className="text-white whitespace-nowrap">Faculté</TableHead>
                      <TableHead className="text-white whitespace-nowrap">Classe</TableHead>
                      <TableHead className="text-white whitespace-nowrap">Date Inscription</TableHead>
                      <TableHead className="text-white whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {etudiantsFiltres.map((etudiant, index) => (
                      <TableRow key={etudiant.id} className="hover:bg-[#474747]">
                        <TableCell className="text-gray-400 whitespace-nowrap">{index + 1}</TableCell>
                        <TableCell className="text-white font-medium whitespace-nowrap">
                         <div className="flex items-center gap-2">
                           <UserAvatarPopover
                             name={`${etudiant.prenom} ${etudiant.nom} ${etudiant.post_nom || ''}`.trim()}
                             role="etudiant"
                             photoUrl={etudiant.photo_url}
                             size="sm"
                           />
                           <span>{etudiant.prenom} {etudiant.post_nom} {etudiant.nom}</span>
                         </div>
                        </TableCell>
                        <TableCell className="text-gray-300 whitespace-nowrap">{etudiant.matricule}</TableCell>
                        <TableCell className="text-gray-300 whitespace-nowrap">{etudiant.email}</TableCell>
                        <TableCell>
                          <Badge className="bg-purple-600">{etudiant.faculte || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-600">{etudiant.classe || "N/A"}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {format(new Date(etudiant.date_traitement || etudiant.created_date || etudiant.createdAt || new Date()), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditEtudiant(etudiant)}
                            className="h-8 w-8 text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de modification */}
      <DraggableDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
        title={
          <span style={{fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif", fontWeight: 600, color: 'var(--ha-text)'}}>
            Modifier l'étudiant
          </span>
        }
        maxWidth="max-w-2xl"
        resizable={false}
      >
        <DraggableDialogBody>
          {editingEtudiant && (
            <div className="space-y-4 py-4" style={{fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"}}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-white">Nom</Label>
                  <Input
                    value={editingEtudiant.nom || ""}
                    disabled
                    style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}}
                  />
                </div>
                <div>
                  <Label className="text-white">Post-nom</Label>
                  <Input
                    value={editingEtudiant.post_nom || ""}
                    disabled
                    style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}}
                  />
                </div>
                <div>
                  <Label className="text-white">Prénom</Label>
                  <Input
                    value={editingEtudiant.prenom || ""}
                    disabled
                    style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Matricule (non modifiable)</Label>
                  <Input
                    value={editingEtudiant.matricule || ""}
                    disabled
                    style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}}
                  />
                </div>
                <div>
                  <Label className="text-white">Date de naissance</Label>
                  <Input
                    value={editingEtudiant.date_naissance || ""}
                    disabled
                    style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}}
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Email</Label>
                <Input
                  type="email"
                  value={editingEtudiant.email || ""}
                  onChange={(e) => setEditingEtudiant({...editingEtudiant, email: e.target.value})}
                  style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Faculté / Option</Label>
                  <Input
                    value={editingEtudiant.faculte || ""}
                    onChange={(e) => setEditingEtudiant({...editingEtudiant, faculte: e.target.value})}
                    style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}}
                  />
                </div>
                <div>
                  <Label className="text-white">Classe</Label>
                  <Input
                    value={editingEtudiant.classe || ""}
                    onChange={(e) => setEditingEtudiant({...editingEtudiant, classe: e.target.value})}
                    style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}}
                  />
                </div>
              </div>
            </div>
          )}
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <Button
            variant="outline"
            onClick={() => setEditDialogOpen(false)}
            style={{backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--ha-text)', borderColor: 'rgba(255,255,255,0.15)', fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"}}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSaveEtudiant}
            disabled={updateEtudiantMutation.isPending}
            style={{backgroundColor: '#3b82f6', color: 'var(--ha-text)', fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"}}
          >
            {updateEtudiantMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DraggableDialogFooter>
      </DraggableDialog>
    </div>
  );
}
