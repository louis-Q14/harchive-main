import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dataService } from "@/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Palette } from "lucide-react";
import { toast } from "sonner";

const defaultColors = [
  '#1e3a8a', '#15803d', '#6b21a8', '#c2410c', 
  '#be185d', '#a16207', '#4338ca', '#b91c1c'
];

export default function ColorManagementDialog({ open, onClose, etablissementId }) {
  const queryClient = useQueryClient();
  const [colorMap, setColorMap] = useState({});

  // Charger toutes les affectations pour extraire les groupes uniques
  const { data: affectations = [] } = useQuery({
    queryKey: ['all-affectations', etablissementId],
    queryFn: async () => {
      const affecs = await dataService.query('AssignationProfesseur', { filters: [{
        etablissement_id: etablissementId,
      }] });
      return affecs;
    },
    enabled: open && !!etablissementId,
  });

  useEffect(() => {
    // Charger les couleurs sauvegardées
    const saved = localStorage.getItem('affectation-colors');
    if (saved) {
      setColorMap(JSON.parse(saved));
    }
  }, [open]);

  // Extraire les groupes uniques
  const groups = Array.from(new Set(
    affectations.map(aff => {
      const dept = aff.departement || 'Aucun';
      const opt = aff.option || 'Aucun';
      const ori = aff.orientation || 'Aucun';
      return JSON.stringify({ dept, opt, ori });
    })
  )).map(str => JSON.parse(str));

  const getGroupKey = (group) => {
    return `${group.dept}-${group.opt}-${group.ori}`;
  };

  const getGroupColor = (group) => {
    const key = getGroupKey(group);
    return colorMap[key] || defaultColors[Math.abs(key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % defaultColors.length];
  };

  const handleColorChange = (group, color) => {
    const key = getGroupKey(group);
    const newColorMap = { ...colorMap, [key]: color };
    setColorMap(newColorMap);
  };

  const handleSave = () => {
    localStorage.setItem('affectation-colors', JSON.stringify(colorMap));
    toast.success("Couleurs sauvegardées et appliquées");
    onClose();
    // Émettre l'événement APRÈS la fermeture du dialog pour garantir la synchronisation
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('affectation-colors-updated', { detail: colorMap }));
    }, 50);
  };

  const handleReset = () => {
    setColorMap({});
    localStorage.removeItem('affectation-colors');
    toast.success("Couleurs réinitialisées");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]" style={{backgroundColor: '#3d3d3d', borderColor: '#4d4d4d'}}>
        <DialogHeader>
          <DialogTitle className="text-xl text-white flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Gestion des Couleurs
          </DialogTitle>
          <p className="text-sm text-gray-300">
            Personnalisez les couleurs des groupes département/option/orientation
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {groups.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Aucun groupe trouvé</p>
            ) : (
              groups.map((group, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-4 p-4 rounded-lg"
                  style={{backgroundColor: '#2d2d2d', borderColor: '#4d4d4d', border: '1px solid'}}
                >
                  <div className="flex-1">
                    <p className="text-white font-semibold">
                      {group.dept}
                    </p>
                    {group.opt !== 'Aucun' && (
                      <p className="text-sm text-gray-300">Option: {group.opt}</p>
                    )}
                    {group.ori !== 'Aucun' && (
                      <p className="text-sm text-gray-300">Orientation: {group.ori}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-12 h-12 rounded border-2 border-white"
                      style={{backgroundColor: getGroupColor(group)}}
                    />
                    <Input
                      type="color"
                      value={getGroupColor(group)}
                      onChange={(e) => handleColorChange(group, e.target.value)}
                      className="w-20 h-12 cursor-pointer"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="bg-[#2d2d2d] text-white border-[#4d4d4d]"
          >
            Réinitialiser
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-[#2d2d2d] text-white border-[#4d4d4d]"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}