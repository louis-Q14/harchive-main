import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clipboard,
  Plus,
  Search,
  Star,
  Pin,
  Copy,
  Trash2,
  Edit2,
  Tag,
  Download,
  Upload,
  Link as LinkIcon,
  Mail,
  Phone,
  Code,
  FileText,
  Filter,
  TrendingUp,
  BarChart3,
  X,
  Check,
  Loader2,
  QrCode,
  Share2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const COULEURS = {
  gray: { bg: "#e5e7eb", border: "#6b7280", text: "#374151" },
  blue: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  green: { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
  yellow: { bg: "#fef3c7", border: "#eab308", text: "#713f12" },
  red: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
  purple: { bg: "#e9d5ff", border: "#a855f7", text: "#6b21a8" },
  pink: { bg: "#fce7f3", border: "#ec4899", text: "#831843" },
  orange: { bg: "#fed7aa", border: "#f97316", text: "#9a3412" }
};

const CATEGORIES = [
  { value: "personnel", label: "Personnel", icon: "👤" },
  { value: "travail", label: "Travail", icon: "💼" },
  { value: "code", label: "Code", icon: "💻" },
  { value: "liens", label: "Liens", icon: "🔗" },
  { value: "contacts", label: "Contacts", icon: "📞" },
  { value: "snippet", label: "Snippet", icon: "📝" },
  { value: "autre", label: "Autre", icon: "📌" }
];

const detectType = (content) => {
  const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[\d\s\+\-\(\)]+$/;
  
  if (urlPattern.test(content)) return "url";
  if (emailPattern.test(content)) return "email";
  if (phonePattern.test(content) && content.length >= 8) return "telephone";
  if (content.includes('{') || content.includes('function') || content.includes('const ')) return "code";
  return "texte";
};

const getTypeIcon = (type) => {
  const icons = {
    url: LinkIcon,
    email: Mail,
    telephone: Phone,
    code: Code,
    texte: FileText,
    autre: Clipboard
  };
  return icons[type] || FileText;
};

export default function PressePapier() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("toutes");
  const [filterType, setFilterType] = useState("tous");
  const [activeTab, setActiveTab] = useState("tous");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClip, setSelectedClip] = useState(null);
  const [showStats, setShowStats] = useState(false);
  
  const [formData, setFormData] = useState({
    contenu: "",
    titre: "",
    notes: "",
    categorie: "personnel",
    tags: [],
    couleur: "gray",
    snippet: false
  });
  
  const [newTag, setNewTag] = useState("");
  
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

  const { data: clips = [] } = useQuery({
    queryKey: ['clips', user?.id],
    queryFn: async () => {
      const allClips = await base44.entities.PressePapier.list('-created_date');
      return allClips.filter(c => c.created_by === user.email);
    },
    enabled: !!user
  });

  const createClipMutation = useMutation({
    mutationFn: (clipData) => dataService.create('PressePapier', {
      ...clipData,
      type: detectType(clipData.contenu),
      nombre_utilisations: 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      resetForm();
      setOpenDialog(false);
    }
  });

  const updateClipMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('PressePapier', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    }
  });

  const deleteClipMutation = useMutation({
    mutationFn: (id) => dataService.delete('PressePapier', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    }
  });

  const resetForm = () => {
    setFormData({
      contenu: "",
      titre: "",
      notes: "",
      categorie: "personnel",
      tags: [],
      couleur: "gray",
      snippet: false
    });
    setSelectedClip(null);
  };

  const handleEdit = (clip) => {
    setSelectedClip(clip);
    setFormData({
      contenu: clip.contenu,
      titre: clip.titre || "",
      notes: clip.notes || "",
      categorie: clip.categorie,
      tags: clip.tags || [],
      couleur: clip.couleur || "gray",
      snippet: clip.snippet || false
    });
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.contenu.trim()) return;

    if (selectedClip) {
      updateClipMutation.mutate({ 
        id: selectedClip.id, 
        data: formData 
      });
      setOpenDialog(false);
    } else {
      createClipMutation.mutate(formData);
    }
  };

  const handleCopy = async (clip) => {
    try {
      await navigator.clipboard.writeText(clip.contenu);
      updateClipMutation.mutate({
        id: clip.id,
        data: {
          nombre_utilisations: (clip.nombre_utilisations || 0) + 1,
          derniere_utilisation: new Date().toISOString()
        }
      });
      alert("Copié !");
    } catch (error) {
      console.error("Erreur copie:", error);
    }
  };

  const toggleFavorite = (clip) => {
    updateClipMutation.mutate({
      id: clip.id,
      data: { favori: !clip.favori }
    });
  };

  const togglePin = (clip) => {
    updateClipMutation.mutate({
      id: clip.id,
      data: { epingle: !clip.epingle }
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tagToRemove)
    });
  };

  const exportClips = () => {
    const data = JSON.stringify(clips, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presse-papier.json';
    a.click();
  };

  const filteredClips = clips.filter(clip => {
    const matchesSearch = searchQuery === "" || 
      clip.contenu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = filterCategory === "toutes" || clip.categorie === filterCategory;
    const matchesType = filterType === "tous" || clip.type === filterType;
    
    let matchesTab = true;
    if (activeTab === "favoris") matchesTab = clip.favori;
    if (activeTab === "epingles") matchesTab = clip.epingle;
    if (activeTab === "snippets") matchesTab = clip.snippet;
    
    return matchesSearch && matchesCategory && matchesType && matchesTab;
  });

  const sortedClips = [...filteredClips].sort((a, b) => {
    if (a.epingle && !b.epingle) return -1;
    if (!a.epingle && b.epingle) return 1;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const stats = {
    total: clips.length,
    favoris: clips.filter(c => c.favori).length,
    snippets: clips.filter(c => c.snippet).length,
    utilises: clips.reduce((sum, c) => sum + (c.nombre_utilisations || 0), 0),
    parType: clips.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {})
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#4d4d4d'}}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: '#4d4d4d'}}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img 
                src="/assets/icons/a40a38617_clipboard.png"
                alt="Presse-papier"
                className="w-12 h-12"
              />
              <div>
                <h1 className="text-3xl font-bold text-white">Presse-papier</h1>
                <p className="text-gray-300">Gérez votre historique de copier-coller</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowStats(!showStats)} variant="outline" style={{backgroundColor: '#333333', color: '#ffffff'}}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Stats
              </Button>
              <Button onClick={exportClips} variant="outline" style={{backgroundColor: '#333333', color: '#ffffff'}}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => {
                resetForm();
                setOpenDialog(true);
              }} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau clip
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white/10 border-white/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clipboard className="w-8 h-8 text-blue-400" />
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.total}</p>
                      <p className="text-sm text-gray-300">Total clips</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Star className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.favoris}</p>
                      <p className="text-sm text-gray-300">Favoris</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.snippets}</p>
                      <p className="text-sm text-gray-300">Snippets</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-purple-400" />
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.utilises}</p>
                      <p className="text-sm text-gray-300">Utilisations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="tous">Tous ({clips.length})</TabsTrigger>
              <TabsTrigger value="favoris">Favoris ({clips.filter(c => c.favori).length})</TabsTrigger>
              <TabsTrigger value="epingles">Épinglés ({clips.filter(c => c.epingle).length})</TabsTrigger>
              <TabsTrigger value="snippets">Snippets ({clips.filter(c => c.snippet).length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtres */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher dans les clips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes catégories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous types</SelectItem>
                <SelectItem value="texte">📝 Texte</SelectItem>
                <SelectItem value="url">🔗 URL</SelectItem>
                <SelectItem value="email">📧 Email</SelectItem>
                <SelectItem value="telephone">📞 Téléphone</SelectItem>
                <SelectItem value="code">💻 Code</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Liste des clips */}
        {sortedClips.length === 0 ? (
          <Card className="bg-white/10 border-white/20">
            <CardContent className="py-12 text-center">
              <Clipboard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">Aucun clip trouvé</p>
              <p className="text-sm text-gray-400">Créez votre premier clip pour commencer</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sortedClips.map(clip => {
              const TypeIcon = getTypeIcon(clip.type);
              const couleur = COULEURS[clip.couleur];
              
              return (
                <Card 
                  key={clip.id} 
                  className="bg-white/10 border-white/20 hover:bg-white/15 transition-all"
                  style={{borderLeftWidth: '4px', borderLeftColor: couleur.border}}
                >
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <TypeIcon className="w-4 h-4 text-gray-400" />
                            {clip.titre && (
                              <h3 className="font-semibold text-white">{clip.titre}</h3>
                            )}
                            {clip.epingle && <Pin className="w-4 h-4 text-orange-400 fill-orange-400" />}
                            {clip.favori && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                            {clip.snippet && <Badge className="bg-green-600">Snippet</Badge>}
                            <Badge variant="outline">{CATEGORIES.find(c => c.value === clip.categorie)?.label}</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleFavorite(clip)}
                              className="text-gray-300 hover:text-yellow-400"
                            >
                              <Star className={`w-4 h-4 ${clip.favori ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => togglePin(clip)}
                              className="text-gray-300 hover:text-orange-400"
                            >
                              <Pin className={`w-4 h-4 ${clip.epingle ? 'fill-orange-400 text-orange-400' : ''}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopy(clip)}
                              className="text-gray-300 hover:text-blue-400"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(clip)}
                              className="text-gray-300 hover:text-green-400"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Supprimer ce clip ?")) {
                                  deleteClipMutation.mutate(clip.id);
                                }
                              }}
                              className="text-gray-300 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-white mb-2 font-mono text-sm whitespace-pre-wrap break-all">
                          {clip.contenu.length > 200 
                            ? clip.contenu.substring(0, 200) + '...' 
                            : clip.contenu}
                        </p>
                        
                        {clip.notes && (
                          <p className="text-gray-400 text-sm mb-2">{clip.notes}</p>
                        )}
                        
                        {clip.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {clip.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>{format(new Date(clip.created_date), "PPP 'à' HH:mm", { locale: fr })}</span>
                          {clip.nombre_utilisations > 0 && (
                            <span>🔄 {clip.nombre_utilisations} utilisation{clip.nombre_utilisations > 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog Ajout/Modification */}
        <DraggableDialog open={openDialog} onOpenChange={setOpenDialog} title={selectedClip ? "Modifier le clip" : "Nouveau clip"} resizable={false}>
          <DraggableDialogBody>
            <div className="space-y-4">
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Titre (optionnel)</Label>
                <Input
                  placeholder="Titre du clip"
                  value={formData.titre}
                  onChange={(e) => setFormData({...formData, titre: e.target.value})}
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Contenu *</Label>
                <Textarea
                  placeholder="Collez votre contenu ici..."
                  value={formData.contenu}
                  onChange={(e) => setFormData({...formData, contenu: e.target.value})}
                  rows={6}
                  className="font-mono"
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Notes</Label>
                <Textarea
                  placeholder="Notes sur ce clip"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Catégorie</Label>
                  <Select value={formData.categorie} onValueChange={(val) => setFormData({...formData, categorie: val})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Couleur</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.keys(COULEURS).map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({...formData, couleur: color})}
                        className={`w-full h-10 rounded-lg border-2 ${
                          formData.couleur === color ? 'border-gray-800' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: COULEURS[color].bg }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Ajouter un tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                  />
                  <Button onClick={addTag} type="button">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.snippet}
                  onChange={(e) => setFormData({...formData, snippet: e.target.checked})}
                />
                <span className="text-white" style={CG}>Marquer comme snippet réutilisable</span>
              </label>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
                <Button variant="outline" onClick={() => setOpenDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG}}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit} className="bg-orange-600 hover:bg-orange-700 text-white" style={CG}>
                  {selectedClip ? "Modifier" : "Créer"}
                </Button>
          </DraggableDialogFooter>
        </DraggableDialog>
      </div>
    </div>
  );
}
