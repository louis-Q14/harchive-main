import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
const inputStyle = { backgroundColor: '#2d2d2d', color: '#ffffff', borderColor: '#4d4d4d', ...CG };
const sectionStyle = {
  fontWeight: 600, color: '#ffffff', background: 'rgba(255,255,255,0.08)',
  padding: '8px 12px', borderRadius: 6, marginBottom: 4, ...CG
};

export default function FichePreparationDialog({
  open, onOpenChange, ficheForm, setFicheForm,
  classes, matieres, editingFiche, handleSaveFiche, isSaving
}) {
  const addActivite = () => setFicheForm({
    ...ficheForm, developpement: {
      ...ficheForm.developpement,
      activites: [...ficheForm.developpement.activites, { contenu: "", duree: 0 }]
    }
  });

  const updateActivite = (index, field, value) => {
    const a = [...ficheForm.developpement.activites];
    a[index][field] = value;
    setFicheForm({ ...ficheForm, developpement: { ...ficheForm.developpement, activites: a } });
  };

  const removeActivite = (index) => setFicheForm({
    ...ficheForm, developpement: {
      ...ficheForm.developpement,
      activites: ficheForm.developpement.activites.filter((_, i) => i !== index)
    }
  });

  if (!open) return null;

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange} title={editingFiche ? 'Modifier la fiche' : 'Nouvelle fiche de préparation pédagogique'} subtitle="Préparez et structurez votre séance pédagogique">
      <DraggableDialogBody>

          {/* En-tête */}
          <div style={{ marginBottom: 20 }}>
            <div style={sectionStyle}>En-tête</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Date de la séance *</Label>
                <Input type="date" value={ficheForm.date_seance}
                  onChange={(e) => setFicheForm({ ...ficheForm, date_seance: e.target.value })}
                  style={inputStyle} />
              </div>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Durée de la séance</Label>
                <Input value={ficheForm.duree_seance}
                  onChange={(e) => setFicheForm({ ...ficheForm, duree_seance: e.target.value })}
                  placeholder="Ex: 02H30" style={inputStyle} />
              </div>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Filière</Label>
                <Input value={ficheForm.filiere}
                  onChange={(e) => setFicheForm({ ...ficheForm, filiere: e.target.value })}
                  style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Année</Label>
                <Input value={ficheForm.annee}
                  onChange={(e) => setFicheForm({ ...ficheForm, annee: e.target.value })}
                  placeholder="Ex: 1ère année" style={inputStyle} />
              </div>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Groupe</Label>
                <Input value={ficheForm.groupe}
                  onChange={(e) => setFicheForm({ ...ficheForm, groupe: e.target.value })}
                  style={inputStyle} />
              </div>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Module</Label>
                <Input value={ficheForm.module}
                  onChange={(e) => setFicheForm({ ...ficheForm, module: e.target.value })}
                  style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Promotion</Label>
                <Select value={ficheForm.classe_id} onValueChange={(v) => setFicheForm({ ...ficheForm, classe_id: v })}>
                  <SelectTrigger style={inputStyle}><SelectValue placeholder="Choisir une promotion" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    {classes.length > 0 ? classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)
                      : <div style={{ padding: '10px 8px', fontSize: 13, color: '#b0b0b0', ...CG }}>Aucune promotion assignée</div>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Matière</Label>
                <Select value={ficheForm.matiere_id} onValueChange={(v) => setFicheForm({ ...ficheForm, matiere_id: v })}>
                  <SelectTrigger style={inputStyle}><SelectValue placeholder="Choisir une matière" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    {matieres.length > 0 ? matieres.map((m) => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)
                      : <div style={{ padding: '10px 8px', fontSize: 13, color: '#b0b0b0', ...CG }}>Aucune matière assignée</div>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Label className="text-white text-xs font-medium" style={CG}>Titre de la séance *</Label>
              <Input value={ficheForm.titre_seance}
                onChange={(e) => setFicheForm({ ...ficheForm, titre_seance: e.target.value })}
                placeholder="Ex: Les missions et les défis d'un entrepreneur" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Label className="text-white text-xs font-medium" style={CG}>Numéro d'identification</Label>
              <Input value={ficheForm.numero_identification || ''}
                onChange={(e) => setFicheForm({ ...ficheForm, numero_identification: e.target.value })}
                placeholder="Ex: FEVR0001" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Label className="text-white text-xs font-medium" style={CG}>Objectifs de la séance</Label>
              <Textarea value={ficheForm.objectifs_seance}
                onChange={(e) => setFicheForm({ ...ficheForm, objectifs_seance: e.target.value })}
                rows={2} placeholder="Définir les objectifs..." style={inputStyle} />
            </div>
            <div>
              <Label className="text-white text-xs font-medium" style={CG}>Espace de la formation</Label>
              <Select value={ficheForm.espace_formation} onValueChange={(v) => setFicheForm({ ...ficheForm, espace_formation: v })}>
                <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="Salle de cours">Salle de cours</SelectItem>
                  <SelectItem value="Salle spécialisée">Salle spécialisée</SelectItem>
                  <SelectItem value="Atelier">Atelier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Introduction */}
          <div style={{ marginBottom: 20 }}>
            <div style={sectionStyle}>Introduction</div>
            {[
              { label: 'Rappel', key: 'rappel', ph: 'Questions et réponses (Debrief séance précédente)' },
              { label: 'Éléments de motivation', key: 'elements_motivation', ph: '' },
              { label: 'Plan de la séance', key: 'plan_seance', ph: 'Objectifs, défis, leçons comprises / Synthèse, Prochaine séance' },
            ].map(({ label, key, ph }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, marginBottom: 10, alignItems: 'end' }}>
                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>{label}</Label>
                  <Textarea value={ficheForm.introduction[key].contenu}
                    onChange={(e) => setFicheForm({ ...ficheForm, introduction: { ...ficheForm.introduction, [key]: { ...ficheForm.introduction[key], contenu: e.target.value } } })}
                    rows={2} placeholder={ph} style={inputStyle} />
                </div>
                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Durée (min)</Label>
                  <Input type="number" value={ficheForm.introduction[key].duree}
                    onChange={(e) => setFicheForm({ ...ficheForm, introduction: { ...ficheForm.introduction, [key]: { ...ficheForm.introduction[key], duree: parseInt(e.target.value) || 0 } } })}
                    style={inputStyle} />
                </div>
              </div>
            ))}
          </div>

          {/* Développement */}
          <div style={{ marginBottom: 20 }}>
            <div style={sectionStyle}>Développement</div>
            <div style={{ marginBottom: 10 }}>
              <Label className="text-white text-xs font-medium" style={CG}>Stratégies pédagogiques</Label>
              <Textarea value={ficheForm.developpement.strategies_pedagogiques}
                onChange={(e) => setFicheForm({ ...ficheForm, developpement: { ...ficheForm.developpement, strategies_pedagogiques: e.target.value } })}
                rows={2} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <Label className="text-white text-xs font-medium" style={CG}>Méthodes pédagogiques</Label>
              <Input value={ficheForm.developpement.methodes_pedagogiques}
                onChange={(e) => setFicheForm({ ...ficheForm, developpement: { ...ficheForm.developpement, methodes_pedagogiques: e.target.value } })}
                placeholder="Ex: Jeux de rôle, Travail de groupe, Exposé interactif" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <Label className="text-white text-xs font-medium" style={CG}>Supports pédagogiques</Label>
              <Input value={ficheForm.developpement.supports_pedagogiques}
                onChange={(e) => setFicheForm({ ...ficheForm, developpement: { ...ficheForm.developpement, supports_pedagogiques: e.target.value } })}
                placeholder="Ex: Tableau, data-show, flip chart" style={inputStyle} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Label className="text-white text-xs font-medium" style={CG}>Activités détaillées</Label>
                <Button size="sm" onClick={addActivite}
                  style={{ background: 'rgba(255,255,255,0.10)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', ...CG }}>
                  <Plus className="w-4 h-4 mr-1" /> Ajouter activité
                </Button>
              </div>
              {ficheForm.developpement.activites.map((activite, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 36px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                  <Textarea value={activite.contenu} onChange={(e) => updateActivite(idx, 'contenu', e.target.value)}
                    rows={2} placeholder="Description de l'activité" style={inputStyle} />
                  <Input type="number" value={activite.duree} onChange={(e) => updateActivite(idx, 'duree', parseInt(e.target.value) || 0)}
                    placeholder="min" style={inputStyle} />
                  <Button size="sm" variant="outline" onClick={() => removeActivite(idx)}
                    style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#f87171' }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Conclusion */}
          <div style={{ marginBottom: 20 }}>
            <div style={sectionStyle}>Conclusion</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, alignItems: 'end' }}>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Synthèse</Label>
                <Textarea value={ficheForm.conclusion.synthese.contenu}
                  onChange={(e) => setFicheForm({ ...ficheForm, conclusion: { ...ficheForm.conclusion, synthese: { ...ficheForm.conclusion.synthese, contenu: e.target.value } } })}
                  rows={2} placeholder="Récapitulation des leçons apprises dans ce cours" style={inputStyle} />
              </div>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Durée (min)</Label>
                <Input type="number" value={ficheForm.conclusion.synthese.duree}
                  onChange={(e) => setFicheForm({ ...ficheForm, conclusion: { ...ficheForm.conclusion, synthese: { ...ficheForm.conclusion.synthese, duree: parseInt(e.target.value) || 0 } } })}
                  style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Évaluation */}
          <div style={{ marginBottom: 20 }}>
            <div style={sectionStyle}>Évaluation</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, alignItems: 'end' }}>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Prochaine séance</Label>
                <Textarea value={ficheForm.evaluation.prochaine_seance.contenu}
                  onChange={(e) => setFicheForm({ ...ficheForm, evaluation: { ...ficheForm.evaluation, prochaine_seance: { ...ficheForm.evaluation.prochaine_seance, contenu: e.target.value } } })}
                  rows={2} placeholder="Travaux préparatoires pour la prochaine séance" style={inputStyle} />
              </div>
              <div>
                <Label className="text-white text-xs font-medium" style={CG}>Durée (min)</Label>
                <Input type="number" value={ficheForm.evaluation.prochaine_seance.duree}
                  onChange={(e) => setFicheForm({ ...ficheForm, evaluation: { ...ficheForm.evaluation, prochaine_seance: { ...ficheForm.evaluation.prochaine_seance, duree: parseInt(e.target.value) || 0 } } })}
                  style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Remarques */}
          <div style={{ marginBottom: 8 }}>
            <Label className="text-white text-xs font-medium" style={CG}>Remarque sur le déroulement de la séance</Label>
            <Textarea value={ficheForm.remarques}
              onChange={(e) => setFicheForm({ ...ficheForm, remarques: e.target.value })}
              rows={3} placeholder="Observations et remarques..." style={inputStyle} />
          </div>
        </DraggableDialogBody>

        <DraggableDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG }}>
            Annuler
          </Button>
          <Button onClick={handleSaveFiche} disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
            {isSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</>)
              : (<><Save className="w-4 h-4 mr-2" />Enregistrer</>)}
          </Button>
        </DraggableDialogFooter>
    </DraggableDialog>
  );
}