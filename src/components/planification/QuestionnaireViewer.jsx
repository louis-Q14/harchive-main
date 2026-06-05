import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { X, Printer, CheckCircle2, XCircle, Send } from "lucide-react";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

/** @param {any} q */
function generateQuestionnaireHTML(q) {
  const questions = (() => {
    const raw = q.contenu_questions;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.length > 0) {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
  })();

  const typeLabel = q.type_evaluation === 'examen' ? "EXAMEN" : "INTERROGATION";

  return `
    <div style="font-family: 'Century Gothic', 'Gill Sans', sans-serif; color: #e0e0e0; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #4d4d4d; padding-bottom: 16px;">
        <h1 style="font-size: 20px; font-weight: bold; margin: 0 0 4px 0; color: #fff;">${escapeHtml(q.titre || '')}</h1>
        <div style="display: flex; justify-content: center; gap: 16px; margin-top: 8px; font-size: 13px; color: #aaa;">
          <span><strong>Type :</strong> ${typeLabel}</span>
          ${q.numero_identification ? `<span><strong>N° :</strong> ${escapeHtml(q.numero_identification)}</span>` : ''}
          ${q.matiere_nom ? `<span><strong>Matière :</strong> ${escapeHtml(q.matiere_nom)}</span>` : ''}
          ${q.classe_nom ? `<span><strong>Promotion :</strong> ${escapeHtml(q.classe_nom)}</span>` : ''}
        </div>
        <div style="display: flex; justify-content: center; gap: 16px; margin-top: 4px; font-size: 13px; color: #aaa;">
          ${q.date_examen ? `<span><strong>Date :</strong> ${q.date_examen}</span>` : ''}
          ${q.duree ? `<span><strong>Durée :</strong> ${escapeHtml(q.duree)}</span>` : ''}
          ${q.bareme_total ? `<span><strong>Barème :</strong> ${escapeHtml(q.bareme_total)} pts</span>` : ''}
        </div>
        <div style="font-size: 13px; color: #aaa; margin-top: 4px;">
          <strong>Professeur :</strong> ${escapeHtml(q.professeur_nom || '')}
        </div>
      </div>

      ${q.consignes ? `
        <div style="background: #2a2a3d; border-left: 4px solid #6366f1; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
          <strong style="color: #818cf8;">Consignes :</strong>
          <p style="margin: 6px 0 0 0; color: #c0c0d0;">${escapeHtml(q.consignes)}</p>
        </div>
      ` : ''}

      <div style="margin-top: 16px;">
        ${questions.length === 0 ? '<p style="color: #888; text-align: center; padding: 20px;">Aucune question composée. Modifiez le questionnaire pour ajouter des questions.</p>' : ''}
        ${questions.map((/** @type {any} */ question, /** @type {number} */ i) => `
          <div style="margin-bottom: 20px; padding: 14px; background: #2d2d2d; border-radius: 8px; border: 1px solid #3d3d3d;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: #60a5fa; font-size: 15px;">Question ${i + 1}</strong>
              <span style="background: #1e3a5f; color: #93c5fd; padding: 2px 10px; border-radius: 12px; font-size: 12px;">${question.points || 0} pt${(question.points || 0) > 1 ? 's' : ''}</span>
            </div>
            <p style="margin: 0 0 8px 0; color: #e0e0e0; white-space: pre-wrap;">${escapeHtml(question.enonce || '')}</p>
            ${question.type === 'qcm' && question.options?.length ? `
              <div style="margin-top: 8px; padding-left: 16px;">
                ${question.options.map((/** @type {any} */ opt, /** @type {number} */ j) => `
                  <div style="margin: 4px 0; color: #b0b0b0;">
                    <span style="color: #60a5fa; font-weight: bold; margin-right: 8px;">${String.fromCharCode(65 + j)}.</span>
                    ${escapeHtml(opt)}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      ${q.approuve_admin ? `
        <div style="margin-top: 24px; padding: 12px 16px; background: #1a3a2a; border: 1px solid #22c55e; border-radius: 8px; text-align: center;">
          <span style="color: #22c55e; font-weight: bold;">✓ APPROUVÉ PAR L'ADMINISTRATION</span>
          ${q.date_approbation ? `<br/><span style="color: #86efac; font-size: 12px;">Le ${q.date_approbation}</span>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

/** @param {string} text */
function escapeHtml(text) {
  /** @type {Record<string, string>} */
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/** @param {{ questionnaire: any, isOpen: boolean, onClose: () => void, userRole: string, onApprove?: (q: any) => void, onReject?: (q: any) => void, onTransmit?: (q: any) => void }} props */
export default function QuestionnaireViewer({
  questionnaire,
  isOpen,
  onClose,
  userRole,
  onApprove,
  onReject,
  onTransmit
}) {
  const contentRef = useRef(null);

  if (!isOpen || !questionnaire) return null;

  const htmlContent = generateQuestionnaireHTML(questionnaire);
  const isProf = userRole === 'professeur';
  const isAdmin = userRole === 'admin_etablissement' || userRole === 'super_admin';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>${questionnaire.titre || 'Questionnaire'}</title>
      <style>body { background: #fff; color: #000; font-family: 'Century Gothic', sans-serif; padding: 20px; }
      div[style*="background"] { background: #f5f5f5 !important; color: #000 !important; border-color: #ccc !important; }
      strong { color: #000 !important; } span { color: #333 !important; } p { color: #000 !important; }
      </style></head><body>${htmlContent}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <DraggableDialog
      open={isOpen}
      onOpenChange={(/** @type {boolean} */ v) => { if (!v) onClose(); }}
      title={
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{questionnaire.titre || 'Questionnaire'}</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>{questionnaire.type_evaluation === 'examen' ? "Questionnaire d'Examen" : "Questionnaire d'Interrogation"}</span>
        </span>
      }
      maxWidth="max-w-2xl"
    >
      <DraggableDialogBody>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <div ref={contentRef} dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>

        {/* Statut d'approbation */}
        <div className="flex items-center justify-center gap-3 mt-4 pt-3" style={{ borderTop: '1px solid #3d3d3d' }}>
          {questionnaire.approuve_admin ? (
            <Badge variant="default" className="bg-green-600 text-white px-4 py-1" style={CG}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approuvé
            </Badge>
          ) : questionnaire.transmis_admin ? (
            <Badge variant="default" className="bg-yellow-600 text-white px-4 py-1" style={CG}>
              <Send className="w-4 h-4 mr-1" /> En attente d'approbation
            </Badge>
          ) : (
            <Badge variant="default" className="bg-gray-600 text-white px-4 py-1" style={CG}>
              Brouillon
            </Badge>
          )}
        </div>
      </DraggableDialogBody>

      <DraggableDialogFooter>
        <div className="flex justify-between w-full">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG }}>
              <Printer className="w-4 h-4 mr-2" /> Imprimer
            </Button>
          </div>
          <div className="flex gap-2">
            {/* Prof: transmettre à l'admin */}
            {isProf && !questionnaire.transmis_admin && onTransmit && (
              <Button onClick={() => onTransmit(questionnaire)} className="bg-purple-600 hover:bg-purple-700 text-white" style={CG}>
                <Send className="w-4 h-4 mr-2" /> Transmettre à l'admin
              </Button>
            )}
            {/* Admin: approuver / rejeter */}
            {isAdmin && questionnaire.transmis_admin && !questionnaire.approuve_admin && (
              <>
                <Button onClick={() => onReject?.(questionnaire)}
                  className="bg-red-600 hover:bg-red-700 text-white" style={CG}>
                  <XCircle className="w-4 h-4 mr-2" /> Rejeter
                </Button>
                <Button onClick={() => onApprove?.(questionnaire)}
                  className="bg-green-600 hover:bg-green-700 text-white" style={CG}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Approuver
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG }}>
              Fermer
            </Button>
          </div>
        </div>
      </DraggableDialogFooter>
    </DraggableDialog>
  );
}
