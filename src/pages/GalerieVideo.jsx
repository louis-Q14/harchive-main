// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { shortsService } from "@/api/liveService";
import { uploadFile } from "@/api/uploadService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Video,
  Upload,
  Heart,
  Trash2,
  Loader2,
  X,
  Plus,
  Play,
  Search,
  Eye,
  MessageCircle,
  Film
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

export default function GalerieVideo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all | mes-videos
  const [formData, setFormData] = useState({ titre: "", description: "" });
  const fileInputRef = useRef(null);

  // Load all published shorts (public feed)
  const { data: allVideos = [], isLoading: loadingAll } = useQuery({
    queryKey: ['galerie-video-all'],
    queryFn: () => user ? shortsService.getFeed(100) : shortsService.getPublicFeed(100),
    staleTime: 1000 * 30,
  });

  // Load user's own shorts
  const { data: mesVideos = [], isLoading: loadingMes } = useQuery({
    queryKey: ['galerie-video-mes', user?.id],
    queryFn: () => shortsService.getUserShorts(user.id),
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => shortsService.deleteShort(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galerie-video-all'] });
      queryClient.invalidateQueries({ queryKey: ['galerie-video-mes'] });
      queryClient.invalidateQueries({ queryKey: ['shorts-feed'] });
      toast.success("Vidéo supprimée");
    },
    onError: (err) => toast.error(err.message || "Erreur suppression"),
  });

  const toggleLikeMutation = useMutation({
    mutationFn: (id) => shortsService.toggleLike(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galerie-video-all'] });
      queryClient.invalidateQueries({ queryKey: ['galerie-video-mes'] });
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error("Veuillez sélectionner un fichier vidéo (mp4, webm...)");
      return;
    }
    if (file.size > 150 * 1024 * 1024) {
      toast.error("Fichier trop volumineux. Maximum 150 MB.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (!formData.titre) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
      setFormData(fd => ({ ...fd, titre: nameWithoutExt }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);
    try {
      // Upload video file to persistent volume
      const uploaded = await uploadFile(selectedFile, 'posts');

      // Create short video entry
      await shortsService.create({
        titre: formData.titre.trim() || selectedFile.name,
        description: formData.description.trim(),
        video_url: uploaded.url,
        duration: 0,
        width: 0,
        height: 0,
        tags: [],
      });

      queryClient.invalidateQueries({ queryKey: ['galerie-video-all'] });
      queryClient.invalidateQueries({ queryKey: ['galerie-video-mes'] });
      queryClient.invalidateQueries({ queryKey: ['shorts-feed'] });

      resetForm();
      toast.success("Vidéo publiée avec succès !");
    } catch (err) {
      console.error("Erreur upload vidéo:", err);
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setUploadDialogOpen(false);
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

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#3d3d3d' }}>
              <Film className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white" style={CG}>Galerie Vidéo</h1>
              <p className="text-gray-400" style={CG}>{filtered.length} vidéo{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {user && (
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
              style={CG}
            >
              <Plus className="w-4 h-4 mr-2" />
              Publier une vidéo
            </Button>
          )}
        </div>

        {/* Tabs + Search */}
        <Card style={{ backgroundColor: '#3d3d3d', borderColor: '#2d2d2d' }}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Tabs */}
              <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: '#2d2d2d' }}>
                <button
                  onClick={() => setActiveTab("all")}
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    ...CG,
                    backgroundColor: activeTab === "all" ? '#6b21a8' : 'transparent',
                    color: activeTab === "all" ? '#fff' : '#b0b0b0',
                  }}
                >
                  Toutes les vidéos
                </button>
                {user && (
                  <button
                    onClick={() => setActiveTab("mes-videos")}
                    className="px-4 py-2 text-sm font-medium transition-colors"
                    style={{
                      ...CG,
                      backgroundColor: activeTab === "mes-videos" ? '#6b21a8' : 'transparent',
                      color: activeTab === "mes-videos" ? '#fff' : '#b0b0b0',
                    }}
                  >
                    Mes vidéos
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher une vidéo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{ backgroundColor: '#2d2d2d', borderColor: '#404040', color: '#fff', ...CG }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Film className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg" style={CG}>
              {activeTab === "mes-videos" ? "Vous n'avez pas encore publié de vidéo" : "Aucune vidéo publiée"}
            </p>
            {user && (
              <Button
                onClick={() => setUploadDialogOpen(true)}
                className="mt-4 bg-purple-600 hover:bg-purple-700"
                style={CG}
              >
                <Plus className="w-4 h-4 mr-2" />
                Publier une vidéo
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg" style={{ backgroundColor: '#2d2d2d', border: '1px solid #4d4d4d', color: '#fff' }}>
          <DialogHeader>
            <DialogTitle style={{ ...CG, color: '#fff' }}>
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" />
                Publier une vidéo
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4" style={CG}>
            {/* File drop zone */}
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-purple-500 transition-colors"
              style={{ borderColor: '#4d4d4d', backgroundColor: '#1d1d1d' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <video
                  src={previewUrl}
                  className="max-h-48 mx-auto rounded-lg"
                  controls
                  style={{ maxWidth: '100%' }}
                />
              ) : (
                <>
                  <Video className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">Cliquez pour sélectionner une vidéo</p>
                  <p className="text-gray-600 text-xs mt-1">MP4, WebM — max 150 MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="space-y-1.5">
              <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
              <Input
                placeholder="Titre de la vidéo"
                value={formData.titre}
                onChange={(e) => setFormData(fd => ({ ...fd, titre: e.target.value }))}
                style={{ backgroundColor: '#1d1d1d', color: '#fff', borderColor: '#4d4d4d', ...CG }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
              <Textarea
                placeholder="Description de la vidéo..."
                value={formData.description}
                onChange={(e) => setFormData(fd => ({ ...fd, description: e.target.value }))}
                rows={3}
                style={{ backgroundColor: '#1d1d1d', color: '#fff', borderColor: '#4d4d4d', ...CG }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={resetForm}
              style={{ color: '#b0b0b0', ...CG }}
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="bg-purple-600 hover:bg-purple-700"
              style={CG}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi en cours...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Publier</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden"
          style={{ backgroundColor: '#000', border: '1px solid #333' }}
        >
          {currentVideo && (
            <div className="relative">
              <video
                src={resolveUrl(currentVideo.video_url)}
                controls
                autoPlay
                className="w-full"
                style={{ maxHeight: '70vh', backgroundColor: '#000' }}
              />
              <div className="p-4" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate" style={CG}>
                      {currentVideo.titre || 'Sans titre'}
                    </h3>
                    {currentVideo.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2" style={CG}>
                        {currentVideo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-gray-500 text-xs" style={CG}>
                        Par {currentVideo.creator_nom}
                      </span>
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {currentVideo.views || 0}
                      </span>
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {Array.isArray(currentVideo.likes) ? currentVideo.likes.length : (currentVideo.nb_likes || 0)}
                      </span>
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {currentVideo.nb_commentaires || 0}
                      </span>
                    </div>
                  </div>
                  {user?.id === currentVideo.creator_id && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        deleteMutation.mutate(currentVideo.id);
                        setPlayerOpen(false);
                      }}
                    >
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

/* ─── Video Card ─── */
function VideoCard({ video, currentUserId, onPlay, onDelete, onLike }) {
  const videoRef = useRef(null);
  const isOwner = currentUserId && video.creator_id === currentUserId;
  const likeCount = Array.isArray(video.likes) ? video.likes.length : (video.nb_likes || 0);
  const isLiked = Array.isArray(video.likes) && video.likes.includes(currentUserId);

  const videoSrc = resolveUrl(video.video_url);

  return (
    <div
      className="group relative overflow-hidden cursor-pointer rounded-lg"
      style={{ backgroundColor: '#2d2d2d', aspectRatio: '9/16' }}
    >
      {/* Video thumbnail (first frame) */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-cover"
        preload="metadata"
        muted
        onMouseEnter={() => { videoRef.current?.play(); }}
        onMouseLeave={() => { videoRef.current?.pause(); videoRef.current && (videoRef.current.currentTime = 0); }}
        onClick={onPlay}
      />

      {/* Play overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-opacity"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}
        onClick={onPlay}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-7 h-7 text-white ml-1" fill="white" />
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-xs font-semibold truncate" style={{ fontFamily: '"Century Gothic", sans-serif' }}>
            {video.titre || 'Sans titre'}
          </p>
          <p className="text-gray-300 text-xs truncate opacity-80">{video.creator_nom}</p>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onLike(); }}
              className="flex items-center gap-1 text-xs transition-colors hover:text-red-400"
              style={{ color: isLiked ? '#ff4458' : '#ccc' }}
            >
              <Heart className="w-3 h-3" fill={isLiked ? '#ff4458' : 'none'} />
              {likeCount}
            </button>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Eye className="w-3 h-3" /> {video.views || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Delete button (owner only) */}
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
