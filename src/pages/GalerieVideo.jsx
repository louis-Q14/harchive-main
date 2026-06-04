// @ts-nocheck
import React, { useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { shortsService } from "@/api/liveService";
import { uploadFile } from "@/api/uploadService";
import { dataService } from "@/api/dataService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Video,
  Upload,
  Heart,
  Trash2,
  Loader2,
  Plus,
  Play,
  Search,
  Eye,
  MessageCircle,
  Film,
  Globe,
  Lock,
  Zap,
  Archive,
  CheckCircle2,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatUserName } from "@/components/utils/nameUtils";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
const backendBase = import.meta.env.VITE_BASE44_BACKEND_URL || '';
function resolveUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${backendBase}${url}`;
}

const PUBLISH_OPTIONS = [
  {
    id: 'journal_public',
    label: 'Journal Principal',
    sublabel: 'Visible par tous les membres',
    icon: Globe,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
  },
  {
    id: 'journal_prive',
    label: 'Journal Prive',
    sublabel: 'Visible par vos amis seulement',
    icon: Lock,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
  },
  {
    id: 'shorts',
    label: 'Shorts / Reels',
    sublabel: 'Format vertical dans le fil Shorts',
    icon: Zap,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.12)',
    border: 'rgba(168,85,247,0.35)',
  },
  {
    id: 'draft',
    label: 'Garder en brouillon',
    sublabel: 'Sauvegarder sans publier',
    icon: Archive,
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.12)',
    border: 'rgba(107,114,128,0.35)',
  },
];

export default function GalerieVideo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [pendingVideo, setPendingVideo] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [formData, setFormData] = useState({ titre: "", description: "" });
  const fileInputRef = useRef(null);

  const { data: allVideos = [], isLoading: loadingAll } = useQuery({
    queryKey: ['galerie-video-all'],
    queryFn: () => user ? shortsService.getFeed(100) : shortsService.getPublicFeed(100),
    staleTime: 1000 * 30,
  });

  const { data: mesVideos = [], isLoading: loadingMes } = useQuery({
    queryKey: ['galerie-video-mes', user?.id],
    queryFn: () => shortsService.getMyShorts(),
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['galerie-video-all'] });
    queryClient.invalidateQueries({ queryKey: ['galerie-video-mes'] });
    queryClient.invalidateQueries({ queryKey: ['shorts-feed'] });
    queryClient.invalidateQueries({ queryKey: ['journal-feed'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => shortsService.deleteShort(id),
    onSuccess: () => { invalidateAll(); toast.success("Video supprimee"); },
    onError: (err) => toast.error(err.message || "Erreur suppression"),
  });

  const toggleLikeMutation = useMutation({
    mutationFn: (id) => shortsService.toggleLike(id),
    onSuccess: invalidateAll,
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { toast.error("Veuillez selectionner un fichier video"); return; }
    if (file.size > 150 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 150 MB)"); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (!formData.titre) {
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setFormData(fd => ({ ...fd, titre: name }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile(selectedFile, 'posts');
      const created = await shortsService.create({
        titre: formData.titre.trim() || selectedFile.name,
        description: formData.description.trim(),
        video_url: uploaded.url,
        duration: 0, width: 0, height: 0,
        tags: [],
        status: 'processing',
      });
      setPendingVideo(created);
      setAddDialogOpen(false);
      setPublishTarget(null);
      setPublishDialogOpen(true);
      invalidateAll();
      toast.success("Video ajoutee — choisissez ou la publier");
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!publishTarget || !pendingVideo || !user) return;
    setPublishing(true);
    try {
      if (publishTarget === 'draft') {
        toast.success("Video gardee en brouillon");
        setPublishDialogOpen(false);
        setActiveTab("mes-videos");
        return;
      }
      if (publishTarget === 'shorts') {
        await shortsService.publishShort(pendingVideo.id);
        toast.success("Video publiee dans les Shorts !");
      }
      if (publishTarget === 'journal_public' || publishTarget === 'journal_prive') {
        await shortsService.publishShort(pendingVideo.id);
        await dataService.create('Publication', {
          contenu: formData.description.trim() || formData.titre.trim() || 'Video partagee',
          type_media: 'video',
          media_url: pendingVideo.video_url,
          auteur_id: user.id,
          auteur_nom: formatUserName(user),
          auteur_photo_url: user.photo_url || null,
          auteur_role: user.role_archive || 'utilisateur',
          etablissement_id: user.etablissement_id || null,
          classe_id: user.classe_id || null,
          visibilite: publishTarget === 'journal_public' ? 'publique' : 'privee',
          visible_to: [],
          likes: [],
          nb_commentaires: 0,
        });
        toast.success(
          publishTarget === 'journal_public'
            ? "Video publiee dans le Journal Principal !"
            : "Video publiee dans le Journal Prive !"
        );
      }
      invalidateAll();
      setPublishDialogOpen(false);
      setActiveTab("all");
    } catch (err) {
      toast.error(err.message || "Erreur lors de la publication");
    } finally {
      setPublishing(false);
    }
  };

  const openPublishForExisting = (video) => {
    setPendingVideo(video);
    setFormData({ titre: video.titre || '', description: video.description || '' });
    setPublishTarget(null);
    setPublishDialogOpen(true);
  };

  const resetUploadForm = () => {
    setAddDialogOpen(false);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFormData({ titre: "", description: "" });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openPlayer = (video) => {
    setCurrentVideo(video);
    setPlayerOpen(true);
    shortsService.recordView(video.id).catch(() => {});
  };

  const displayVideos = activeTab === "mes-videos" ? mesVideos : allVideos;
  const filtered = displayVideos.filter(v =>
    !searchQuery ||
    v.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.creator_nom?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const isLoading = activeTab === "mes-videos" ? loadingMes : loadingAll;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#4d4d4d' }}>
      <div className="w-full px-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#3d3d3d' }}>
              <Film className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white" style={CG}>Galerie Video</h1>
              <p className="text-gray-400" style={CG}>{filtered.length} video{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {user && (
            <Button onClick={() => setAddDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700" style={CG}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une video
            </Button>
          )}
        </div>

        <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: '#2d2d2d' }}>
                {["all", "mes-videos"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-4 py-2 text-sm font-medium transition-colors"
                    style={{
                      ...CG,
                      backgroundColor: activeTab === tab ? '#6b21a8' : 'transparent',
                      color: activeTab === tab ? '#fff' : '#b0b0b0',
                    }}
                  >
                    {tab === "all" ? "Toutes les videos" : "Mes videos"}
                  </button>
                ))}
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher une video..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{ backgroundColor: '#2d2d2d', borderColor: '#404040', color: '#fff', ...CG }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Film className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg" style={CG}>
              {activeTab === "mes-videos" ? "Vous n avez pas encore ajoute de video" : "Aucune video publiee"}
            </p>
            {user && (
              <Button onClick={() => setAddDialogOpen(true)} className="mt-4 bg-purple-600 hover:bg-purple-700" style={CG}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter une video
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                currentUserId={user?.id}
                onPlay={() => openPlayer(video)}
                onDelete={() => deleteMutation.mutate(video.id)}
                onLike={() => toggleLikeMutation.mutate(video.id)}
                onPublish={() => openPublishForExisting(video)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ADD VIDEO DIALOG */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) resetUploadForm(); }}>
        <DialogContent className="max-w-lg" style={{ backgroundColor: '#1e1e2e', border: '1px solid #3d3d5c', color: '#fff' }}>
          <DialogHeader>
            <DialogTitle style={{ ...CG, color: '#fff' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-purple-400" />
                </div>
                Ajouter une video
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4" style={CG}>
            <div
              className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all"
              style={{
                borderColor: selectedFile ? '#7c3aed' : '#4d4d6d',
                backgroundColor: selectedFile ? 'rgba(124,58,237,0.06)' : '#14141f',
              }}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="relative">
                  <video src={previewUrl} className="max-h-52 mx-auto rounded-xl w-full object-contain" controls />
                  <button
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-600/80 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-purple-600/20 flex items-center justify-center mx-auto">
                    <Video className="w-7 h-7 text-purple-400" />
                  </div>
                  <p className="text-white font-medium">Cliquer pour selectionner</p>
                  <p className="text-gray-500 text-xs">MP4, WebM — max 150 MB</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/ogg" className="hidden" onChange={handleFileSelect} />
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs" style={CG}>Titre</Label>
              <Input
                placeholder="Titre de la video"
                value={formData.titre}
                onChange={(e) => setFormData(fd => ({ ...fd, titre: e.target.value }))}
                style={{ backgroundColor: '#14141f', color: '#fff', borderColor: '#3d3d5c', ...CG }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs" style={CG}>Description</Label>
              <Textarea
                placeholder="Description..."
                value={formData.description}
                onChange={(e) => setFormData(fd => ({ ...fd, description: e.target.value }))}
                rows={2}
                style={{ backgroundColor: '#14141f', color: '#fff', borderColor: '#3d3d5c', ...CG }}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={resetUploadForm} disabled={uploading} style={{ color: '#888', ...CG }} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              style={CG}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Upload...</>
              ) : (
                <>Suivant <ChevronRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PUBLISH MANAGER DIALOG */}
      <Dialog open={publishDialogOpen} onOpenChange={(open) => { if (!open) { setPublishDialogOpen(false); setPublishTarget(null); setActiveTab("mes-videos"); } }}>
        <DialogContent className="max-w-lg" style={{ backgroundColor: '#1e1e2e', border: '1px solid #3d3d5c', color: '#fff', padding: 0, overflow: 'hidden' }}>
          <div className="p-5 pb-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-purple-600/25 flex items-center justify-center">
                <Globe className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg" style={CG}>Gestionnaire de publication</h2>
                <p className="text-gray-500 text-xs" style={CG}>{pendingVideo?.titre || 'Video'}</p>
              </div>
            </div>
          </div>

          {pendingVideo?.video_url && (
            <div className="px-5 py-3">
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#000', maxHeight: 160 }}>
                <video
                  src={resolveUrl(pendingVideo.video_url)}
                  className="w-full object-contain"
                  style={{ maxHeight: 160 }}
                  controls
                  muted
                />
              </div>
            </div>
          )}

          <div className="px-5 pb-2 space-y-2">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3" style={CG}>Ou publier ?</p>
            {PUBLISH_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = publishTarget === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setPublishTarget(opt.id)}
                  className="w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all text-left"
                  style={{
                    backgroundColor: selected ? opt.bg : 'rgba(255,255,255,0.03)',
                    border: "1.5px solid " + (selected ? opt.border : 'rgba(255,255,255,0.07)'),
                    transform: selected ? 'scale(1.01)' : 'scale(1)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: selected ? opt.bg : 'rgba(255,255,255,0.05)', border: "1px solid " + (selected ? opt.border : 'transparent') }}
                  >
                    <Icon className="w-5 h-5" style={{ color: selected ? opt.color : '#777' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ ...CG, color: selected ? '#fff' : '#ccc' }}>{opt.label}</p>
                    <p className="text-xs truncate" style={{ ...CG, color: selected ? '#bbb' : '#666' }}>{opt.sublabel}</p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: selected ? opt.color : '#444', backgroundColor: selected ? opt.color : 'transparent' }}
                  >
                    {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-5 pt-3 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Button
              variant="ghost"
              onClick={() => { setPublishDialogOpen(false); setPublishTarget(null); setActiveTab("mes-videos"); }}
              disabled={publishing}
              style={{ color: '#777', ...CG }}
              className="flex-1"
            >
              Plus tard
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!publishTarget || publishing}
              className="flex-1 font-semibold"
              style={{
                background: publishTarget
                  ? (PUBLISH_OPTIONS.find(o => o.id === publishTarget)?.color || '#6b21a8')
                  : '#333',
                color: '#fff',
                opacity: !publishTarget ? 0.5 : 1,
                ...CG,
              }}
            >
              {publishing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publication...</>
              ) : publishTarget === 'draft' ? (
                <><Archive className="w-4 h-4 mr-2" /> Garder en brouillon</>
              ) : publishTarget ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Publier maintenant</>
              ) : (
                'Choisir une destination'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIDEO PLAYER DIALOG */}
      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden" style={{ backgroundColor: '#000', border: '1px solid #333' }}>
          {currentVideo && (
            <div className="relative">
              <video
                src={resolveUrl(currentVideo.video_url)}
                controls autoPlay
                className="w-full"
                style={{ maxHeight: '70vh', backgroundColor: '#000' }}
              />
              <div className="p-4" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate" style={CG}>{currentVideo.titre || 'Sans titre'}</h3>
                    {currentVideo.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2" style={CG}>{currentVideo.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-gray-500 text-xs" style={CG}>Par {currentVideo.creator_nom}</span>
                      <span className="text-gray-500 text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> {currentVideo.views || 0}</span>
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {Array.isArray(currentVideo.likes) ? currentVideo.likes.length : (currentVideo.nb_likes || 0)}
                      </span>
                      <span className="text-gray-500 text-xs flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {currentVideo.nb_commentaires || 0}</span>
                    </div>
                  </div>
                  {user?.id === currentVideo.creator_id && (
                    <Button size="sm" variant="destructive" onClick={() => { deleteMutation.mutate(currentVideo.id); setPlayerOpen(false); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoCard({ video, currentUserId, onPlay, onDelete, onLike, onPublish }) {
  const videoRef = useRef(null);
  const isOwner = currentUserId && video.creator_id === currentUserId;
  const isDraft = video.status === 'processing';
  const likeCount = Array.isArray(video.likes) ? video.likes.length : (video.nb_likes || 0);
  const isLiked = Array.isArray(video.likes) && video.likes.includes(currentUserId);
  const videoSrc = resolveUrl(video.video_url);

  return (
    <div
      className="group relative overflow-hidden cursor-pointer rounded-xl"
      style={{ backgroundColor: '#2d2d2d', aspectRatio: '9/16' }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-cover"
        preload="metadata"
        muted
        onMouseEnter={() => videoRef.current?.play()}
        onMouseLeave={() => { videoRef.current?.pause(); videoRef.current && (videoRef.current.currentTime = 0); }}
        onClick={!isDraft ? onPlay : undefined}
      />

      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }}
        onClick={!isDraft ? onPlay : undefined}
      >
        {!isDraft && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <Play className="w-7 h-7 text-white ml-1" fill="white" />
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-xs font-semibold truncate" style={{ fontFamily: '"Century Gothic", sans-serif' }}>
            {video.titre || 'Sans titre'}
          </p>
          <p className="text-gray-300 text-xs truncate opacity-80">{video.creator_nom}</p>
          {!isDraft && (
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={(e) => { e.stopPropagation(); onLike(); }}
                className="flex items-center gap-1 text-xs hover:text-red-400 transition-colors"
                style={{ color: isLiked ? '#ff4458' : '#ccc' }}
              >
                <Heart className="w-3 h-3" fill={isLiked ? '#ff4458' : 'none'} /> {likeCount}
              </button>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Eye className="w-3 h-3" /> {video.views || 0}
              </span>
            </div>
          )}
        </div>
      </div>

      {isDraft && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
        >
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: 'rgba(107,114,128,0.8)', color: '#fff', fontFamily: '"Century Gothic", sans-serif' }}
          >
            <Archive className="w-3 h-3" /> Brouillon
          </div>
          {isOwner && (
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', fontFamily: '"Century Gothic", sans-serif', boxShadow: '0 4px 15px rgba(124,58,237,0.4)' }}
              onClick={(e) => { e.stopPropagation(); onPublish(); }}
            >
              <Globe className="w-3.5 h-3.5" /> Publier
            </button>
          )}
        </div>
      )}

      {isOwner && (
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="w-3.5 h-3.5 text-white" />
        </button>
      )}
    </div>
  );
}
