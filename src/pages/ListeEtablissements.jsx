import React, { useState } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import { School, Plus, Pencil, Trash2, Search, MapPin, Building2, Filter, Loader2, GraduationCap, Users, BookOpen, ChevronRight, Globe, Phone, Mail, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ListeEtablissements() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterProvince, setFilterProvince] = useState("tous");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEtablissement, setSelectedEtablissement] = useState(null);
  const [formData, setFormData] = useState({
    sigle: "",
    denomination: "",
    statut: "Privé",
    territoire: "",
    province: "",
    etat: "",
    type: "Université",
    ordre: 0
  });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailEtab, setDetailEtab] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [structureData, setStructureData] = useState(null);
  const [registeredEtab, setRegisteredEtab] = useState(null);
  const [inscriptionData, setInscriptionData] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
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

  const { data: etablissements = [], isLoading } = useQuery({
    queryKey: ['etablissements-agrees'],
    queryFn: () => dataService.query('EtablissementAgree', { limit: 10000 }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => dataService.create('EtablissementAgree', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etablissements-agrees'] });
      setEditDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('EtablissementAgree', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etablissements-agrees'] });
      setEditDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => dataService.delete('EtablissementAgree', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etablissements-agrees'] });
      setDeleteDialogOpen(false);
      setSelectedEtablissement(null);
    },
  });

  const resetForm = () => {
    setFormData({
      sigle: "",
      denomination: "",
      statut: "Privé",
      territoire: "",
      province: "",
      etat: "",
      type: "Université",
      ordre: 0
    });
    setSelectedEtablissement(null);
  };

  const handleEdit = (etab) => {
    setSelectedEtablissement(etab);
    setFormData({
      sigle: etab.sigle || "",
      denomination: etab.denomination || "",
      statut: etab.statut || "Privé",
      territoire: etab.territoire || "",
      province: etab.province || "",
      etat: etab.etat || "",
      type: etab.type || "Université",
      ordre: etab.ordre || 0
    });
    setEditDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedEtablissement) {
      await updateMutation.mutateAsync({ id: selectedEtablissement.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = async () => {
    if (selectedEtablissement) {
      await deleteMutation.mutateAsync(selectedEtablissement.id);
    }
  };

  const handleViewDetail = async (etab) => {
    setDetailEtab(etab);
    setDetailDialogOpen(true);
    setDetailLoading(true);
    setStructureData(null);
    setRegisteredEtab(null);
    setInscriptionData(null);
    try {
      const [registered, inscriptions] = await Promise.all([
        dataService.query('Etablissement', { limit: 1000 }),
        dataService.query('DemandeInscriptionEtablissement', { limit: 1000 }),
      ]);
      const match = registered.find(r =>
        r.code === etab.sigle ||
        r.name?.toUpperCase()?.includes(etab.denomination?.toUpperCase()?.substring(0, 20)) ||
        etab.denomination?.toUpperCase()?.includes(r.name?.toUpperCase()?.substring(0, 20))
      );
      const inscMatch = inscriptions.find(i =>
        i.code_etablissement === etab.sigle ||
        i.nom_etablissement?.toUpperCase()?.includes(etab.denomination?.toUpperCase()?.substring(0, 20)) ||
        etab.denomination?.toUpperCase()?.includes(i.nom_etablissement?.toUpperCase()?.substring(0, 20))
      );
      if (inscMatch) setInscriptionData(inscMatch);
      if (match) {
        setRegisteredEtab(match);
        const [facultes, departements, orientations, options, promotions] = await Promise.all([
          dataService.query('EtablissementFaculte', { filters: [{ etablissement_id: match.id }], limit: 500 }),
          dataService.query('EtablissementDepartement', { filters: [{ etablissement_id: match.id }], limit: 500 }),
          dataService.query('EtablissementOrientation', { filters: [{ etablissement_id: match.id }], limit: 500 }),
          dataService.query('EtablissementOption', { filters: [{ etablissement_id: match.id }], limit: 500 }),
          dataService.query('Promotion', { filters: [{ etablissement_id: match.id }], limit: 500 }),
        ]);
        setStructureData({ facultes, departements, orientations, options, promotions });
      }
    } catch (err) {
      console.error('Erreur chargement détails:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const provinces = [...new Set(etablissements.map(e => e.province).filter(Boolean))].sort();

  const filteredEtablissements = etablissements.filter(etab => {
    const matchSearch = searchQuery === "" || 
      etab.sigle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      etab.denomination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      etab.territoire?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchStatut = filterStatut === "tous" || etab.statut === filterStatut;
    const matchProvince = filterProvince === "tous" || etab.province === filterProvince;
    
    return matchSearch && matchStatut && matchProvince;
  });

  const isAdminSysteme = user?.role_archive === "admin_systeme" || user?.role_archive === "super_admin";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="w-full px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <School className="w-8 h-8 text-gray-700" />
              Établissements Agréés de la RDC
            </h1>
            <p className="text-gray-600 mt-2">
              Liste officielle des universités et instituts supérieurs
            </p>
          </div>
          {isAdminSysteme && (
            <Button
              onClick={() => {
                resetForm();
                setEditDialogOpen(true);
              }}
              className="bg-gray-700 hover:bg-gray-800 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un Établissement
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Établissements</p>
                  <p className="text-3xl font-bold text-gray-800">{etablissements.length}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <School className="w-6 h-6 text-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Établissements Privés</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {etablissements.filter(e => e.statut === "Privé").length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Établissements Publics</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {etablissements.filter(e => e.statut === "Public").length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <School className="w-6 h-6 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et Recherche */}
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Rechercher
                </Label>
                <Input
                  placeholder="Sigle, dénomination ou territoire..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Statut
                </Label>
                <Select value={filterStatut} onValueChange={setFilterStatut}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous</SelectItem>
                    <SelectItem value="Privé">Privé</SelectItem>
                    <SelectItem value="Public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Province
                </Label>
                <Select value={filterProvince} onValueChange={setFilterProvince}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes les Provinces</SelectItem>
                    {provinces.map(prov => (
                      <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des Établissements */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle>
              Liste des Établissements ({filteredEtablissements.length})
            </CardTitle>
            <CardDescription>
              Cliquez sur un établissement pour voir les détails
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : filteredEtablissements.length === 0 ? (
              <div className="text-center py-12">
                <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Aucun établissement trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Sigle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Dénomination
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Territoire
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Province
                      </th>
                      {isAdminSysteme && (
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEtablissements.map((etab) => (
                      <tr key={etab.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleViewDetail(etab)}>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-800">{etab.sigle}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700">{etab.denomination}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={etab.statut === "Privé" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                            {etab.statut}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">{etab.territoire}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{etab.province}</span>
                        </td>
                        {isAdminSysteme && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleEdit(etab); }}
                                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEtablissement(etab);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog Ajouter/Modifier */}
        <DraggableDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} title={selectedEtablissement ? "Modifier l'Établissement" : "Ajouter un Établissement"} subtitle="Remplissez les informations de l'établissement" resizable={false}>
          <form onSubmit={handleSubmit}>
          <DraggableDialogBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sigle" className="text-white text-xs font-medium" style={CG}>Sigle <span className="text-red-500">*</span></Label>
                  <Input
                    id="sigle"
                    required
                    value={formData.sigle}
                    onChange={(e) => setFormData({...formData, sigle: e.target.value})}
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                    placeholder="Ex: UNIKIN"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-white text-xs font-medium" style={CG}>Type <span className="text-red-500">*</span></Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Université">Université</SelectItem>
                      <SelectItem value="Institut Supérieur">Institut Supérieur</SelectItem>
                      <SelectItem value="École Supérieure">École Supérieure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="denomination" className="text-white text-xs font-medium" style={CG}>Dénomination <span className="text-red-500">*</span></Label>
                <Input
                  id="denomination"
                  required
                  value={formData.denomination}
                  onChange={(e) => setFormData({...formData, denomination: e.target.value})}
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                  placeholder="Ex: UNIVERSITE DE KINSHASA"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="statut" className="text-white text-xs font-medium" style={CG}>Statut <span className="text-red-500">*</span></Label>
                  <Select value={formData.statut} onValueChange={(value) => setFormData({...formData, statut: value})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Privé">Privé</SelectItem>
                      <SelectItem value="Public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="etat" className="text-white text-xs font-medium" style={CG}>État</Label>
                  <Input
                    id="etat"
                    value={formData.etat}
                    onChange={(e) => setFormData({...formData, etat: e.target.value})}
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                    placeholder="Ex: Crée, Admis à l'agrément"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="territoire" className="text-white text-xs font-medium" style={CG}>Territoire/Ville <span className="text-red-500">*</span></Label>
                  <Input
                    id="territoire"
                    required
                    value={formData.territoire}
                    onChange={(e) => setFormData({...formData, territoire: e.target.value})}
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                    placeholder="Ex: Lemba, Kinshasa Ville"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province" className="text-white text-xs font-medium" style={CG}>Province <span className="text-red-500">*</span></Label>
                  <Input
                    id="province"
                    required
                    value={formData.province}
                    onChange={(e) => setFormData({...formData, province: e.target.value})}
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                    placeholder="Ex: Kinshasa"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ordre" className="text-white text-xs font-medium" style={CG}>Ordre d'affichage</Label>
                <Input
                  id="ordre"
                  type="number"
                  value={formData.ordre}
                  onChange={(e) => setFormData({...formData, ordre: parseInt(e.target.value) || 0})}
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                  placeholder="0"
                />
              </div>

            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                resetForm();
              }}
              style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG}}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              style={CG}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                selectedEtablissement ? "Mettre à jour" : "Ajouter"
              )}
            </Button>
          </DraggableDialogFooter>
          </form>
        </DraggableDialog>

        {/* Dialog Suppression */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer <strong>{selectedEtablissement?.sigle}</strong> ?
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedEtablissement(null)}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog Détails Établissement */}
        <DraggableDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          title={
            <div className="flex items-center gap-3">
              <School className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-white font-bold text-base" style={CG}>{detailEtab?.sigle}</div>
                <div className="text-gray-400 text-xs" style={CG}>{detailEtab?.denomination}</div>
              </div>
            </div>
          }
          maxWidth="max-w-3xl"
          resizable={false}
        >
          <DraggableDialogBody>
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
                <span className="text-gray-400 text-sm" style={CG}>Chargement des informations...</span>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Informations générales */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2" style={CG}>
                    <Building2 className="w-4 h-4 text-blue-400" />
                    Informations Générales
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-500 text-xs" style={CG}>Sigle</span>
                      <p className="text-white text-sm font-medium" style={CG}>{detailEtab?.sigle || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs" style={CG}>Statut</span>
                      <p className="text-sm" style={CG}>
                        <Badge className={detailEtab?.statut === "Privé" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"}>
                          {detailEtab?.statut}
                        </Badge>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 text-xs" style={CG}>Dénomination complète</span>
                      <p className="text-white text-sm" style={CG}>{detailEtab?.denomination || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Adresse et localisation */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2" style={CG}>
                    <MapPin className="w-4 h-4 text-green-400" />
                    Adresse & Localisation
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-500 text-xs" style={CG}>Territoire / Ville</span>
                      <p className="text-white text-sm" style={CG}>{detailEtab?.territoire || inscriptionData?.ville || registeredEtab?.city || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs" style={CG}>Province</span>
                      <p className="text-white text-sm" style={CG}>{detailEtab?.province || '—'}</p>
                    </div>
                    {(inscriptionData?.adresse || registeredEtab?.address) && (
                      <div className="col-span-2">
                        <span className="text-gray-500 text-xs" style={CG}>Adresse complète</span>
                        <p className="text-white text-sm" style={CG}>{inscriptionData?.adresse || registeredEtab?.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact (depuis formulaire d'inscription) */}
                {(inscriptionData?.telephone || inscriptionData?.email_etablissement || registeredEtab?.website) && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2" style={CG}>
                      <Phone className="w-4 h-4 text-purple-400" />
                      Contact
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {(inscriptionData?.telephone || registeredEtab?.phone) && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-white text-sm" style={CG}>{inscriptionData?.telephone || registeredEtab?.phone}</span>
                        </div>
                      )}
                      {(inscriptionData?.email_etablissement || registeredEtab?.email) && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-white text-sm" style={CG}>{inscriptionData?.email_etablissement || registeredEtab?.email}</span>
                        </div>
                      )}
                      {registeredEtab?.website && (
                        <div className="flex items-center gap-2 col-span-2">
                          <Globe className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-blue-300 text-sm" style={CG}>{registeredEtab.website}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Structure Académique */}
                {structureData && structureData.facultes?.length > 0 ? (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2" style={CG}>
                      <GraduationCap className="w-4 h-4 text-yellow-400" />
                      Structure Académique
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 ml-auto text-xs">
                        {structureData.facultes.length} Faculté{structureData.facultes.length > 1 ? 's' : ''}
                      </Badge>
                    </h3>
                    <div className="space-y-3">
                      {structureData.facultes.map(fac => {
                        const facDepts = structureData.departements.filter(d => d.faculte_id === fac.id);
                        return (
                          <div key={fac.id} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              <span className="text-white text-sm font-medium" style={CG}>{fac.nom}</span>
                              {facDepts.length > 0 && (
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs ml-auto">
                                  {facDepts.length} Dept{facDepts.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            {facDepts.length > 0 && (
                              <div className="ml-6 space-y-1.5">
                                {facDepts.map(dept => {
                                  const deptOrientations = structureData.orientations.filter(o => o.departement_id === dept.id);
                                  const deptOptions = structureData.options.filter(o => o.departement_id === dept.id);
                                  return (
                                    <div key={dept.id}>
                                      <div className="flex items-center gap-2">
                                        <ChevronRight className="w-3 h-3 text-gray-500" />
                                        <span className="text-gray-300 text-xs" style={CG}>{dept.nom}</span>
                                      </div>
                                      {deptOrientations.length > 0 && (
                                        <div className="ml-5 mt-1 space-y-1">
                                          {deptOrientations.map(ori => (
                                            <div key={ori.id} className="flex items-center gap-2">
                                              <ChevronRight className="w-2.5 h-2.5 text-gray-600" />
                                              <span className="text-gray-400 text-xs" style={CG}>{ori.nom}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {deptOptions.length > 0 && !deptOrientations.length && (
                                        <div className="ml-5 mt-1 space-y-1">
                                          {deptOptions.map(opt => (
                                            <div key={opt.id} className="flex items-center gap-2">
                                              <ChevronRight className="w-2.5 h-2.5 text-gray-600" />
                                              <span className="text-gray-400 text-xs" style={CG}>{opt.nom}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : !detailLoading && (
                  <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                    <School className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm" style={CG}>
                      Cet établissement n'a pas encore configuré sa structure académique sur H-Archive.
                    </p>
                    <p className="text-gray-600 text-xs mt-1" style={CG}>
                      Les facultés et départements s'afficheront une fois l'établissement inscrit.
                    </p>
                  </div>
                )}

                {/* Statistiques si structure présente */}
                {structureData && structureData.facultes?.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Facultés', count: structureData.facultes?.length || 0, color: 'blue' },
                      { label: 'Départements', count: structureData.departements?.length || 0, color: 'green' },
                      { label: 'Orientations', count: structureData.orientations?.length || 0, color: 'purple' },
                      { label: 'Promotions', count: structureData.promotions?.length || 0, color: 'yellow' },
                    ].map(s => (
                      <div key={s.label} className="text-center rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div className={`text-lg font-bold text-${s.color}-400`} style={CG}>{s.count}</div>
                        <div className="text-gray-500 text-xs" style={CG}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DraggableDialogBody>
        </DraggableDialog>
      </div>
    </div>
  );
}
