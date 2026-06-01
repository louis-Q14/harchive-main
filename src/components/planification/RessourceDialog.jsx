import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Save } from "lucide-react";
import { uploadFile } from "@/api/uploadService";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
const inputStyle = { backgroundColor: '#2d2d2d', color: '#ffffff', borderColor: '#4d4d4d', ...CG };

export default function RessourceDialog({
  open,
  onOpenChange,
  ressourceForm,
  setRessourceForm,
  editingRessource,
  handleSaveRessource,
  handleFileUpload,
  uploadingFile
}) {
  if (!open) return null;

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange} title={editingRessource ? 'Modifier la ressource' : 'Nouvelle ressource'} subtitle="Gérez vos ressources pédagogiques">
      <DraggableDialogBody>
          <div style={{ marginBottom: 14 }}>
            <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
            <Input
              value={ressourceForm.titre}
              onChange={(e) => setRessourceForm({ ...ressourceForm, titre: e.target.value })}
              placeholder="Titre de la ressource"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
            <Textarea
              value={ressourceForm.description}
              onChange={(e) => setRessourceForm({ ...ressourceForm, description: e.target.value })}
              placeholder="Description..."
              rows={3}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <Label className="text-white text-xs font-medium" style={CG}>Type *</Label>
              <Select value={ressourceForm.type} onValueChange={(v) => setRessourceForm({ ...ressourceForm, type: v })}>
                <SelectTrigger style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="fiche">Fiche de cours</SelectItem>
                  <SelectItem value="exercice">Exercice</SelectItem>
                  <SelectItem value="diaporama">Diaporama</SelectItem>
                  <SelectItem value="video">Vidéo</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="lien">Lien externe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white text-xs font-medium" style={CG}>Vignette de couverture</Label>
              <Input
                type="file"
                accept="image/*"
                style={inputStyle}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    const result = await uploadFile(file, 'documents');
                    setRessourceForm({ ...ressourceForm, vignette_url: result.url });
                  } catch (err) {
                    console.error('Erreur upload vignette:', err);
                    alert('Erreur lors de l\'upload de la vignette');
                  }
                }}
              />
              {ressourceForm.vignette_url && (
                <img src={ressourceForm.vignette_url} alt="Vignette" style={{ marginTop: 6, height: 60, borderRadius: 6, objectFit: 'cover' }} />
              )}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label className="text-white text-xs font-medium" style={CG}>Fichier</Label>
            <Input type="file" onChange={handleFileUpload} disabled={uploadingFile} style={inputStyle} />
            {uploadingFile && <p style={{ fontSize: 12, color: '#b0b0b0', marginTop: 4, ...CG }}>Upload en cours...</p>}
            {ressourceForm.fichier_url && <p style={{ fontSize: 12, color: '#4ade80', marginTop: 4, ...CG }}>Fichier uploadé ✓</p>}
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label className="text-white text-xs font-medium" style={CG}>Lien externe</Label>
            <Input
              value={ressourceForm.lien_externe}
              onChange={(e) => setRessourceForm({ ...ressourceForm, lien_externe: e.target.value })}
              placeholder="https://..."
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={ressourceForm.public}
              onChange={(e) => setRessourceForm({ ...ressourceForm, public: e.target.checked })}
              style={{ width: 16, height: 16 }}
            />
            <Label className="text-white text-xs font-medium" style={CG}>Partager avec les autres professeurs</Label>
          </div>
        </DraggableDialogBody>

        <DraggableDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG }}>
            Annuler
          </Button>
          <Button onClick={handleSaveRessource}
            className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </DraggableDialogFooter>
    </DraggableDialog>
  );
}