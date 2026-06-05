import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Trash2, FileText, Eye, Edit2, Folder } from "lucide-react";
import { format } from "date-fns";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import FichePreparationViewer from "@/components/planification/FichePreparationViewer";

const FOLDER_ICON = "/assets/icons/d8ad0ef1d_folder3.png";
const FILE_ICON = "/assets/icons/47dbdd7fa_file.png";

// Hiérarchie complète dans l'ordre
const ALL_LEVELS = [
  { key: 'faculte',     label: 'Faculté',      field: 'faculte' },
  { key: 'departement', label: 'Département',   field: 'departement' },
  { key: 'orientation', label: 'Orientation',   field: 'orientation' },
  { key: 'option',      label: 'Option',        field: 'option' },
  { key: 'promotion',   label: 'Promotion',     field: 'classe_nom' },
  { key: 'professeur',  label: 'Professeur',    field: 'professeur_nom' },
  { key: 'matiere',     label: 'Matière',       field: 'matiere_nom' },
];

// Une valeur est "vide" si nulle, vide ou ressemble à un email
function isEmpty(val) {
  if (!val || val.trim() === '') return true;
  if (val.includes('@')) return true; // email → ignorer
  return false;
}

function FolderItem({ label, count, onClick }) {
  return (
    <div className="flex flex-col items-center p-2 cursor-pointer" onClick={onClick}>
      <div className="flex flex-col items-center rounded-lg px-2 py-1 hover:bg-[#3d3d3d] transition-colors">
        <img src={FOLDER_ICON} alt={label} className="w-14 h-14 object-contain mb-1" />
        <span className="text-white text-xs text-center font-medium line-clamp-2 max-w-[90px]">{label}</span>
      </div>
      <span className="text-gray-400 text-xs text-center">{count} fiche(s)</span>
    </div>
  );
}

function Breadcrumb({ path, onNavigate }) {
  return (
    <div className="flex items-center gap-1 flex-wrap mb-4 text-sm">
      {path.map((crumb, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-gray-500 mx-1">/</span>}
          {idx < path.length - 1 ? (
            <button onClick={() => onNavigate(idx)} className="text-blue-400 hover:text-blue-300 transition-colors">
              {crumb.label}
            </button>
          ) : (
            <span className="text-white font-semibold">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function FichesFolderView({ fiches, user, queryClient, createPageUrl }) {
  // path = [{ label, filters: { field: value, ... } }]
  // filters accumule les filtres actifs jusqu'à ce niveau
  const [path, setPath] = useState([{ label: 'Fiches de préparation', filters: {} }]);
  const [viewingFiche, setViewingFiche] = useState(null);
  const [renameItem, setRenameItem] = useState(null);
  const [newName, setNewName] = useState("");

  const { data: assignations = [] } = useQuery({
    queryKey: ['assignations-all', user?.etablissement_id],
    queryFn: () => base44.entities.AssignationProfesseur.filter({ etablissement_id: user.etablissement_id }),
    enabled: !!user?.etablissement_id,
  });

  // Enrichir chaque fiche avec les données de l'assignation correspondante
  const enrichedFiches = useMemo(() => {
    return fiches.map(fiche => {
      // Matching prioritaire par classe_id + matiere_id (les IDs prof peuvent différer)
      const a = assignations.find(a =>
        a.classe_id === fiche.classe_id &&
        a.matiere_id === fiche.matiere_id
      ) || assignations.find(a =>
        a.classe_id === fiche.classe_id
      ) || assignations.find(a =>
        a.professeur_id === fiche.professeur_id
      );

      // Nom complet du prof : priorité assignation > fiche.professeur_nom (si pas email) > fallback
      const profNom = !isEmpty(a?.professeur_nom) ? a.professeur_nom
        : !isEmpty(fiche.professeur_nom) ? fiche.professeur_nom
        : null;

      return {
        ...fiche,
        _faculte:     a?.faculte     || null,
        _departement: a?.departement || null,
        _option:      a?.option      || null,
        _orientation: a?.orientation || null,
        _promotion:   a?.classe_nom  || null,
        _professeur:  profNom        || null,
        _matiere:     a?.matiere_nom || fiche.module || null,
      };
    });
  }, [fiches, assignations]);

  // Filtrer les fiches selon les filtres actifs du chemin courant
  const currentFilters = path[path.length - 1].filters;
  const filteredFiches = useMemo(() => {
    return enrichedFiches.filter(fiche =>
      Object.entries(currentFilters).every(([field, value]) => fiche[field] === value)
    );
  }, [enrichedFiches, currentFilters]);

  // Trouver le prochain niveau pertinent : le premier ALL_LEVELS qui a des valeurs non-vides
  // parmi les fiches filtrées et qui n'est pas déjà dans les filtres actifs
  const nextLevel = useMemo(() => {
    const usedFields = new Set(Object.keys(currentFilters));
    for (const level of ALL_LEVELS) {
      const field = `_${level.key}`;
      if (usedFields.has(field)) continue;
      // Ce niveau a-t-il au moins une valeur non-vide ?
      const hasValues = filteredFiches.some(f => !isEmpty(f[field]));
      if (hasValues) return level;
    }
    return null; // niveau feuille → afficher les fiches
  }, [filteredFiches, currentFilters]);

  // Valeurs uniques du prochain niveau
  const uniqueValues = useMemo(() => {
    if (!nextLevel) return [];
    const field = `_${nextLevel.key}`;
    const seen = new Set();
    filteredFiches.forEach(f => {
      if (!isEmpty(f[field])) seen.add(f[field]);
    });
    return [...seen].sort();
  }, [filteredFiches, nextLevel]);

  const navigateTo = (idx) => {
    setPath(path.slice(0, idx + 1));
  };

  const openFolder = (level, value) => {
    const field = `_${level.key}`;
    const newFilters = { ...currentFilters, [field]: value };
    setPath([...path, { label: value, filters: newFilters }]);
  };

  const handleApprouver = async (fiche) => {
    if (!confirm('Approuver cette fiche ?')) return;
    await base44.entities.FichePreparation.update(fiche.id, { approuvee_admin: true });
    await base44.entities.Notification.create({
      destinataire_id: fiche.professeur_id,
      type: "systeme",
      titre: "Fiche de préparation approuvée",
      contenu: `Votre fiche "${fiche.titre_seance}" a été approuvée par l'administration.`,
      lien: createPageUrl("PlanificationPedagogique"),
      emetteur_id: user.id,
      emetteur_nom: user.full_name
    });
    queryClient.invalidateQueries({ queryKey: ['fiches-documents'] });
    alert('Fiche approuvée et notification envoyée');
  };

  const handleMasquer = async (fiche) => {
    if (!confirm('Voulez-vous masquer ce document ?')) return;
    await base44.entities.FichePreparation.update(fiche.id, { masque_par_admin: true });
    queryClient.invalidateQueries({ queryKey: ['fiches-documents'] });
    if (viewingFiche?.id === fiche.id) setViewingFiche(null);
  };

  if (fiches.length === 0) {
    return (
      <div className="py-16 text-center">
        <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400 mb-2">Aucun document</p>
        <p className="text-sm text-gray-500">Les fiches seront affichées ici une fois transmises</p>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb path={path} onNavigate={navigateTo} />

      {nextLevel ? (
        <div>
          <p className="text-gray-400 text-xs mb-3 uppercase tracking-wide">{nextLevel.label}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {uniqueValues.map((val) => {
              const field = `_${nextLevel.key}`;
              const count = filteredFiches.filter(f => f[field] === val).length;
              return (
                <ContextMenu key={val}>
                  <ContextMenuTrigger asChild>
                    <div>
                      <FolderItem
                        label={val}
                        count={count}
                        onClick={() => openFolder(nextLevel, val)}
                      />
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent style={{ backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)' }}>
                    <ContextMenuItem onClick={() => openFolder(nextLevel, val)} className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                      <Folder className="w-3.5 h-3.5 mr-2 text-yellow-400" /> Ouvrir le dossier
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        </div>
      ) : (
        filteredFiches.length === 0 ? (
          <div className="py-8 text-center text-gray-400">Aucune fiche</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {filteredFiches.map((fiche) => (
              <ContextMenu key={fiche.id}>
                <ContextMenuTrigger asChild>
                  <div
                    className="flex flex-col items-center p-2 cursor-pointer"
                    onClick={() => setViewingFiche(fiche)}
                  >
                    <div className="flex flex-col items-center rounded-lg px-2 py-1 hover:bg-[#3d3d3d] transition-colors relative">
                      <img src={FILE_ICON} alt={fiche.titre_seance} className="w-12 h-12 object-contain mb-1" />
                      {fiche.approuvee_admin && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </span>
                      )}
                      <span className="text-white text-xs text-center font-medium line-clamp-2 max-w-[90px]">
                        {fiche.date_seance ? format(new Date(fiche.date_seance), 'dd/MM/yy') : ''} — {fiche.titre_seance}
                      </span>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent style={{ backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)' }}>
                  <ContextMenuItem onClick={() => setViewingFiche(fiche)} className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                    <Eye className="w-3.5 h-3.5 mr-2 text-blue-400" /> Ouvrir
                  </ContextMenuItem>
                  <ContextMenuSeparator style={{ backgroundColor: 'var(--ha-bg)' }} />
                  <ContextMenuItem onClick={() => { setRenameItem(fiche); setNewName(fiche.titre_seance); }} className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                    <Edit2 className="w-3.5 h-3.5 mr-2 text-blue-400" /> Renommer
                  </ContextMenuItem>
                  <ContextMenuSeparator style={{ backgroundColor: 'var(--ha-bg)' }} />
                  <ContextMenuItem onClick={() => handleApprouver(fiche)} className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-green-400" /> Approuver
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleMasquer(fiche)} className="text-red-400 text-xs hover:bg-[#474747] cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )
      )}

      {renameItem && (
        <Dialog open={!!renameItem} onOpenChange={() => setRenameItem(null)}>
          <DialogContent style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
            <DialogHeader>
              <DialogTitle className="text-white">Renommer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nouveau nom" className="bg-[#2d2d2d] border-[#4d4d4d] text-white" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameItem(null)} className="bg-[#2d2d2d] text-white border-[#4d4d4d]">Annuler</Button>
              <Button onClick={async () => { if (newName.trim()) { await base44.entities.FichePreparation.update(renameItem.id, { titre_seance: newName }); queryClient.invalidateQueries({ queryKey: ['fiches-documents'] }); setRenameItem(null); } }} className="bg-blue-600 hover:bg-blue-700 text-white">Renommer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {viewingFiche && (
        <FichePreparationViewer
          fiche={viewingFiche}
          classes={[]}
          matieres={[]}
          onClose={() => setViewingFiche(null)}
          onEdit={null}
          onExportPDF={null}
          onTransmettre={null}
          extraActions={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleApprouver(viewingFiche)} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Approuver
              </Button>
              <Button size="sm" onClick={() => handleMasquer(viewingFiche)} className="bg-red-600 hover:bg-red-700">
                <Trash2 className="w-4 h-4 mr-1" /> Masquer
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}