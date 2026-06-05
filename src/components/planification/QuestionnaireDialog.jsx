import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Save, Loader2, Plus, Trash2, GripVertical } from "lucide-react";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
const inputStyle = { backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG };

export default function QuestionnaireDialog({
  open,
  onOpenChange,
  questionnaireForm,
  setQuestionnaireForm,
  classes,
  matieres,
  editingQuestionnaire,
  typeQuestionnaire,
  handleSaveQuestionnaire,
  isSaving
}) {
  if (!open) return null;

  const titleText = editingQuestionnaire
    ? 'Modifier le questionnaire'
    : typeQuestionnaire === 'examen'
    ? "Nouveau Questionnaire d'Examen"
    : "Nouveau Questionnaire d'Interrogation";

  const questions = questionnaireForm.questions || [];

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestionnaireForm({ ...questionnaireForm, questions: updated });
  };

  const addQuestion = (type = 'libre') => {
    const newQ = {
      enonce: "",
      points: "",
      type,
      options: type === 'qcm' ? ["", "", "", ""] : []
    };
    setQuestionnaireForm({ ...questionnaireForm, questions: [...questions, newQ] });
  };

  const removeQuestion = (index) => {
    setQuestionnaireForm({ ...questionnaireForm, questions: questions.filter((_, i) => i !== index) });
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...questions];
    const opts = [...(updated[qIndex].options || [])];
    opts[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setQuestionnaireForm({ ...questionnaireForm, questions: updated });
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], options: [...(updated[qIndex].options || []), ""] };
    setQuestionnaireForm({ ...questionnaireForm, questions: updated });
  };

  const removeOption = (qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], options: updated[qIndex].options.filter((_, i) => i !== optIndex) };
    setQuestionnaireForm({ ...questionnaireForm, questions: updated });
  };

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange} title={titleText} subtitle="Préparez votre questionnaire d'évaluation" maxWidth="max-w-2xl">
      <DraggableDialogBody>
        <div className="space-y-4">
          <div>
            <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
            <Input
              value={questionnaireForm.titre}
              onChange={(e) => setQuestionnaireForm({ ...questionnaireForm, titre: e.target.value })}
              placeholder="Titre du questionnaire"
              style={inputStyle}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white text-xs font-medium" style={CG}>Promotion *</Label>
              <Select value={questionnaireForm.classe_id} onValueChange={(v) => setQuestionnaireForm({ ...questionnaireForm, classe_id: v })}>
                <SelectTrigger style={inputStyle}><SelectValue placeholder="Choisir une promotion" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white text-xs font-medium" style={CG}>Matière *</Label>
              <Select value={questionnaireForm.matiere_id} onValueChange={(v) => setQuestionnaireForm({ ...questionnaireForm, matiere_id: v })}>
                <SelectTrigger style={inputStyle}><SelectValue placeholder="Choisir une matière" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  {matieres.map((m) => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white text-xs font-medium" style={CG}>Date de l'examen</Label>
              <Input
                type="date"
                value={questionnaireForm.date_examen}
                onChange={(e) => setQuestionnaireForm({ ...questionnaireForm, date_examen: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <Label className="text-white text-xs font-medium" style={CG}>Durée</Label>
              <Input
                value={questionnaireForm.duree}
                onChange={(e) => setQuestionnaireForm({ ...questionnaireForm, duree: e.target.value })}
                placeholder="Ex: 02H00"
                style={inputStyle}
              />
            </div>
            <div>
              <Label className="text-white text-xs font-medium" style={CG}>Barème total</Label>
              <Input
                value={questionnaireForm.bareme_total}
                onChange={(e) => setQuestionnaireForm({ ...questionnaireForm, bareme_total: e.target.value })}
                placeholder="Ex: 20"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <Label className="text-white text-xs font-medium" style={CG}>Numéro d'identification</Label>
            <Input
              value={questionnaireForm.numero_identification}
              onChange={(e) => setQuestionnaireForm({ ...questionnaireForm, numero_identification: e.target.value })}
              placeholder="Ex: EXM0001"
              style={inputStyle}
            />
          </div>

          <div>
            <Label className="text-white text-xs font-medium" style={CG}>Consignes</Label>
            <Textarea
              value={questionnaireForm.consignes}
              onChange={(e) => setQuestionnaireForm({ ...questionnaireForm, consignes: e.target.value })}
              rows={2}
              placeholder="Instructions pour les étudiants..."
              style={inputStyle}
            />
          </div>

          {/* Section: Composer l'épreuve */}
          <div style={{ borderTop: '2px solid #4d4d4d', paddingTop: '16px', marginTop: '8px' }}>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-white text-sm font-bold" style={CG}>Composer l'épreuve *</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => addQuestion('libre')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs" style={CG}>
                  <Plus className="w-3 h-3 mr-1" /> Question libre
                </Button>
                <Button type="button" size="sm" onClick={() => addQuestion('qcm')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs" style={CG}>
                  <Plus className="w-3 h-3 mr-1" /> Question QCM
                </Button>
              </div>
            </div>

            {questions.length === 0 && (
              <div className="text-center py-8 rounded-lg" style={{ backgroundColor: 'var(--ha-surface2)', border: '2px dashed #4d4d4d' }}>
                <p className="text-gray-400 text-sm" style={CG}>Aucune question ajoutée.</p>
                <p className="text-gray-500 text-xs mt-1" style={CG}>Cliquez sur "Question libre" ou "Question QCM" pour commencer.</p>
              </div>
            )}

            <div className="space-y-3" style={{ maxHeight: '35vh', overflowY: 'auto', paddingRight: '4px' }}>
              {questions.map((q, i) => (
                <div key={i} className="rounded-lg p-3" style={{ backgroundColor: 'var(--ha-surface2)', border: '1px solid #3d3d3d' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-500" />
                      <span className="text-blue-400 font-bold text-sm" style={CG}>Question {i + 1}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: q.type === 'qcm' ? '#312e81' : '#1e3a5f',
                        color: q.type === 'qcm' ? '#a5b4fc' : '#93c5fd'
                      }}>
                        {q.type === 'qcm' ? 'QCM' : 'Libre'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={q.points}
                        onChange={(e) => updateQuestion(i, 'points', e.target.value)}
                        placeholder="Pts"
                        className="w-16 text-center text-xs h-7"
                        style={{ ...inputStyle, padding: '2px 6px' }}
                      />
                      <span className="text-gray-400 text-xs">pts</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeQuestion(i)} className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    value={q.enonce}
                    onChange={(e) => updateQuestion(i, 'enonce', e.target.value)}
                    rows={2}
                    placeholder="Énoncé de la question..."
                    style={{ ...inputStyle, fontSize: '13px' }}
                  />

                  {q.type === 'qcm' && (
                    <div className="mt-2 space-y-1.5 pl-4">
                      <Label className="text-gray-400 text-xs" style={CG}>Options de réponse :</Label>
                      {(q.options || []).map((opt, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <span className="text-blue-400 font-bold text-xs w-5">{String.fromCharCode(65 + j)}.</span>
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(i, j, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + j)}`}
                            className="flex-1 h-7 text-xs"
                            style={{ ...inputStyle, padding: '2px 8px' }}
                          />
                          {(q.options || []).length > 2 && (
                            <Button type="button" size="sm" variant="ghost" onClick={() => removeOption(i, j)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {(q.options || []).length < 8 && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => addOption(i)}
                          className="text-xs text-blue-400 hover:text-blue-300 h-6 px-2" style={CG}>
                          <Plus className="w-3 h-3 mr-1" /> Ajouter une option
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DraggableDialogBody>

      <DraggableDialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG }}>
          Annuler
        </Button>
        <Button onClick={handleSaveQuestionnaire} disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
          {isSaving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Enregistrer</>
          )}
        </Button>
      </DraggableDialogFooter>
    </DraggableDialog>
  );
}