import React, { useEffect, useMemo, useState } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Users, Loader2, Mail, IdCard, Pencil } from "lucide-react";

export default function ListeProfesseurs() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [etab, setEtab] = useState(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const queryClient = useQueryClient();

  const [editForm, setEditForm] = useState({
    nom: "",
    post_nom: "",
    prenom: "",
    matricule: "",
    email: "",
    faculte: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const me = await authService.getCurrentUser();
        let etablissement_id = me?.etablissement_id || null;
        let etablissement_nom = me?.etablissement_nom || null;

        // Si admin établissement et pas de liaison, la retrouver
        if (me?.role_archive === "admin_etablissement" && (!etablissement_id || !etablissement_nom)) {
          const all = await dataService.query('Etablissement');
          const found = all.find(
            (e) => e.admin_id === me.id || e.admin_email?.toLowerCase() === me.email?.toLowerCase()
          );
          if (found) {
            etablissement_id = found.id;
            etablissement_nom = found.nom;
          }
        }

        setUser({ ...me, etablissement_id, etablissement_nom });
        setEtab(etablissement_id ? { id: etablissement_id, nom: etablissement_nom } : null);
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Professeurs approuvés pour cet établissement
  const { data: profs = [], isLoading } = useQuery({
    queryKey: ["profs-etab", etab?.id],
    queryFn: async () => {
      // On s'appuie sur les demandes d'inscription approuvées (type professeur)
      const demandes = await dataService.query('DemandeInscription', { filters: [{
        type_utilisateur: "professeur",
        statut: "approuvee",
        etablissement_nom: user.etablissement_nom,
      }],
  limit: 1000, offset: 0 });
      return demandes;
    },
    enabled: !!user?.role_archive && user.role_archive === "admin_etablissement" && !!user?.etablissement_nom,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profs.filter((p) => {
      if (!q) return true;
      return (
        p.nom?.toLowerCase().includes(q) ||
        p.post_nom?.toLowerCase().includes(q) ||
        p.prenom?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.matricule?.toLowerCase().includes(q) ||
        p.faculte?.toLowerCase().includes(q)
      );
    });
  }, [profs, search]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return dataService.update('DemandeInscription', id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profs-etab"] });
      setShowEdit(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return dataService.delete('DemandeInscription', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profs-etab"] });
      setShowDelete(false);
      setToDelete(null);
    },
  });

  const openEdit = (prof) => {
    setEditing(prof);
    setEditForm({
      nom: prof.nom || "",
      post_nom: prof.post_nom || "",
      prenom: prof.prenom || "",
      matricule: prof.matricule || "",
      email: prof.email || "",
      faculte: prof.faculte || "",
    });
    setShowEdit(true);
  };

  const handleUpdate = () => {
    if (!editing) return;
    updateMutation.mutate({ id: editing.id, data: editForm });
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteMutation.mutate(toDelete.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#4d4d4d" }}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!user || user.role_archive !== "admin_etablissement") {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: "#4d4d4d" }}>
        <div className="max-w-4xl mx-auto">
          <Card style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }}>
            <CardHeader>
              <CardTitle className="text-white">Accès restreint</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">Cette page est réservée aux administrateurs d'établissement.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: "#4d4d4d" }}>
      <div className="w-full px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: "#3d3d3d" }}>
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Professeurs</h1>
            <p className="text-gray-400">{user.etablissement_nom || "Mon établissement"}</p>
          </div>
        </div>

        {/* Barre de recherche */}
        <Card style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }}>
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, email, matricule, faculté..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tableau */}
        <Card style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Liste des professeurs</CardTitle>
              <Badge className="bg-[#2d2d2d]">{filtered.length} professeur(s)</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Aucun professeur trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead className="bg-[#2d2d2d]">
                    <tr>
                      <th className="px-4 py-3 text-left text-white whitespace-nowrap">Nom</th>
                      <th className="px-4 py-3 text-left text-white whitespace-nowrap">Matricule</th>
                      <th className="px-4 py-3 text-left text-white whitespace-nowrap">Faculté / Département</th>
                      <th className="px-4 py-3 text-left text-white whitespace-nowrap">Email</th>
                      <th className="px-4 py-3 text-center text-white whitespace-nowrap">Statut</th>
                      <th className="px-4 py-3 text-right text-white whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={`${p.email}-${p.matricule}`} className="border-t border-[#2d2d2d] hover:bg-[#474747]">
                        <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                          {p.prenom} {p.nom}
                        </td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <IdCard className="w-4 h-4 text-gray-400" />
                            {p.matricule || "–"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{p.faculte || "–"}</td>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {p.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-green-600">Approuvé</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEdit(p)}
                              className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-[#2d2d2d]"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setToDelete(p);
                                setShowDelete(true);
                              }}
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-[#2d2d2d]"
                            >
                              <img src="/assets/icons/8b9a4e0c1_delete1.png" alt="Supprimer" className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog Modifier */}
        <DraggableDialog 
          open={showEdit} 
          onOpenChange={setShowEdit}
          title={
            <span style={{fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif", fontWeight: 600, color: 'var(--ha-text)'}}>
              Modifier le professeur
            </span>
          }
          maxWidth="max-w-md"
        >
          <DraggableDialogBody>
            <div className="space-y-4 py-4" style={{fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"}}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Nom</Label>
                  <Input
                    value={editForm.nom}
                    onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                    style={{ backgroundColor: "#2d2d2d", color: "#ffffff", borderColor: "#4d4d4d" }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Post-nom</Label>
                  <Input
                    value={editForm.post_nom}
                    onChange={(e) => setEditForm({ ...editForm, post_nom: e.target.value })}
                    style={{ backgroundColor: "#2d2d2d", color: "#ffffff", borderColor: "#4d4d4d" }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Prénom</Label>
                <Input
                  value={editForm.prenom}
                  onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                  style={{ backgroundColor: "#2d2d2d", color: "#ffffff", borderColor: "#4d4d4d" }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Matricule</Label>
                <Input
                  value={editForm.matricule}
                  onChange={(e) => setEditForm({ ...editForm, matricule: e.target.value })}
                  style={{ backgroundColor: "#2d2d2d", color: "#ffffff", borderColor: "#4d4d4d" }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{ backgroundColor: "#2d2d2d", color: "#ffffff", borderColor: "#4d4d4d" }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Faculté</Label>
                <Input
                  value={editForm.faculte}
                  onChange={(e) => setEditForm({ ...editForm, faculte: e.target.value })}
                  style={{ backgroundColor: "#2d2d2d", color: "#ffffff", borderColor: "#4d4d4d" }}
                />
              </div>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--ha-text)', borderColor: 'rgba(255,255,255,0.15)', fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"}}>
              Annuler
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              style={{backgroundColor: '#3b82f6', color: 'var(--ha-text)', fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"}}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>

        {/* Dialog Supprimer */}
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Supprimer ce professeur ?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Cette action est irréversible. Le professeur {toDelete?.prenom} {toDelete?.nom} sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: '#5a5a5a'}}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Suppression...
                  </>
                ) : (
                  "Supprimer"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
