import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Search, Lock, Globe, Loader2, MessageCircle } from "lucide-react";
import CreateGroupDialog from "../components/groupes/CreateGroupDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Groupes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filter, setFilter] = useState("mes_groupes");

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

  // Charger les groupes - seulement ceux dont l'utilisateur est membre ou admin
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async () => {
      const allGroups = await dataService.query('Group', { filters: [], limit: 500, offset: 0 });
      // Filtrer: seulement les groupes dont l'utilisateur est membre ou admin
      return allGroups.filter(g => 
        g.admin_id === user.id || 
        (Array.isArray(g.members) ? g.members.includes(user.id) : (g.members || '').includes(user.id))
      );
    },
    enabled: !!user
  });

  // Créer un groupe
  const createGroupMutation = useMutation({
    mutationFn: async (groupData) => {
      return await dataService.create('Group', groupData);
    },
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowCreateDialog(false);
      navigate(createPageUrl(`GroupeDetails?id=${newGroup.id}`));
    }
  });

  // Rejoindre un groupe public
  const joinGroupMutation = useMutation({
    mutationFn: async (group) => {
      const updatedMembers = [...group.members, user.id];
      const updatedMembersDetails = [
        ...(group.members_details || []),
        { 
          user_id: user.id, 
          full_name: [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ').trim() || user.full_name || 'Utilisateur', 
          email: user.email 
        }
      ];

      await dataService.update('Group', group.id, {
        members: updatedMembers,
        members_details: updatedMembersDetails
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    }
  });

  // Demander é  rejoindre un groupe privé
  const requestJoinMutation = useMutation({
    mutationFn: async (group) => {
      const updatedRequests = [
        ...(group.demandes_adhesion || []),
        {
          user_id: user.id,
          full_name: [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ').trim() || user.full_name || 'Utilisateur',
          date_demande: new Date().toISOString()
        }
      ];

      await dataService.update('Group', group.id, {
        demandes_adhesion: updatedRequests
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    }
  });

  const handleCreateGroup = async (groupData) => {
    await createGroupMutation.mutateAsync({
      ...groupData,
      admin_id: user.id,
      admin_name: user.full_name,
      members: [user.id],
      members_details: [
        { 
          user_id: user.id, 
          full_name: [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ').trim() || user.full_name || 'Utilisateur', 
          email: user.email 
        }
      ]
    });
  };

  const handleJoinGroup = (group) => {
    if (group.type === "public") {
      joinGroupMutation.mutate(group);
    } else {
      requestJoinMutation.mutate(group);
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?';
  };

  const filteredGroups = groups
    .filter((group) => {
      const matchesSearch = group.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          group.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

  const myGroups = groups.filter(g => g.members?.includes(user?.id));
  const publicGroups = []; // Les groupes publics d'autres ne sont plus visibles

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="w-full px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Groupes</h1>
              <p className="text-gray-600 mt-1">Créez et rejoignez des groupes pour collaborer</p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Créer un groupe
            </Button>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{myGroups.length}</p>
                    <p className="text-sm text-gray-300">Mes groupes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{groups.length}</p>
                    <p className="text-sm text-gray-300">Total groupes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtres et recherche */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher un groupe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

          </div>
        </div>

        {/* Liste des groupes */}
        {loadingGroups ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-16 h-16 text-gray-500 mb-4" />
            <p className="text-gray-300 mb-1 font-medium">Aucun groupe trouvé</p>
            <p className="text-sm text-gray-500 mb-4">
              {filter === "mes_groupes" 
                ? "Vous n'avez pas encore rejoint de groupe" 
                : "Créez votre premier groupe"}
            </p>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {filteredGroups.map((group) => {
              const isMember = group.members?.includes(user.id);
              const hasPendingRequest = group.demandes_adhesion?.some(req => req.user_id === user.id);

              return (
                <div
                  key={group.id}
                  className="flex flex-col items-center text-center rounded-2xl p-4 transition-all duration-200 hover:scale-105 cursor-pointer"
                  style={{ backgroundColor: 'transparent' }}
                >
                  {/* Avatar cliquable */}
                  <div
                    onClick={() => isMember && navigate(createPageUrl(`GroupeDetails?id=${group.id}`))}
                    className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center mb-3 shadow-lg ring-2 ring-offset-2 ring-offset-[#2a2a2a]"
                    style={{ ringColor: '#4d4d4d' }}
                  >
                    {group.avatar_url ? (
                      <img src={group.avatar_url} alt={group.nom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white bg-gradient-to-br from-blue-500 to-blue-700">
                        {getInitials(group.nom)}
                      </div>
                    )}
                  </div>

                  {/* Nom */}
                  <p className="font-semibold text-white text-sm leading-tight mb-1 line-clamp-2">{group.nom}</p>

                  {/* Badges */}
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {group.type === "prive" ? (
                      <span className="flex items-center gap-0.5 text-xs text-gray-400">
                        <Lock className="w-3 h-3" /> Privé
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-xs text-gray-400">
                        <Globe className="w-3 h-3" /> Public
                      </span>
                    )}
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <Users className="w-3 h-3" /> {group.members?.length || 0}
                    </span>
                  </div>

                  {/* Description courte */}
                  {group.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{group.description}</p>
                  )}

                  {/* Action si pas membre */}
                  {!isMember && (
                    hasPendingRequest ? (
                      <span className="text-xs text-yellow-400 mt-1">En attente...</span>
                    ) : (
                      <button
                        onClick={() => handleJoinGroup(group)}
                        className="mt-1 text-xs px-3 py-1 rounded-full text-white transition-colors"
                        style={{ backgroundColor: '#3d6cb5' }}
                      >
                        {group.type === "public" ? "Rejoindre" : "Demander"}
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog de création */}
      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateGroup={handleCreateGroup}
        creating={createGroupMutation.isPending}
      />
    </div>
  );
}
