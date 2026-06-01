import React, { useState, useRef } from "react";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Loader2, X } from "lucide-react";

export default function CreateGroupDialog({ open, onOpenChange, onCreateGroup, creating }) {
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    type: "public",
    message_bienvenue: ""
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Le fichier est trop volumineux (max 5MB)");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nom.trim()) {
      alert("Le nom du groupe est requis");
      return;
    }

    let avatarUrl = null;

    if (avatarFile) {
      // Convert to base64 data URL (no external upload service needed)
      avatarUrl = avatarPreview; // avatarPreview is already the base64 data URL from FileReader
    }

    await onCreateGroup({
      ...formData,
      avatar_url: avatarUrl
    });

    // Reset form
    setFormData({
      nom: "",
      description: "",
      type: "public",
      message_bienvenue: ""
    });
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange} title="Créer un nouveau groupe" resizable={false}>
      <DraggableDialogBody>
        <div className="space-y-4 py-4">
          {/* Avatar */}
          <div>
            <Label className="text-white text-xs font-medium" style={CG}>Image du groupe (optionnel)</Label>
            <div className="flex items-center gap-4 mt-2">
              {avatarPreview ? (
                <div className="relative">
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <button
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || creating}
                style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG}}>
                Choisir une image
              </Button>
            </div>
          </div>

          {/* Nom */}
          <div>
            <Label htmlFor="nom" className="text-white text-xs font-medium" style={CG}>Nom du groupe *</Label>
            <Input
              id="nom"
              placeholder="Nom du groupe"
              value={formData.nom}
              onChange={(e) => handleChange("nom", e.target.value)}
              disabled={uploading || creating}
              style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-white text-xs font-medium" style={CG}>Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez votre groupe..."
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              disabled={uploading || creating}
              className="min-h-[80px]"
              style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
            />
          </div>

          {/* Type */}
          <div>
            <Label className="text-white text-xs font-medium" style={CG}>Type de groupe</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) => handleChange("type", value)}
              disabled={uploading || creating}
              className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="font-normal cursor-pointer text-gray-300" style={CG}>
                  Public - N'importe qui peut rejoindre
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prive" id="prive" />
                <Label htmlFor="prive" className="font-normal cursor-pointer text-gray-300" style={CG}>
                  Privé - Nécessite une approbation pour rejoindre
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Message de bienvenue */}
          <div>
            <Label htmlFor="message_bienvenue" className="text-white text-xs font-medium" style={CG}>Message de bienvenue (optionnel)</Label>
            <Textarea
              id="message_bienvenue"
              placeholder="Message affiché aux nouveaux membres..."
              value={formData.message_bienvenue}
              onChange={(e) => handleChange("message_bienvenue", e.target.value)}
              disabled={uploading || creating}
              className="min-h-[60px]"
              style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
            />
          </div>
        </div>

      </DraggableDialogBody>
      <DraggableDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading || creating}
            style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG}}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.nom.trim() || uploading || creating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            style={CG}>
            {uploading || creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploading ? "Upload..." : "Création..."}
              </>
            ) : (
              "Créer le groupe"
            )}
          </Button>
      </DraggableDialogFooter>
    </DraggableDialog>
  );
}