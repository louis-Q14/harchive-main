import React, { useState } from "react";
import { dataService } from "@/api";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";
import FileViewer from "@/components/documents/FileViewer";
import PdfThumbnail from "@/components/documents/PdfThumbnail";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

function StatutBadge({ statut }) {
  if (statut === "approuve") return <span className="flex items-center gap-1 text-green-400 text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Approuvé</span>;
  if (statut === "rejete") return <span className="flex items-center gap-1 text-red-400 text-xs font-bold"><XCircle className="w-3 h-3" /> Rejeté</span>;
  return <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold"><Clock className="w-3 h-3" /> En attente de vérification</span>;
}

function PieceRow({ label, fieldPJ, fieldStatut, fieldMotif, data, adminUser, onUpdated }) {
  const [motif, setMotif] = useState("");
  const [showMotif, setShowMotif] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const url = data[fieldPJ];
  const statut = data[fieldStatut] || "en_attente";
  const isImage = url && (url.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url));
  const isPdf = url && !isImage;

  const handleApprouver = async () => {
    setLoading(true);
    try {
      const updateData = {};
      updateData[fieldStatut] = "approuve";
      updateData[fieldMotif] = "";
      await dataService.update('DemandeInscription', data.id, updateData);
      onUpdated();
    } catch (error) {
      console.error("Erreur approbation:", error);
      alert("Erreur lors de l'approbation");
      setLoading(false);
    }
  };

  const handleRejeter = async () => {
    if (!motif.trim()) { setShowMotif(true); return; }
    setLoading(true);

    try {
      const updateData = {};
      updateData[fieldStatut] = "rejete";
      updateData[fieldMotif] = motif;
      updateData[fieldPJ] = null;
      await dataService.update('DemandeInscription', data.id, updateData);
      setShowMotif(false);
      setMotif("");
      onUpdated();
    } catch (error) {
      console.error("Erreur rejet:", error);
      alert("Erreur lors du rejet");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg p-2 space-y-2" style={{ backgroundColor: 'var(--ha-surface2)', border: '1px solid #3d3d3d' }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Miniature du fichier */}
          {url && (
            <button onClick={() => setViewerOpen(true)} className="flex-shrink-0 rounded overflow-hidden border border-[#3d3d3d] hover:border-blue-400 transition-colors flex items-center justify-center" style={{ width: 90, height: 90 }}>
              {isImage ? (
                <img src={url} alt={label} className="w-full h-full object-cover" />
              ) : (
                <PdfThumbnail url={url} width={90} height={90} />
              )}
            </button>
          )}
          <div>
            <span className="text-gray-300 text-xs font-semibold" style={CG}>{label}</span>
            <div><StatutBadge statut={statut} /></div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {url && viewerOpen && <FileViewer url={url} title={label} onClose={() => setViewerOpen(false)} />}
          {!url && statut === "rejete" && (
            <span className="text-red-400 text-xs italic" style={CG}>Fichier supprimé</span>
          )}
          {!url && statut !== "rejete" && (
            <span className="text-gray-500 text-xs italic" style={CG}>Non fourni</span>
          )}
        </div>
      </div>

      {url && statut === "en_attente" && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleApprouver} disabled={loading} className="h-6 px-2 bg-green-700 hover:bg-green-800 text-white text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approuver
          </Button>
          <Button size="sm" onClick={() => setShowMotif(!showMotif)} disabled={loading} className="h-6 px-2 bg-red-700 hover:bg-red-800 text-white text-xs">
            <XCircle className="w-3 h-3 mr-1" /> Rejeter
          </Button>
        </div>
      )}

      {statut === "approuve" && (
        <p className="text-green-400 text-xs" style={CG}>✓ Document validé et conservé dans le dossier</p>
      )}

      {statut === "rejete" && data[fieldMotif] && (
        <div className="flex items-start gap-1 p-1.5 rounded" style={{ backgroundColor: '#2a1a1a' }}>
          <MessageSquare className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-xs" style={CG}>Motif : {data[fieldMotif]}</p>
        </div>
      )}

      {showMotif && (
        <div className="space-y-2">
          <textarea
            value={motif}
            onChange={e => setMotif(e.target.value)}
            placeholder="Précisez le motif du rejet (obligatoire)..."
            rows={2}
            className="w-full text-xs text-white rounded p-2 resize-none outline-none"
            style={{ backgroundColor: 'var(--ha-surface2)', border: '1px solid #4d4d4d', ...CG }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleRejeter} disabled={loading || !motif.trim()} className="h-6 px-2 bg-red-700 hover:bg-red-800 text-white text-xs">
              {loading ? "..." : "Confirmer le rejet"}
            </Button>
            <Button size="sm" onClick={() => { setShowMotif(false); setMotif(""); }} className="h-6 px-2 bg-gray-600 hover:bg-gray-700 text-white text-xs">
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PiecesJointesReview({ data, adminUser, onUpdated }) {
  if (!data) return null;

  const hasDiplome = !!data.piece_jointe_diplome || data.statut_diplome === "rejete";
  const hasBulletin = !!data.piece_jointe_bulletin || data.statut_bulletin_1 === "rejete";
  const hasBulletin2 = !!data.piece_jointe_bulletin_2 || data.statut_bulletin_2 === "rejete";
  const hasAttestation = !!data.piece_jointe_attestation_naissance || data.statut_attestation_naissance === "rejete";
  const hasBonneVie = !!data.piece_jointe_bonne_vie || data.statut_bonne_vie === "rejete";

  if (!hasDiplome && !hasBulletin && !hasBulletin2 && !hasAttestation && !hasBonneVie) return null;

  const anyPending =
    (hasDiplome && (data.statut_diplome === "en_attente" || !data.statut_diplome)) ||
    (hasBulletin && (data.statut_bulletin_1 === "en_attente" || !data.statut_bulletin_1)) ||
    (hasBulletin2 && (data.statut_bulletin_2 === "en_attente" || !data.statut_bulletin_2)) ||
    (hasAttestation && (data.statut_attestation_naissance === "en_attente" || !data.statut_attestation_naissance)) ||
    (hasBonneVie && (data.statut_bonne_vie === "en_attente" || !data.statut_bonne_vie));

  return (
    <div className="space-y-2">
      {anyPending && (
        <div className="flex items-start gap-2 rounded p-2 text-xs" style={{ backgroundColor: '#1a1500', border: '1px solid #5a4500' }}>
          <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-300" style={CG}>
            <span className="font-bold">Action requise :</span> Veuillez approuver ou rejeter les pièces jointes ci-dessous avant de pouvoir transmettre le dossier à l'étudiant.
          </p>
        </div>
      )}
      {hasDiplome && (
        <PieceRow
          label="Diplôme secondaire"
          fieldPJ="piece_jointe_diplome"
          fieldStatut="statut_diplome"
          fieldMotif="motif_rejet_diplome"
          data={data}
          adminUser={adminUser}
          onUpdated={onUpdated}
        />
      )}
      {hasBulletin && (
        <PieceRow
          label="Bulletin 5ème et 6ème — 1er fichier"
          fieldPJ="piece_jointe_bulletin"
          fieldStatut="statut_bulletin_1"
          fieldMotif="motif_rejet_bulletin_1"
          data={data}
          adminUser={adminUser}
          onUpdated={onUpdated}
        />
      )}
      {hasBulletin2 && (
        <PieceRow
          label="Bulletin 5ème et 6ème — 2ème fichier"
          fieldPJ="piece_jointe_bulletin_2"
          fieldStatut="statut_bulletin_2"
          fieldMotif="motif_rejet_bulletin_2"
          data={data}
          adminUser={adminUser}
          onUpdated={onUpdated}
        />
      )}
      {hasAttestation && (
        <PieceRow
          label="Attestation de Naissance"
          fieldPJ="piece_jointe_attestation_naissance"
          fieldStatut="statut_attestation_naissance"
          fieldMotif="motif_rejet_attestation_naissance"
          data={data}
          adminUser={adminUser}
          onUpdated={onUpdated}
        />
      )}
      {hasBonneVie && (
        <PieceRow
          label="Certificat de Bonne Vie et Mœurs"
          fieldPJ="piece_jointe_bonne_vie"
          fieldStatut="statut_bonne_vie"
          fieldMotif="motif_rejet_bonne_vie"
          data={data}
          adminUser={adminUser}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}