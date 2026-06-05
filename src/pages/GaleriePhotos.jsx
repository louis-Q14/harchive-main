import React, { useState, useEffect } from "react";
import { authService, dataService, functionService, uploadService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import {
  Image,
  Upload,
  Heart,
  Trash2,
  Loader2,
  X,
  Plus,
  Eye,
  EyeOff,
  Users,
  Search,
  Grid,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderOpen
} from "lucide-react";
import { toast } from "sonner";

// Parse JSON string safely into array
function parseLikes(likes) {
  if (Array.isArray(likes)) return likes;
  if (typeof likes === 'string') {
    try { const parsed = JSON.parse(likes); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

export default function GaleriePhotos() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAlbum, setFilterAlbum] = useState("all");
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    album: "",
    visibilite: "privee"
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

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

  const { data: mesPhotos = [], isLoading: loadingPhotos } = useQuery({
    queryKey: ['mes-photos', user?.email],
    queryFn: () => dataService.query('Photo', { filters: [{ created_by: user.email }] }),
    enabled: !!user?.email
  });

  const createPhotoMutation = useMutation({
    mutationFn: (data) => dataService.create('Photo', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-photos'] });
      resetForm();
      toast.success("Photo ajoutée!");
    }
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (id) => dataService.delete('Photo', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-photos'] });
      toast.success("Photo supprimée");
    }
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ photoId, visibilite }) => {
      return dataService.update('Photo', photoId, { visibilite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-photos'] });
      toast.success("Visibilité modifiée");
    }
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ photo, userId }) => {
      const likes = parseLikes(photo.likes);
      const newLikes = likes.includes(userId)
        ? likes.filter(id => id !== userId)
        : [...likes, userId];
      return dataService.update('Photo', photo.id, { likes: newLikes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-photos'] });
    }
  });

  const resetForm = () => {
    setUploadDialogOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData({ titre: "", description: "", album: "", visibilite: "privee" });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Veuillez sélectionner une image");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const uploadResult = await uploadService.uploadFile(selectedFile, 'galerie');
      const imageUrl = uploadResult.url;
      
      await createPhotoMutation.mutateAsync({
        titre: formData.titre || selectedFile.name,
        description: formData.description,
        image_url: imageUrl,
        album: formData.album || "Sans album",
        visibilite: formData.visibilite,
        likes: [],
        created_by: user.email
      });
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error(error.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const openViewer = (index) => {
    setCurrentPhotoIndex(index);
    setViewerOpen(true);
  };

  const navigatePhoto = (direction) => {
    const filteredPhotos = getFilteredPhotos();
    if (direction === 'prev') {
      setCurrentPhotoIndex(prev => prev === 0 ? filteredPhotos.length - 1 : prev - 1);
    } else {
      setCurrentPhotoIndex(prev => prev === filteredPhotos.length - 1 ? 0 : prev + 1);
    }
  };

  const getFilteredPhotos = () => {
    return mesPhotos.filter(photo => {
      const matchSearch = !searchQuery || 
        photo.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.album?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchAlbum = filterAlbum === "all" || photo.album === filterAlbum;
      return matchSearch && matchAlbum;
    });
  };

  const albums = [...new Set(mesPhotos.map(p => p.album).filter(Boolean))];
  const filteredPhotos = getFilteredPhotos();
  const currentPhoto = filteredPhotos[currentPhotoIndex];

  const getVisibilityIcon = (visibilite) => {
    switch (visibilite) {
      case 'publique': return <Eye className="w-3 h-3" />;
      case 'amis': return <Users className="w-3 h-3" />;
      default: return <EyeOff className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--ha-bg)' }}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--ha-bg)' }}>
      <div className="w-full px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--ha-surface)' }}>
              <img src="/assets/icons/6db68e5c5_photos.png" alt="Galerie" className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Ma Galerie Photos</h1>
              <p className="text-gray-400">{mesPhotos.length} photo(s)</p>
            </div>
          </div>
          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une photo
          </Button>
        </div>

        {/* Filtres */}
        <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{ backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)' }}
                />
              </div>
              <Select value={filterAlbum} onValueChange={setFilterAlbum}>
                <SelectTrigger className="w-full md:w-48" style={{ backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)' }}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Album" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les albums</SelectItem>
                  {albums.map(album => (
                    <SelectItem key={album} value={album}>{album}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Galerie */}
        {loadingPhotos ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-16">
            <Image className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Aucune photo</p>
            <p className="text-gray-500 text-sm mt-1">Commencez par ajouter vos premières photos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden cursor-pointer"
                style={{ backgroundColor: 'var(--ha-surface2)' }}
                onClick={() => openViewer(index)}
              >
                <img
                  src={photo.image_url}
                  alt={photo.titre}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white font-medium text-sm truncate">{photo.titre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="text-xs" style={{ backgroundColor: 'var(--ha-surface)' }}>
                        {getVisibilityIcon(photo.visibilite)}
                        <span className="ml-1">{photo.visibilite}</span>
                      </Badge>
                      <span className="text-xs text-gray-300 flex items-center gap-1">
                        <Heart className={`w-3 h-3 ${parseLikes(photo.likes).includes(user?.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        {parseLikes(photo.likes).length}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-8 h-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePhotoMutation.mutate(photo.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog d'upload */}
      <DraggableDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}
        title={<div style={CG}>
          <div className="text-base font-semibold text-white flex items-center gap-2"><Upload className="w-5 h-5 text-purple-400" /> Ajouter une photo</div>
          <div className="text-xs mt-0.5" style={{color: 'var(--ha-text-muted)'}}>Sélectionnez une image et remplissez les détails</div>
        </div>}
        maxWidth="max-w-lg">
        <DraggableDialogBody>
          <div className="grid gap-4" style={CG}>
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-purple-500 transition-colors"
              style={{ borderColor: 'var(--ha-border)', backgroundColor: 'var(--ha-surface2)' }}
              onClick={() => document.getElementById('photo-input').click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
              ) : (
                <>
                  <Image className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">Cliquez pour sélectionner une image</p>
                </>
              )}
            </div>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="space-y-1.5">
              <Label className="text-white text-xs font-medium" style={CG}>Titre</Label>
              <Input
                placeholder="Titre de la photo"
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
              <Textarea
                placeholder="Description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white text-xs font-medium" style={CG}>Album</Label>
                <Input
                  placeholder="Nom de l'album"
                  value={formData.album}
                  onChange={(e) => setFormData({ ...formData, album: e.target.value })}
                  style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white text-xs font-medium" style={CG}>Visibilité</Label>
                <Select value={formData.visibilite} onValueChange={(v) => setFormData({ ...formData, visibilite: v })}>
                  <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="privee">Privée</SelectItem>
                    <SelectItem value="amis">Amis</SelectItem>
                    <SelectItem value="publique">Publique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <Button variant="outline" onClick={resetForm} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>Annuler</Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            style={CG}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            {uploading ? "Upload..." : "Ajouter"}
          </Button>
        </DraggableDialogFooter>
      </DraggableDialog>

      {/* Visionneuse (nouveau design) */}
      <DraggableDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        title={
          currentPhoto && (
            <div style={CG} className="flex items-center gap-2">
              <span className="text-base font-semibold text-white">{currentPhoto.titre}</span>
              <span className="text-xs text-gray-300">Aperçu de la photo</span>
            </div>
          )
        }
        maxWidth="max-w-3xl"
      >
        {currentPhoto && (
          <DraggableDialogBody>
            <div className="relative flex flex-col items-center">
              {/* Navigation gauche */}
              <Button
                variant="ghost"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 hover:bg-white/10"
                onClick={() => navigatePhoto('prev')}
                aria-label="Précédent"
              >
                <ChevronLeft className="w-7 h-7" />
              </Button>
              {/* Image */}
              <div className="flex justify-center items-center w-full" style={{ minHeight: '50vh' }}>
                <img
                  src={currentPhoto.image_url}
                  alt={currentPhoto.titre}
                  style={{ maxHeight: '50vh', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
              {/* Navigation droite */}
              <Button
                variant="ghost"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:bg-white/10"
                onClick={() => navigatePhoto('next')}
                aria-label="Suivant"
              >
                <ChevronRight className="w-7 h-7" />
              </Button>
              {/* Infos */}
              <div className="w-full mt-4">
                {currentPhoto.description && (
                  <p className="text-gray-300 mb-2 text-sm">{currentPhoto.description}</p>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-gray-700 text-gray-100">{currentPhoto.album}</Badge>
                  <Select
                    value={currentPhoto.visibilite || 'privee'}
                    onValueChange={(val) => updateVisibilityMutation.mutate({ photoId: currentPhoto.id, visibilite: val })}
                  >
                    <SelectTrigger className="w-36 h-7 text-xs" style={{ backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)', color: 'var(--ha-text-muted)' }}>
                      <div className="flex items-center gap-1">
                        {getVisibilityIcon(currentPhoto.visibilite)}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="privee">Privée</SelectItem>
                      <SelectItem value="publique">Publique</SelectItem>
                      <SelectItem value="amis">Amis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </DraggableDialogBody>
        )}
        {currentPhoto && (
          <DraggableDialogFooter>
            <Button
              variant="ghost"
              className="text-gray-300 hover:bg-white/10"
              onClick={() => toggleLikeMutation.mutate({ photo: currentPhoto, userId: user.id })}
            >
              <Heart className={`w-5 h-5 ${parseLikes(currentPhoto.likes).includes(user?.id) ? 'fill-red-500 text-red-500' : ''}`} />
              <span className="ml-1">{parseLikes(currentPhoto.likes).length}</span>
            </Button>
            <a href={currentPhoto.image_url} download target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" className="text-gray-300 hover:bg-white/10">
                <Download className="w-5 h-5" />
              </Button>
            </a>
            <Button variant="outline" onClick={() => setViewerOpen(false)} className="ml-auto bg-white/10 border-gray-500 text-gray-200 hover:bg-white/20" style={CG}>Fermer</Button>
          </DraggableDialogFooter>
        )}
      </DraggableDialog>
    </div>
  );
}
