import React, { useState, useEffect, useRef } from "react";
import { dataService } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Paperclip,
  Search,
  Plus,
  Loader2,
  X,
  Image as ImageIcon,
  Video,
  Mic,
  MapPin,
  File,
  Download,
  MoreVertical,
  Trash2,
  Reply,
  Forward,
  Smile,
  Check,
  CheckCheck,
  Pin,
  Archive,
  VolumeX,
  Edit3,
  Copy } from
"lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger } from
"@/components/ui/popover";
import { useNotifications } from "@/components/notifications/useNotifications";
import { formatUserName, getInitials } from "@/components/utils/nameUtils";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

const EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '👍', '👎', '🔥'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export default function Messagerie() {
  const { notifyNewMessage } = useNotifications();
  const { user } = useAuth();
  const [_unusedUser, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const queryClient = useQueryClient();
  const recordingInterval = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation]);

  useEffect(() => {
    if (recording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, [recording]);

  const loadUser = () => {
    // User is now provided by useAuth()
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Charger les conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations', user?.id, showArchived],
    queryFn: async () => {
      try {
        const allConvs = await dataService.query('Conversation', { filters: [] });
        return allConvs.filter((conv) => {
          const isParticipant = conv.participants?.includes(user.id);
          const isArchived = conv.archive_par?.includes(user.id);
          return isParticipant && (showArchived ? isArchived : !isArchived);
        });
      } catch (error) {
        console.error("Erreur chargement conversations:", error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: 3000
  });

  // Sync selectedConversation with latest data from conversations list (keeps non_lu, archive_par etc. fresh)
  useEffect(() => {
    if (selectedConversation && conversations.length > 0) {
      const updated = conversations.find((c) => c.id === selectedConversation.id);
      if (updated) setSelectedConversation(updated);
    }
  }, [conversations]);

  // Charger les messages
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: async () => {
      const msgs = await dataService.query('Message', { filters: [{ 
        conversation_id: selectedConversation.id
       }],
  limit: 1000, offset: 0 });
      return msgs.
      filter((msg) => !msg.supprime_pour?.includes(user.id)).
      sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!selectedConversation,
    refetchInterval: 2000
  });

  // Charger les utilisateurs
  const { data: allUsers = [] } = useQuery({
    queryKey: ['messagerie-users', user?.id],
    queryFn: async () => {
      try {
        const users = await dataService.query('User', { limit: 1000 });
        return users.filter((u) => u.id !== user?.id
          && u.role_archive !== 'admin_systeme'
          && u.role_archive !== 'super_admin');
      } catch (error) {
        console.error("Erreur chargement utilisateurs:", error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const message = await dataService.create('Message', messageData);

      const nonLu = { ...selectedConversation.non_lu };
      const otherParticipants = selectedConversation.participants.filter((id) => id !== user.id);

      selectedConversation.participants.forEach((participantId) => {
        if (participantId !== user.id) {
          nonLu[participantId] = (nonLu[participantId] || 0) + 1;
        }
      });

      let dernierMessageTexte = messageData.contenu;
      if (messageData.type === 'image') dernierMessageTexte = '📷 Image';else
      if (messageData.type === 'video') dernierMessageTexte = '🎥 Vidéo';else
      if (messageData.type === 'audio') dernierMessageTexte = '🎤 Message vocal';else
      if (messageData.type === 'fichier') dernierMessageTexte = `📎 ${messageData.media_nom}`;else
      if (messageData.type === 'localisation') dernierMessageTexte = '📍 Position';

      await dataService.update('Conversation', selectedConversation.id, {
        dernier_message: dernierMessageTexte,
        dernier_message_date: new Date().toISOString(),
        dernier_message_auteur: user.id,
        dernier_message_type: messageData.type,
        non_lu: nonLu
      });

      // Notifications pour les autres participants
      await Promise.all(
        otherParticipants.map((participantId) =>
        notifyNewMessage(participantId, user.id, user.full_name, selectedConversation.id)
        )
      );

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageText("");
      setReplyingTo(null);
      scrollToBottom();
    }
  });

  const updateMessageMutation = useMutation({
    mutationFn: async ({ messageId, newContent }) => {
      await dataService.update('Message', messageId, {
        contenu: newContent,
        modifie: true,
        date_modification: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setEditingMessage(null);
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (message) => {
      const suppressedFor = message.supprime_pour || [];
      if (!suppressedFor.includes(user.id)) {
        suppressedFor.push(user.id);
      }
      await dataService.update('Message', message.id, {
        supprime_pour: suppressedFor
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const reactToMessageMutation = useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      const message = messages.find((m) => m.id === messageId);
      const reactions = { ...(message.reactions || {}) };

      if (reactions[user.id] === emoji) {
        delete reactions[user.id];
      } else {
        reactions[user.id] = emoji;
      }

      await dataService.update('Message', messageId, { reactions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const createConversationMutation = useMutation({
    mutationFn: async (targetUser) => {
      const existingConv = conversations.find((conv) =>
      conv.participants.length === 2 &&
      conv.participants.includes(targetUser.id) &&
      conv.participants.includes(user.id)
      );

      if (existingConv) return existingConv;

      return dataService.create('Conversation', {
        participants: [user.id, targetUser.id],
        participants_details: [
        { user_id: user.id, full_name: formatUserName(user), email: user.email },
        { user_id: targetUser.id, full_name: formatUserName(targetUser), email: targetUser.email }],

        non_lu: {}
      });
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversation(conversation);
      setShowNewConversation(false);
    }
  });

  const togglePinMutation = useMutation({
    mutationFn: async (conversation) => {
      const epinglePar = conversation.epingle_par || [];
      const index = epinglePar.indexOf(user.id);

      if (index > -1) {
        epinglePar.splice(index, 1);
      } else {
        epinglePar.push(user.id);
      }

      await dataService.update('Conversation', conversation.id, {
        epingle_par: epinglePar
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: async (conversation) => {
      const archivePar = conversation.archive_par || [];
      const index = archivePar.indexOf(user.id);

      if (index > -1) {
        archivePar.splice(index, 1);
      } else {
        archivePar.push(user.id);
      }

      await dataService.update('Conversation', conversation.id, {
        archive_par: archivePar
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (selectedConversation?.archive_par?.includes(user.id)) {
        setSelectedConversation(null);
      }
    }
  });

  const toggleMuteMutation = useMutation({
    mutationFn: async (conversation) => {
      const muetPar = conversation.muet_par || [];
      const index = muetPar.indexOf(user.id);

      if (index > -1) {
        muetPar.splice(index, 1);
      } else {
        muetPar.push(user.id);
      }

      await dataService.update('Conversation', conversation.id, {
        muet_par: muetPar
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId) => {
      // Supprimer tous les messages de cette conversation pour cet utilisateur
      const msgs = await dataService.query('Message', { filters: [{  conversation_id: conversationId  }],
  limit: 1000, offset: 0 });
      for (const msg of msgs) {
        const suppressedFor = msg.supprime_pour || [];
        if (!suppressedFor.includes(user.id)) {
          suppressedFor.push(user.id);
          await dataService.update('Message', msg.id, { supprime_pour: suppressedFor });
        }
      }
      // Archiver la conversation
      const conv = await dataService.query('Conversation', { filters: [{  id: conversationId  }],
  limit: 1000, offset: 0 });
      if (conv[0]) {
        const archivePar = conv[0].archive_par || [];
        if (!archivePar.includes(user.id)) {
          archivePar.push(user.id);
          await dataService.update('Conversation', conversationId, { archive_par: archivePar });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setSelectedConversation(null);
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (conversation) => {
      const nonLu = { ...conversation.non_lu };
      nonLu[user.id] = 0;

      await dataService.update('Conversation', conversation.id, {
        non_lu: nonLu
      });

      const unreadMessages = messages.filter((msg) =>
      msg.auteur_id !== user.id && !msg.lu_par?.includes(user.id)
      );

      for (const msg of unreadMessages) {
        await dataService.update('Message', msg.id, {
          lu_par: [...(msg.lu_par || []), user.id]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  useEffect(() => {
    if (selectedConversation && !markAsReadMutation.isPending) {
      const unreadCount = selectedConversation.non_lu?.[user?.id] || 0;
      if (unreadCount > 0) {
        markAsReadMutation.mutate(selectedConversation);
      }
    }
  }, [selectedConversation?.id]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    await sendMessageMutation.mutateAsync({
      conversation_id: selectedConversation.id,
      auteur_id: user.id,
      auteur_nom: formatUserName(user),
      contenu: messageText.trim(),
      type: "texte",
      lu_par: [user.id],
      recu_par: [user.id],
      reply_to: replyingTo?.id || null
    });
  };

  const handleFileUpload = async (file, type) => {
    if (file.size > MAX_FILE_SIZE) {
      alert(`Le fichier est trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // File upload: store as data URL for local backend
      const reader = new FileReader();
      const uploadResult = await new Promise((resolve, reject) => {
        reader.onload = () => resolve({ file_url: reader.result });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setUploadProgress(100);

      let messageType = type || 'fichier';
      if (file.type.startsWith('image/')) messageType = 'image';else
      if (file.type.startsWith('video/')) messageType = 'video';else
      if (file.type.startsWith('audio/')) messageType = 'audio';

      await sendMessageMutation.mutateAsync({
        conversation_id: selectedConversation.id,
        auteur_id: user.id,
        auteur_nom: formatUserName(user),
        contenu: messageText.trim() || "",
        type: messageType,
        media_url: uploadResult.file_url,
        media_nom: file.name,
        media_taille: file.size,
        lu_par: [user.id],
        recu_par: [user.id],
        reply_to: replyingTo?.id || null
      });

      setMessageText("");
    } catch (error) {
      console.error("Erreur upload:", error);
      alert("Erreur lors de l'upload du fichier");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        await handleFileUpload(audioFile, 'audio');
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setAudioChunks(chunks);
    } catch (error) {
      console.error("Erreur enregistrement:", error);
      alert("Impossible d'accéder au microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  const sendLocation = async () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      await sendMessageMutation.mutateAsync({
        conversation_id: selectedConversation.id,
        auteur_id: user.id,
        auteur_nom: formatUserName(user),
        contenu: "Position partagée",
        type: "localisation",
        localisation: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          nom: "Ma position"
        },
        lu_par: [user.id],
        recu_par: [user.id]
      });
    }, (error) => {
      console.error("Erreur géolocalisation:", error);
      alert("Impossible d'obtenir votre position");
    });
  };

  const getConversationName = (conversation) => {
    const otherParticipant = conversation.participants_details?.find(
      (p) => p.user_id !== user.id
    );
    return formatUserName({ full_name: otherParticipant?.full_name }) || "Conversation";
  };

  const getOtherUser = (conversation) => {
    const otherUserId = conversation.participants?.find((id) => id !== user.id);
    return allUsers.find((u) => u.id === otherUserId);
  };

  const formatMessageTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    if (isNaN(messageDate.getTime())) return '';
    if (isToday(messageDate)) {
      return format(messageDate, 'HH:mm');
    } else if (isYesterday(messageDate)) {
      return 'Hier';
    } else {
      return format(messageDate, 'dd/MM/yyyy');
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredConversations = conversations.filter((conv) => {
    const name = getConversationName(conv).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  }).sort((a, b) => {
    const aIsPinned = a.epingle_par?.includes(user.id);
    const bIsPinned = b.epingle_par?.includes(user.id);

    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;

    return new Date(b.dernier_message_date || 0) - new Date(a.dernier_message_date || 0);
  });

  const myAmis = typeof user?.amis === 'string' ? JSON.parse(user.amis || '[]') : (user?.amis || []);
  const isAdmin = user?.role_archive === 'admin_systeme' || user?.role_archive === 'super_admin' || user?.role_archive === 'harchive_officiel';

  const filteredUsers = allUsers.filter((u) => {
    const isHarchiveOfficielAccount = u.id === 'harchive-officiel-001';
    if (!isAdmin && !isHarchiveOfficielAccount && !myAmis.includes(u.id)) return false;
    const search = searchQuery.toLowerCase();
    const fullName = (formatUserName(u) || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return !search || fullName.includes(search) || email.includes(search);
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-[var(--ha-text-faint)] animate-spin" />
      </div>);

  }

  return (
    <div className="h-screen bg-[var(--ha-bg)] flex flex-col">
      {/* Header moderne */}
      <div className="bg-[var(--ha-surface2)] px-6 py-4 border-b border-[var(--ha-border)] shadow-lg">
        <div className="w-full min-w-[1100px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Send className="w-5 h-5 text-[var(--ha-text)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--ha-text)]">Messagerie</h1>
              <p className="text-xs text-[var(--ha-text-faint)]">Restez connecté avec vos amis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className={showArchived ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30" : "text-[var(--ha-text-muted)] hover:bg-[var(--ha-surface2)] hover:text-[var(--ha-text)]"}>
              <Archive className="w-4 h-4 mr-2" />
              {showArchived ? "Actives" : "Archivées"}
            </Button>
            <Button
              onClick={() => setShowNewConversation(true)}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-[var(--ha-text)] shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle conversation
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden">
        <div className="w-full min-w-[1100px] mx-auto h-full flex">
          {/* Liste conversations - Design moderne */}
          <div className="w-full md:w-96 bg-[var(--ha-surface)] border-r border-[var(--ha-border)] flex flex-col">
            <div className="bg-[var(--ha-surface)] p-4 border-b border-[var(--ha-border)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Rechercher une conversation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[var(--ha-bg)] border-[var(--ha-border)] text-[var(--ha-text)] placeholder:text-[var(--ha-text-faint)] focus:border-blue-500" />
              </div>
            </div>

            <div className="bg-[var(--ha-surface2)] flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--ha-surface3)] scrollbar-track-transparent">
              {loadingConversations ?
              <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                </div> :
              filteredConversations.length === 0 ?
              <div className="text-center py-12 px-4">
                  <Send className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">Aucune conversation</p>
                  <p className="text-xs text-gray-600 mt-1">Créez une nouvelle conversation pour commencer</p>
                </div> :

              filteredConversations.map((conv) => {
                const unreadCount = conv.non_lu?.[user.id] || 0;
                const isActive = selectedConversation?.id === conv.id;
                const isPinned = conv.epingle_par?.includes(user.id);
                const isMuted = conv.muet_par?.includes(user.id);

                return (
                  <div
                    key={conv.id}
                    className={`relative group transition-all duration-200 ${
                    isActive ? 'bg-[var(--ha-surface2)] border-l-4 border-blue-500' : 'hover:bg-[var(--ha-surface2)]/50 border-l-4 border-transparent'}`
                    }>

                      <button
                      onClick={() => setSelectedConversation(conv)} className="p-4 text-left w-full">


                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 ring-2 ring-[var(--ha-border)]">
                              {(() => {
                              const otherUser = getOtherUser(conv);
                              return otherUser?.photo_url ?
                              <img src={otherUser.photo_url} alt={getConversationName(conv)} className="w-full h-full object-cover rounded-full" /> :

                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-[var(--ha-text)] font-semibold rounded-full flex h-full w-full items-center justify-center text-lg">
                                    {getInitials(getConversationName(conv))}
                                  </AvatarFallback>;

                            })()}
                            </Avatar>
                            {isPinned &&
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <Pin className="w-3 h-3 text-[var(--ha-text)]" />
                              </div>
                          }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-[var(--ha-text)] truncate text-base">
                                {getConversationName(conv)}
                              </p>
                              <div className="flex items-center gap-1.5">
                                {isMuted && <VolumeX className="w-3.5 h-3.5 text-gray-500" />}
                                {conv.dernier_message_date &&
                              <span className="text-xs text-gray-500">
                                    {formatMessageTime(conv.dernier_message_date)}
                                  </span>
                              }
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate flex-1 ${unreadCount > 0 ? 'text-[var(--ha-text-muted)] font-medium' : 'text-gray-500'}`}>
                                {conv.dernier_message_type === 'image' && '📷 '}
                                {conv.dernier_message_type === 'video' && '🎥 '}
                                {conv.dernier_message_type === 'audio' && '🎤 '}
                                {conv.dernier_message_type === 'fichier' && '📎 '}
                                {conv.dernier_message_type === 'localisation' && '📍 '}
                                {conv.dernier_message || "Aucun message"}
                              </p>
                              {unreadCount > 0 &&
                            <Badge className="bg-blue-500 text-[var(--ha-text)] ml-2 rounded-full px-2 py-0.5 text-xs font-bold">
                                  {unreadCount}
                                </Badge>
                            }
                            </div>
                          </div>
                        </div>
                      </button>
                      
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 bg-[var(--ha-surface)] hover:bg-[var(--ha-surface2)] text-[var(--ha-text-muted)]">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[var(--ha-surface)] border-[var(--ha-border)] text-[var(--ha-text)]">
                            <DropdownMenuItem onClick={() => togglePinMutation.mutate(conv)} className="hover:bg-[var(--ha-surface2)] focus:bg-[var(--ha-surface2)]">
                              <Pin className="w-4 h-4 mr-2" />
                              {isPinned ? 'Désépingler' : 'Épingler'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleMuteMutation.mutate(conv)} className="hover:bg-[var(--ha-surface2)] focus:bg-[var(--ha-surface2)]">
                              <VolumeX className="w-4 h-4 mr-2" />
                              {isMuted ? 'Réactiver les notifications' : 'Masquer les notifications'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleArchiveMutation.mutate(conv)} className="hover:bg-[var(--ha-surface2)] focus:bg-[var(--ha-surface2)]">
                              <Archive className="w-4 h-4 mr-2" />
                              {conv.archive_par?.includes(user.id) ? 'Désarchiver' : 'Archiver'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[var(--ha-border)]" />
                            <DropdownMenuItem
                            onClick={() => {
                              if (confirm('Êtes-vous sûr de vouloir supprimer cette conversation ? Tous les messages seront supprimés.')) {
                                deleteConversationMutation.mutate(conv.id);
                              }
                            }}
                            className="hover:bg-red-600/20 focus:bg-red-600/20 text-red-400">

                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer la conversation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>);

              })
              }
            </div>
          </div>

          {/* Zone messages - Design moderne */}
          <div className="flex-1 bg-[var(--ha-bg)] flex flex-col">
            {selectedConversation ?
            <>
                {/* En-tête conversation moderne */}
                <div className="p-4 border-b border-[var(--ha-border)] bg-[var(--ha-surface)] shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-[var(--ha-border)]">
                        {(() => {
                        const otherUser = getOtherUser(selectedConversation);
                        return otherUser?.photo_url ?
                        <img src={otherUser.photo_url} alt={getConversationName(selectedConversation)} className="w-full h-full object-cover rounded-full" /> :

                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-[var(--ha-text)] font-semibold rounded-full flex h-full w-full items-center justify-center text-lg">
                              {getInitials(getConversationName(selectedConversation))}
                            </AvatarFallback>;

                      })()}
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-[var(--ha-text)] text-lg">
                          {getConversationName(selectedConversation)}
                        </h3>
                        <p className="text-xs text-gray-500">En ligne</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-[var(--ha-text-faint)] hover:text-[var(--ha-text)] hover:bg-[var(--ha-surface2)]">
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[var(--ha-surface)] border-[var(--ha-border)] text-[var(--ha-text)]">
                        <DropdownMenuItem onClick={() => togglePinMutation.mutate(selectedConversation)} className="hover:bg-[var(--ha-surface2)]">
                          <Pin className="w-4 h-4 mr-2" />
                          {selectedConversation.epingle_par?.includes(user.id) ? 'Désépingler' : 'Épingler'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleMuteMutation.mutate(selectedConversation)} className="hover:bg-[var(--ha-surface2)]">
                          <VolumeX className="w-4 h-4 mr-2" />
                          {selectedConversation.muet_par?.includes(user.id) ? 'Réactiver' : 'Masquer'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleArchiveMutation.mutate(selectedConversation)} className="hover:bg-[var(--ha-surface2)]">
                          <Archive className="w-4 h-4 mr-2" />
                          Archiver
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[var(--ha-border)]" />
                        <DropdownMenuItem
                        onClick={() => {
                          if (confirm('Supprimer cette conversation ?')) {
                            deleteConversationMutation.mutate(selectedConversation.id);
                          }
                        }}
                        className="hover:bg-red-600/20 text-red-400">

                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages avec fond amélioré */}
                <div className="bg-[var(--ha-bg)] p-6 flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-[var(--ha-surface3)] scrollbar-track-transparent">
                  {loadingMessages ?
                <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-[var(--ha-text-faint)] animate-spin" />
                    </div> :
                messages.length === 0 ?
                <div className="text-center py-12">
                      <p className="text-gray-600">Aucun message</p>
                    </div> :

                <>
                      {messages.map((message, idx) => {
                    const isOwn = message.auteur_id === user.id;
                    const showAvatar = idx === 0 || messages[idx - 1].auteur_id !== message.auteur_id;
                    const isReadByOthers = message.lu_par && message.lu_par.length > 1;
                    const replyToMessage = message.reply_to ? messages.find((m) => m.id === message.reply_to) : null;

                    return (
                      <div
                        key={message.id}
                        className={`flex group ${isOwn ? 'justify-end' : 'justify-start'}`}>

                            {!isOwn && showAvatar &&
                        <Avatar className="w-8 h-8 bg-gray-600 mr-2">
                                {(() => {
                            const messageAuthor = allUsers.find((u) => u.id === message.auteur_id);
                            return messageAuthor?.photo_url ?
                            <img src={messageAuthor.photo_url} alt={message.auteur_nom} className="w-full h-full object-cover rounded-full" /> :

                            <AvatarFallback className="text-[var(--ha-text)] text-xs">
                                      {getInitials(formatUserName({ full_name: message.auteur_nom }))}
                                    </AvatarFallback>;

                          })()}
                              </Avatar>
                        }
                            {!isOwn && !showAvatar && <div className="w-8 mr-2" />}
                            
                            <div className="max-w-[70%]">
                              <div className={`relative rounded-2xl px-3 py-2 ${
                          isOwn ? 'bg-blue-600 text-[var(--ha-text)]' : 'bg-gray-100 text-gray-800'}`
                          }>
                                {replyToMessage &&
                            <div className={`mb-2 p-2 rounded-lg border-l-2 text-xs ${
                            isOwn ? 'bg-blue-500 border-blue-300' : 'bg-gray-200 border-gray-400'}`
                            }>
                                    <p className="font-semibold">{replyToMessage.auteur_nom}</p>
                                    <p className="truncate opacity-80">{replyToMessage.contenu?.substring(0, 50)}</p>
                                  </div>
                            }

                                {message.type === "image" && message.media_url &&
                            <img
                              src={message.media_url}
                              alt={message.media_nom}
                              className="max-w-full h-auto rounded-lg max-h-96 cursor-pointer mb-2"
                              onClick={() => window.open(message.media_url, '_blank')} />

                            }

                                {message.type === "video" && message.media_url &&
                            <video
                              controls
                              src={message.media_url}
                              className="max-w-full h-auto rounded-lg max-h-96 mb-2" />

                            }

                                {message.type === "audio" && message.media_url &&
                            <div className="flex items-center gap-2 mb-2">
                                    <Mic className="w-4 h-4" />
                                    <audio controls src={message.media_url} className="h-8" />
                                  </div>
                            }

                                {message.type === "fichier" && message.media_url &&
                            <a
                              href={message.media_url}
                              download
                              className="flex items-center gap-2 mb-2 hover:opacity-80">

                                    <File className="w-4 h-4" />
                                    <span className="text-sm">{message.media_nom}</span>
                                    <Download className="w-4 h-4 ml-auto" />
                                  </a>
                            }

                                {message.type === "localisation" && message.localisation &&
                            <a
                              href={`https://www.google.com/maps?q=${message.localisation.latitude},${message.localisation.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:opacity-80">

                                    <MapPin className="w-4 h-4" />
                                    <span className="text-sm">Voir sur la carte</span>
                                  </a>
                            }

                                {message.contenu &&
                            <p className="text-sm whitespace-pre-wrap break-words">
                                    {message.contenu}
                                    {message.modifie && <span className="text-xs opacity-70 ml-2">(modifié)</span>}
                                  </p>
                            }

                                <div className="flex items-center gap-1 mt-1">
                                  <span className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                                    {message.created_date ? format(new Date(message.created_date), 'HH:mm') : ''}
                                  </span>
                                  {isOwn &&
                              <span className={isReadByOthers ? 'text-blue-200' : 'text-blue-300'}>
                                      {isReadByOthers ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                    </span>
                              }
                                </div>

                                {/* Réactions */}
                                {message.reactions && Object.keys(message.reactions).length > 0 &&
                            <div className="flex gap-1 mt-1 flex-wrap">
                                    {Object.entries(Object.values(message.reactions).reduce((acc, emoji) => {
                                acc[emoji] = (acc[emoji] || 0) + 1;
                                return acc;
                              }, {})).map(([emoji, count]) =>
                              <span key={emoji} className="text-xs bg-white rounded-full px-2 py-0.5">
                                        {emoji} {count}
                                      </span>
                              )}
                                  </div>
                            }

                                {/* Menu message */}
                                <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-0 opacity-0 group-hover:opacity-100`}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => setReplyingTo(message)}>
                                        <Reply className="w-4 h-4 mr-2" />
                                        Répondre
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                    setMessageToForward(message);
                                    setShowForwardDialog(true);
                                  }}>
                                        <Forward className="w-4 h-4 mr-2" />
                                        Transférer
                                      </DropdownMenuItem>
                                      {message.type === 'texte' &&
                                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.contenu)}>
                                          <Copy className="w-4 h-4 mr-2" />
                                          Copier
                                        </DropdownMenuItem>
                                  }
                                      {isOwn && message.type === 'texte' &&
                                  <DropdownMenuItem onClick={() => { setEditingMessage(message); setMessageText(message.contenu || ''); }}>
                                          <Edit3 className="w-4 h-4 mr-2" />
                                          Modifier
                                        </DropdownMenuItem>
                                  }
                                      <DropdownMenuSeparator />
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Smile className="w-4 h-4 mr-2" />
                                            Réagir
                                          </DropdownMenuItem>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-2">
                                          <div className="flex gap-1">
                                            {EMOJIS.map((emoji) =>
                                        <button
                                          key={emoji}
                                          onClick={() => reactToMessageMutation.mutate({ messageId: message.id, emoji })}
                                          className="text-2xl hover:scale-125 transition-transform">

                                                {emoji}
                                              </button>
                                        )}
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                    onClick={() => deleteMessageMutation.mutate(message)}
                                    className="text-red-600">

                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          </div>);

                  })}
                      <div ref={messagesEndRef} />
                    </>
                }
                </div>

                {/* Zone saisie moderne */}
                <div className="p-4 border-t border-[var(--ha-border)] bg-[var(--ha-surface)]">
                  {replyingTo &&
                <div className="mb-3 flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                      <Reply className="w-4 h-4 text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-blue-300">{replyingTo.auteur_nom}</p>
                        <p className="text-xs text-[var(--ha-text-faint)] truncate">{replyingTo.contenu?.substring(0, 50)}</p>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="hover:bg-[var(--ha-surface2)] rounded p-1">
                        <X className="w-4 h-4 text-[var(--ha-text-faint)]" />
                      </button>
                    </div>
                }

                  {editingMessage &&
                <div className="mb-2 flex items-center gap-2 bg-blue-50 rounded-lg p-2">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        updateMessageMutation.mutate({
                          messageId: editingMessage.id,
                          newContent: messageText
                        });
                      }
                    }}
                    className="flex-1" />

                      <button onClick={() => {
                    setEditingMessage(null);
                    setMessageText("");
                  }}>
                        <X className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                }

                  {uploading &&
                <div className="mb-2 bg-blue-50 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <div className="flex-1 bg-white rounded-full h-2">
                          <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }} />

                        </div>
                        <span className="text-xs text-blue-600">{uploadProgress}%</span>
                      </div>
                    </div>
                }

                  {recording &&
                <div className="mb-2 bg-red-50 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                      <span className="text-red-600 font-semibold">{formatRecordingTime(recordingTime)}</span>
                      <Button
                    onClick={stopRecording}
                    className="ml-auto bg-red-600 hover:bg-red-700"
                    size="sm">

                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                }

                  <div className="flex gap-2">
                    <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} />

                    <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'image')} />

                    <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'video')} />

                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-[var(--ha-surface2)] border-[var(--ha-border)] hover:bg-[var(--ha-surface2)] text-[var(--ha-text-faint)]">
                          <Plus className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[var(--ha-surface)] border-[var(--ha-border)] text-[var(--ha-text)]">
                        <DropdownMenuItem onClick={() => imageInputRef.current?.click()} className="hover:bg-[var(--ha-surface2)]">
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Image
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => videoInputRef.current?.click()} className="hover:bg-[var(--ha-surface2)]">
                          <Video className="w-4 h-4 mr-2" />
                          Vidéo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="hover:bg-[var(--ha-surface2)]">
                          <Paperclip className="w-4 h-4 mr-2" />
                          Fichier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={sendLocation} className="hover:bg-[var(--ha-surface2)]">
                          <MapPin className="w-4 h-4 mr-2" />
                          Position
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Input
                    placeholder="Écrivez votre message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (editingMessage) {
                          updateMessageMutation.mutate({
                            messageId: editingMessage.id,
                            newContent: messageText
                          });
                        } else {
                          handleSendMessage();
                        }
                      }
                    }}
                    className="flex-1 bg-[var(--ha-surface2)] border-[var(--ha-border)] text-[var(--ha-text)] placeholder:text-[var(--ha-text-faint)] focus:border-blue-500"
                    disabled={uploading || recording} />


                    {!recording &&
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={startRecording}
                    disabled={uploading}
                    className="bg-[var(--ha-surface2)] border-[var(--ha-border)] hover:bg-[var(--ha-surface2)] text-[var(--ha-text-faint)]">
                        <Mic className="w-5 h-5" />
                      </Button>
                  }

                    <Button
                    onClick={editingMessage ? () => updateMessageMutation.mutate({
                      messageId: editingMessage.id,
                      newContent: messageText
                    }) : handleSendMessage}
                    disabled={!messageText.trim() || uploading || recording}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-[var(--ha-text)] shadow-lg">

                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </> :

            <div className="flex-1 flex items-center justify-center bg-[var(--ha-bg)]">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Send className="w-12 h-12 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--ha-text)] mb-3">
                    Aucune conversation sélectionnée
                  </h3>
                  <p className="text-[var(--ha-text-faint)] mb-6">
                    Choisissez une conversation dans la liste ou créez-en une nouvelle pour commencer a discuter
                  </p>
                  <Button
                  onClick={() => setShowNewConversation(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-[var(--ha-text)] shadow-lg">

                    <Plus className="w-5 h-5 mr-2" />
                    Nouvelle conversation
                  </Button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      {/* Dialog nouvelle conversation */}
      <DraggableDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        title="Nouvelle Conversation"
        subtitle={(user?.role_archive === 'admin_systeme' || user?.role_archive === 'super_admin') ?
          'Sélectionnez un utilisateur pour démarrer' :
          'Sélectionnez un ami pour démarrer une conversation'}>
        <DraggableDialogBody className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-col flex-1 min-h-0 py-4">
            <div className="relative mb-4 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--ha-text-faint)]" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                style={{backgroundColor:'var(--ha-surface)',color:'var(--ha-text)',borderColor:'var(--ha-border)',...CG}} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {filteredUsers.map((targetUser) =>
              <button
                key={targetUser.id}
                onClick={() => createConversationMutation.mutate(targetUser)}
                className="w-full p-3 hover:bg-gray-50 rounded-lg border flex items-center gap-3">
                  <Avatar className="w-10 h-10 bg-blue-600">
                    {targetUser.photo_url ?
                  <img src={targetUser.photo_url} alt={formatUserName(targetUser)} className="w-full h-full object-cover rounded-full" /> :
                  <AvatarFallback className="text-[var(--ha-text)]">
                        {getInitials(formatUserName(targetUser))}
                      </AvatarFallback>
                  }
                  </Avatar>
                  <div className="text-left flex-1">
                    <p className="font-semibold" style={CG}>{formatUserName(targetUser)}</p>
                    <p className="text-sm text-gray-600" style={CG}>{targetUser.email}</p>
                  </div>
                </button>
              )}
              {filteredUsers.length === 0 &&
              <p className="text-center text-gray-600 py-8" style={CG}>
                {(user?.role_archive === 'admin_systeme' || user?.role_archive === 'super_admin') ?
                'Aucun utilisateur trouvé' :
                'Aucun ami trouvé. Ajoutez des amis pour démarrer une conversation.'}
              </p>
              }
            </div>
          </div>
        </DraggableDialogBody>
      </DraggableDialog>

      {/* Dialog transfert */}
      <DraggableDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        title="Transférer le message">
        <DraggableDialogBody>
          <div className="py-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredUsers.map((targetUser) =>
              <button
                key={targetUser.id}
                onClick={async () => {
                  let targetConv = conversations.find((conv) =>
                  conv.participants.length === 2 &&
                  conv.participants.includes(targetUser.id)
                  );

                  if (!targetConv) {
                    targetConv = await dataService.create('Conversation', {
                      participants: [user.id, targetUser.id],
                      participants_details: [
                      { user_id: user.id, full_name: formatUserName(user), email: user.email },
                      { user_id: targetUser.id, full_name: formatUserName(targetUser), email: targetUser.email }],

                      non_lu: {}
                    });
                  }

                  await dataService.create('Message', {
                    conversation_id: targetConv.id,
                    auteur_id: user.id,
                    auteur_nom: formatUserName(user),
                    contenu: messageToForward.contenu,
                    type: messageToForward.type,
                    media_url: messageToForward.media_url,
                    media_nom: messageToForward.media_nom,
                    forward_from: messageToForward.id,
                    lu_par: [user.id],
                    recu_par: [user.id]
                  });

                  queryClient.invalidateQueries({ queryKey: ['conversations'] });
                  setShowForwardDialog(false);
                  setMessageToForward(null);
                }}
                className="w-full p-3 hover:bg-gray-50 rounded-lg border flex items-center gap-3">
                  <Avatar className="w-10 h-10 bg-blue-600">
                    {targetUser.photo_url ?
                  <img src={targetUser.photo_url} alt={formatUserName(targetUser)} className="w-full h-full object-cover rounded-full" /> :
                  <AvatarFallback className="text-[var(--ha-text)]">
                        {getInitials(formatUserName(targetUser))}
                      </AvatarFallback>
                  }
                  </Avatar>
                  <p className="font-semibold" style={CG}>{formatUserName(targetUser)}</p>
                </button>
              )}
            </div>
          </div>
        </DraggableDialogBody>
      </DraggableDialog>
    </div>);

}

