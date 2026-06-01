import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Label } from "@/components/ui/label";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Star, 
  Archive, 
  Trash2, 
  Edit2, 
  Pin, 
  Grid3x3, 
  List,
  Tag,
  Download,
  X,
  Check,
  Calendar,
  Loader2,
  FileText,
  Clock,
  StickyNote
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const COULEURS = {
  yellow: { bg: "#fef3c7", border: "#fbbf24", text: "#78350f" },
  blue: { bg: "#dbeafe", border: "#60a5fa", text: "#1e3a8a" },
  green: { bg: "#d1fae5", border: "#34d399", text: "#065f46" },
  pink: { bg: "#fce7f3", border: "#f472b6", text: "#831843" },
  purple: { bg: "#e9d5ff", border: "#a855f7", text: "#581c87" },
  orange: { bg: "#fed7aa", border: "#fb923c", text: "#7c2d12" },
  red: { bg: "#fee2e2", border: "#f87171", text: "#7f1d1d" },
  gray: { bg: "#e5e7eb", border: "#9ca3af", text: "#1f2937" }
};

const CATEGORIES = [
  { value: "personnel", label: "Personnel", icon: "👤" },
  { value: "travail", label: "Travail", icon: "💼" },
  { value: "etudes", label: "Études", icon: "📚" },
  { value: "idees", label: "Idées", icon: "💡" },
  { value: "taches", label: "Tâches", icon: "✓" },
  { value: "autre", label: "Autre", icon: "📝" }
];

export default function BlocNotes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedCategory, setSelectedCategory] = useState("toutes");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    titre: "",
    contenu: "",
    categorie: "personnel",
    couleur: "yellow",
    tags: [],
    favori: false,
    epingle: false,
    date_rappel: null,
    liste_taches: []
  });
  const [newTag, setNewTag] = useState("");
  const [newTask, setNewTask] = useState("");

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

  // Charger les notes
  const { data: notes = [] } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      const allNotes = await base44.entities.Note.list('-updated_date');
      return allNotes.filter(n => n.created_by === user.email);
    },
    enabled: !!user
  });

  // Mutations
  const createNoteMutation = useMutation({
    mutationFn: (noteData) => dataService.create('Note', noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      resetForm();
      setOpenDialog(false);
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('Note', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => dataService.delete('Note', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const resetForm = () => {
    setFormData({
      titre: "",
      contenu: "",
      categorie: "personnel",
      couleur: "yellow",
      tags: [],
      favori: false,
      epingle: false,
      date_rappel: null,
      liste_taches: []
    });
    setSelectedNote(null);
    setNewTag("");
    setNewTask("");
  };

  const handleEdit = (note) => {
    setSelectedNote(note);
    setFormData({
      titre: note.titre,
      contenu: note.contenu,
      categorie: note.categorie,
      couleur: note.couleur,
      tags: note.tags || [],
      favori: note.favori,
      epingle: note.epingle,
      date_rappel: note.date_rappel,
      liste_taches: note.liste_taches || []
    });
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.titre.trim()) return;

    if (selectedNote) {
      updateNoteMutation.mutate({ id: selectedNote.id, data: formData });
    } else {
      createNoteMutation.mutate(formData);
    }
  };

  const toggleFavorite = (note) => {
    updateNoteMutation.mutate({
      id: note.id,
      data: { ...note, favori: !note.favori }
    });
  };

  const togglePin = (note) => {
    updateNoteMutation.mutate({
      id: note.id,
      data: { ...note, epingle: !note.epingle }
    });
  };

  const toggleArchive = (note) => {
    updateNoteMutation.mutate({
      id: note.id,
      data: { ...note, archive: !note.archive }
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tagToRemove)
    });
  };

  const addTask = () => {
    if (newTask.trim()) {
      setFormData({
        ...formData,
        liste_taches: [...formData.liste_taches, { texte: newTask.trim(), complete: false }]
      });
      setNewTask("");
    }
  };

  const toggleTask = (index) => {
    const newTasks = [...formData.liste_taches];
    newTasks[index].complete = !newTasks[index].complete;
    setFormData({ ...formData, liste_taches: newTasks });
  };

  const removeTask = (index) => {
    setFormData({
      ...formData,
      liste_taches: formData.liste_taches.filter((_, i) => i !== index)
    });
  };

  const exportNote = (note) => {
    const content = `${note.titre}\n\n${note.contenu}\n\nCatégorie: ${note.categorie}\nCréé le: ${format(new Date(note.created_date), 'PPP', { locale: fr })}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.titre}.txt`;
    a.click();
  };

  // Filtrer les notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.contenu.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "toutes" || note.categorie === selectedCategory;
    const matchesArchive = showArchived ? note.archive : !note.archive;
    return matchesSearch && matchesCategory && matchesArchive;
  });

  // Trier par épinglé puis par date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.epingle && !b.epingle) return -1;
    if (!a.epingle && b.epingle) return 1;
    return new Date(b.updated_date) - new Date(a.updated_date);
  });

  const stats = {
    total: notes.filter(n => !n.archive).length,
    favorites: notes.filter(n => n.favori && !n.archive).length,
    archived: notes.filter(n => n.archive).length,
    withReminders: notes.filter(n => n.date_rappel && !n.archive).length
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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img 
                src="/assets/icons/e9df37227_agenda2.png"
                alt="Bloc-notes"
                className="w-12 h-12"
              />
              <div>
                <h1 className="text-3xl font-bold text-white">Bloc-notes</h1>
                <p className="text-gray-300">Organisez vos idées et pensées</p>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setOpenDialog(true); }} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle note
                </Button>
          </div>

          <DraggableDialog open={openDialog} onOpenChange={setOpenDialog}
            title={<div style={CG}>
              <div className="text-base font-semibold text-white">{selectedNote ? "Modifier la note" : "Créer une note"}</div>
              <div className="text-xs mt-0.5" style={{color: '#b0b0b0'}}>Organisez vos idées et pensées</div>
            </div>}
            maxWidth="max-w-2xl" resizable={false}>
            <DraggableDialogBody>
              <div className="grid gap-4" style={CG}>
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
                  <Input
                    placeholder="Titre de la note"
                    value={formData.titre}
                    onChange={(e) => setFormData({...formData, titre: e.target.value})}
                    style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Contenu</Label>
                  <Textarea
                    placeholder="Contenu de la note..."
                    value={formData.contenu}
                    onChange={(e) => setFormData({...formData, contenu: e.target.value})}
                    className="min-h-[200px]"
                    style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white text-xs font-medium" style={CG}>Catégorie</Label>
                    <Select value={formData.categorie} onValueChange={(val) => setFormData({...formData, categorie: val})}>
                      <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}>
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

                  <div className="space-y-1.5">
                    <Label className="text-white text-xs font-medium" style={CG}>Couleur</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.keys(COULEURS).map(color => (
                        <button
                          key={color}
                          onClick={() => setFormData({...formData, couleur: color})}
                          className={`w-10 h-10 rounded-lg border-2 ${
                            formData.couleur === color ? 'border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: COULEURS[color].bg }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Ajouter un tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                    />
                    <Button onClick={addTag} size="sm" style={{backgroundColor:'rgba(255,255,255,0.1)', color:'#fff'}}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, i) => (
                      <Badge key={i} style={{backgroundColor:'rgba(139,92,246,0.3)', color:'#c4b5fd'}}>
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-2">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Liste de tâches */}
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Liste de tâches</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Ajouter une tâche"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTask()}
                      style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                    />
                    <Button onClick={addTask} size="sm" style={{backgroundColor:'rgba(255,255,255,0.1)', color:'#fff'}}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.liste_taches.map((task, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={task.complete}
                          onChange={() => toggleTask(i)}
                          className="w-4 h-4"
                          style={{ accentColor: '#3b82f6' }}
                        />
                        <span className={task.complete ? "line-through text-gray-500" : "text-white"} style={CG}>
                          {task.texte}
                        </span>
                        <button onClick={() => removeTask(i)} className="ml-auto text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-white" style={CG}>
                    <input
                      type="checkbox"
                      checked={formData.favori}
                      onChange={(e) => setFormData({...formData, favori: e.target.checked})}
                      style={{ accentColor: '#3b82f6' }}
                    />
                    <Star className="w-4 h-4" />
                    <span>Favori</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-white" style={CG}>
                    <input
                      type="checkbox"
                      checked={formData.epingle}
                      onChange={(e) => setFormData({...formData, epingle: e.target.checked})}
                      style={{ accentColor: '#3b82f6' }}
                    />
                    <Pin className="w-4 h-4" />
                    <span>Épingler</span>
                  </label>
                </div>
              </div>
            </DraggableDialogBody>
            <DraggableDialogFooter>
              <Button variant="outline" onClick={() => setOpenDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG}}>Annuler</Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
                {selectedNote ? "Modifier" : "Créer"}
              </Button>
            </DraggableDialogFooter>
          </DraggableDialog>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/10 border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <p className="text-sm text-gray-300">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Star className="w-8 h-8 text-yellow-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.favorites}</p>
                    <p className="text-sm text-gray-300">Favoris</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Archive className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.archived}</p>
                    <p className="text-sm text-gray-300">Archives</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.withReminders}</p>
                    <p className="text-sm text-gray-300">Rappels</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtres et recherche */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher dans les notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les catégories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={showArchived ? "default" : "outline"}
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="w-4 h-4 mr-2" />
                {showArchived ? "Actives" : "Archives"}
              </Button>
            </div>
          </div>
        </div>

        {/* Liste des notes */}
        {sortedNotes.length === 0 ? (
          <Card className="bg-white/10 border-white/20">
            <CardContent className="py-12 text-center">
              <StickyNote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-white mb-2">Aucune note</p>
              <p className="text-sm text-gray-400">Créez votre première note pour commencer</p>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
            {sortedNotes.map((note) => {
              const couleur = COULEURS[note.couleur] || COULEURS.yellow;
              const categorie = CATEGORIES.find(c => c.value === note.categorie);
              
              return (
                <Card 
                  key={note.id} 
                  className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  style={{
                    backgroundColor: couleur.bg,
                    borderColor: couleur.border,
                    borderWidth: '2px'
                  }}
                  onClick={() => handleEdit(note)}
                >
                  {note.epingle && (
                    <div className="absolute top-2 right-2">
                      <Pin className="w-5 h-5" style={{color: couleur.text}} />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1" style={{color: couleur.text}}>
                          {note.titre}
                        </h3>
                        <div className="flex items-center gap-2 text-xs" style={{color: couleur.text, opacity: 0.7}}>
                          {categorie && <span>{categorie.icon} {categorie.label}</span>}
                          <span>•</span>
                          <span>{format(new Date(note.updated_date), 'dd MMM', { locale: fr })}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3 line-clamp-4" style={{color: couleur.text}}>
                      {note.contenu}
                    </p>

                    {note.liste_taches?.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {note.liste_taches.slice(0, 3).map((task, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs" style={{color: couleur.text}}>
                            <input type="checkbox" checked={task.complete} readOnly className="w-3 h-3" />
                            <span className={task.complete ? "line-through opacity-60" : ""}>
                              {task.texte}
                            </span>
                          </div>
                        ))}
                        {note.liste_taches.length > 3 && (
                          <p className="text-xs opacity-60" style={{color: couleur.text}}>
                            +{note.liste_taches.length - 3} tâches
                          </p>
                        )}
                      </div>
                    )}

                    {note.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {note.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} className="text-xs" style={{backgroundColor: couleur.border, color: '#fff'}}>
                            {tag}
                          </Badge>
                        ))}
                        {note.tags.length > 3 && (
                          <Badge className="text-xs" style={{backgroundColor: couleur.border, color: '#fff'}}>
                            +{note.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t" style={{borderColor: couleur.border}}>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(note);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Star className={`w-4 h-4 ${note.favori ? 'fill-current text-yellow-500' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(note);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Pin className={`w-4 h-4 ${note.epingle ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleArchive(note);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportNote(note);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Supprimer cette note ?')) {
                              deleteNoteMutation.mutate(note.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
