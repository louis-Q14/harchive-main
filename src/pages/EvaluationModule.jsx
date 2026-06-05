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
const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart3,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save,
  Download,
  Award,
  LineChart as LineChartIcon,
  ArrowLeft
} from "lucide-react";

export default function EvaluationModule() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openEvalDialog, setOpenEvalDialog] = useState(false);
  const [editingEval, setEditingEval] = useState(null);
  const [evalForm, setEvalForm] = useState({
    titre: "",
    type: "formative",
    competence: "",
    description: "",
    date: ""
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

  const { data: notes = [] } = useQuery({
    queryKey: ['notes-etudiants', user?.id],
    queryFn: async () => {
      return await dataService.query('NoteEtudiant', { filters: [{
        professeur_id: user.id
      }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user
  });

  const { data: etudiants = [] } = useQuery({
    queryKey: ['etudiants-eval', user?.etablissement_nom],
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

  const createNotesMutation = useMutation({
    mutationFn: async (data) => {
      if (editingEval) {
        return await dataService.update('NoteEtudiant', editingEval.id, data);
      } else {
        return await dataService.create('NoteEtudiant', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes-etudiants'] });
      resetForm();
      setOpenEvalDialog(false);
    }
  });

  const deleteNotesMutation = useMutation({
    mutationFn: async (id) => {
      return await dataService.delete('NoteEtudiant', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes-etudiants'] });
    }
  });

  const resetForm = () => {
    setEvalForm({
      titre: "",
      type: "formative",
      competence: "",
      description: "",
      date: ""
    });
    setEditingEval(null);
  };

  const handleSaveEval = async () => {
    if (!evalForm.titre.trim()) {
      alert("Veuillez saisir un titre");
      return;
    }

    const data = {
      titre: evalForm.titre,
      type_evaluation: evalForm.type,
      competence_evaluee: evalForm.competence,
      description: evalForm.description,
      date_evaluation: evalForm.date,
      professeur_id: user.id,
      professeur_nom: user.full_name,
      etablissement_id: user.etablissement_id
    };

    await createNotesMutation.mutateAsync(data);
  };

  const handleEditEval = (evaluation) => {
    setEditingEval(evaluation);
    setEvalForm({
      titre: evaluation.titre,
      type: evaluation.type_evaluation || "formative",
      competence: evaluation.competence_evaluee || "",
      description: evaluation.description || "",
      date: evaluation.date_evaluation || ""
    });
    setOpenEvalDialog(true);
  };

  const moyenneNotes = notes.length > 0
    ? (notes.reduce((sum, n) => sum + (n.note || 0), 0) / notes.length).toFixed(2)
    : 0;

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
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Évaluation & Suivi</h1>
              <p className="text-gray-300">Évaluez et suivez la progression de vos élèves</p>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Évaluations</p>
                  <p className="text-3xl font-bold text-white">{notes.length}</p>
                </div>
                <BarChart3 className="w-12 h-12 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Moyenne</p>
                  <p className="text-3xl font-bold text-white">{moyenneNotes}/20</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Étudiants</p>
                  <p className="text-3xl font-bold text-white">{etudiants.length}</p>
                </div>
                <Award className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Progression</p>
                  <p className="text-3xl font-bold text-white">85%</p>
                </div>
                <LineChartIcon className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="evaluations" className="space-y-6">
          <TabsList className="bg-[#3d3d3d]">
            <TabsTrigger value="evaluations">Mes Évaluations</TabsTrigger>
            <TabsTrigger value="resultats">Résultats</TabsTrigger>
            <TabsTrigger value="strategies">Stratégies</TabsTrigger>
          </TabsList>

          {/* TAB: Mes Évaluations */}
          <TabsContent value="evaluations" className="space-y-6">
            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardContent className="pt-6">
                <Button
                  onClick={() => {
                    resetForm();
                    setOpenEvalDialog(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une Évaluation
                </Button>
              </CardContent>
            </Card>

            {notes.length === 0 ? (
              <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">Aucune évaluation créée</p>
                  <p className="text-sm text-gray-500">Créez votre première évaluation</p>
                </CardContent>
              </Card>
            ) : (
              <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#2d2d2d]">
                          <TableHead className="text-white">Titre</TableHead>
                          <TableHead className="text-white">Type</TableHead>
                          <TableHead className="text-white">Compétence</TableHead>
                          <TableHead className="text-white">Date</TableHead>
                          <TableHead className="text-right text-white">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notes.map(note => (
                          <TableRow key={note.id} className="hover:bg-[#474747]">
                            <TableCell className="text-white">{note.titre}</TableCell>
                            <TableCell>
                              <Badge className={note.type_evaluation === 'formative' ? 'bg-blue-600' : 'bg-purple-600'}>
                                {note.type_evaluation}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300 text-sm">{note.competence_evaluee || "-"}</TableCell>
                            <TableCell className="text-gray-400 text-sm">
                              {note.date_evaluation ? new Date(note.date_evaluation).toLocaleDateString('fr-FR') : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditEval(note)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (confirm('Supprimer cette évaluation ?')) {
                                      deleteNotesMutation.mutate(note.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB: Résultats */}
          <TabsContent value="resultats" className="space-y-6">
            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardHeader>
                <CardTitle className="text-white">Distribution des Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { range: "0-5", count: Math.floor(notes.length * 0.1), color: "bg-red-600" },
                    { range: "6-10", count: Math.floor(notes.length * 0.2), color: "bg-orange-600" },
                    { range: "11-15", count: Math.floor(notes.length * 0.4), color: "bg-yellow-600" },
                    { range: "16-20", count: Math.floor(notes.length * 0.3), color: "bg-green-600" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-20 text-sm text-gray-400">{item.range}</div>
                      <div className="flex-1 h-6 bg-[#2d2d2d] rounded-lg overflow-hidden">
                        <div
                          className={`h-full ${item.color}`}
                          style={{ width: `${(item.count / notes.length) * 100}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-400">{item.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardHeader>
                <CardTitle className="text-white">Analyse des Résultats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--ha-surface2)'}}>
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-white font-semibold">Points forts</p>
                      <p className="text-sm text-gray-400">La majorité des élèves comprennent les concepts fondamentaux</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--ha-surface2)'}}>
                    <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-white font-semibold">Axes d'amélioration</p>
                      <p className="text-sm text-gray-400">Renforcer le travail sur les applications pratiques</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Stratégies */}
          <TabsContent value="strategies" className="space-y-6">
            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardHeader>
                <CardTitle className="text-white">Types d'Évaluation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      title: "Évaluation Formative",
                      desc: "Évaluations régulières pour suivre la progression",
                      exemples: ["Quiz hebdomadaires", "Exercices pratiques", "Discussions en classe"]
                    },
                    {
                      title: "Évaluation Sommative",
                      desc: "Évaluations finales pour mesurer les acquis",
                      exemples: ["Contrôles continus", "Examens", "Projets finaux"]
                    },
                    {
                      title: "Auto-évaluation",
                      desc: "L'élève évalue sa propre progression",
                      exemples: ["Réflexion personnelle", "Portfolio", "Auto-questionnaire"]
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 rounded-lg" style={{backgroundColor: 'var(--ha-surface2)'}}>
                      <h4 className="font-semibold text-white mb-2">{item.title}</h4>
                      <p className="text-sm text-gray-400 mb-3">{item.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {item.exemples.map((ex, i) => (
                          <Badge key={i} className="bg-[#1a1a1a] text-gray-300">
                            {ex}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardHeader>
                <CardTitle className="text-white">Bonnes Pratiques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    "Évaluer régulièrement tout au long du cours",
                    "Utiliser des critères d'évaluation clairs et transparents",
                    "Donner un retour constructif aux élèves",
                    "Adapter l'évaluation au niveau et au profil de chaque élève",
                    "Analyser les résultats pour améliorer l'enseignement",
                    "Valoriser les efforts et les progrès réalisés"
                  ].map((pratique, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--ha-surface2)'}}>
                      <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
                      <p className="text-gray-300">{pratique}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog Évaluation */}
        <DraggableDialog open={openEvalDialog} onOpenChange={setOpenEvalDialog} title={editingEval ? 'Modifier une Évaluation' : 'Créer une Évaluation'} subtitle="Évaluation & Suivi">
          <DraggableDialogBody>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
                <Input
                  value={evalForm.titre}
                  onChange={(e) => setEvalForm({...evalForm, titre: e.target.value})}
                  placeholder="Ex: Quiz sur les fonctions"
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Type</Label>
                  <Select value={evalForm.type} onValueChange={(v) => setEvalForm({...evalForm, type: v})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formative">Formative</SelectItem>
                      <SelectItem value="sommative">Sommative</SelectItem>
                      <SelectItem value="auto">Auto-évaluation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Date</Label>
                  <Input
                    type="date"
                    value={evalForm.date}
                    onChange={(e) => setEvalForm({...evalForm, date: e.target.value})}
                    style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                  />
                </div>
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Compétence Évaluée</Label>
                <Input
                  value={evalForm.competence}
                  onChange={(e) => setEvalForm({...evalForm, competence: e.target.value})}
                  placeholder="Ex: Résoudre des équations du second degré"
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>

              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
                <Textarea
                  value={evalForm.description}
                  onChange={(e) => setEvalForm({...evalForm, description: e.target.value})}
                  placeholder="Description de l'évaluation..."
                  rows={3}
                  style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
                />
              </div>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
              <Button variant="outline" onClick={() => setOpenEvalDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>
                Annuler
              </Button>
              <Button onClick={handleSaveEval} className="bg-orange-600 hover:bg-orange-700 text-white" style={CG}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
          </DraggableDialogFooter>
        </DraggableDialog>
      </div>
    </div>
  );
}
