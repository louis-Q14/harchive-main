// @ts-nocheck
import React, { useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { shortsService } from "@/api/liveService";
import { uploadFile } from "@/api/uploadService";
import { dataService } from "@/api/dataService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
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
  const [activeTab, setActiveTab] = useState("mes-videos");
  const [formData, setFormData] = useState({ titre: "", description: "" });
  const fileInputRef = useRef(null);

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

  const filtered = mesVideos.filter(v =>
    !searchQuery ||
    v.titre?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const isLoading = loadingMes;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111118' }}>
      {/* HEADER */}
      <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none" style={CG}>Galerie Vidéo</h1>
              <p className="text-xs mt-0.5" style={{ color: '#888', ...CG }}>{filtered.length} vidéo{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {user && (
            <Button onClick={() => setAddDialogOpen(true)} size="sm" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', border: 'none', ...CG }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Ajouter une vidéo
            </Button>
          )}
        </div>
        {/* SEARCH */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', ...CG }}
            />
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Film className="w-14 h-14 mx-auto mb-3" style={{ color: '#333' }} />
            <p className="text-sm" style={{ color: '#666', ...CG }}>Aucune vidéo ajoutée</p>
            {user && (
              <Button onClick={() => setAddDialogOpen(true)} size="sm" className="mt-4" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', ...CG }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Ajouter
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
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
      <DraggableDialog
        open={addDialogOpen}
        onOpenChange={(open) => { if (!open) resetUploadForm(); }}
        title={
          <div style={CG}>
            <div className="text-base font-semibold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-400" /> Ajouter une vidéo
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#b0b0b0' }}>Sélectionnez une vidéo et remplissez les détails</div>
          </div>
        }
        maxWidth="max-w-lg"
      >
        <DraggableDialogBody>
          <div className="grid gap-4" style={CG}>
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-purple-500 transition-colors"
              style={{ borderColor: selectedFile ? '#7c3aed' : '#4d4d4d', backgroundColor: '#2d2d2d' }}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="relative">
                  <video src={previewUrl} className="max-h-48 mx-auto rounded-lg w-full object-contain" controls />
                  <button
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-600/80 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <>
                  <Video className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">Cliquez pour sélectionner une vidéo</p>
                  <p className="text-gray-600 text-xs mt-1">MP4, WebM — max 150 MB</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/ogg" className="hidden" onChange={handleFileSelect} />
            <div className="space-y-1.5">
              <Label className="text-white text-xs font-medium" style={CG}>Titre</Label>
              <Input
                placeholder="Titre de la vidéo"
                value={formData.titre}
                onChange={(e) => setFormData(fd => ({ ...fd, titre: e.target.value }))}
                style={{ backgroundColor: '#2d2d2d', color: '#fff', borderColor: '#4d4d4d', ...CG }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
              <Textarea
                placeholder="Description..."
                value={formData.description}
                onChange={(e) => setFormData(fd => ({ ...fd, description: e.target.value }))}
                style={{ backgroundColor: '#2d2d2d', color: '#fff', borderColor: '#4d4d4d', ...CG }}
              />
            </div>
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <Button variant="outline" onClick={resetUploadForm} disabled={uploading} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG }}>
            Annuler
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            style={CG}
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Upload...</> : <><ChevronRight className="w-4 h-4 mr-2" /> Suivant</>}
          </Button>
        </DraggableDialogFooter>
      </DraggableDialog>

      {/* PUBLISH MANAGER DIALOG */}
      <DraggableDialog
        open={publishDialogOpen}
        onOpenChange={(open) => { if (!open) { setPublishDialogOpen(false); setPublishTarget(null); setActiveTab("mes-videos"); } }}
        title={
          <div style={CG}>
            <div className="text-base font-semibold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-400" /> Gestionnaire de publication
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#b0b0b0' }}>{pendingVideo?.titre || 'Vidéo'}</div>
          </div>
        }
        maxWidth="max-w-2xl"
      >
        <DraggableDialogBody>
          <div className="grid gap-2" style={CG}>
            {pendingVideo?.video_url && (
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#000' }}>
                <video
                  src={resolveUrl(pendingVideo.video_url)}
                  className="w-full"
                  style={{ maxHeight: '60vh', display: 'block' }}
                  controls
                  muted
                />
              </div>
            )}
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest" style={CG}>Où publier ?</p>
            <div className="flex gap-2">
              {PUBLISH_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = publishTarget === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setPublishTarget(opt.id)}
                    className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all"
                    style={{
                      backgroundColor: selected ? opt.bg : 'rgba(255,255,255,0.04)',
                      border: "1.5px solid " + (selected ? opt.border : 'rgba(255,255,255,0.08)'),
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: selected ? opt.color : '#666' }} />
                    <p className="text-xs font-semibold leading-tight text-center" style={{ ...CG, color: selected ? '#fff' : '#888', fontSize: 10 }}>{opt.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <Button
            variant="outline"
            onClick={() => { setPublishDialogOpen(false); setPublishTarget(null); setActiveTab("mes-videos"); }}
            disabled={publishing}
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG }}
          >
            Plus tard
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!publishTarget || publishing}
            style={{
              background: publishTarget ? (PUBLISH_OPTIONS.find(o => o.id === publishTarget)?.color || '#6b21a8') : '#555',
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
        </DraggableDialogFooter>
      </DraggableDialog>

      {/* VIDEO PLAYER DIALOG */}
      <DraggableDialog
        open={playerOpen}
        onOpenChange={setPlayerOpen}
        title={
          <div className="text-base font-semibold text-white flex items-center gap-2" style={CG}>
            <Video className="w-5 h-5 text-purple-400" />
            {currentVideo?.titre || 'Lecture'}
          </div>
        }
        maxWidth="max-w-2xl"
      >
        <DraggableDialogBody style={{ padding: 0 }}>
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
                </div>
              </div>
            </div>
          )}
        </DraggableDialogBody>
      </DraggableDialog>
    </div>
  );
}

function VideoCard({ video, currentUserId, onPlay, onDelete, onLike, onPublish }) {
  const videoRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const isOwner = currentUserId && video.creator_id === currentUserId;
  const isDraft = video.status === 'processing';
  const likeCount = Array.isArray(video.likes) ? video.likes.length : (video.nb_likes || 0);
  const isLiked = Array.isArray(video.likes) && video.likes.includes(currentUserId);
  const videoSrc = resolveUrl(video.video_url);

  return (
    <div
      className="group relative overflow-hidden cursor-pointer rounded-lg"
      style={{ backgroundColor: '#1c1c24', aspectRatio: '9/16', border: '1px solid rgba(255,255,255,0.06)', transition: 'transform 0.2s, box-shadow 0.2s', transform: isHovered ? 'scale(1.04)' : 'scale(1)', boxShadow: isHovered ? '0 8px 24px rgba(0,0,0,0.6)' : 'none' }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-cover"
        preload="metadata"
        muted
        onMouseEnter={() => { setIsHovered(true); videoRef.current?.play(); }}
        onMouseLeave={() => { setIsHovered(false); videoRef.current?.pause(); videoRef.current && (videoRef.current.currentTime = 0); }}
        onClick={!isDraft ? onPlay : undefined}
      />

      {/* gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 45%, transparent 70%)' }}
      />

      {/* play button — caché pendant la lecture en miniature */}
      {!isDraft && !isHovered && (
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onPlay}
        >
          <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm" style={{ border: '1.5px solid rgba(255,255,255,0.3)' }}>
            <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
          </div>
        </div>
      )}

      {/* indicateur lecture en miniature */}
      {isHovered && !isDraft && (
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span style={{ fontSize: 8, color: '#fff', fontFamily: '"Century Gothic", sans-serif' }}>Aperçu</span>
        </div>
      )}

      {/* bottom info */}
      <div className="absolute bottom-0 left-0 right-0 px-1.5 pb-1.5" onClick={!isDraft ? onPlay : undefined}>
        <p className="text-white font-semibold truncate leading-tight" style={{ fontSize: 9, fontFamily: '"Century Gothic", sans-serif' }}>
          {video.titre || 'Sans titre'}
        </p>
        {!isDraft && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onLike(); }}
              className="flex items-center gap-0.5 hover:text-red-400 transition-colors"
              style={{ fontSize: 8, color: isLiked ? '#ff4458' : '#aaa' }}
            >
              <Heart className="w-2 h-2" fill={isLiked ? '#ff4458' : 'none'} /> {likeCount}
            </button>
            <span className="flex items-center gap-0.5" style={{ fontSize: 8, color: '#888' }}>
              <Eye className="w-2 h-2" /> {video.views || 0}
            </span>
          </div>
        )}
      </div>

      {/* draft overlay */}
      {isDraft && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
        >
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(107,114,128,0.85)', color: '#fff', fontSize: 8, fontFamily: '"Century Gothic", sans-serif' }}
          >
            <Archive className="w-2 h-2" /> Brouillon
          </div>
          {isOwner && (
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 9, fontFamily: '"Century Gothic", sans-serif', boxShadow: '0 3px 10px rgba(124,58,237,0.5)' }}
              onClick={(e) => { e.stopPropagation(); onPublish(); }}
            >
              <Globe className="w-2.5 h-2.5" /> Publier
            </button>
          )}
        </div>
      )}

      {/* delete button */}
      {isOwner && (
        <button
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="w-2.5 h-2.5 text-white" />
        </button>
      )}
    </div>
  );
}
