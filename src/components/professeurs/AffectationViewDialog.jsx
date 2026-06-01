import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataService } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

export default function AffectationViewDialog({ open, onClose, professeur, etablissementId }) {
  const queryClient = useQueryClient();

  const { data: affectations = [], isLoading } = useQuery({
    queryKey: ['affectations', professeur?.id],
    queryFn: async () => {
      const affecs = await dataService.query('AssignationProfesseur', { filters: [{
        professeur_id: professeur.id,
      }] });
      return affecs;
    },
    enabled: open && !!professeur?.id,
  });

  const deleteAffectationMutation = useMutation({
    mutationFn: async (affectationId) => {
      await dataService.delete('AssignationProfesseur', affectationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affectations'] });
      toast.success("Affectation supprimée avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const handleDelete = (affectationId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette affectation ?")) {
      deleteAffectationMutation.mutate(affectationId);
    }
  };

  const titleNode = (
    <div style={CG}>
      <div className="text-base font-semibold text-white">
        Affectations de {professeur?.prenom} {professeur?.nom}
      </div>
      <div className="text-xs mt-0.5" style={{ color: '#b0b0b0' }}>
        {affectations.length} affectation(s)
      </div>
    </div>
  );

  return (
    <>
      <DraggableDialog
        open={open}
        onOpenChange={onClose}
        title={titleNode}
        maxWidth="max-w-5xl"
      >
        <DraggableDialogBody>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          ) : affectations.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ ...CG, color: '#b0b0b0' }}>Aucune affectation pour ce professeur</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[55vh]">
              <div className="pr-2">
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <TableHead className="text-white" style={CG}>Matière</TableHead>
                      <TableHead className="text-white" style={CG}>Faculté</TableHead>
                      <TableHead className="text-white" style={CG}>Département</TableHead>
                      <TableHead className="text-white" style={CG}>Option</TableHead>
                      <TableHead className="text-white" style={CG}>Orientation</TableHead>
                      <TableHead className="text-white" style={CG}>Classe</TableHead>
                      <TableHead className="text-center text-white" style={CG}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...affectations].sort((a, b) => {
                      const extractLevel = (name) => {
                        if (!name) return 99;
                        const m = name.match(/^(\d+)/);
                        return m ? parseInt(m[1], 10) : 99;
                      };
                      const levelA = extractLevel(a.classe_nom);
                      const levelB = extractLevel(b.classe_nom);
                      if (levelA !== levelB) return levelA - levelB;
                      return (a.classe_nom || '').localeCompare(b.classe_nom || '');
                    }).map((aff, idx, sortedArr) => {
                      const prevAff = idx > 0 ? sortedArr[idx - 1] : null;
                      const showMatiere = !prevAff || prevAff.matiere_nom !== aff.matiere_nom;
                      const showFaculte = !prevAff || prevAff.faculte !== aff.faculte;
                      const showDept = !prevAff || prevAff.departement !== aff.departement;
                      const showOption = !prevAff || prevAff.option !== aff.option;
                      const showOrientation = !prevAff || prevAff.orientation !== aff.orientation;

                      const groupKey = `${aff.departement || 'Aucun'}-${aff.option || 'Aucun'}-${aff.orientation || 'Aucun'}`;
                      const savedColors = JSON.parse(localStorage.getItem('affectation-colors') || '{}');
                      const defaultColors = [
                        '#1e3a8a', '#15803d', '#6b21a8', '#c2410c',
                        '#be185d', '#a16207', '#4338ca', '#b91c1c'
                      ];
                      const colorIndex = Math.abs(groupKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % defaultColors.length;
                      const classeColor = savedColors[groupKey] || defaultColors[colorIndex];

                      return (
                        <TableRow
                          key={aff.id}
                          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                          className="hover:bg-white/5"
                        >
                          <TableCell className={`text-white font-semibold ${showMatiere ? '' : 'opacity-0'}`} style={{ ...CG, backgroundColor: showMatiere ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                            {showMatiere ? aff.matiere_nom : ''}
                          </TableCell>
                          <TableCell className="text-white font-semibold" style={{ ...CG, backgroundColor: showFaculte ? 'rgba(255,100,100,0.08)' : 'transparent', opacity: showFaculte ? 1 : 0 }}>
                            {showFaculte ? (aff.faculte || '—') : ''}
                          </TableCell>
                          <TableCell className="text-white font-semibold" style={{ ...CG, backgroundColor: showDept ? 'rgba(100,255,100,0.06)' : 'transparent', opacity: showDept ? 1 : 0 }}>
                            {showDept ? (aff.departement || '—') : ''}
                          </TableCell>
                          <TableCell className="text-white font-semibold" style={{ ...CG, backgroundColor: showOption ? 'rgba(255,255,100,0.06)' : 'transparent', opacity: showOption ? 1 : 0 }}>
                            {showOption ? (aff.option || '—') : ''}
                          </TableCell>
                          <TableCell className="text-white font-semibold" style={{ ...CG, backgroundColor: showOrientation ? 'rgba(100,200,255,0.06)' : 'transparent', opacity: showOrientation ? 1 : 0 }}>
                            {showOrientation ? (aff.orientation || '—') : ''}
                          </TableCell>
                          <TableCell className="text-white font-semibold" style={{ ...CG, backgroundColor: classeColor + '40' }}>
                            {aff.classe_nom}
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={() => handleDelete(aff.id)}
                              disabled={deleteAffectationMutation.isPending}
                              className="p-1 hover:opacity-70 transition-opacity disabled:opacity-50"
                            >
                              <Trash2 className="w-5 h-5 text-red-500" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </DraggableDialogBody>


      </DraggableDialog>

    </>
  );
}