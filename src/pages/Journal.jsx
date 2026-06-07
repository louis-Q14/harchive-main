import React, { useState, useRef, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { dataService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image as ImageIcon, Video, Send, Loader2, X, Globe, Newspaper, Building, Users, Lock, ChevronDown, Search, Radio, Play } from "lucide-react";
import PublicationItem from "../components/journal/PublicationItem";
import UserAvatarPopover from "@/components/ui/UserAvatarPopover";
import { formatUserName } from "@/components/utils/nameUtils";
import LiveSection from "@/components/journal/LiveSection";
import ShortsSection from "@/components/journal/ShortsSection";

const JOURNAL_TABS = [
  { id: 'publications', label: 'Journal', icon: Newspaper },
  { id: 'shorts', label: 'Shorts', icon: Play },
  { id: 'live', label: 'Live', icon: Radio },
];

const VISIBILITY_OPTIONS = [
  { value: 'publique', label: 'Public', icon: Globe, description: 'Visible par tous les utilisateurs' },
  { value: 'etablissement', label: 'Établissement', icon: Building, description: 'Visible par les membres de votre établissement' },
  { value: 'amis', label: 'Amis', icon: Users, description: 'Visible uniquement par vos amis' },
  { value: 'privee', label: 'Privé', icon: Lock, description: 'Visible uniquement par les personnes choisies' },
];

export default function Journal() {
  const { user, isLoadingAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('publications');
  const [contenu, setContenu] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [typeMedia, setTypeMedia] = useState("texte");
  const [visibilite, setVisibilite] = useState("publique");
  const [showVisMenu, setShowVisMenu] = useState(false);
  const [showPrivateDialog, setShowPrivateDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchPrivate, setSearchPrivate] = useState("");
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const visMenuRef = useRef(null);
  const queryClient = useQueryClient();

  // Charger tous les utilisateurs (pour le mode privé et pour filtrer)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-journal'],
    queryFn: () => dataService.query('User', { limit: 10000 }),
    enabled: !!user,
  });

  // Charger les publications et filtrer par visibilité
  // Les publications du journal personnel (cible_profil_id renseigné) ne doivent pas apparaître ici
  const { data: publications = [], isLoading: loadingPubs } = useQuery({
    queryKey: ['journal-commun', user?.id],
    queryFn: async () => {
      const allPubs = await dataService.query('Publication', { orderBy: '-created_date', limit: 200 });
      return allPubs.filter(pub => !pub.cible_profil_id && canSeePub(pub));
    },
    enabled: !isLoadingAuth && !!user,
  });

  // Déterminer si l'utilisateur courant peut voir une publication
  const canSeePub = (pub) => {
    if (!user) return false;
    // L'auteur voit toujours ses propres publications
    if (pub.auteur_id === user.id) return true;
    // Les admins système voient tout
    if (user.role_archive === 'admin_systeme' || user.role_archive === 'super_admin') return true;

    switch (pub.visibilite) {
      case 'publique':
        return true;
      case 'etablissement':
        return user.etablissement_id && pub.etablissement_id && pub.etablissement_id === user.etablissement_id;
      case 'amis': {
        const mesAmis = Array.isArray(user.amis) ? user.amis : tryParseJSON(user.amis);
        return mesAmis.includes(pub.auteur_id);
      }
      case 'privee': {
        const visibleTo = Array.isArray(pub.visible_to) ? pub.visible_to : tryParseJSON(pub.visible_to);
        return visibleTo.includes(user.id);
      }
      default:
        return true;
    }
  };

  const tryParseJSON = (val) => {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    try { return JSON.parse(val); } catch { return []; }
  };

  const createPublicationMutation = useMutation({
    mutationFn: (pubData) => dataService.create('Publication', pubData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-commun'] });
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      queryClient.invalidateQueries({ queryKey: ['profil-publications'] });
      setContenu("");
      setMediaFile(null);
      setMediaPreview(null);
      setTypeMedia("texte");
      setVisibilite("publique");
      setSelectedUsers([]);
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

  const handleVisibilitySelect = (value) => {
    setVisibilite(value);
    setShowVisMenu(false);
    if (value === 'privee') {
      setShowPrivateDialog(true);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handlePublish = async () => {
    if (!contenu.trim() && !mediaFile) {
      alert("Veuillez ajouter du texte ou un fichier média");
      return;
    }
    if (visibilite === 'privee' && selectedUsers.length === 0) {
      alert("Veuillez sélectionner au moins un destinataire pour une publication privée.");
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

      await createPublicationMutation.mutateAsync({
        contenu: contenu.trim() || (mediaFile ? (typeMedia === 'image' ? 'Photo partagée' : 'Vidéo partagée') : ""),
        type_media: mediaFile ? typeMedia : "texte",
        media_url: mediaUrl,
        auteur_id: user.id,
        auteur_nom: formatUserName(user),
        auteur_photo_url: user.photo_url || null,
        auteur_role: user.role_archive || "utilisateur",
        etablissement_id: user.etablissement_id || null,
        classe_id: user.classe_id || null,
        visibilite,
        visible_to: visibilite === 'privee' ? selectedUsers : [],
        likes: [],
        nb_commentaires: 0
      });
    } catch (error) {
      console.error("Erreur publication:", error);
      alert("Erreur lors de la création de la publication.");
    } finally {
      setUploading(false);
    }
  };

  const currentVisOption = VISIBILITY_OPTIONS.find(o => o.value === visibilite);
  const VisIcon = currentVisOption?.icon || Globe;

  // Liste des amis pour le mode privé
  const mesAmisIds = useMemo(() => {
    if (!user) return [];
    return Array.isArray(user.amis) ? user.amis : tryParseJSON(user.amis);
  }, [user]);

  // Utilisateurs affichables dans le sélecteur privé (tous sauf soi-même)
  const usersForPrivateSelect = useMemo(() => {
    return allUsers
      .filter(u => u.id !== user?.id)
      .filter(u => {
        if (!searchPrivate.trim()) return true;
        const q = searchPrivate.toLowerCase();
        const name = `${u.prenom || ''} ${u.nom || ''} ${u.post_nom || ''} ${u.email || ''}`.toLowerCase();
        return name.includes(q);
      });
  }, [allUsers, user, searchPrivate]);

  const getRoleLabel = (role) => {
    const labels = {
      super_admin: 'Super Administrateur',
      admin_systeme: 'Administrateur Système',
      admin_ministeriel: 'Admin Ministériel',
      admin_etablissement: 'Admin Établissement',
      professeur: 'Professeur',
      etudiant: 'Étudiant',
      parent: 'Parent'
    };
    return labels[role] || 'Utilisateur';
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  const displayName = formatUserName(user);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-6">
          <p className="text-sm mb-5" style={{ color: 'var(--ha-text-muted)' }}>
            Partagez et découvrez les actualités de la communauté
          </p>

          {/* Tabs */}
          <div className="flex items-center gap-0 rounded-full p-1 w-full" style={{ backgroundColor: 'var(--ha-surface2)', border: '1px solid var(--ha-border)' }}>
            {JOURNAL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all"
                  style={isActive
                    ? { backgroundColor: 'var(--ha-surface3)', color: 'var(--ha-text)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }
                    : { color: 'var(--ha-text-muted)' }
                  }
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'live' && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Tab */}
        {activeTab === 'live' && <LiveSection />}

        {/* Shorts Tab */}
        {activeTab === 'shorts' && <ShortsSection />}

        {/* Publications Tab */}
        {activeTab === 'publications' && (<>

        {/* Formulaire de publication */}
        {user && (
          <Card className="mb-6 border" style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
            <CardHeader className="py-3 border-b" style={{ borderColor: 'var(--ha-border)' }}>
              <div className="flex items-center gap-3">
                <UserAvatarPopover
                  name={displayName}
                  role={user?.role_archive}
                  photoUrl={user?.photo_url}
                  size="md"
                />
                <div>
                  <p className="font-semibold text-white">{displayName}</p>
                  <p className="text-xs text-gray-400">{getRoleLabel(user?.role_archive)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <Textarea
                placeholder="Partagez quelque chose avec la communauté..."
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                className="mb-3 min-h-[80px] text-white placeholder-gray-500 border"
                style={{ backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)' }}
                disabled={uploading}
              />

              {mediaPreview && (
                <div className="relative mb-4 rounded-lg p-2" style={{ backgroundColor: 'var(--ha-surface2)' }}>
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

              {/* Sélecteur de visibilité */}
              <div className="relative mb-3" ref={visMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowVisMenu(!showVisMenu)}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors hover:bg-[#333]"
                  style={{ borderColor: 'var(--ha-border)', color: '#ccc' }}
                  disabled={uploading}
                >
                  <VisIcon className="w-3.5 h-3.5" />
                  <span>{currentVisOption?.label}</span>
                  {visibilite === 'privee' && selectedUsers.length > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full">{selectedUsers.length}</span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showVisMenu && (
                  <div
                    className="absolute left-0 top-full mt-1 z-50 rounded-lg border shadow-xl py-1 w-72"
                    style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}
                  >
                    {VISIBILITY_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const isActive = visibilite === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleVisibilitySelect(opt.value)}
                          className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? 'bg-[#444]' : 'hover:bg-[#3a3a3a]'}`}
                        >
                          <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                          <div>
                            <p className={`text-sm font-medium ${isActive ? 'text-blue-400' : 'text-white'}`}>{opt.label}</p>
                            <p className="text-[11px] text-gray-500">{opt.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <input ref={imageInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => handleFileChange(e, "image")} disabled={uploading} />
              <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/ogg" className="hidden" onChange={(e) => handleFileChange(e, "video")} disabled={uploading} />

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => imageInputRef.current?.click()} style={{ color: 'var(--ha-text-muted)', padding: '4px 8px' }} disabled={uploading}>
                    <ImageIcon className="w-4 h-4 mr-1" /> Photo
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => videoInputRef.current?.click()} style={{ color: 'var(--ha-text-muted)', padding: '4px 8px' }} disabled={uploading}>
                    <Video className="w-4 h-4 mr-1" /> Vidéo
                  </Button>
                </div>
                <Button size="sm" onClick={handlePublish} disabled={(!contenu.trim() && !mediaFile) || uploading} style={{ background: 'var(--ha-surface2)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }}>
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
          <div className="p-12 text-center border rounded-lg" style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--ha-surface2)' }}>
              <Newspaper className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-white text-lg mb-2">Aucune publication pour le moment</p>
            <p className="text-gray-400 text-sm">Soyez le premier à partager quelque chose avec la communauté !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {publications.map((pub) => (
              <PublicationItem key={pub.id} publication={pub} currentUser={user} />
            ))}
          </div>
        )}

        </>)} {/* End publications tab */}
      </div>

      {/* Dialog de sélection d'utilisateurs pour le mode Privé */}
      <Dialog open={showPrivateDialog} onOpenChange={setShowPrivateDialog}>
        <DialogContent className="max-w-md border" style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Choisir les destinataires
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchPrivate}
              onChange={(e) => setSearchPrivate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 border"
              style={{ backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)' }}
            />
          </div>

          {selectedUsers.length > 0 && (
            <p className="text-xs text-blue-400 mb-2">
              {selectedUsers.length} utilisateur{selectedUsers.length > 1 ? 's' : ''} sélectionné{selectedUsers.length > 1 ? 's' : ''}
            </p>
          )}

          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {usersForPrivateSelect.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Aucun utilisateur trouvé</p>
            ) : (
              usersForPrivateSelect.map(u => {
                const uName = [u.prenom, u.nom, u.post_nom].filter(Boolean).join(' ') || u.email;
                const isSelected = selectedUsers.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUserSelection(u.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isSelected ? 'bg-blue-900/30 border border-blue-600/50' : 'hover:bg-[#333] border border-transparent'}`}
                  >
                    <Checkbox checked={isSelected} className="border-gray-500" />
                    <UserAvatarPopover name={uName} role={u.role_archive} photoUrl={u.photo_url} size="sm" />
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{uName}</p>
                      <p className="text-[11px] text-gray-500">{getRoleLabel(u.role_archive)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter className="mt-3">
            <Button variant="ghost" onClick={() => { setShowPrivateDialog(false); if (selectedUsers.length === 0) setVisibilite('publique'); }} style={{ color: '#aaa' }}>
              Annuler
            </Button>
            <Button onClick={() => setShowPrivateDialog(false)} disabled={selectedUsers.length === 0} style={{ background: '#3b82f6', color: '#fff' }}>
              Confirmer ({selectedUsers.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
