import React, { useState, useEffect, useRef } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Paperclip,
  Users,
  Settings,
  Loader2,
  ArrowLeft,
  X,
  Image as ImageIcon,
  File,
  Download,
  Smile,
  Check,
  UserPlus,
  UserMinus,
  Shield,
  Info,
  Trash2,
  MoreVertical,
  Copy
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import InviterMembresDialog from "@/components/groupes/InviterMembresDialog";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";

const EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '👍', '👎', '🔥'];

export default function GroupeDetails() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showRequestsDialog, setShowRequestsDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('id');

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [groupId]);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Charger le groupe
  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const groups = await dataService.query('Group', { filters: [{  id: groupId  }],
  limit: 1000, offset: 0 });
      return groups[0];
    },
    enabled: !!groupId && !!user,
    refetchInterval: 5000
  });

  // Charger les données réelles des membres
  const { data: membersData = [] } = useQuery({
    queryKey: ['group-members-data', groupId, group?.members],
    queryFn: async () => {
      if (!group?.members?.length) return [];
      try {
        const allUsers = await dataService.query('User', { filters: [], limit: 500, offset: 0 });
        return allUsers.filter(u => group.members.includes(u.id));
      } catch (e) {
        return [];
      }
    },
    enabled: !!group?.members?.length,
    staleTime: 60000
  });

  const getMemberDisplay = (member) => {
    const realUser = membersData.find(u => u.user_id === member.user_id || u.id === member.user_id);
    if (realUser) {
      const fullName = [realUser.prenom, realUser.post_nom, realUser.nom].filter(Boolean).join(' ').trim()
        || realUser.full_name || member.full_name || member.email || '?';
      return { name: fullName, photo: realUser.photo_url || member.photo_url || null };
    }
    // Fallback: si full_name ressemble à un email, masquer
    const name = member.full_name && !member.full_name.includes('@') ? member.full_name : (member.email?.split('@')[0] || '?');
    return { name, photo: member.photo_url || null };
  };

  // Charger les messages
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: async () => {
      const msgs = await dataService.query('GroupMessage', { filters: [{  group_id: groupId  }],
  limit: 1000, offset: 0 });
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!groupId && !!group,
    refetchInterval: 3000
  });

  // Envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const message = await dataService.create('GroupMessage', messageData);

      let dernierMessageTexte = messageData.contenu;
      if (messageData.type === 'image') dernierMessageTexte = '📷 Image';
      else if (messageData.type === 'fichier') dernierMessageTexte = `📎 ${messageData.media_nom}`;

      await dataService.update('Group', groupId, {
        dernier_message: dernierMessageTexte,
        dernier_message_date: new Date().toISOString(),
        dernier_message_auteur: user.id
      });

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setMessageText("");
      scrollToBottom();
    }
  });

  // Réagir é  un message
  const reactToMessageMutation = useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      const message = messages.find(m => m.id === messageId);
      const reactions = { ...(message.reactions || {}) };

      if (reactions[user.id] === emoji) {
        delete reactions[user.id];
      } else {
        reactions[user.id] = emoji;
      }

      await dataService.update('GroupMessage', messageId, { reactions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages'] });
    }
  });

  // Supprimer un message
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await dataService.delete('GroupMessage', messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages'] });
    }
  });

  // Quitter le groupe
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      const updatedMembers = group.members.filter(id => id !== user.id);
      const updatedMembersDetails = group.members_details.filter(m => m.user_id !== user.id);

      await dataService.update('Group', groupId, {
        members: updatedMembers,
        members_details: updatedMembersDetails
      });
    },
    onSuccess: () => {
      navigate(createPageUrl("Groupes"));
    }
  });

  // Accepter/Rejeter une demande
  const handleJoinRequest = useMutation({
    mutationFn: async ({ requestUserId, accept }) => {
      const updatedRequests = group.demandes_adhesion.filter(req => req.user_id !== requestUserId);
      
      let updates = { demandes_adhesion: updatedRequests };

      if (accept) {
        const request = group.demandes_adhesion.find(req => req.user_id === requestUserId);
        updates.members = [...group.members, requestUserId];
        updates.members_details = [
          ...group.members_details,
          { user_id: requestUserId, full_name: request.full_name, email: "" }
        ];
      }

      await dataService.update('Group', groupId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group'] });
    }
  });

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    await sendMessageMutation.mutateAsync({
      group_id: groupId,
      sender_id: user.id,
      sender_name: [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ').trim() || user.full_name || 'Utilisateur',
      contenu: messageText.trim(),
      type: "texte",
      lu_par: [user.id]
    });
  };

  const handleFileUpload = async (file, type) => {
    if (file.size > 50 * 1024 * 1024) {
      alert("Le fichier est trop volumineux (max 50MB)");
      return;
    }

    setUploading(true);
    try {
      // Read file as base64 data URL
      const fileDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let messageType = type || 'fichier';
      if (file.type.startsWith('image/')) messageType = 'image';

      await sendMessageMutation.mutateAsync({
        group_id: groupId,
        sender_id: user.id,
        sender_name: [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ').trim() || user.full_name || 'Utilisateur',
        contenu: messageText.trim() || "",
        type: messageType,
        media_url: fileDataUrl,
        media_nom: file.name,
        media_taille: file.size,
        lu_par: [user.id]
      });

      // Ajouter aux fichiers partagés
      if (messageType !== 'image') {
        const updatedFiles = [
          ...(group.fichiers_partages || []),
          {
            nom: file.name,
            url: fileDataUrl,
            type: file.type,
            uploaded_by: user.id,
            uploaded_at: new Date().toISOString()
          }
        ];
        await dataService.update('Group', groupId, { fichiers_partages: updatedFiles });
      }

      setMessageText("");
    } catch (error) {
      console.error("Erreur upload:", error);
      alert("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?';
  };

  if (loading || loadingGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Groupe non trouvé</p>
            <Button onClick={() => navigate(createPageUrl("Groupes"))} className="mt-4">
              Retour aux groupes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMember = group.members?.includes(user.id);
  const isAdmin = group.admin_id === user.id;

  if (!isMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Vous n'êtes pas membre de ce groupe</p>
            <Button onClick={() => navigate(createPageUrl("Groupes"))}>
              Retour aux groupes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("Groupes"))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="w-10 h-10 bg-blue-600">
              {group.avatar_url ? (
                <img src={group.avatar_url} alt={group.nom} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-blue-600 text-white">
                  {getInitials(group.nom)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">{group.nom}</h1>
              <p className="text-sm text-gray-600">{group.members?.length || 0} membres</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setShowInviteDialog(true)}
                style={{backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)', borderColor: '#5a5a5a'}}>
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter
              </Button>
            )}
            {isAdmin && group.demandes_adhesion?.length > 0 && (
              <Button
                size="sm"
                onClick={() => setShowRequestsDialog(true)}
                style={{backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)', borderColor: '#5a5a5a'}}>
                <UserPlus className="w-4 h-4 mr-2" />
                {group.demandes_adhesion.length} demande(s)
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowMembersDialog(true)}
              style={{backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)', borderColor: '#5a5a5a'}}>
              <Users className="w-4 h-4 mr-2" />
              Membres
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setShowSettingsDialog(true)}
                style={{backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)', borderColor: '#5a5a5a'}}>
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100">
        {loadingMessages ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Aucun message pour le moment</p>
          </div>
        ) : (
          <>
            {messages.map((message, idx) => {
              const isOwn = message.sender_id === user.id;
              const showAvatar = idx === 0 || messages[idx - 1].sender_id !== message.sender_id;
              // Trouver la photo du sender depuis membersData
              const senderUser = membersData.find(u => u.id === message.sender_id);
              const senderPhoto = senderUser?.photo_url || null;

              return (
                <div
                  key={message.id}
                  className={`flex gap-2 group ${isOwn ? 'justify-end' : 'justify-start'}`}
                  onMouseEnter={() => setHoveredMessage(message.id)}
                  onMouseLeave={() => setHoveredMessage(null)}
                >
                  {!isOwn && showAvatar && (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-gray-500 flex items-center justify-center">
                      {senderPhoto ? (
                        <img src={senderPhoto} alt={message.sender_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-semibold">{getInitials(message.sender_name)}</span>
                      )}
                    </div>
                  )}
                  {!isOwn && !showAvatar && <div className="w-8" />}

                  <div className={`max-w-[70%] flex items-end gap-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="flex-1">
                      {!isOwn && showAvatar && (
                        <p className="text-xs text-gray-600 mb-1 ml-1">{message.sender_name}</p>
                      )}
                      <div className={`rounded-2xl px-3 py-2 ${
                        isOwn ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'
                      }`}>
                        {message.type === "image" && message.media_url && (
                          <img
                            src={message.media_url}
                            alt={message.media_nom}
                            className="max-w-full h-auto rounded-lg max-h-96 cursor-pointer mb-2"
                            onClick={() => window.open(message.media_url, '_blank')}
                          />
                        )}
                        {message.type === "fichier" && message.media_url && (
                          <a
                            href={message.media_url}
                            download
                            className="flex items-center gap-2 mb-2 hover:opacity-80">
                            <File className="w-4 h-4" />
                            <span className="text-sm">{message.media_nom}</span>
                            <Download className="w-4 h-4 ml-auto" />
                          </a>
                        )}
                        {message.contenu && (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.contenu}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                            {format(new Date(message.created_date), 'HH:mm')}
                          </span>
                        </div>
                        {message.reactions && Object.keys(message.reactions).length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {Object.entries(
                              Object.values(message.reactions).reduce((acc, emoji) => {
                                acc[emoji] = (acc[emoji] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([emoji, count]) => (
                              <span key={emoji} className="text-xs bg-white rounded-full px-2 py-0.5">
                                {emoji} {count}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Menu actions message - toujours visible au hover */}
                    <div className={`flex-shrink-0 mb-2 transition-opacity duration-150 ${hoveredMessage === message.id ? 'opacity-100' : 'opacity-0'}`}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1.5 rounded-full bg-gray-200 hover:bg-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="z-50 p-1 min-w-0 w-auto">
                          {message.contenu && (
                            <DropdownMenuItem
                              className="p-1.5 cursor-pointer"
                              title="Copier"
                              onClick={() => navigator.clipboard.writeText(message.contenu)}>
                              <Copy className="w-4 h-4" />
                            </DropdownMenuItem>
                          )}
                          {(isOwn || isAdmin) && (
                            <DropdownMenuItem
                              className="p-1.5 text-red-600 focus:text-red-600 cursor-pointer"
                              title="Supprimer"
                              onClick={() => {
                                if (confirm("Supprimer ce message ?")) {
                                  deleteMessageMutation.mutate(message.id);
                                }
                              }}>
                              <Trash2 className="w-4 h-4" />
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Zone de saisie */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'fichier')}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'image')}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" disabled={uploading} style={{backgroundColor: '#4b5563', color: 'var(--ha-text)', borderColor: '#4b5563'}}>
                <Paperclip className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <File className="w-4 h-4 mr-2" />
                Fichier
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            placeholder="Votre message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
            disabled={uploading}
          />

          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Dialog Membres */}
      <DraggableDialog
        open={showMembersDialog}
        onOpenChange={setShowMembersDialog}
        title={`Membres du groupe (${group.members?.length || 0})`}
        subtitle={`Liste des membres du groupe "${group.nom}"`}
      >
        <DraggableDialogBody>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {group.members_details?.map((member) => {
              const { name, photo } = getMemberDisplay(member);
              return (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 bg-blue-600 overflow-hidden">
                      {photo ? (
                        <img src={photo} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <AvatarFallback className="text-white bg-blue-600">
                          {getInitials(name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium text-white text-sm" style={CG}>{name}</p>
                      {member.user_id === group.admin_id && (
                        <Badge className="text-xs mt-1 bg-blue-600 text-white" style={CG}>
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isAdmin && member.user_id !== group.admin_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" style={{ color: '#aaaaaa' }}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" style={{ backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)' }}>
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-400 focus:bg-red-900/20"
                          style={CG}
                          onClick={async () => {
                            if (confirm(`Expulser ${name} du groupe ?`)) {
                              const updatedMembers = group.members.filter(id => id !== member.user_id);
                              const updatedDetails = group.members_details.filter(m => m.user_id !== member.user_id);
                              await dataService.update('Group', groupId, { members: updatedMembers, members_details: updatedDetails });
                              queryClient.invalidateQueries({ queryKey: ['group'] });
                            }
                          }}>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Expulser
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
          {!isAdmin ? (
            <Button
              onClick={() => {
                if (confirm("Êtes-vous sûr de vouloir quitter ce groupe ?")) {
                  leaveGroupMutation.mutate();
                }
              }}
              style={{ backgroundColor: '#dc2626', color: 'var(--ha-text)', borderColor: '#dc2626', ...CG }}>
              Quitter le groupe
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowMembersDialog(false)}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG }}>
              Fermer
            </Button>
          )}
        </DraggableDialogFooter>
      </DraggableDialog>

      {/* Dialog Invitation */}
      <InviterMembresDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        group={group}
        currentUser={user}
      />

      {/* Dialog Demandes */}
      {isAdmin && (
        <Dialog open={showRequestsDialog} onOpenChange={setShowRequestsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Demandes d'adhésion</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {group.demandes_adhesion?.map((request) => (
                <div key={request.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{request.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(request.date_demande), 'dd/MM/yyyy é  HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleJoinRequest.mutate({ requestUserId: request.user_id, accept: true })}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleJoinRequest.mutate({ requestUserId: request.user_id, accept: false })}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

