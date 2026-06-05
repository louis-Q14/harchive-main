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
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Bell,
  Repeat,
  Search,
  Download,
  Trash2,
  Edit2,
  X,
  Grid3x3,
  List,
  Loader2,
  FileText,
  Check
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const COULEURS = {
  blue: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  green: { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
  red: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
  purple: { bg: "#e9d5ff", border: "#a855f7", text: "#6b21a8" },
  orange: { bg: "#fed7aa", border: "#f97316", text: "#9a3412" },
  pink: { bg: "#fce7f3", border: "#ec4899", text: "#831843" },
  yellow: { bg: "#fef3c7", border: "#eab308", text: "#713f12" },
  teal: { bg: "#ccfbf1", border: "#14b8a6", text: "#115e59" }
};

const CATEGORIES = [
  { value: "personnel", label: "Personnel", icon: "👤" },
  { value: "travail", label: "Travail", icon: "💼" },
  { value: "anniversaire", label: "Anniversaire", icon: "🎂" },
  { value: "rendez-vous", label: "Rendez-vous", icon: "📅" },
  { value: "sante", label: "Santé", icon: "🏥" },
  { value: "sport", label: "Sport", icon: "⚽" },
  { value: "loisir", label: "Loisir", icon: "🎮" },
  { value: "famille", label: "Famille", icon: "👨‍👩‍👧" },
  { value: "autre", label: "Autre", icon: "📌" }
];

export default function CalendrierPersonnel() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("toutes");
  
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    date_debut: "",
    date_fin: "",
    toute_journee: false,
    categorie: "personnel",
    couleur: "blue",
    lieu: "",
    participants: [],
    rappels: [{ type: "minutes", valeur: 30 }],
    recurrence: { active: false },
    notes: "",
    statut: "planifie"
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

  // Charger les événements
  const { data: events = [] } = useQuery({
    queryKey: ['personal-events', user?.id],
    queryFn: async () => {
      const allEvents = await base44.entities.EvenementPersonnel.list('-date_debut');
      return allEvents.filter(e => e.created_by === user.email);
    },
    enabled: !!user
  });

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: (eventData) => dataService.create('EvenementPersonnel', eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-events'] });
      resetForm();
      setOpenDialog(false);
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('EvenementPersonnel', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-events'] });
      resetForm();
      setOpenDialog(false);
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => dataService.delete('EvenementPersonnel', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-events'] });
    }
  });

  const resetForm = () => {
    setFormData({
      titre: "",
      description: "",
      date_debut: "",
      date_fin: "",
      toute_journee: false,
      categorie: "personnel",
      couleur: "blue",
      lieu: "",
      participants: [],
      rappels: [{ type: "minutes", valeur: 30 }],
      recurrence: { active: false },
      notes: "",
      statut: "planifie"
    });
    setSelectedEvent(null);
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setFormData({
      titre: event.titre,
      description: event.description || "",
      date_debut: event.date_debut,
      date_fin: event.date_fin,
      toute_journee: event.toute_journee,
      categorie: event.categorie,
      couleur: event.couleur,
      lieu: event.lieu || "",
      participants: event.participants || [],
      rappels: event.rappels || [{ type: "minutes", valeur: 30 }],
      recurrence: event.recurrence || { active: false },
      notes: event.notes || "",
      statut: event.statut
    });
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.titre.trim() || !formData.date_debut || !formData.date_fin) return;

    const eventData = {
      ...formData,
      date_debut: formData.date_debut.includes('T') ? formData.date_debut : `${formData.date_debut}T00:00:00`,
      date_fin: formData.date_fin.includes('T') ? formData.date_fin : `${formData.date_fin}T23:59:59`
    };

    if (selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent.id, data: eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleNewEvent = (date) => {
    resetForm();
    const dateStr = format(date, 'yyyy-MM-dd');
    setFormData({
      ...formData,
      date_debut: `${dateStr}T09:00:00`,
      date_fin: `${dateStr}T10:00:00`
    });
    setOpenDialog(true);
  };

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Générer les jours du calendrier
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: fr });
  const calendarEnd = endOfWeek(monthEnd, { locale: fr });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Filtrer les événements
  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = parseISO(event.date_debut);
      const matchesDay = isSameDay(eventDate, day);
      const matchesSearch = searchQuery === "" || 
        event.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === "toutes" || event.categorie === filterCategory;
      return matchesDay && matchesSearch && matchesCategory;
    });
  };

  const exportCalendar = () => {
    const content = events.map(e => 
      `${e.titre}\n${format(parseISO(e.date_debut), 'PPP é  HH:mm', { locale: fr })}\n${e.description || ''}\n---\n`
    ).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendrier.txt';
    a.click();
  };

  const stats = {
    total: events.length,
    thisMonth: events.filter(e => isSameMonth(parseISO(e.date_debut), currentDate)).length,
    upcoming: events.filter(e => parseISO(e.date_debut) > new Date()).length,
    completed: events.filter(e => e.statut === "termine").length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ha-bg)'}}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--ha-bg)'}}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img 
                src="/assets/icons/8757acc9d_calendar.png" 
                alt="Calendrier Personnel"
                className="w-12 h-12"
              />
              <div>
                <h1 className="text-3xl font-bold text-white">Calendrier Personnel</h1>
                <p className="text-gray-300">Gérez vos événements et rendez-vous</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportCalendar} variant="outline" style={{backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)'}}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => handleNewEvent(selectedDate)} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouvel événement
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/10 border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-8 h-8 text-blue-400" />
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
                  <CalendarIcon className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.thisMonth}</p>
                    <p className="text-sm text-gray-300">Ce mois</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.upcoming}</p>
                    <p className="text-sm text-gray-300">é€ venir</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Check className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.completed}</p>
                    <p className="text-sm text-gray-300">Terminés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtres */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher un événement..."
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
                <SelectItem value="toutes">Toutes les catégories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calendrier */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth} style={{backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)'}}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-bold text-white">
                  {format(currentDate, 'MMMM yyyy', { locale: fr })}
                </h2>
                <Button variant="outline" size="icon" onClick={goToNextMonth} style={{backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)'}}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" onClick={goToToday} style={{backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)'}}>
                Aujourd'hui
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-gray-300 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Grille des jours */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map(day => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);

                return (
                  <div
                    key={day.toString()}
                    onClick={() => {
                      setSelectedDate(day);
                      if (dayEvents.length === 0) handleNewEvent(day);
                    }}
                    className={`min-h-24 p-2 rounded-lg border cursor-pointer transition-all ${
                      isToday ? 'border-teal-500 bg-teal-500/20' :
                      isSelected ? 'border-teal-400 bg-teal-400/10' :
                      'border-white/10 hover:bg-white/5'
                    } ${!isCurrentMonth && 'opacity-40'}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday ? 'text-teal-400' : 'text-white'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => {
                        const couleur = COULEURS[event.couleur];
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(event);
                            }}
                            className="text-xs p-1 rounded truncate"
                            style={{
                              backgroundColor: couleur.bg,
                              color: couleur.text,
                              borderLeft: `3px solid ${couleur.border}`
                            }}
                          >
                            {event.titre}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-400">
                          +{dayEvents.length - 3} plus
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Dialog d'événement */}
        <DraggableDialog open={openDialog} onOpenChange={setOpenDialog}
          title={<div style={CG}>
            <div className="text-base font-semibold text-white">{selectedEvent ? "Modifier l'événement" : "Nouvel événement"}</div>
            <div className="text-xs mt-0.5" style={{color: 'var(--ha-text-muted)'}}>Renseignez les détails de votre événement</div>
          </div>}
          maxWidth="max-w-2xl">
          <DraggableDialogBody>
            <div className="grid gap-4" style={CG}>
              <div className="space-y-1.5">
                <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
                <Input
                  placeholder="Titre de l'événement"
                  value={formData.titre}
                  onChange={(e) => setFormData({...formData, titre: e.target.value})}
                  style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
                <Textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Date de début</Label>
                  <Input
                    type="datetime-local"
                    value={formData.date_debut}
                    onChange={(e) => setFormData({...formData, date_debut: e.target.value})}
                    style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Date de fin</Label>
                  <Input
                    type="datetime-local"
                    value={formData.date_fin}
                    onChange={(e) => setFormData({...formData, date_fin: e.target.value})}
                    style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.toute_journee}
                  onChange={(e) => setFormData({...formData, toute_journee: e.target.checked})}
                  style={{ accentColor: '#3b82f6' }}
                />
                <Label className="text-white text-xs" style={CG}>Événement toute la journée</Label>
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

              <div className="space-y-1.5">
                <Label className="text-white text-xs font-medium" style={CG}>Lieu</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Lieu"
                    value={formData.lieu}
                    onChange={(e) => setFormData({...formData, lieu: e.target.value})}
                    style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white text-xs font-medium" style={CG}>Notes</Label>
                <Textarea
                  placeholder="Notes supplémentaires"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                />
              </div>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            {selectedEvent && (
              <Button
                variant="outline"
                className="text-red-400 mr-auto"
                onClick={() => {
                  if (confirm('Supprimer cet événement ?')) {
                    deleteEventMutation.mutate(selectedEvent.id);
                    setOpenDialog(false);
                  }
                }}
                style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', ...CG}}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpenDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>Annuler</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
              {selectedEvent ? "Modifier" : "Créer"}
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>
      </div>
    </div>
  );
}
