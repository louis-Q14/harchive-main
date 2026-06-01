import React from "react";
import { DraggableDialog, DraggableDialogBody } from "@/components/ui/DraggableDialog";
import { Button } from "@/components/ui/button";
import { FileText, Edit, Download, Upload } from "lucide-react";
import { format } from "date-fns";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

function Section({ title }) {
  return (
    <tr>
      <td colSpan={3} style={{ background: 'rgba(255,255,255,0.10)', padding: '6px 10px', fontWeight: 700, color: '#fff', ...CG }}>
        {title}
      </td>
    </tr>
  );
}

export default function FichePreparationViewer({ fiche, classes, matieres, onClose, onEdit, onExportPDF, onTransmettre }) {
  if (!fiche) return null;

  const classe = classes?.find(c => c.id === fiche.classe_id);
  const matiere = matieres?.find(m => m.id === fiche.matiere_id);

  return (
    <DraggableDialog
      open={!!fiche}
      onOpenChange={onClose}
      title={
        <span style={{ ...CG, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText style={{ width: 16, height: 16, color: '#818cf8', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {fiche.numero_identification && <span style={{ color: '#818cf8' }}>{fiche.numero_identification} — </span>}
            {fiche.titre_seance}
          </span>
        </span>
      }
      maxWidth="max-w-3xl"
    >
      <DraggableDialogBody>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          {onEdit && (
            <Button size="sm" onClick={onEdit}
              style={{ background: '#3b82f6', color: '#fff', ...CG, fontSize: 12, height: 28, padding: '0 10px' }}>
              <Edit style={{ width: 12, height: 12, marginRight: 4 }} /> Modifier
            </Button>
          )}
          {onExportPDF && (
            <Button size="sm" onClick={() => onExportPDF(fiche.id)}
              style={{ background: '#16a34a', color: '#fff', ...CG, fontSize: 12, height: 28, padding: '0 10px' }}>
              <Download style={{ width: 12, height: 12, marginRight: 4 }} /> PDF
            </Button>
          )}
          {onTransmettre && (
            <Button size="sm" onClick={() => onTransmettre(fiche)}
              style={{ background: '#7c3aed', color: '#fff', ...CG, fontSize: 12, height: 28, padding: '0 10px' }}>
              <Upload style={{ width: 12, height: 12, marginRight: 4 }} /> Transmettre
            </Button>
          )}
        </div>

        {/* Tableau principal */}
        <table style={{ width: '100%', borderCollapse: 'collapse', ...CG, fontSize: 12 }}>
          <tbody>
            {/* En-tête */}
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.55)', width: '30%' }}>Date de la séance</td>
              <td style={{ padding: '5px 8px', color: '#fff', fontWeight: 600 }} colSpan={2}>
                {fiche.date_seance ? format(new Date(fiche.date_seance), 'dd/MM/yyyy') : '-'}
                {fiche.duree_seance && <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 16 }}>Durée : {fiche.duree_seance}</span>}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.55)' }}>Filière / Année</td>
              <td style={{ padding: '5px 8px', color: '#fff' }} colSpan={2}>
                {[fiche.filiere, fiche.annee, fiche.groupe && `Groupe : ${fiche.groupe}`].filter(Boolean).join(' — ') || '-'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.55)' }}>Module</td>
              <td style={{ padding: '5px 8px', color: '#fff' }} colSpan={2}>{fiche.module || matiere?.nom || '-'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.55)' }}>Promotion / Matière</td>
              <td style={{ padding: '5px 8px', color: '#fff' }} colSpan={2}>
                {[classe?.nom, matiere?.nom].filter(Boolean).join(' — ') || '-'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.55)' }}>Objectifs</td>
              <td style={{ padding: '5px 8px', color: '#fff' }} colSpan={2}>{fiche.objectifs_seance || '-'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.55)' }}>Espace</td>
              <td style={{ padding: '5px 8px', color: '#fff' }} colSpan={2}>{fiche.espace_formation || '-'}</td>
            </tr>

            {/* Introduction */}
            <Section title="Introduction" />
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <th style={{ padding: '4px 8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textAlign: 'left', background: 'rgba(255,255,255,0.04)', width: '30%' }}>Étape</th>
              <th style={{ padding: '4px 8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textAlign: 'left', background: 'rgba(255,255,255,0.04)' }}>Contenu</th>
              <th style={{ padding: '4px 8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textAlign: 'center', background: 'rgba(255,255,255,0.04)', width: 70 }}>Durée (min)</th>
            </tr>
            {[
              { label: 'Rappel', data: fiche.introduction?.rappel },
              { label: 'Motivation', data: fiche.introduction?.elements_motivation },
              { label: 'Plan de séance', data: fiche.introduction?.plan_seance },
            ].map(({ label, data }) => (
              <tr key={label} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{label}</td>
                <td style={{ padding: '5px 8px', color: '#e5e7eb' }}>{data?.contenu || '-'}</td>
                <td style={{ padding: '5px 8px', color: '#fff', textAlign: 'center' }}>{data?.duree ?? '-'}</td>
              </tr>
            ))}

            {/* Développement */}
            <Section title="Développement" />
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.55)' }}>Stratégies</td>
              <td style={{ padding: '5px 8px', color: '#e5e7eb' }} colSpan={2}>{fiche.developpement?.strategies_pedagogiques || '-'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.55)' }}>Méthodes</td>
              <td style={{ padding: '5px 8px', color: '#e5e7eb' }} colSpan={2}>{fiche.developpement?.methodes_pedagogiques || '-'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.55)' }}>Supports</td>
              <td style={{ padding: '5px 8px', color: '#e5e7eb' }} colSpan={2}>{fiche.developpement?.supports_pedagogiques || '-'}</td>
            </tr>
            {fiche.developpement?.activites?.length > 0 && (
              <>
                <tr>
                  <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.55)', verticalAlign: 'top' }}>Activités</td>
                  <td style={{ padding: '5px 8px' }} colSpan={2}>
                    {fiche.developpement.activites.map((a, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#e5e7eb' }}>
                        <span>❖ {a.contenu}</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 12, flexShrink: 0 }}>{a.duree} min</span>
                      </div>
                    ))}
                  </td>
                </tr>
              </>
            )}

            {/* Conclusion */}
            <Section title="Conclusion" />
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Synthèse</td>
              <td style={{ padding: '5px 8px', color: '#e5e7eb' }}>{fiche.conclusion?.synthese?.contenu || '-'}</td>
              <td style={{ padding: '5px 8px', color: '#fff', textAlign: 'center' }}>{fiche.conclusion?.synthese?.duree ?? '-'}</td>
            </tr>

            {/* Évaluation */}
            <Section title="Évaluation" />
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Prochaine séance</td>
              <td style={{ padding: '5px 8px', color: '#e5e7eb' }}>{fiche.evaluation?.prochaine_seance?.contenu || '-'}</td>
              <td style={{ padding: '5px 8px', color: '#fff', textAlign: 'center' }}>{fiche.evaluation?.prochaine_seance?.duree ?? '-'}</td>
            </tr>

            {/* Remarques */}
            {fiche.remarques && (
              <>
                <Section title="Remarques" />
                <tr>
                  <td colSpan={3} style={{ padding: '6px 8px', color: '#e5e7eb' }}>{fiche.remarques}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </DraggableDialogBody>
    </DraggableDialog>
  );
}