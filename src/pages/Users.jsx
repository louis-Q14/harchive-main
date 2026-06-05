// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { authService, dataService, functionService } from "@/api";
import { backendConfig } from "@/api/backendConfig";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import {
  Users,
  Search,
  Shield,
  School,
  GraduationCap,
  BookOpen,
  UserCheck,
  Loader2,
  Filter,
  X,
  ArrowUpDown,
  Crown,
  UserPlus,
  Ban,
  Trash2,
  Pencil,
  ShieldOff,
  MoreHorizontal,
  Landmark } from
"lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UsersPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedEtablissement, setSelectedEtablissement] = useState("all");
  const [selectedMatricule, setSelectedMatricule] = useState("");
  const [sortField, setSortField] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showCreateAdminDialog, setShowCreateAdminDialog] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ nom: '', prenom: '', email: '', password: '', role_type: 'admin_systeme', province_affectation: '' });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const { data: allUsersData = {}, isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const [usersRes, inscriptionsRes] = await Promise.all([
        dataService.query('User', {}),
        authService.listInscriptions('all')
      ]);
      const users = (Array.isArray(usersRes) ? usersRes : (usersRes?.data || [])).filter((u) => u.role_archive);
      const inscData = inscriptionsRes?.data || inscriptionsRes || {};
      const { etudiants = [], parents = [], etablissements = [] } = inscData.etudiants ? inscData : (inscData.data || {});
      return { users, etudiants, parents, etablissements };
    },
    enabled: !loading && !!user && (user.role_archive === 'admin_systeme' || user.role_archive === 'super_admin'),
    refetchInterval: 5000
  });

  const getBaseUrl = () => backendConfig.useLocalBackend ? backendConfig.localBackendUrl + '/api' : '/api';

  const allUsers = allUsersData.users || [];

  const inscriptionsByEmail = useMemo(() => {
    const map = {};
    (allUsersData.etudiants || []).forEach((d) => { if (d?.email) map[d.email.toLowerCase()] = d; });
    (allUsersData.parents || []).forEach((d) => { if (d?.email) map[d.email.toLowerCase()] = d; });
    (allUsersData.etablissements || []).forEach((d) => { if (d?.email_responsable) map[d.email_responsable.toLowerCase()] = d; });
    return map;
  }, [allUsersData]);

  // Dériver les valeurs uniques pour les filtres
  const filterOptions = useMemo(() => {
    const etablissements = new Set();

    allUsers.forEach((u) => {
      const det = inscriptionsByEmail[u.email?.toLowerCase()] || {};
      const etab = u.etablissement_nom || det.etablissement_nom || det.nom_etablissement;
      if (etab) etablissements.add(etab);
    });

    return {
      etablissements: [...etablissements].sort(),
    };
  }, [allUsers, inscriptionsByEmail]);

  const handleUserClick = (clickedUser) => {
    // Trouver les détails d'inscription avec recherche case-insensitive
    let inscriptionDetails = null;
    const userEmailLower = clickedUser.email?.toLowerCase();
    
    if (clickedUser.role_archive === 'etudiant' || clickedUser.role_archive === 'professeur') {
      inscriptionDetails = (allUsersData.etudiants || []).find((d) => d.email?.toLowerCase() === userEmailLower);
    } else if (clickedUser.role_archive === 'parent') {
      inscriptionDetails = (allUsersData.parents || []).find((d) => d.email?.toLowerCase() === userEmailLower);
    } else if (clickedUser.role_archive === 'admin_etablissement') {
      inscriptionDetails = (allUsersData.etablissements || []).find((d) => d.email_responsable?.toLowerCase() === userEmailLower);
    }

    setSelectedUser({ ...clickedUser, inscriptionDetails });
    setShowUserDialog(true);
  };

  const filteredUsers = allUsers.filter((u) => {
    // Masquer les super_admin pour les admin_systeme
    if (user.role_archive === 'admin_systeme' && u.role_archive === 'super_admin') return false;

    const det = inscriptionsByEmail[u.email?.toLowerCase()] || {};
    const nom = u.nom || det.nom || det.nom_responsable || '';
    const prenom = u.prenom || det.prenom || det.prenom_responsable || '';
    const postNom = u.post_nom || det.post_nom || '';
    const matricule = u.matricule || det.matricule || '';
    const haystack = [nom, postNom, prenom, u.full_name, matricule].filter(Boolean).join(' ').toLowerCase();
    const matchSearch = searchTerm === "" || haystack.includes(searchTerm.toLowerCase());
    const matchRole = selectedRole === "all" || u.role_archive === selectedRole;

    const etab = u.etablissement_nom || det.etablissement_nom || det.nom_etablissement || '';

    const matchEtab = selectedEtablissement === "all" || etab === selectedEtablissement;
    const matchMatricule = selectedMatricule === "" || matricule.toLowerCase().includes(selectedMatricule.toLowerCase());

    return matchSearch && matchRole && matchEtab && matchMatricule;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const ad = inscriptionsByEmail[a.email?.toLowerCase()] || {};
    const bd = inscriptionsByEmail[b.email?.toLowerCase()] || {};
    const getVal = (u, d) => {
      if (sortField === 'nom') {
        return (u.nom || d.nom || d.nom_responsable || '').toString().toLowerCase();
      }
      if (sortField === 'post_nom') {
        return (u.post_nom || d.post_nom || '').toString().toLowerCase();
      }
      if (sortField === 'prenom') {
        return (u.prenom || d.prenom || d.prenom_responsable || '').toString().toLowerCase();
      }
      if (sortField === 'full_name') return (u.full_name || '').toString().toLowerCase();
      if (sortField === 'role_archive') return (u.role_archive || '').toString().toLowerCase();
      return '';
    };
    const aVal = getVal(a, ad);
    const bVal = getVal(b, bd);
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const usersByRole = {
    super_admin: allUsers.filter((u) => u.role_archive === 'super_admin'),
    admin_systeme: filteredUsers.filter((u) => u.role_archive === 'admin_systeme'),
    admin_ministeriel: filteredUsers.filter((u) => u.role_archive === 'admin_ministeriel'),
    admin_etablissement: filteredUsers.filter((u) => u.role_archive === 'admin_etablissement'),
    professeur: filteredUsers.filter((u) => u.role_archive === 'professeur'),
    etudiant: filteredUsers.filter((u) => u.role_archive === 'etudiant'),
    parent: filteredUsers.filter((u) => u.role_archive === 'parent')
  };

  const roleConfig = {
    super_admin: {
      label: "Super Administrateur",
      icon: Crown,
      badgeColor: "bg-yellow-600"
    },
    admin_systeme: {
      label: "Admin Système",
      icon: Shield,
      badgeColor: "bg-purple-600"
    },
    admin_ministeriel: {
      label: "Admin Ministériel",
      icon: Landmark,
      badgeColor: "bg-indigo-600"
    },
    admin_etablissement: {
      label: "Admin Établissement",
      icon: School,
      badgeColor: "bg-blue-600"
    },
    professeur: {
      label: "Professeur",
      icon: BookOpen,
      badgeColor: "bg-green-600"
    },
    etudiant: {
      label: "Étudiant",
      icon: GraduationCap,
      badgeColor: "bg-orange-600"
    },
    parent: {
      label: "Parent",
      icon: UserCheck,
      badgeColor: "bg-pink-600"
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRole("all");
    setSelectedEtablissement("all");
    setSelectedMatricule("");
  };

  const hasActiveFilters = searchTerm !== "" || selectedRole !== "all" || selectedEtablissement !== "all" || selectedMatricule !== "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
      </div>);

  }

  if (!user || (user.role_archive !== 'admin_systeme' && user.role_archive !== 'super_admin')) {
    return null;
  }

  const isSuperAdmin = user.role_archive === 'super_admin';
  const isAdminSysteme = user.role_archive === 'admin_systeme';

  const canManageUser = (targetUser) => {
    if (targetUser.id === user.id) return false;
    if (isSuperAdmin) return true;
    if (isAdminSysteme && targetUser.role_archive !== 'super_admin' && targetUser.role_archive !== 'admin_systeme') return true;
    return false;
  };

  const handleBlockUser = async (targetUser) => {
    const newBlocked = targetUser.blocked ? 0 : 1;
    const action = newBlocked ? 'bloquer' : 'débloquer';
    if (!confirm(`Voulez-vous vraiment ${action} ${targetUser.prenom || ''} ${targetUser.nom || ''} ?`)) return;
    setActionLoading(targetUser.id);
    try {
      await authService.blockUser(targetUser.id, newBlocked);
      refetchUsers();
    } catch (error) {
      alert(error.message || `Erreur lors du ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    const fullName = `${targetUser.prenom || ''} ${targetUser.nom || ''}`.trim();
    const msg = `⚠️ SUPPRESSION TOTALE DU COMPTE ⚠️\n\n` +
      `Utilisateur : ${fullName} (${targetUser.email})\n` +
      `Rôle : ${roleConfig[targetUser.role_archive]?.label || targetUser.role_archive}\n\n` +
      `Toutes les données suivantes seront DÉFINITIVEMENT supprimées :\n\n` +
      `• Publications, commentaires et réactions\n` +
      `• Photos et fichiers de la galerie\n` +
      `• Messages privés et conversations\n` +
      `• Messages et groupes administrés\n` +
      `• Demandes d'amis et liste d'amis\n` +
      `• Notifications\n` +
      `• Dossiers académiques et pièces jointes\n` +
      `• Notes et évaluations\n` +
      `• Assignations, calendriers, fiches de préparation\n` +
      `• Demande d'inscription associée\n\n` +
      `Cette action est IRRÉVERSIBLE. Confirmer ?`;
    if (!confirm(msg)) return;
    // Double confirmation for safety
    if (!confirm(`Dernière chance : supprimer définitivement ${fullName} et TOUTES ses données ?`)) return;
    setActionLoading(targetUser.id);
    try {
      const result = await authService.deleteUser(targetUser.id);
      const d = result?.deletedData || {};
      const summary = Object.entries(d).filter(([,v]) => v > 0).map(([k,v]) => `${k}: ${v}`).join(', ');
      alert(`✅ Compte supprimé avec succès.\n\nDonnées effacées : ${summary || 'aucune donnée associée'}`);
      setShowUserDialog(false);
      refetchUsers();
    } catch (error) {
      alert(error.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenEdit = (targetUser) => {
    setEditingUser(targetUser);
    setEditForm({
      nom: targetUser.nom || '',
      post_nom: targetUser.post_nom || '',
      prenom: targetUser.prenom || '',
      email: targetUser.email || '',
      role_archive: targetUser.role_archive || '',
      etablissement_nom: targetUser.etablissement_nom || '',
      etablissement_id: targetUser.etablissement_id || '',
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      await authService.adminUpdateUser(editingUser.id, editForm);
      setShowEditDialog(false);
      setEditingUser(null);
      refetchUsers();
    } catch (error) {
      alert(error.message || 'Erreur lors de la modification');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminForm.nom || !newAdminForm.prenom || !newAdminForm.email || !newAdminForm.password) {
      alert('Tous les champs sont obligatoires');
      return;
    }
    if (newAdminForm.role_type === 'admin_ministeriel' && !newAdminForm.province_affectation) {
      alert('La province d\'affectation est obligatoire pour un administrateur ministériel');
      return;
    }
    if (newAdminForm.password.length < 8) {
      alert('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (!/[A-Z]/.test(newAdminForm.password)) {
      alert('Le mot de passe doit contenir au moins une majuscule');
      return;
    }
    if (!/[a-z]/.test(newAdminForm.password)) {
      alert('Le mot de passe doit contenir au moins une minuscule');
      return;
    }
    if (!/[0-9]/.test(newAdminForm.password)) {
      alert('Le mot de passe doit contenir au moins un chiffre');
      return;
    }
    setCreatingAdmin(true);
    try {
      await authService.createAdminSysteme(newAdminForm);
      alert(`Compte administrateur créé avec succès pour ${newAdminForm.prenom} ${newAdminForm.nom}`);
      setShowCreateAdminDialog(false);
      setNewAdminForm({ nom: '', prenom: '', email: '', password: '', role_type: 'admin_systeme', province_affectation: '' });
      refetchUsers();
    } catch (error) {
      alert(error.message || 'Erreur lors de la création du compte');
    } finally {
      setCreatingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="w-full min-w-[1100px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: 'var(--ha-surface)' }}>
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Gestion des Utilisateurs</h1>
            </div>
            <p className="text-gray-600 ml-15">
              Gérez et consultez tous les utilisateurs approuvés de la plateforme
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin &&
            <Button
              onClick={() => setShowCreateAdminDialog(true)}
              variant="outline"
              className="bg-yellow-600 text-white hover:bg-yellow-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Créer Administrateur
            </Button>
            }
            <Button
              onClick={() => navigate('/gestioninscriptions')}
              variant="outline"
              className="bg-green-600 text-white hover:bg-green-700">
              Gérer les Inscriptions
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>
            <Users className="w-4 h-4 inline-block mr-2" />
            Utilisateurs ({allUsers.length})
          </button>
        </div>

        {activeTab === 'users' && <>
        <div className="grid md:grid-cols-6 gap-4">
          {Object.entries(roleConfig).map(([roleKey, config]) => {
            const Icon = config.icon;
            const count = usersByRole[roleKey].length;
            return (
              <Card key={roleKey} className="border border-gray-200">
                <CardContent className="bg-[#333333] pt-6 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{count}</p>
                      <p className="text-xs font-medium text-gray-600 mt-1">{config.label}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${config.badgeColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>);

          })}
        </div>

        <Card className="bg-white border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Filter className="w-5 h-5" />
                Recherche
              </CardTitle>
              {hasActiveFilters &&
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-600 hover:text-gray-800">

                  <X className="w-4 h-4 mr-2" />
                  Réinitialiser
                </Button>
              }
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Rechercher</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Nom, post-nom ou prénom..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Rôle</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    {isSuperAdmin && <SelectItem value="super_admin">Super Administrateurs</SelectItem>}
                    <SelectItem value="admin_systeme">Administrateurs Système</SelectItem>
                    <SelectItem value="admin_ministeriel">Administrateurs Ministériels</SelectItem>
                    <SelectItem value="admin_etablissement">Administrateurs Établissement</SelectItem>
                    <SelectItem value="professeur">Professeurs</SelectItem>
                    <SelectItem value="etudiant">Étudiants</SelectItem>
                    <SelectItem value="parent">Parents</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Établissement</label>
                <Select value={selectedEtablissement} onValueChange={setSelectedEtablissement}>
                  <SelectTrigger className="border-gray-300"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {filterOptions.etablissements.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Matricule</label>
                <Input
                  placeholder="Rechercher par matricule..."
                  value={selectedMatricule}
                  onChange={(e) => setSelectedMatricule(e.target.value)}
                  className="border-gray-300" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{filteredUsers.length}</span>
              <span>utilisateur{filteredUsers.length !== 1 ? 's' : ''} trouvé{filteredUsers.length !== 1 ? 's' : ''}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-0">
            {loadingUsers ?
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div> :
            filteredUsers.length === 0 ?
            <div className="py-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Aucun utilisateur trouvé</p>
                <p className="text-sm text-gray-500">Essayez de modifier vos critères de recherche</p>
              </div> :

            <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('nom')} className="font-semibold hover:bg-gray-100">
                          Nom
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('post_nom')} className="font-semibold hover:bg-gray-100">
                          Post-nom
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('prenom')} className="font-semibold hover:bg-gray-100">
                          Prénom
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Établissement</TableHead>
                      <TableHead>Matricule</TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('role_archive')} className="font-semibold hover:bg-gray-100">
                          Rôle
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUsers.map((u) => {
                      const config = roleConfig[u.role_archive];
                      const det = inscriptionsByEmail[u.email?.toLowerCase()] || {};
                      return (
                        <TableRow
                          key={u.id}
                          className={`hover:bg-gray-50 cursor-pointer ${u.blocked ? 'opacity-60' : ''}`}
                          onClick={() => handleUserClick(u)}>

                            <TableCell className="font-medium text-gray-800">
                              {u.nom || det.nom || det.nom_responsable || '-'}
                            </TableCell>
                            <TableCell className="font-medium text-gray-800">
                              {u.post_nom || det.post_nom || '-'}
                            </TableCell>
                            <TableCell className="font-medium text-gray-800">
                              {u.prenom || det.prenom || det.prenom_responsable || '-'}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {(u.role_archive === 'admin_systeme' || u.role_archive === 'super_admin') ? 'HARCHIVE' : u.role_archive === 'admin_ministeriel' ? 'MINISTERE' : (det.etablissement_nom || det.nom_etablissement || u.etablissement_nom || '-')}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {u.matricule || det.matricule || '-'}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {config?.label || u.role_archive}
                            </TableCell>
                            <TableCell>
                              {u.blocked ?
                                <Badge className="bg-red-600 text-white">Bloqué</Badge> :
                                <Badge className="bg-green-600 text-white">Actif</Badge>
                              }
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {canManageUser(u) &&
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" disabled={actionLoading === u.id}>
                                      {actionLoading === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenEdit(u)}>
                                      <Pencil className="w-4 h-4 mr-2" /> Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBlockUser(u)}>
                                      {u.blocked ?
                                        <><ShieldOff className="w-4 h-4 mr-2" /> Débloquer</> :
                                        <><Ban className="w-4 h-4 mr-2" /> Bloquer</>
                                      }
                                    </DropdownMenuItem>
                                    {isSuperAdmin &&
                                    <DropdownMenuItem onClick={() => handleDeleteUser(u)} className="text-red-600">
                                      <Trash2 className="w-4 h-4 mr-2" /> Supprimer le compte
                                    </DropdownMenuItem>
                                    }
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              }
                            </TableCell>
                          </TableRow>);

                    })}
                  </TableBody>
                </Table>
              </div>
            }
          </CardContent>
        </Card>
        </>}
        </div>

        {/* Dialog des détails utilisateur */}
        <DraggableDialog open={showUserDialog} onOpenChange={setShowUserDialog} title={<span className="text-white text-xl font-semibold" style={CG}>Détails de l'utilisateur</span>}>
          <DraggableDialogBody>

          {selectedUser &&
          <div className="space-y-6 py-4" style={CG}>
              {/* Informations de base */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white text-lg border-b pb-2" style={{borderColor: 'rgba(255,255,255,0.15)'}}>
                  Informations du compte
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Nom complet</p>
                    <p className="text-sm font-medium text-white">{selectedUser.full_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Email</p>
                    <p className="text-sm font-medium text-white">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Rôle</p>
                    <Badge className={`${roleConfig[selectedUser.role_archive]?.badgeColor || 'bg-gray-400'} text-white`}>
                      {roleConfig[selectedUser.role_archive]?.label || selectedUser.role_archive}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Date de création</p>
                    <p className="text-sm text-white">
                      {new Date(selectedUser.created_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Détails d'inscription */}
              {selectedUser.inscriptionDetails &&
            <div className="space-y-4">
                  <h3 className="font-semibold text-white text-lg border-b pb-2" style={{borderColor: 'rgba(255,255,255,0.15)'}}>
                    Détails d'inscription
                  </h3>

                  {(selectedUser.role_archive === 'etudiant' || selectedUser.role_archive === 'professeur') &&
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Nom</p>
                        <p className="text-sm text-white">{selectedUser.nom || selectedUser.inscriptionDetails?.nom || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Post-nom</p>
                        <p className="text-sm text-white">{selectedUser.post_nom || selectedUser.inscriptionDetails?.post_nom || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Prénom</p>
                        <p className="text-sm text-white">{selectedUser.prenom || selectedUser.inscriptionDetails?.prenom || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Date de naissance</p>
                        <p className="text-sm text-white">
                          {selectedUser.inscriptionDetails.date_naissance ?
                    new Date(selectedUser.inscriptionDetails.date_naissance).toLocaleDateString('fr-FR') :
                    '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Matricule</p>
                        <p className="text-sm text-white">{selectedUser.inscriptionDetails.matricule || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Établissement</p>
                        <p className="text-sm text-white">{selectedUser.inscriptionDetails.etablissement_nom || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Faculté</p>
                        <p className="text-sm text-white">{selectedUser.inscriptionDetails.faculte || '-'}</p>
                      </div>
                      {selectedUser.inscriptionDetails.classe &&
                <div>
                          <p className="text-xs text-gray-400 mb-1">Classe</p>
                          <p className="text-sm text-white">{selectedUser.inscriptionDetails.classe}</p>
                        </div>
                }
                      {selectedUser.inscriptionDetails.statut &&
                <div>
                          <p className="text-xs text-gray-400 mb-1">Statut de la demande</p>
                          <Badge className={selectedUser.inscriptionDetails.statut === 'approuvee' ? 'bg-green-600' : 'bg-yellow-600'}>
                            {selectedUser.inscriptionDetails.statut}
                          </Badge>
                        </div>
                }
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Date de la demande</p>
                        <p className="text-sm text-white">
                          {new Date(selectedUser.inscriptionDetails.created_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
              }

                  {selectedUser.role_archive === 'parent' &&
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Nom</p>
                            <p className="text-sm text-white">{selectedUser.nom || selectedUser.inscriptionDetails?.nom || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Post-nom</p>
                            <p className="text-sm text-white">{selectedUser.post_nom || selectedUser.inscriptionDetails?.post_nom || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Prénom</p>
                            <p className="text-sm text-white">{selectedUser.prenom || selectedUser.inscriptionDetails?.prenom || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Téléphone</p>
                            <p className="text-sm text-white">{selectedUser.inscriptionDetails.telephone || '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-400 mb-1">Adresse</p>
                            <p className="text-sm text-white">{selectedUser.inscriptionDetails.adresse || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Matricule de l'enfant</p>
                            <p className="text-sm text-white">{selectedUser.inscriptionDetails.matricule_enfant || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Nom de l'enfant</p>
                            <p className="text-sm text-white">{selectedUser.inscriptionDetails.nom_enfant || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Établissement de l'enfant</p>
                            <p className="text-sm text-white">{selectedUser.inscriptionDetails.etablissement_nom || '-'}</p>
                          </div>
                          {selectedUser.inscriptionDetails.statut &&
                    <div>
                              <p className="text-xs text-gray-400 mb-1">Statut de la demande</p>
                              <Badge className={selectedUser.inscriptionDetails.statut === 'approuvee' ? 'bg-green-600' : 'bg-yellow-600'}>
                                {selectedUser.inscriptionDetails.statut}
                              </Badge>
                            </div>
                    }
                        </div>
                  }

                  {selectedUser.role_archive === 'admin_etablissement' &&
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Nom</p>
                            <p className="text-sm text-white">{selectedUser.nom || selectedUser.inscriptionDetails?.nom_responsable || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Prénom</p>
                            <p className="text-sm text-white">{selectedUser.prenom || selectedUser.inscriptionDetails?.prenom_responsable || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Téléphone</p>
                            <p className="text-sm text-white">{selectedUser.inscriptionDetails?.telephone_responsable || '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-400 mb-1">Nom de l'établissement</p>
                            <p className="text-sm text-white">{selectedUser.inscriptionDetails?.nom_etablissement || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Code établissement</p>
                            <p className="text-sm text-white">{selectedUser.inscriptionDetails?.code_etablissement || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Type</p>
                            <p className="text-sm text-white">{selectedUser.inscriptionDetails?.type || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Ville</p>
                            <p className="text-sm text-white">{selectedUser.inscriptionDetails?.ville || '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-400 mb-1">Adresse</p>
                            <p className="text-sm text-white">{selectedUser.inscriptionDetails?.adresse || '-'}</p>
                          </div>
                          {selectedUser.inscriptionDetails?.statut &&
                    <div>
                              <p className="text-xs text-gray-400 mb-1">Statut de la demande</p>
                              <Badge className={selectedUser.inscriptionDetails.statut === 'approuvee' ? 'bg-green-600' : 'bg-yellow-600'}>
                                {selectedUser.inscriptionDetails.statut}
                              </Badge>
                            </div>
                    }
                        </div>
                  }
                </div>
            }

              {!selectedUser.inscriptionDetails &&
            <div className="p-8 text-center rounded-lg" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}>
                  <p className="text-gray-300" style={CG}>
                    Aucun détail d'inscription disponible pour cet utilisateur
                  </p>
                </div>
            }
            </div>
          }

          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button
              onClick={() => setShowUserDialog(false)}
              style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>
              Fermer
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>

        {/* Dialog Créer Admin Système - réservé Super Admin */}
        <DraggableDialog open={showCreateAdminDialog} onOpenChange={setShowCreateAdminDialog} title={<span className="text-white text-xl font-semibold" style={CG}>Créer un Administrateur</span>} resizable={false}>
          <DraggableDialogBody>
            <div className="space-y-4 py-4" style={CG}>
              <p className="text-sm text-gray-400 mb-4">Ce compte aura tous les droits d'administration. Créé directement sans validation requise.</p>
              <div className="space-y-2 mb-4">
                <label className="text-xs text-gray-400">Type d'administrateur *</label>
                <Select value={newAdminForm.role_type} onValueChange={(v) => setNewAdminForm(f => ({...f, role_type: v}))}>
                  <SelectTrigger className="bg-[#484848] border-[#5a5a5a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_systeme">Administrateur Système</SelectItem>
                    <SelectItem value="admin_ministeriel">Administrateur Ministériel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newAdminForm.role_type === 'admin_ministeriel' && (
                <div className="space-y-2 mb-4">
                  <label className="text-xs text-gray-400">Province d'affectation *</label>
                  <Select value={newAdminForm.province_affectation} onValueChange={(v) => setNewAdminForm(f => ({...f, province_affectation: v}))}>
                    <SelectTrigger className="bg-[#484848] border-[#5a5a5a] text-white">
                      <SelectValue placeholder="Sélectionner une province" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Bas-Uele","Equateur","Haut-Katanga","Haut-Lomami","Haut-Uele","Ituri","Kasai-Central","Kasai-Oriental","Kasaï","Kinshasa","Kongo-Central","Kwango","Kwilu","Lomami","Lualaba","Mai-Ndombe","Maniema","Mongala","Nord-Kivu","Nord-Ubangi","Sankuru","Sud-Kivu","Sud-Ubangi","Tanganyika","Tshopo","Tshuapa"].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Nom *</label>
                  <Input
                    placeholder="KAZADI"
                    value={newAdminForm.nom}
                    onChange={(e) => setNewAdminForm(f => ({...f, nom: e.target.value}))}
                    className="bg-[#484848] border-[#5a5a5a] text-white placeholder:text-gray-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Prénom *</label>
                  <Input
                    placeholder="Jean"
                    value={newAdminForm.prenom}
                    onChange={(e) => setNewAdminForm(f => ({...f, prenom: e.target.value}))}
                    className="bg-[#484848] border-[#5a5a5a] text-white placeholder:text-gray-500" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Email *</label>
                <Input
                  type="email"
                  placeholder="admin@harchive.local"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm(f => ({...f, email: e.target.value}))}
                  className="bg-[#484848] border-[#5a5a5a] text-white placeholder:text-gray-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Mot de passe * (min. 8 caractères, majuscule, minuscule, chiffre)</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm(f => ({...f, password: e.target.value}))}
                  className="bg-[#484848] border-[#5a5a5a] text-white placeholder:text-gray-500" />
              </div>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button
              onClick={() => { setShowCreateAdminDialog(false); setNewAdminForm({ nom: '', prenom: '', email: '', password: '', role_type: 'admin_systeme', province_affectation: '' }); }}
              style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}
              disabled={creatingAdmin}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateAdmin}
              disabled={creatingAdmin}
              style={{backgroundColor: '#ca8a04', color: 'white', ...CG}}>
              {creatingAdmin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Créer le compte
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>

        {/* Dialog Modifier Utilisateur */}
        <DraggableDialog open={showEditDialog} onOpenChange={setShowEditDialog} title={<span className="text-white text-xl font-semibold" style={CG}>Modifier l'utilisateur</span>} resizable={false}>
          <DraggableDialogBody>
            {editingUser &&
            <div className="space-y-4 py-4" style={CG}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Nom</label>
                  <Input
                    value={editForm.nom}
                    onChange={(e) => setEditForm(f => ({...f, nom: e.target.value}))}
                    className="bg-[#484848] border-[#5a5a5a] text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Post-nom</label>
                  <Input
                    value={editForm.post_nom}
                    onChange={(e) => setEditForm(f => ({...f, post_nom: e.target.value}))}
                    className="bg-[#484848] border-[#5a5a5a] text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Prénom</label>
                <Input
                  value={editForm.prenom}
                  onChange={(e) => setEditForm(f => ({...f, prenom: e.target.value}))}
                  className="bg-[#484848] border-[#5a5a5a] text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Email</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(f => ({...f, email: e.target.value}))}
                  className="bg-[#484848] border-[#5a5a5a] text-white" />
              </div>
              {isSuperAdmin &&
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Rôle</label>
                <Select value={editForm.role_archive} onValueChange={(v) => setEditForm(f => ({...f, role_archive: v}))}>
                  <SelectTrigger className="bg-[#484848] border-[#5a5a5a] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Administrateur</SelectItem>
                    <SelectItem value="admin_systeme">Admin Système</SelectItem>
                    <SelectItem value="admin_etablissement">Admin Établissement</SelectItem>
                    <SelectItem value="professeur">Professeur</SelectItem>
                    <SelectItem value="etudiant">Étudiant</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              }
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Établissement</label>
                <Input
                  value={editForm.etablissement_nom}
                  onChange={(e) => setEditForm(f => ({...f, etablissement_nom: e.target.value}))}
                  className="bg-[#484848] border-[#5a5a5a] text-white" />
              </div>
            </div>
            }
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button
              onClick={() => { setShowEditDialog(false); setEditingUser(null); }}
              style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}
              disabled={savingEdit}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              style={{backgroundColor: '#2563eb', color: 'white', ...CG}}>
              {savingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>
        </div>);

}
