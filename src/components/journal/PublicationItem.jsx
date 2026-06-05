import React, { useState } from "react";
import { dataService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Send, Loader2, School, Badge as BadgeIcon, Globe, Users, Building, GraduationCap, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatUserName } from "@/components/utils/nameUtils";
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
import ImageLightbox from "./ImageLightbox";
import UserAvatarPopover from "@/components/ui/UserAvatarPopover";
import ProfilModal from "./ProfilModal";
import { useNotifications } from "@/components/notifications/useNotifications";

// Parse JSON string safely into array
function parseLikes(likes) {
  if (Array.isArray(likes)) return likes;
  if (typeof likes === 'string') {
    try { const parsed = JSON.parse(likes); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

export default function PublicationItem({ publication, currentUser }) {
  const currentUserName = formatUserName(currentUser);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showProfilModal, setShowProfilModal] = useState(false);
  const queryClient = useQueryClient();
  const { notifyNewComment } = useNotifications();

  // Parse likes from JSON string to array
  const likesArray = parseLikes(publication.likes);

  // Charger l'utilisateur auteur pour un nom fiable
  const { data: auteurUser } = useQuery({
    queryKey: ['user', publication.auteur_id],
    queryFn: async () => {
      const res = await dataService.query('User', { filters: [{ field: 'id', operator: '=', value: publication.auteur_id }] });
      return res[0];
    },
    enabled: !!publication.auteur_id,
  });

  // Charger les commentaires toujours (pour la lightbox aussi)
  const { data: commentaires = [] } = useQuery({
    queryKey: ['commentaires', publication.id],
    queryFn: () => dataService.query('Commentaire', { filters: [{ field: 'publication_id', operator: '=', value: publication.id }] }),
    staleTime: 0,
  });



  // Utiliser auteur_nom de la publication comme fallback
  const authorDisplayName = auteurUser ? formatUserName(auteurUser) : publication.auteur_nom || 'Utilisateur';

  const likeMutation = useMutation({
    mutationFn: async () => {
      const hasLiked = likesArray.includes(currentUser.id);
      const newLikes = hasLiked
        ? likesArray.filter(id => id !== currentUser.id)
        : [...likesArray, currentUser.id];
      
      return dataService.update('Publication', publication.id, { likes: newLikes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      queryClient.invalidateQueries({ queryKey: ['journal-commun'] });
      queryClient.invalidateQueries({ queryKey: ['profil-publications'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (texte) => {
      await dataService.create('Commentaire', {
        publication_id: publication.id,
        auteur_id: currentUser.id,
        auteur_nom: currentUserName,
        auteur_role: currentUser.role_archive,
        auteur_photo_url: currentUser?.photo_url || null,
        contenu: texte
      });
      await dataService.update('Publication', publication.id, {
        nb_commentaires: (publication.nb_commentaires || 0) + 1
      });
      // Notifier l'auteur de la publication (sauf si c'est son propre commentaire)
      if (currentUser?.id && publication.auteur_id && currentUser.id !== publication.auteur_id) {
        try { await notifyNewComment(publication.auteur_id, currentUser.id, currentUserName, publication.id); } catch(e) { /* silent */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commentaires', publication.id] });
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      queryClient.invalidateQueries({ queryKey: ['journal-commun'] });
      queryClient.invalidateQueries({ queryKey: ['profil-publications'] });
      setCommentText("");
    },
  });

  const deletePublicationMutation = useMutation({
    mutationFn: async () => {
      // Supprimer d'abord tous les commentaires associés
      const allComments = await dataService.query('Commentaire', { filters: [{ field: 'publication_id', operator: '=', value: publication.id }] });
      for (const comment of allComments) {
        await dataService.delete('Commentaire', comment.id);
      }
      
      // Puis supprimer la publication
      await dataService.delete('Publication', publication.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      queryClient.invalidateQueries({ queryKey: ['home-publications'] });
      queryClient.invalidateQueries({ queryKey: ['journal-commun'] });
      queryClient.invalidateQueries({ queryKey: ['profil-publications'] });
      setShowDeleteDialog(false);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      await dataService.delete('Commentaire', commentId);
      await dataService.update('Publication', publication.id, {
        nb_commentaires: Math.max(0, (publication.nb_commentaires || 0) - 1)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commentaires', publication.id] });
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      queryClient.invalidateQueries({ queryKey: ['journal-commun'] });
    },
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleComment = () => {
    if (commentText.trim()) {
      commentMutation.mutate(commentText.trim());
    }
  };

  const handleDeletePublication = () => {
    deletePublicationMutation.mutate();
  };

  const handleDeleteComment = (commentId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce commentaire ?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const isLiked = likesArray.includes(currentUser?.id);
  const isAdminPost = publication.auteur_role === 'admin_systeme' || publication.auteur_role === 'super_admin' || publication.auteur_role === 'admin_etablissement' || publication.auteur_role === 'admin_ministeriel';
  const canDelete = currentUser?.role_archive === 'admin_systeme' || currentUser?.role_archive === 'super_admin' || publication.auteur_id === currentUser?.id;
  const canDeleteComment = (comment) => {
    return currentUser?.role_archive === 'admin_systeme' || currentUser?.role_archive === 'super_admin' || comment.auteur_id === currentUser?.id;
  };

  const getVisibilityIcon = (vis) => {
    const icons = {
      publique: <Globe className="w-3 h-3" />,
      amis: <Users className="w-3 h-3" />,
      etablissement: <Building className="w-3 h-3" />,
      classe: <GraduationCap className="w-3 h-3" />
    };
    return icons[vis] || <Globe className="w-3 h-3" />;
  };

  const getVisibilityLabel = (vis) => {
    const labels = {
      publique: "Public",
      amis: "Amis",
      etablissement: "Établissement",
      classe: "Classe"
    };
    return labels[vis] || "Public";
  };

  const getRoleLabel = (role) => {
    const labels = {
      super_admin: "Super Administrateur",
      admin_systeme: "Administrateur Système",
      admin_ministeriel: "Admin Ministériel",
      admin_etablissement: "Administrateur Établissement",
      professeur: "Professeur",
      etudiant: "Étudiant",
      parent: "Parent"
    };
    return labels[role] || role;
  };

  return (
    <>
      {showProfilModal && (
        <ProfilModal
          open={showProfilModal}
          onClose={() => setShowProfilModal(false)}
          userId={publication.auteur_id}
          auteurNom={authorDisplayName}
          auteurPhotoUrl={publication.auteur_photo_url || publication.auteur_current_photo_url || auteurUser?.photo_url}
          auteurRole={publication.auteur_role}
        />
      )}
      <Card className="shadow-sm hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
        <CardHeader className="border-b" style={{ borderColor: 'var(--ha-border)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <UserAvatarPopover
                name={authorDisplayName}
                role={publication.auteur_role}
                photoUrl={publication.auteur_photo_url || publication.auteur_current_photo_url || auteurUser?.photo_url}
                size="lg"
              />
              <div>
                <div className="flex items-center gap-2">
                  <p
                    className="font-semibold cursor-pointer hover:underline"
                    style={{ color: 'var(--ha-text)' }}
                    onClick={() => setShowProfilModal(true)}
                  >{authorDisplayName}</p>
                  {isAdminPost && (
                    <Badge className={`${publication.auteur_role === 'admin_ministeriel' ? 'bg-yellow-500 text-black' : ''} text-xs`}
                      style={publication.auteur_role !== 'admin_ministeriel' ? { backgroundColor: 'var(--ha-surface3)', color: 'var(--ha-text)' } : {}}>
                      <BadgeIcon className="w-3 h-3 mr-1" />
                      Officiel
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ha-text-muted)' }}>
                  {isAdminPost && <School className="w-4 h-4" />}
                  <span>{getRoleLabel(publication.auteur_role)}</span>
                  <span>•</span>
                  <span>{format(new Date(publication.created_date), 'PPp', { locale: fr })}</span>
                </div>
                {/* Indicateur de visibilité */}
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  {getVisibilityIcon(publication.visibilite)}
                  <span>{getVisibilityLabel(publication.visibilite)}</span>
                </div>
              </div>
            </div>
            
            {/* Bouton supprimer pour admin système ou auteur */}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Contenu */}
          <p className="mb-4 whitespace-pre-wrap" style={{ color: 'var(--ha-text)' }}>{publication.contenu}</p>

          {/* Media */}
          {publication.media_url && (
            <div className="mb-4 rounded-lg overflow-hidden">
              {publication.type_media === "image" ? (
                <img 
                  src={publication.media_url} 
                  alt="Publication" 
                  className="w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    setLightboxIndex(0);
                    setShowLightbox(true);
                  }}
                />
              ) : publication.type_media === "video" ? (
                <video 
                  src={publication.media_url} 
                  controls 
                  className="w-full h-auto"
                />
              ) : null}
            </div>
          )}

          {/* Actions */}
          {currentUser ? (
            <div className="flex items-center gap-4 pt-4 border-t" style={{ borderColor: 'var(--ha-border)' }}>
              <Button
                variant="ghost"
                onClick={handleLike}
                className={`flex items-center gap-2 ${isLiked ? 'text-red-600' : ''} hover:text-red-600`}
                style={isLiked ? {} : { color: 'var(--ha-text-muted)' }}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium">{likesArray.length}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-2 hover:text-blue-600"
                style={{ color: 'var(--ha-text-muted)' }}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="font-medium">{commentaires.length}</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4 pt-4 border-t" style={{ borderColor: 'var(--ha-border)', color: 'var(--ha-text-muted)' }}>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                <span className="font-medium">{likesArray.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <span className="font-medium">{commentaires.length}</span>
              </div>
            </div>
          )}

          {/* Section Commentaires */}
          {showComments && (
            <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: 'var(--ha-border)' }}>
              {/* Liste des commentaires */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {commentaires.map((comment) => {
                  return (
                    <div key={comment.id} className="flex gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--ha-surface2)' }}>
                      <UserAvatarPopover
                        name={comment.auteur_nom}
                        role={comment.auteur_role}
                        photoUrl={comment.auteur_photo_url}
                        size="sm"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm" style={{ color: 'var(--ha-text)' }}>{comment.auteur_nom}</p>
                          <span className="text-xs" style={{ color: 'var(--ha-text-faint)' }}>
                            {format(new Date(comment.created_date), 'PPp', { locale: fr })}
                          </span>
                        </div>
                          {canDeleteComment(comment) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--ha-text-muted)' }}>{comment.contenu}</p>
                      </div>
                    </div>
                  );
                })}
                {commentaires.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Aucun commentaire pour le moment</p>
                )}
              </div>

              {/* Formulaire nouveau commentaire */}
              {currentUser && (
                <div className="flex gap-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Ajouter un commentaire..."
                    className="min-h-[60px] resize-none" style={{ borderColor: 'var(--ha-border)', backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)' }}
                  />
                  <Button
                    onClick={handleComment}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    style={{ backgroundColor: 'var(--ha-accent)', color: '#ffffff' }}
                  >
                    {commentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer cette publication ? Cette action est irréversible et supprimera également tous les commentaires associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 text-gray-700">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePublication}
              disabled={deletePublicationMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletePublicationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lightbox pour les images */}
      {showLightbox && publication.media_url && publication.type_media === "image" && (
        <ImageLightbox
          images={[publication.media_url]}
          currentIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
          onNavigate={setLightboxIndex}
          caption={publication.contenu}
          commentaires={commentaires}
        />
      )}
    </>
  );
}