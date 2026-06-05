import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  MapPin,
  Users,
  BookOpen,
  Loader2,
  RepeatIcon
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isWithinInterval, addWeeks, addDays } from "date-fns";
import { fr } from "date-fns/locale";

export default function CalendrierAcademique() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState("mois");
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterClasse, setFilterClasse] = useState("toutes");
  const [filterType, setFilterType] = useState("tous");

  const [formData, setFormData] = useState({
    titre: "",
    type: "cours",
    classe_id: "",
    classe_nom: "",
    matiere_id: "",
    matiere_nom: "",
    professeur_id: "",
    professeur_nom: "",
    date_debut: "",
    date_fin: "",
    heure_debut: "",
    heure_fin: "",
    salle: "",
    description: "",
    couleur: "#3b82f6",
    recurrence: {
      active: false,
      type: "hebdomadaire",
      jours_semaine: [],
      date_fin_recurrence: ""
    },
    annee_scolaire: "2024-2025"
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      let currentUser = await authService.getCurrentUser();
      
      // Pour admin établissement, résoudre l'etablissement_id via la table establishments (colonne email)
      if (currentUser.role_archive === 'admin_etablissement') {
        let etablissements = await dataService.query('Etablissement', { filters: [{  email: currentUser.email  }],
  limit: 1000, offset: 0 });
        
        if (etablissements.length > 0) {
          currentUser = {
            ...currentUser,
            etablissement_id: etablissements[0].id,
            etablissement_nom: etablissements[0].name || etablissements[0].nom
          };
        }
      }

      // Pour les étudiants et professeurs, résoudre l'etablissement_id correct
      // via la table establishments (par nom)
      if (currentUser.role_archive === 'etudiant' || currentUser.role_archive === 'professeur') {
        if (currentUser.etablissement_nom) {
          try {
            const etablissements = await dataService.query('Etablissement', { filters: [{ name: currentUser.etablissement_nom }], limit: 5, offset: 0 });
            if (etablissements.length > 0) {
              currentUser = {
                ...currentUser,
                etablissement_id: etablissements[0].id,
                etablissement_nom: etablissements[0].name || etablissements[0].nom
              };
            }
          } catch (e) {
            // garder l'etablissement_id existant en cas d'erreur
          }
        }
      }
      
      setUser(currentUser);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const { data: events = [] } = useQuery({
    queryKey: ['calendrier-events', user?.etablissement_id],
    queryFn: async () => {
      const allEvents = await base44.entities.CalendrierAcademique.list('-date_debut');
      return allEvents.filter(e => e.etablissement_id === user?.etablissement_id);
    },
    enabled: !!user?.etablissement_id
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', user?.etablissement_id],
    queryFn: async () => {
      const allClasses = await dataService.query('Classe');
      return allClasses.filter(c => c.etablissement_id === user?.etablissement_id);
    },
    enabled: !!user?.etablissement_id
  });

  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres', user?.etablissement_id],
    queryFn: async () => {
      const allMatieres = await dataService.query('Matiere');
      return allMatieres.filter(m => m.etablissement_id === user?.etablissement_id);
    },
    enabled: !!user?.etablissement_id
  });

  const { data: assignations = [] } = useQuery({
    queryKey: ['assignations', user?.etablissement_id],
    queryFn: async () => {
      const allAssignations = await dataService.query('AssignationProfesseur');
      return allAssignations.filter(a => a.etablissement_id === user?.etablissement_id);
    },
    enabled: !!user?.etablissement_id
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      console.log("Mutation - données envoyées:", eventData);
      if (eventData.recurrence?.active) {
        const recurringEvents = generateRecurringEvents(eventData);
        return Promise.all(recurringEvents.map(evt => dataService.create('CalendrierAcademique', evt)));
      }
      return dataService.create('CalendrierAcademique', eventData);
    },
    onSuccess: (data) => {
      console.log("Événement créé avec succès:", data);
      queryClient.invalidateQueries(['calendrier-events']);
      setShowEventDialog(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Erreur création événement:", error);
      alert(`Erreur lors de la création: ${error.message}`);
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('CalendrierAcademique', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendrier-events']);
      setShowEventDialog(false);
      setEditingEvent(null);
      resetForm();
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => dataService.delete('CalendrierAcademique', id),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendrier-events']);
    }
  });

  const generateRecurringEvents = (baseEvent) => {
    const events = [];
    const startDate = parseISO(baseEvent.date_debut);
    const endRecurrence = parseISO(baseEvent.recurrence.date_fin_recurrence);
    
    let currentDate = startDate;
    
    while (currentDate <= endRecurrence) {
      const eventStart = new Date(currentDate);
      const eventEnd = new Date(currentDate);
      
      const [startHours, startMinutes] = baseEvent.heure_debut.split(':');
      const [endHours, endMinutes] = baseEvent.heure_fin.split(':');
      
      eventStart.setHours(parseInt(startHours), parseInt(startMinutes));
      eventEnd.setHours(parseInt(endHours), parseInt(endMinutes));
      
      if (baseEvent.recurrence.type === 'hebdomadaire' && 
          baseEvent.recurrence.jours_semaine.includes(currentDate.getDay())) {
        events.push({
          ...baseEvent,
          date_debut: eventStart.toISOString(),
          date_fin: eventEnd.toISOString(),
          recurrence: { ...baseEvent.recurrence, active: false }
        });
      }
      
      currentDate = addDays(currentDate, 1);
    }
    
    return events;
  };

  const resetForm = () => {
    setFormData({
      titre: "",
      type: "cours",
      classe_id: "",
      classe_nom: "",
      matiere_id: "",
      matiere_nom: "",
      professeur_id: "",
      professeur_nom: "",
      date_debut: "",
      date_fin: "",
      heure_debut: "",
      heure_fin: "",
      salle: "",
      description: "",
      couleur: "#3b82f6",
      recurrence: {
        active: false,
        type: "hebdomadaire",
        jours_semaine: [],
        date_fin_recurrence: ""
      },
      annee_scolaire: "2024-2025"
    });
  };

  const handleSubmit = () => {
    if (!formData.titre || !formData.date_debut || !formData.date_fin || !formData.heure_debut || !formData.heure_fin) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!user?.etablissement_id) {
      alert("Erreur: Établissement non trouvé. Veuillez contacter l'administrateur.");
      return;
    }

    const eventData = {
      titre: formData.titre,
      type: formData.type,
      etablissement_id: user.etablissement_id,
      classe_id: formData.classe_id || undefined,
      classe_nom: formData.classe_nom || undefined,
      matiere_id: formData.matiere_id || undefined,
      matiere_nom: formData.matiere_nom || undefined,
      professeur_id: formData.professeur_id || undefined,
      professeur_nom: formData.professeur_nom || undefined,
      date_debut: `${formData.date_debut}T${formData.heure_debut}:00`,
      date_fin: `${formData.date_fin}T${formData.heure_fin}:00`,
      heure_debut: formData.heure_debut,
      heure_fin: formData.heure_fin,
      salle: formData.salle || undefined,
      description: formData.description || undefined,
      couleur: formData.couleur,
      recurrence: formData.recurrence,
      annee_scolaire: formData.annee_scolaire
    };

    console.log("Création événement:", eventData);

    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data: eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    const dateDebut = parseISO(event.date_debut);
    const dateFin = parseISO(event.date_fin);
    
    setFormData({
      titre: event.titre,
      type: event.type,
      classe_id: event.classe_id || "",
      classe_nom: event.classe_nom || "",
      matiere_id: event.matiere_id || "",
      matiere_nom: event.matiere_nom || "",
      professeur_id: event.professeur_id || "",
      professeur_nom: event.professeur_nom || "",
      date_debut: format(dateDebut, 'yyyy-MM-dd'),
      date_fin: format(dateFin, 'yyyy-MM-dd'),
      heure_debut: format(dateDebut, 'HH:mm'),
      heure_fin: format(dateFin, 'HH:mm'),
      salle: event.salle || "",
      description: event.description || "",
      couleur: event.couleur || "#3b82f6",
      recurrence: event.recurrence || {
        active: false,
        type: "hebdomadaire",
        jours_semaine: [],
        date_fin_recurrence: ""
      },
      annee_scolaire: event.annee_scolaire || "2024-2025"
    });
    setShowEventDialog(true);
  };

  const handleClasseChange = (classeId) => {
    const classe = classes.find(c => c.id === classeId);
    setFormData({
      ...formData,
      classe_id: classeId,
      classe_nom: classe?.nom || ""
    });
  };

  const handleMatiereChange = (matiereId) => {
    const matiere = matieres.find(m => m.id === matiereId);
    const assignation = assignations.find(a => 
      a.matiere_id === matiereId && a.classe_id === formData.classe_id
    );
    
    setFormData({
      ...formData,
      matiere_id: matiereId,
      matiere_nom: matiere?.nom || "",
      professeur_id: assignation?.professeur_id || "",
      professeur_nom: assignation?.professeur_nom || ""
    });
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const filteredEvents = events.filter(event => {
    const classeMatch = filterClasse === "toutes" || event.classe_id === filterClasse;
    const typeMatch = filterType === "tous" || event.type === filterType;
    return classeMatch && typeMatch;
  });

  const getEventsForDay = (day) => {
    return filteredEvents.filter(event => {
      const eventDate = parseISO(event.date_debut);
      return isSameDay(eventDate, day);
    });
  };

  const getTypeColor = (type) => {
    const colors = {
      cours: "bg-blue-500",
      examen: "bg-red-500",
      evenement: "bg-purple-500",
      vacances: "bg-green-500",
      reunion: "bg-yellow-500"
    };
    return colors[type] || "bg-gray-500";
  };

  const getTypeLabel = (type) => {
    const labels = {
      cours: "Cours",
      examen: "Examen",
      evenement: "Événement",
      vacances: "Vacances",
      reunion: "Réunion"
    };
    return labels[type] || type;
  };

  const canEdit = user?.role_archive === 'admin_etablissement';
  const canView = ['admin_etablissement', 'admin_systeme', 'super_admin', 'professeur', 'etudiant', 'parent'].includes(user?.role_archive);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--ha-text)' }} />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card style={{ backgroundColor: 'var(--ha-surface)' }}>
          <CardContent className="pt-6 text-center">
            <p style={{ color: 'var(--ha-text)' }}>Accès non autorisé</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--ha-text)' }}>
                <img 
                  src="/assets/icons/346bbc18d_calendrier.png"
                  alt="Calendrier"
                  className="w-8 h-8"
                />
                Calendrier Académique
              </h1>
              <p style={{ color: 'var(--ha-text-muted)' }} className="mt-1">
                {canEdit ? 'Gérez les cours, examens et événements de votre établissement' : 'Consultez le calendrier des cours et événements'}
              </p>
            </div>
            {canEdit && (
              <Button onClick={() => setShowEventDialog(true)} style={{ backgroundColor: '#3b82f6', color: 'var(--ha-text)' }}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un événement
              </Button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterClasse} onValueChange={setFilterClasse}>
              <SelectTrigger className="w-48" style={{ backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)' }}>
                <SelectValue placeholder="Toutes les classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les classes</SelectItem>
                {classes.map(classe => (
                  <SelectItem key={classe.id} value={classe.id}>{classe.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48" style={{ backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)' }}>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les types</SelectItem>
                <SelectItem value="cours">Cours</SelectItem>
                <SelectItem value="examen">Examen</SelectItem>
                <SelectItem value="evenement">Événement</SelectItem>
                <SelectItem value="vacances">Vacances</SelectItem>
                <SelectItem value="reunion">Réunion</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Navigation du calendrier */}
        <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }} className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <h2 className="text-2xl font-bold capitalize" style={{ color: 'var(--ha-text)' }}>
                {format(currentDate, 'MMMM yyyy', { locale: fr })}
              </h2>
              
              <Button
                variant="outline"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Grille du calendrier */}
            <div className="grid grid-cols-7 gap-2">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                <div key={day} className="text-center font-semibold p-2" style={{ color: 'var(--ha-text-muted)' }}>
                  {day}
                </div>
              ))}
              
              {monthDays.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={index}
                    className="min-h-24 p-2 rounded-lg cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isToday ? '#2d2d2d' : '#262626',
                      borderColor: isToday ? '#3b82f6' : '#4d4d4d',
                      border: isToday ? '2px solid' : '1px solid'
                    }}
                    onClick={() => {
                      if (canEdit) {
                        setSelectedDate(day);
                        setFormData({ ...formData, date_debut: format(day, 'yyyy-MM-dd'), date_fin: format(day, 'yyyy-MM-dd') });
                        setShowEventDialog(true);
                      }
                    }}
                  >
                    <div className="text-sm font-semibold mb-1" style={{ color: isToday ? '#60a5fa' : '#ffffff' }}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event, idx) => (
                        <div
                          key={idx}
                          className="text-xs p-1 rounded truncate"
                          style={{ backgroundColor: event.couleur, color: 'var(--ha-text)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canEdit) {
                              handleEdit(event);
                            }
                          }}
                        >
                          {event.titre}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>
                          +{dayEvents.length - 2} autres
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Dialog Événement */}
        <DraggableDialog open={showEventDialog} onOpenChange={(open) => {
          if (!open) {
            setShowEventDialog(false);
            setEditingEvent(null);
            resetForm();
          }
        }} title={editingEvent ? "Modifier l'événement" : "Nouvel événement"} resizable={false}>
          <DraggableDialogBody>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
                  <Input
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    placeholder="Titre de l'événement"
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                  />
                </div>

                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Type *</Label>
                  <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cours">Cours</SelectItem>
                      <SelectItem value="examen">Examen</SelectItem>
                      <SelectItem value="evenement">Événement</SelectItem>
                      <SelectItem value="vacances">Vacances</SelectItem>
                      <SelectItem value="reunion">Réunion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Couleur</Label>
                  <Input
                    type="color"
                    value={formData.couleur}
                    onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                    style={{backgroundColor:'#2d2d2d',borderColor:'#4d4d4d',...CG}}
                  />
                </div>

                {formData.type === 'cours' && (
                  <>
                    <div>
                      <Label className="text-white text-xs font-medium" style={CG}>Classe</Label>
                      <Select value={formData.classe_id} onValueChange={handleClasseChange}>
                        <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                          <SelectValue placeholder="Sélectionner une classe" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(classe => (
                            <SelectItem key={classe.id} value={classe.id}>{classe.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white text-xs font-medium" style={CG}>Matière</Label>
                      <Select value={formData.matiere_id} onValueChange={handleMatiereChange}>
                        <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                          <SelectValue placeholder="Sélectionner une matière" />
                        </SelectTrigger>
                        <SelectContent>
                          {matieres.map(matiere => (
                            <SelectItem key={matiere.id} value={matiere.id}>{matiere.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label className="text-white text-xs font-medium" style={CG}>Professeur</Label>
                      <Input
                        value={formData.professeur_nom}
                        readOnly
                        placeholder="Sélectionnez une matière et classe"
                        style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Date de début *</Label>
                  <Input
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                  />
                </div>

                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Date de fin *</Label>
                  <Input
                    type="date"
                    value={formData.date_fin}
                    onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                  />
                </div>

                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Heure de début *</Label>
                  <Input
                    type="time"
                    value={formData.heure_debut}
                    onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                  />
                </div>

                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Heure de fin *</Label>
                  <Input
                    type="time"
                    value={formData.heure_fin}
                    onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-white text-xs font-medium" style={CG}>Salle</Label>
                  <Input
                    value={formData.salle}
                    onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
                    placeholder="Ex: Salle 101"
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description de l'événement"
                    rows={3}
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                  />
                </div>

                {/* Récurrence */}
                <div className="col-span-2 border-t pt-4" style={{ borderColor: 'var(--ha-border)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={formData.recurrence.active}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurrence: { ...formData.recurrence, active: e.target.checked }
                      })}
                      className="w-4 h-4"
                    />
                    <Label className="text-white text-xs font-medium flex items-center gap-2" style={CG}>
                      <RepeatIcon className="w-4 h-4" />
                      Activer la récurrence (rotation des cours)
                    </Label>
                  </div>

                  {formData.recurrence.active && (
                    <div className="space-y-4 pl-6">
                      <div>
                        <Label className="text-white text-xs font-medium" style={CG}>Type de récurrence</Label>
                        <Select
                          value={formData.recurrence.type}
                          onValueChange={(val) => setFormData({
                            ...formData,
                            recurrence: { ...formData.recurrence, type: val }
                          })}
                        >
                          <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quotidien">Quotidien</SelectItem>
                            <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                            <SelectItem value="bihebdomadaire">Bihebdomadaire</SelectItem>
                            <SelectItem value="mensuel">Mensuel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.recurrence.type === 'hebdomadaire' && (
                        <div>
                          <Label className="text-white text-xs font-medium" style={CG}>Jours de la semaine</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((jour, index) => (
                              <Button
                                key={index}
                                type="button"
                                variant={formData.recurrence.jours_semaine.includes(index) ? "default" : "outline"}
                                onClick={() => {
                                  const jours = formData.recurrence.jours_semaine.includes(index)
                                    ? formData.recurrence.jours_semaine.filter(j => j !== index)
                                    : [...formData.recurrence.jours_semaine, index];
                                  setFormData({
                                    ...formData,
                                    recurrence: { ...formData.recurrence, jours_semaine: jours }
                                  });
                                }}
                                style={{
                                  backgroundColor: formData.recurrence.jours_semaine.includes(index) ? '#3b82f6' : '#2d2d2d',
                                  color: 'var(--ha-text)',
                                  borderColor: 'var(--ha-border)'
                                }}
                              >
                                {jour}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-white text-xs font-medium" style={CG}>Fin de la récurrence</Label>
                        <Input
                          type="date"
                          value={formData.recurrence.date_fin_recurrence}
                          onChange={(e) => setFormData({
                            ...formData,
                            recurrence: { ...formData.recurrence, date_fin_recurrence: e.target.value }
                          })}
                          style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </DraggableDialogBody>
          <DraggableDialogFooter>
              {editingEvent && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm("Supprimer cet événement ?")) {
                      deleteEventMutation.mutate(editingEvent.id);
                      setShowEventDialog(false);
                    }
                  }}
                  style={{ backgroundColor: '#991b1b', color: 'var(--ha-text)', borderColor: '#991b1b', ...CG }}
                  className="mr-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              )}
              <Button variant="outline" onClick={() => { setShowEventDialog(false); setEditingEvent(null); resetForm(); }} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={!formData.titre || !formData.date_debut || !formData.date_fin || !formData.heure_debut || !formData.heure_fin || createEventMutation.isPending || updateEventMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
                {(createEventMutation.isPending || updateEventMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingEvent ? "Modifier" : "Créer"}
              </Button>
          </DraggableDialogFooter>
        </DraggableDialog>
      </div>
    </div>
  );
}

