import React, { useState } from "react";
import { dataService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Search, UserPlus, Check, Loader2 } from "lucide-react";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

export default function InviterMembresDialog({ open, onOpenChange, group, currentUser }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [invitedIds, setInvitedIds] = useState([]);
  const queryClient = useQueryClient();

  // Charger les utilisateurs pour inviter (amis de l'admin qui ne sont pas encore membres)
  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['all-users-for-invite', group?.id],
    queryFn: async () => {
      const users = await dataService.query('User', { filters: [], limit: 500, offset: 0 });
      return users;
    },
    enabled: open && !!group?.admin_id
  });

  const inviterMutation = useMutation({
    mutationFn: async (targetUser) => {
      // Ajouter directement comme membre
      const updatedMembers = [...(group.members || []), targetUser.id];
      const updatedMembersDetails = [
        ...(group.members_details || []),
        {
          user_id: targetUser.id,
          full_name: targetUser.full_name || targetUser.email,
          email: targetUser.email
        }
      ];
      await dataService.update('Group', group.id, {
        members: updatedMembers,
        members_details: updatedMembersDetails
      });

      // Envoyer une notification
      await dataService.create('Notification', {
        destinataire_id: targetUser.id,
        type: "systeme",
        titre: `Invitation au groupe "${group.nom}"`,
        contenu: `${currentUser.full_name || currentUser.email} vous a ajouté au groupe "${group.nom}".`,
        lue: false
      });
    },
    onSuccess: (_, targetUser) => {
      setInvitedIds(prev => [...prev, targetUser.id]);
      queryClient.invalidateQueries({ queryKey: ['group', group.id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    }
  });

  const getDisplayName = (u) => {
    const composed = [u.prenom, u.nom, u.post_nom].filter(Boolean).join(' ').trim();
    if (composed) return composed;
    const full = u.full_name || '';
    if (full && !full.includes('@') && !full.includes('_') && !full.includes('-') && full.includes(' ')) return full;
    return u.email || 'Utilisateur';
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?';

  // Filtrer: exclure déjà membres, déjà invités, soi-même
  const filteredUsers = allUsers.filter(u => {
    const notMember = !group.members?.includes(u.id);
    const notSelf = u.id !== currentUser.id;
    const matchesSearch = !searchQuery ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return notMember && notSelf && matchesSearch;
  });

  return (
    <DraggableDialog
      open={open}
      onOpenChange={(v) => { onOpenChange(v); if (!v) { setSearchQuery(""); setInvitedIds([]); } }}
      title="Inviter des membres"
      subtitle={`Recherchez et ajoutez des membres au groupe "${group?.nom || ''}"`}
    >
      <DraggableDialogBody>
        {/* Barre de recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }}
          />
        </div>

        {/* Liste des utilisateurs */}
        <div className="max-h-80 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8" style={CG}>
              {searchQuery ? "Aucun utilisateur trouvé" : "Tous les utilisateurs sont déjà membres"}
            </p>
          ) : (
            filteredUsers.map((u) => {
              const alreadyInvited = invitedIds.includes(u.id);
              const isPending = inviterMutation.isPending && inviterMutation.variables?.id === u.id;
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      {u.photo_url ? (
                        <img src={u.photo_url} alt={u.full_name} className="object-cover" />
                      ) : (
                        <AvatarFallback className="bg-blue-600 text-white text-sm">
                          {getInitials(getDisplayName(u))}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium text-white text-sm" style={CG}>{getDisplayName(u)}</p>
                      <p className="text-xs text-gray-400" style={CG}>{u.role_archive || u.role || ''}</p>
                    </div>
                  </div>
                  {alreadyInvited ? (
                    <Badge className="bg-green-600 text-white text-xs" style={CG}>
                      <Check className="w-3 h-3 mr-1" /> Ajouté
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => inviterMutation.mutate(u)}
                      disabled={isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      style={CG}
                    >
                      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3 mr-1" />}
                      Inviter
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DraggableDialogBody>
      <DraggableDialogFooter>
        <Button
          variant="outline"
          onClick={() => { onOpenChange(false); setSearchQuery(""); setInvitedIds([]); }}
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG }}
        >
          Fermer
        </Button>
      </DraggableDialogFooter>
    </DraggableDialog>
  );
}