// @ts-nocheck
import React, { useState } from "react";
import { dataService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart, MessageCircle, Share2, Trash2, EyeOff, Eye, MoreHorizontal,
  Send, Loader2, Link2, Check, Pin, PinOff, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatUserName } from "@/components/utils/nameUtils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ImageLightbox from "./ImageLightbox";
import { useNotifications } from "@/components/notifications/useNotifications";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

function parseLikes(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilPublicationItem({ pub, currentUser, isProfileOwner, profileUserId }) {
  const queryClient = useQueryClient();
  const { notifyNewComment } = useNotifications();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const likesArray = parseLikes(pub.likes);
  const isLiked = !!currentUser && likesArray.includes(currentUser.id);
  const isOwnPost = currentUser?.id === pub.auteur_id;
  const canDelete = isProfileOwner || isOwnPost || currentUser?.role_archive === 'admin_systeme' || currentUser?.role_archive === 'super_admin';
  const canMask = isProfileOwner && !isOwnPost; // owner can mask others' posts on their profile
  const isHidden = pub.masque === 1 || pub.masque === true;
  const isPinned = pub.epingle === 1 || pub.epingle === true;

  // Load comments
  const { data: commentaires = [], isLoading: loadingComments } = useQuery({
    queryKey: ["commentaires-profil", pub.id],
    queryFn: () => dataService.query("Commentaire", {
      filters: [{ field: "publication_id", operator: "=", value: pub.id }],
    }),
    enabled: showComments,
    staleTime: 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["profil-publications"] });
    queryClient.invalidateQueries({ queryKey: ["publications"] });
    queryClient.invalidateQueries({ queryKey: ["journal-commun"] });
  };

  // Like
  const likeMutation = useMutation({
    mutationFn: async () => {
      const newLikes = isLiked
        ? likesArray.filter(id => id !== currentUser.id)
        : [...likesArray, currentUser.id];
      return dataService.update("Publication", pub.id, { likes: newLikes });
    },
    onSuccess: invalidate,
  });

  // Comment
  const commentMutation = useMutation({
    mutationFn: async (texte) => {
      await dataService.create("Commentaire", {
        publication_id: pub.id,
        auteur_id: currentUser.id,
        auteur_nom: formatUserName(currentUser),
        auteur_role: currentUser.role_archive,
        auteur_photo_url: currentUser?.photo_url || null,
        contenu: texte,
      });
      await dataService.update("Publication", pub.id, {
        nb_commentaires: (pub.nb_commentaires || 0) + 1,
      });
      // Notifier l'auteur de la publication (sauf si c'est son propre commentaire)
      if (currentUser?.id && pub.auteur_id && currentUser.id !== pub.auteur_id) {
        try { await notifyNewComment(pub.auteur_id, currentUser.id, formatUserName(currentUser), pub.id); } catch(e) { /* silent */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commentaires-profil", pub.id] });
      invalidate();
      setCommentText("");
    },
  });

  // Delete comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      await dataService.delete("Commentaire", commentId);
      await dataService.update("Publication", pub.id, {
        nb_commentaires: Math.max(0, (pub.nb_commentaires || 0) - 1),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commentaires-profil", pub.id] });
      invalidate();
    },
  });

  // Delete publication
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const allComments = await dataService.query("Commentaire", {
        filters: [{ field: "publication_id", operator: "=", value: pub.id }],
      });
      for (const c of allComments) await dataService.delete("Commentaire", c.id);
      await dataService.delete("Publication", pub.id);
    },
    onSuccess: () => {
      invalidate();
      setShowDeleteDialog(false);
    },
  });

  // Toggle mask (owner hides/shows a post on their profile)
  const maskMutation = useMutation({
    mutationFn: () => dataService.update("Publication", pub.id, { masque: isHidden ? 0 : 1 }),
    onSuccess: invalidate,
  });

  // Toggle pin
  const pinMutation = useMutation({
    mutationFn: () => dataService.update("Publication", pub.id, { epingle: isPinned ? 0 : 1 }),
    onSuccess: invalidate,
  });

  // Share — copy link to clipboard
  const handleShare = () => {
    const url = `${window.location.origin}/profil?userId=${pub.cible_profil_id || pub.auteur_id}&pub=${pub.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // fallback: select a temporary input
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setShowMenu(false);
  };

  const authorName = pub.auteur_nom || "Utilisateur";
  const authorPhoto = pub.auteur_photo_url;

  // If hidden and viewer is not the owner, don't render
  if (isHidden && !isProfileOwner) return null;

  return (
    <>
      <div
        style={{
          background: isHidden ? "rgba(38,38,38,0.5)" : "#262626",
          border: `1px solid ${isPinned ? "#ca8a04" : "#404040"}`,
          borderRadius: 12,
          padding: "16px",
          opacity: isHidden ? 0.6 : 1,
          ...CG,
        }}
      >
        {/* Pinned indicator */}
        {isPinned && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "#ca8a04", fontSize: "0.72rem", fontWeight: 600 }}>
            <Pin style={{ width: 12, height: 12 }} />
            Publication épinglée
          </div>
        )}

        {/* Hidden indicator (owner only) */}
        {isHidden && isProfileOwner && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "#888", fontSize: "0.72rem", fontStyle: "italic" }}>
            <EyeOff style={{ width: 12, height: 12 }} />
            Publication masquée — visible uniquement par vous
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {authorPhoto ? (
              <img src={authorPhoto} alt={authorName} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#555", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: "bold", flexShrink: 0 }}>
                {getInitials(authorName)}
              </div>
            )}
            <div>
              <p style={{ color: "#fff", fontWeight: 600, fontSize: "0.88rem" }}>{authorName}</p>
              <p style={{ color: "#888", fontSize: "0.72rem" }}>
                {format(new Date(pub.created_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </div>
          </div>

          {/* Menu actions */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: "#888", cursor: "pointer" }}
            >
              <MoreHorizontal style={{ width: 18, height: 18 }} />
            </button>
            {showMenu && (
              <div
                style={{ position: "absolute", right: 0, top: 36, background: "#1a1a1a", border: "1px solid #404040", borderRadius: 10, zIndex: 50, minWidth: 170, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", overflow: "hidden" }}
                onMouseLeave={() => setShowMenu(false)}
              >
                {/* Share */}
                <button onClick={handleShare} style={menuItemStyle}>
                  {copied ? <Check style={{ width: 14, height: 14, color: "#4ade80" }} /> : <Share2 style={{ width: 14, height: 14 }} />}
                  {copied ? "Lien copié !" : "Partager le lien"}
                </button>

                {/* Pin (owner only) */}
                {isProfileOwner && (
                  <button onClick={() => { pinMutation.mutate(); setShowMenu(false); }} style={menuItemStyle}>
                    {isPinned ? <PinOff style={{ width: 14, height: 14 }} /> : <Pin style={{ width: 14, height: 14 }} />}
                    {isPinned ? "Désépingler" : "Épingler"}
                  </button>
                )}

                {/* Mask (owner hides others' posts on their profile) */}
                {(canMask || (isProfileOwner && !isOwnPost)) && (
                  <button onClick={() => { maskMutation.mutate(); setShowMenu(false); }} style={menuItemStyle}>
                    {isHidden ? <Eye style={{ width: 14, height: 14 }} /> : <EyeOff style={{ width: 14, height: 14 }} />}
                    {isHidden ? "Afficher" : "Masquer"}
                  </button>
                )}
                {/* Owner can also mask own posts */}
                {isProfileOwner && isOwnPost && (
                  <button onClick={() => { maskMutation.mutate(); setShowMenu(false); }} style={menuItemStyle}>
                    {isHidden ? <Eye style={{ width: 14, height: 14 }} /> : <EyeOff style={{ width: 14, height: 14 }} />}
                    {isHidden ? "Afficher" : "Masquer"}
                  </button>
                )}

                {/* Delete */}
                {canDelete && (
                  <button onClick={() => { setShowDeleteDialog(true); setShowMenu(false); }} style={{ ...menuItemStyle, color: "#ef4444" }}>
                    <Trash2 style={{ width: 14, height: 14 }} />
                    Supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {pub.contenu && (
          <p style={{ color: "#e0e0e0", fontSize: "0.88rem", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: pub.media_url ? 10 : 0 }}>
            {pub.contenu}
          </p>
        )}

        {/* Media */}
        {pub.media_url && (pub.type_media === "image" || pub.type_media === "photo") && (
          <img
            src={pub.media_url}
            alt="Publication"
            onClick={() => setShowLightbox(true)}
            style={{ width: "100%", height: "auto", borderRadius: 8, marginTop: 10, cursor: "pointer", display: "block" }}
          />
        )}
        {pub.media_url && pub.type_media === "video" && (
          <video src={pub.media_url} controls style={{ width: "100%", borderRadius: 8, marginTop: 10 }} />
        )}

        {/* Stats bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid #404040" }}>
          <div style={{ display: "flex", gap: 16 }}>
            {/* Like */}
            <button
              onClick={() => currentUser && likeMutation.mutate()}
              disabled={!currentUser || likeMutation.isPending}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: currentUser ? "pointer" : "default", color: isLiked ? "#ef4444" : "#888", fontSize: "0.8rem", transition: "color 0.15s" }}
            >
              <Heart style={{ width: 16, height: 16, fill: isLiked ? "#ef4444" : "none" }} />
              <span>{likesArray.length > 0 ? likesArray.length : ""} {likesArray.length === 1 ? "J'aime" : "J'aime"}</span>
            </button>

            {/* Comment toggle */}
            <button
              onClick={() => setShowComments(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: showComments ? "#60a5fa" : "#888", fontSize: "0.8rem" }}
            >
              <MessageCircle style={{ width: 16, height: 16 }} />
              <span>{pub.nb_commentaires || 0} Commentaire{(pub.nb_commentaires || 0) !== 1 ? "s" : ""}</span>
            </button>
          </div>

          {/* Share shortcut */}
          <button
            onClick={handleShare}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: copied ? "#4ade80" : "#888", fontSize: "0.8rem" }}
          >
            {copied ? <Check style={{ width: 15, height: 15 }} /> : <Share2 style={{ width: 15, height: 15 }} />}
            <span>{copied ? "Copié !" : "Partager"}</span>
          </button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #333" }}>
            {/* Add comment */}
            {currentUser && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {currentUser.photo_url ? (
                  <img src={currentUser.photo_url} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0, marginTop: 4 }} />
                ) : (
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#555", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold", flexShrink: 0, marginTop: 4 }}>
                    {getInitials(formatUserName(currentUser))}
                  </div>
                )}
                <div style={{ flex: 1, display: "flex", gap: 6 }}>
                  <Textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (commentText.trim()) commentMutation.mutate(commentText.trim()); } }}
                    placeholder="Écrire un commentaire..."
                    rows={1}
                    style={{ background: "#1a1a1a", color: "#fff", border: "1px solid #404040", borderRadius: 8, resize: "none", fontSize: "0.82rem", padding: "8px 10px", flex: 1, ...CG }}
                  />
                  <button
                    onClick={() => commentText.trim() && commentMutation.mutate(commentText.trim())}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    style={{ width: 34, height: 34, borderRadius: 8, background: commentText.trim() ? "#2563eb" : "#333", border: "none", cursor: commentText.trim() ? "pointer" : "default", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "center" }}
                  >
                    {commentMutation.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              </div>
            )}

            {/* Comment list */}
            {loadingComments ? (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <Loader2 style={{ width: 16, height: 16, color: "#888", animation: "spin 1s linear infinite", display: "inline-block" }} />
              </div>
            ) : commentaires.length === 0 ? (
              <p style={{ color: "#666", fontSize: "0.78rem", textAlign: "center", padding: "4px 0" }}>Aucun commentaire. Soyez le premier !</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {commentaires.map(c => {
                  const canDelC = currentUser?.role_archive === "admin_systeme" || currentUser?.role_archive === "super_admin" || c.auteur_id === currentUser?.id || isProfileOwner;
                  return (
                    <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      {c.auteur_photo_url ? (
                        <img src={c.auteur_photo_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#555", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: "bold", flexShrink: 0 }}>
                          {getInitials(c.auteur_nom || "?")}
                        </div>
                      )}
                      <div style={{ flex: 1, background: "#1a1a1a", borderRadius: 8, padding: "7px 10px", position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "space-between" }}>
                          <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.78rem" }}>{c.auteur_nom || "Utilisateur"}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "#666", fontSize: "0.68rem" }}>{c.created_date ? format(new Date(c.created_date), "d MMM HH:mm", { locale: fr }) : ""}</span>
                            {canDelC && (
                              <button onClick={() => deleteCommentMutation.mutate(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#666", padding: 0 }}>
                                <Trash2 style={{ width: 11, height: 11 }} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p style={{ color: "#d0d0d0", fontSize: "0.8rem", marginTop: 2, lineHeight: 1.4 }}>{c.contenu}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {pub.media_url && (pub.type_media === "image" || pub.type_media === "photo") && showLightbox && (
        <ImageLightbox
          images={[pub.media_url]}
          startIndex={0}
          onClose={() => setShowLightbox(false)}
          comments={commentaires}
          currentUser={currentUser}
        />
      )}

      {/* Delete dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent style={{ background: "#1a1a1a", border: "1px solid #404040", ...CG }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "#fff" }}>Supprimer la publication ?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "#b0b0b0" }}>
              Cette action est irréversible. La publication et tous ses commentaires seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ background: "#333", color: "#fff", border: "1px solid #555" }}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} style={{ background: "#ef4444", color: "#fff" }} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "9px 14px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "#e0e0e0",
  fontSize: "0.82rem",
  fontFamily: '"Century Gothic", sans-serif',
  textAlign: "left",
};
