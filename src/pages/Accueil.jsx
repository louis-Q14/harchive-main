import React, { useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { dataService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Newspaper, Loader2, Image as ImageIcon, Video, Send, X, Building, School, Lock } from "lucide-react";
import { formatUserName } from "@/components/utils/nameUtils";
import PublicationItem from "../components/journal/PublicationItem";
import UserAvatarPopover from "@/components/ui/UserAvatarPopover";

export default function Accueil() {
  const { user, isLoadingAuth } = useAuth();
  const [contenu, setContenu] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [typeMedia, setTypeMedia] = useState("texte");
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const queryClient = useQueryClient();

  const isAdmin = user?.role_archive === 'admin_systeme' || user?.role_archive === 'super_admin';
  const hasEtablissement = !!user?.etablissement_id;
  const canAccess = isAdmin || hasEtablissement;

  const canPublish = isAdmin ||
    user?.role_archive === 'admin_etablissement' ||
    user?.role_archive === 'professeur' ||
    user?.role_archive === 'etudiant';

  const { data: publications = [], isLoading: loadingPubs } = useQuery({
    queryKey: ['journal-officiel', user?.id, user?.etablissement_id],
    queryFn: async () => {
      const allPubs = await dataService.query('Publication', { orderBy: '-created_date', limit: 100 });

      if (isAdmin) {
        return allPubs.filter(pub => pub.visibilite === 'etablissement' && !pub.cible_profil_id);
      }

      return allPubs.filter(pub => {
        if (pub.visibilite !== 'etablissement') return false;
        if (pub.cible_profil_id) return false; // never show personal journal posts
        return pub.etablissement_id === user.etablissement_id || pub.auteur_id === user.id;
      });
    },
    enabled: !isLoadingAuth && canAccess,
  });

  const createPublicationMutation = useMutation({
    mutationFn: (pubData) => dataService.create('Publication', pubData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-officiel'] });
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      setContenu("");
      setMediaFile(null);
      setMediaPreview(null);
      setTypeMedia("texte");
    }
  });

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert("Le fichier est trop volumineux. Taille maximale : 50 MB");
        return;
      }
      setMediaFile(file);
      setTypeMedia(type);
      const reader = new FileReader();
      reader.onloadend = () => setMediaPreview(reader.result);
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handlePublish = async () => {
    if (!contenu.trim() && !mediaFile) {
      alert("Veuillez ajouter du texte ou un fichier média");
      return;
    }
    setUploading(true);
    try {
      let mediaUrl = null;
      if (mediaFile) {
        try {
          const { uploadService } = await import("@/api");
          const uploadResult = await uploadService.uploadFile(mediaFile, 'posts');
          mediaUrl = uploadResult.url;
        } catch (uploadError) {
          console.error("Erreur upload:", uploadError);
          alert(uploadError.message || "Erreur lors de l'upload du fichier.");
          setUploading(false);
          return;
        }
      }

      await createPublicationMutation.mutateAsync(/** @type {any} */ ({
        contenu: contenu.trim() || (mediaFile ? `${typeMedia === 'image' ? 'Photo' : 'Vidéo'} partagée` : ""),
        type_media: mediaFile ? typeMedia : "texte",
        media_url: mediaUrl,
        auteur_id: user.id,
        auteur_nom: formatUserName(user),
        auteur_photo_url: user.photo_url || null,
        auteur_role: user.role_archive,
        etablissement_id: user.etablissement_id || null,
        classe_id: user.classe_id || null,
        visibilite: "etablissement",
        likes: [],
        nb_commentaires: 0
      }));
    } catch (error) {
      console.error("Erreur publication:", error);
      alert("Erreur lors de la création de la publication.");
    } finally {
      setUploading(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 border rounded-lg" style={{ backgroundColor: '#262626', borderColor: '#404040' }}>
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-3">Accès restreint</h2>
            <p className="text-gray-400">
              Le Journal Officiel est réservé aux membres d'un établissement.
              Vous devez être rattaché à un établissement pour accéder à cette page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = formatUserName(user);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Newspaper className="w-7 h-7 text-white" />
            <h2 className="text-3xl font-bold text-white">Journal Officiel</h2>
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Building className="w-4 h-4 text-gray-300" />
            <p className="text-gray-300 text-sm">
              {isAdmin ? "Toutes les publications des établissements" : (user.etablissement_nom || "Mon établissement")}
            </p>
          </div>
          <p className="text-gray-500 text-xs">
            Réservé aux membres de l'établissement et aux administrateurs système
          </p>
        </div>

        {/* Formulaire de publication */}
        {canPublish && (
          <Card className="mb-6 border" style={{ backgroundColor: '#262626', borderColor: '#404040' }}>
            <CardHeader className="py-3 border-b" style={{ borderColor: '#404040' }}>
              <div className="flex items-center gap-3">
                <UserAvatarPopover
                  name={displayName}
                  role={user?.role_archive}
                  photoUrl={user?.photo_url}
                  size="md"
                  onClick={undefined}
                />
                <div>
                  <p className="font-semibold text-white">{displayName}</p>
                  <div className="flex items-center gap-2">
                    <School className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-xs text-gray-400">
                      {user?.role_archive === 'super_admin' ? 'Super Administrateur' :
                       user?.role_archive === 'admin_systeme' ? 'Administrateur Système' :
                       user?.role_archive === 'admin_etablissement' ? 'Admin Établissement' :
                       user?.role_archive === 'professeur' ? 'Professeur' : 'Étudiant'}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <Textarea
                placeholder="Publiez une annonce pour votre établissement..."
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                className="mb-3 min-h-[80px] text-white placeholder-gray-500 border"
                style={{ backgroundColor: '#1a1a1a', borderColor: '#555555' }}
                disabled={uploading}
              />

              {mediaPreview && (
                <div className="relative mb-4 rounded-lg p-2" style={{ backgroundColor: '#1a1a1a' }}>
                  <button
                    onClick={() => { setMediaFile(null); setMediaPreview(null); setTypeMedia("texte"); }}
                    className="absolute top-4 right-4 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 z-10"
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {typeMedia === "image" ? (
                    <img src={mediaPreview} alt="Aperçu" className="w-full rounded-lg max-h-96 object-contain" />
                  ) : (
                    <video src={mediaPreview} controls className="w-full rounded-lg max-h-96" />
                  )}
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    {typeMedia === "image" ? "Image" : "Vidéo"} sélectionnée - {mediaFile?.name}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>Visible uniquement par votre établissement</span>
                </div>
              </div>

              <input ref={imageInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => handleFileChange(e, "image")} disabled={uploading} />
              <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/ogg" className="hidden" onChange={(e) => handleFileChange(e, "video")} disabled={uploading} />

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => imageInputRef.current?.click()} style={{ color: '#b0b0b0', padding: '4px 8px' }} disabled={uploading}>
                    <ImageIcon className="w-4 h-4 mr-1" /> Photo
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => videoInputRef.current?.click()} style={{ color: '#b0b0b0', padding: '4px 8px' }} disabled={uploading}>
                    <Video className="w-4 h-4 mr-1" /> Vidéo
                  </Button>
                </div>
                <Button size="sm" onClick={handlePublish} disabled={(!contenu.trim() && !mediaFile) || uploading} style={{ background: '#555', color: '#fff' }}>
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {mediaFile ? 'Upload...' : 'Publication...'}</>
                  ) : (
                    <><Send className="w-4 h-4 mr-1" /> Publier</>
                  )}
                </Button>
              </div>

              {mediaFile && (
                <p className="text-xs text-gray-500 mt-2">
                  Taille : {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB / 50 MB max
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Publications */}
        {loadingPubs ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : publications.length === 0 ? (
          <div className="p-12 text-center border rounded-lg" style={{ backgroundColor: '#262626', borderColor: '#404040' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#404040' }}>
              <Newspaper className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-white text-lg mb-2">Aucune publication officielle</p>
            <p className="text-gray-400 text-sm">
              {canPublish ? "Soyez le premier à publier une annonce pour votre établissement !" : "Les annonces de votre établissement apparaîtront ici."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {publications.map((pub) => (
              <PublicationItem key={pub.id} publication={pub} currentUser={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
