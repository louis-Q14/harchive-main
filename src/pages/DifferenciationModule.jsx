import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import {
  Brain,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
  Users,
  Target,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Save,
  X,
  ArrowLeft
} from "lucide-react";

export default function DifferenciationModule() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openParcoursDialog, setOpenParcoursDialog] = useState(false);
  const [editingParcours, setEditingParcours] = useState(null);
  const [parcoursForm, setParcoursForm] = useState({
    titre: "",
    description: "",
    niveau: "moyen",
    competences: "",
    activites: ""
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      if (!currentUser.role_archive || currentUser.role_archive !== 'professeur') {
        navigate(createPageUrl("MesClasses"));
      }
    } catch (error) {
      console.error("Erreur:", error);
      navigate(createPageUrl("MesClasses"));
    } finally {
      setLoading(false);
    }
  };

  const { data: parcours = [] } = useQuery({
    queryKey: ['parcours-personnalises', user?.id],
    queryFn: async () => {
      return await dataService.query('ParcoursPersonnalise', { filters: [{
        professeur_id: user.id
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user
  });

  const { data: etudiants = [] } = useQuery({
    queryKey: ['etudiants-prof', user?.etablissement_nom],
    queryFn: async () => {
      const demandes = await dataService.query('DemandeInscription', { filters: [{
        type_utilisateur: 'etudiant',
        statut: 'approuvee',
        etablissement_nom: user.etablissement_nom,
      }],
  limit: 1000, offset: 0 });
      return demandes;
    },
    enabled: !!user?.etablissement_nom
  });

  const createParcourssMutation = useMutation({
    mutationFn: async (data) => {
      if (editingParcours) {
        return await dataService.update('ParcoursPersonnalise', editingParcours.id, data);
      } else {
        return await dataService.create('ParcoursPersonnalise', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcours-personnalises'] });
      resetForm();
      setOpenParcoursDialog(false);
    }
  });

  const deleteParcourssMutation = useMutation({
    mutationFn: async (id) => {
      return await dataService.delete('ParcoursPersonnalise', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcours-personnalises'] });
    }
  });

  const resetForm = () => {
    setParcoursForm({
      titre: "",
      description: "",
      niveau: "moyen",
      competences: "",
      activites: ""
    });
    setEditingParcours(null);
  };

  const handleSaveParcours = async () => {
    if (!parcoursForm.titre.trim()) {
      alert("Veuillez saisir un titre");
      return;
    }

    const data = {
      titre: parcoursForm.titre,
      description: parcoursForm.description,
      niveau_difficulte: parcoursForm.niveau,
      competences_visees: parcoursForm.competences,
      activites: parcoursForm.activites,
      professeur_id: user.id,
      professeur_nom: user.full_name,
      etablissement_id: user.etablissement_id,
      actif: true
    };

    await createParcourssMutation.mutateAsync(data);
  };

  const handleEditParcours = (p) => {
    setEditingParcours(p);
    setParcoursForm({
      titre: p.titre,
      description: p.description || "",
      niveau: p.niveau_difficulte || "moyen",
      competences: p.competences_visees || "",
      activites: p.activites || ""
    });
    setOpenParcoursDialog(true);
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
      <div className="w-full px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('MesClasses'))}
              className="bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white border-[#3d3d3d]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Différenciation Pédagogique</h1>
              <p className="text-gray-300">Créez des parcours adaptés à chaque profil d'élève</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="parcours" className="space-y-6">
          <TabsList className="bg-[#3d3d3d]">
            <TabsTrigger value="parcours">Parcours Personnalisés</TabsTrigger>
            <TabsTrigger value="profils">Profils d'Apprentissage</TabsTrigger>
          </TabsList>

          {/* TAB: Parcours Personnalisés */}
          <TabsContent value="parcours" className="space-y-6">
            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardContent className="pt-6">
                <Button
                  onClick={() => {
                    resetForm();
                    setOpenParcoursDialog(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un Parcours
                </Button>
              </CardContent>
            </Card>

            {parcours.length === 0 ? (
              <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">Aucun parcours créé</p>
                  <p className="text-sm text-gray-500">Créez votre premier parcours personnalisé</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {parcours.map(p => (
                  <Card key={p.id} style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white">{p.titre}</CardTitle>
                          <p className="text-sm text-gray-400 mt-2">{p.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditParcours(p)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('Supprimer ce parcours ?')) {
                                deleteParcourssMutation.mutate(p.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Badge className={`
                            ${p.niveau_difficulte === 'facile' ? 'bg-green-600' : 
                              p.niveau_difficulte === 'moyen' ? 'bg-yellow-600' : 
                              'bg-red-600'}
                          `}>
                            Niveau: {p.niveau_difficulte}
                          </Badge>
                        </div>
                        {p.competences_visees && (
                          <div>
                            <p className="text-sm font-semibold text-gray-300 mb-2">Compétences visées:</p>
                            <p className="text-sm text-gray-400">{p.competences_visees}</p>
                          </div>
                        )}
                        {p.activites && (
                          <div>
                            <p className="text-sm font-semibold text-gray-300 mb-2">Activités:</p>
                            <p className="text-sm text-gray-400">{p.activites}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB: Profils d'Apprentissage */}
          <TabsContent value="profils" className="space-y-6">
            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Profils d'Apprentissage
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Analysez et adaptez votre enseignement selon les profils des élèves
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { title: "Visuels", desc: "Apprentissage par images et schémas", icon: "👁️" },
                    { title: "Auditifs", desc: "Apprentissage par écoute et discussion", icon: "👂" },
                    { title: "Kinesthésiques", desc: "Apprentissage par pratique et manipulation", icon: "🤲" },
                    { title: "Lecteurs-Rédacteurs", desc: "Apprentissage par lecture et écriture", icon: "📝" }
                  ].map((profil, idx) => (
                    <div key={idx} className="p-4 rounded-lg" style={{backgroundColor: 'var(--ha-surface2)'}}>
                      <div className="text-3xl mb-2">{profil.icon}</div>
                      <h4 className="font-semibold text-white mb-1">{profil.title}</h4>
                      <p className="text-sm text-gray-400">{profil.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Stratégies d'Adaptation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    "Créer plusieurs parcours pour différents niveaux",
                    "Proposer des activités variées (ateliers, projets, travail individuel)",
                    "Utiliser des ressources diversifiées (textes, vidéos, schémas)",
                    "Mettre en place des évaluations adaptées à chaque profil",
                    "Encourager l'apprentissage collaboratif"
                  ].map((strategie, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--ha-surface2)'}}>
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                      <p className="text-gray-300">{strategie}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog Parcours */}
        <DraggableDialog open={openParcoursDialog} onOpenChange={setOpenParcoursDialog} title={editingParcours ? 'Modifier un Parcours' : 'Créer un Parcours'}>
          <DraggableDialogBody>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
                <Input
                  value={parcoursForm.titre}
                  onChange={(e) => setParcoursForm({...parcoursForm, titre: e.target.value})}
                  placeholder="Ex: Parcours Avancé - Algèbre"
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
                <Textarea
                  value={parcoursForm.description}
                  onChange={(e) => setParcoursForm({...parcoursForm, description: e.target.value})}
                  placeholder="Description du parcours..."
                  rows={2}
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Niveau de Difficulté</Label>
                <Select value={parcoursForm.niveau} onValueChange={(v) => setParcoursForm({...parcoursForm, niveau: v})}>
                  <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facile">Facile</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="difficile">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Compétences Visées</Label>
                <Textarea
                  value={parcoursForm.competences}
                  onChange={(e) => setParcoursForm({...parcoursForm, competences: e.target.value})}
                  placeholder="Ex: Résoudre des équations, Manipuler des expressions..."
                  rows={2}
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Activités</Label>
                <Textarea
                  value={parcoursForm.activites}
                  onChange={(e) => setParcoursForm({...parcoursForm, activites: e.target.value})}
                  placeholder="Ex: Exercices pratiques, Projets collaboratifs..."
                  rows={2}
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>
            </div>

          </DraggableDialogBody>
          <DraggableDialogFooter>
              <Button variant="outline" onClick={() => setOpenParcoursDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>
                Annuler
              </Button>
              <Button onClick={handleSaveParcours} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
          </DraggableDialogFooter>
        </DraggableDialog>
      </div>
    </div>
  );
}
