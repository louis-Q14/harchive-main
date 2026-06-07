import React, { useState } from "react";
import { dataService } from "@/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Folder, FolderOpen, FileText, ArrowLeft, Download, Eye, User, Trash2, Edit2, GraduationCap, MapPin, Mail, BookOpen, Save, X, Send, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { DraggableDialog, DraggableDialogBody } from "@/components/ui/DraggableDialog";
import PiecesJointesReview from "@/components/documents/PiecesJointesReview";
import FileViewer from "@/components/documents/FileViewer";
import PdfThumbnail from "@/components/documents/PdfThumbnail";
import DocumentThumbnail from "@/components/documents/DocumentThumbnail";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

function Section({ title, icon, children }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #4d4d4d' }}>
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: 'var(--ha-surface2)' }}>
        {icon}
        <h3 className="text-white font-semibold text-xs" style={CG}>{title}</h3>
      </div>
      <div className="p-2 space-y-0.5" style={{ backgroundColor: 'var(--ha-surface2)' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, editMode, fieldKey, onChange, highlight }) {
  if (!editMode && !value) return null;
  return (
    <div className="flex items-center justify-between py-0.5 border-b last:border-0" style={{ borderColor: '#3d3d3d' }}>
      <span className="text-gray-400 text-xs w-36 flex-shrink-0" style={CG}>{label}</span>
      {editMode ? (
        <input
          className="flex-1 text-xs text-white bg-transparent border-b border-blue-500 outline-none text-right px-1"
          style={CG}
          value={value || ''}
          onChange={e => onChange(fieldKey, e.target.value)}
        />
      ) : (
        <span className={`text-xs text-right flex-1 ${highlight ? 'text-blue-300 font-bold' : 'text-white'}`} style={CG}>{value}</span>
      )}
    </div>
  );
}

export default function FichiersInscriptions({ user, onBack, roleFilter = "etudiant" }) {
  const [path, setPath] = useState([]);
  const [renameItem, setRenameItem] = useState(null);
  const [newName, setNewName] = useState("");
  const [viewingFiche, setViewingFiche] = useState(null);
  const [ficheData, setFicheData] = useState(null);
  const [loadingFiche, setLoadingFiche] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [fileViewer, setFileViewer] = useState(null);
  const queryClient = useQueryClient();

  const handlePJUpdated = async () => {
    if (!viewingFiche?.etudiant_id) return;
    try {
      const demandeList = await dataService.query('DemandeInscription', { filters: [{ id: viewingFiche.etudiant_id }], limit: 1, offset: 0 });
      if (demandeList.length === 0) return;
      const d = demandeList[0];
      setFicheData(d);
      setEditedData({ ...d });

      // Vérifier si TOUTES les PJ existantes sont maintenant approuvées
      const pjList = [
        { field: 'piece_jointe_diplome', statut: d.statut_diplome, nom: 'Diplôme secondaire', type: 'diplome' },
        { field: 'piece_jointe_bulletin', statut: d.statut_bulletin_1, nom: 'Bulletin 5ème et 6ème — 1er fichier', type: 'bulletin' },
        { field: 'piece_jointe_bulletin_2', statut: d.statut_bulletin_2, nom: 'Bulletin 5ème et 6ème — 2ème fichier', type: 'bulletin_2' },
        { field: 'piece_jointe_attestation_naissance', statut: d.statut_attestation_naissance, nom: 'Attestation de Naissance', type: 'attestation_naissance' },
        { field: 'piece_jointe_bonne_vie', statut: d.statut_bonne_vie, nom: 'Certificat de Bonne Vie et Mœurs', type: 'bonne_vie' },
      ].filter(pj => d[pj.field]);

      const toutApprouve = pjList.length > 0 && pjList.every(pj => pj.statut === 'approuve');

      if (toutApprouve) {
        const studentUserId = d.user_id || d.id;
        const allDossiers = await dataService.query('DossierInscription', { filters: [{ etudiant_id: studentUserId }], limit: 1000, offset: 0 });
        const certifieInfo = {
          certifie: true,
          pre_certification: false,
          certifie_par: user.full_name || user.email,
          date_certification: new Date().toISOString(),
        };

        for (const dossier of allDossiers) {
          await dataService.update('DossierInscription', dossier.id, certifieInfo);
        }

        const canauxOuverts = await dataService.query('CanalRenvoi', { filters: [{ demande_id: d.id, statut: 'ouvert' }], limit: 1000, offset: 0 });
        for (const canal of canauxOuverts) {
          await dataService.update('CanalRenvoi', canal.id, { statut: 'ferme' });
        }

        const subDossier = allDossiers.find(x => x.nom === 'Inscription' && !x.is_fichier);
        const pjDossier = subDossier ? allDossiers.find(x => x.nom === 'Pièces jointes' && x.parent_id === subDossier.id && !x.is_fichier) : null;
        if (pjDossier) {
          const etudiantInfo = { etudiant_id: studentUserId, etudiant_nom: `${d.prenom} ${d.nom}`, etudiant_email: d.email, etablissement_id: d.etablissement_id || user.etablissement_id, etablissement_nom: d.etablissement_nom || user.etablissement_nom || '' };
          for (const pj of pjList) {
            const existe = allDossiers.find(x => x.fichier_type === pj.type && x.parent_id === pjDossier.id);
            if (!existe) {
              await dataService.create('DossierInscription', {
                nom: pj.nom, type: 'mon_inscription', fichier_type: pj.type,
                fichier_url: d[pj.field], is_fichier: true, parent_id: pjDossier.id,
                ...etudiantInfo, ...certifieInfo,
              });
            } else {
              await dataService.update('DossierInscription', existe.id, { ...certifieInfo, fichier_url: d[pj.field] });
            }
          }
        }

        // Notifier l'étudiant en interne
        try {
          await dataService.create('Notification', {
            destinataire_id: d.user_id || d.id,
            type: 'systeme',
            titre: 'Dossier certifié complet',
            contenu: `Votre dossier d'inscription a été certifié complet par ${user.full_name || user.email} (${d.etablissement_nom}).`,
            lien: '/mesdossiersacademiques',
            emetteur_id: user.id,
            emetteur_nom: user.full_name || user.email,
          });
        } catch {}

        queryClient.invalidateQueries({ queryKey: ["dossiers-inscription"] });
      }
    } catch (e) {
      console.error("Erreur rafraîchissement:", e);
    }
  };

  const openFicheInscription = async (item) => {
    setViewingFiche(item);
    setLoadingFiche(true);
    setEditMode(false);
    setEditedData(null);
    setSendSuccess(false);
    try {
      let baseData = null;

      // Priority 1: parse chemin JSON (always present on the dossier record)
      if (item.chemin) {
        baseData = typeof item.chemin === 'object' ? item.chemin : JSON.parse(item.chemin);
      }

      // Always query the full DemandeInscription to get PJ fields (piece_jointe_*)
      let fullRecord = null;
      if (item.etudiant_email || baseData?.email) {
        const email = item.etudiant_email || baseData.email;
        const demande = await dataService.query('DemandeInscription', { filters: [{ email }], limit: 1, offset: 0 });
        if (demande.length > 0) fullRecord = demande[0];
      }
      if (!fullRecord && (item.etudiant_id || baseData?.user_id)) {
        const uid = item.etudiant_id || baseData.user_id;
        const demande = await dataService.query('DemandeInscription', { filters: [{ user_id: uid }], limit: 1, offset: 0 });
        if (demande.length > 0) fullRecord = demande[0];
      }
      if (!fullRecord && baseData?.id) {
        const demande = await dataService.query('DemandeInscription', { filters: [{ id: baseData.id }], limit: 1, offset: 0 });
        if (demande.length > 0) fullRecord = demande[0];
      }

      // Merge: chemin data + full record (full record has PJ fields)
      const merged = fullRecord ? { ...baseData, ...fullRecord } : baseData;

      if (merged) {
        setFicheData(merged);
        setEditedData({ ...merged });
      } else {
        setFicheData(null);
      }
    } catch (e) {
      setFicheData(null);
    } finally {
      setLoadingFiche(false);
    }
  };

  const handleFieldChange = (key, val) => {
    setEditedData(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (!editedData?.id) return;
    setSaving(true);
    // Exclude PJ base64 fields from update payload (too large, not editable via form)
    const { piece_jointe_diplome, piece_jointe_bulletin, piece_jointe_bulletin_2,
      piece_jointe_attestation_naissance, piece_jointe_bonne_vie, ...updateData } = editedData;
    await dataService.update('DemandeInscription', editedData.id, updateData);
    setFicheData({ ...editedData });
    setEditMode(false);
    setSaving(false);
  };

  // Export PDF via jsPDF — mise en page ABA sur une seule page A4
  const handleExportPDF = async () => {
    const d = editMode ? editedData : ficheData;
    if (!d) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const margin = 12;
    const contentW = pageW - margin * 2;

    // Calcul du code de traçabilité
    const hash = (d.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const num = String(1000 + (hash % 9000));
    const year = new Date(d.created_date || Date.now()).getFullYear();
    const traceCode = `HARCH-${year}-${d.matricule || 'X'}-${hash.toString(16).toUpperCase().slice(0, 6)}`;

    // Ville depuis l'établissement ou défaut
    const ville = d.etablissement_ville || 'Kinshasa';
    const dateAujourd = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const adminNomComplet = [user?.prenom, user?.nom, user?.post_nom].filter(Boolean).join(' ').trim();
    const adminNom = adminNomComplet || (user?.full_name && !user.full_name.includes('@') ? user.full_name : null) || 'L\'administrateur';

    // Toutes les sections et leurs lignes (filtrer les vides)
    const allSections = [
      { title: 'Informations Personnelles', rows: [
        ['Nom', d.nom], ['Post-nom', d.post_nom], ['Prénom', d.prenom],
        ['Date de naissance', d.date_naissance], ['Lieu de naissance', d.lieu_naissance],
        ['Sexe', d.sexe === 'M' ? 'Masculin' : d.sexe === 'F' ? 'Féminin' : d.sexe],
        ['Nationalité', d.nationalite], ['État civil', d.etat_civil],
      ]},
      { title: 'Origine', rows: [
        ['Province', d.province_origine], ['District', d.district],
        ['Territoire', d.territoire], ['Adresse', d.adresse_candidat],
      ]},
      { title: 'Filiation', rows: [
        ['Nom du père', d.nom_pere], ['Nom de la mère', d.nom_mere],
      ]},
      { title: 'Études Secondaires', rows: [
        ['École secondaire', d.ecole_secondaire], ['Adresse école', d.adresse_ecole],
        ['Centre EXETAT', d.centre_exetat], ['Section', d.section_secondaire],
        ["Année d'obtention", d.annee_secondaire],
        ['Pourcentage obtenu', d.pourcentage_obtenu ? `${d.pourcentage_obtenu}%` : null],
        ['Nº Diplôme', d.numero_diplome_secondaire],
      ]},
      { title: d.type_utilisateur === 'professeur' ? 'Affectation Académique' : 'Inscription Académique', rows: [
        ['Matricule', d.matricule], ['Type', d.type_utilisateur],
        ['Faculté', d.faculte], ['Département', d.departement],
        ['Option', d.option], ['Orientation', d.orientation], ['Classe/Niveau', d.classe],
      ]},
      { title: 'Contact', rows: [
        ['Email', d.email], ['Téléphone', d.telephone],
      ]},
    ];

    // Calculer la hauteur totale du contenu pour adapter la taille de police
    const headerH = 22 + 12 + 4; // logo+titre + sous-bande + espace
    const footerH = 22; // bas de page
    const sectionTitleH = 6;
    const sectionGapH = 3;
    const rowH = 5.5;

    let totalContentH = headerH + footerH;
    allSections.forEach(s => {
      const validRows = s.rows.filter(([, v]) => v);
      totalContentH += sectionTitleH + sectionGapH + validRows.length * rowH + 2;
    });

    // Facteur de mise à l'échelle pour tenir sur une page
    const availH = pageH - 10;
    const scale = totalContentH > availH ? availH / totalContentH : 1;
    const rh = rowH * scale;       // row height scaled
    const sth = sectionTitleH * scale;
    const sg = sectionGapH * scale;
    const fs = Math.max(6, 8 * scale);  // font size scaled
    const fsBold = Math.max(6.5, 9 * scale);

    let y = 8;

    // ── EN-TÊTE centré — nom d'établissement dynamique ──────
    const etablissementNom = (d.etablissement_nom || user?.etablissement_nom || 'ÉTABLISSEMENT').toUpperCase();
    const headerBlockH = 22 * scale;
    doc.setFillColor(232, 232, 232);
    doc.rect(margin, y, contentW, headerBlockH, 'F');

    // Nom de l'établissement centré
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fsBold + 2);
    doc.setTextColor(0);
    doc.text(etablissementNom, pageW / 2, y + headerBlockH * 0.42, { align: 'center' });
    doc.setFontSize(fs + 1);
    doc.text(d.type_utilisateur === 'professeur' ? 'FORMULAIRE D\'AFFECTATION' : 'FORMULAIRE D\'INSCRIPTION', pageW / 2, y + headerBlockH * 0.72, { align: 'center' });
    y += headerBlockH;

    // Sous-bande bulletin
    const subBandH = 12 * scale;
    doc.setFillColor(210, 210, 210);
    doc.rect(margin, y, contentW, subBandH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs);
    doc.setTextColor(0);
    doc.text(`BULLETIN D'${d.type_utilisateur === 'professeur' ? 'AFFECTATION' : 'INSCRIPTION'} N° ${num}/${year}`, pageW / 2, y + subBandH * 0.42, { align: 'center' });
    doc.text(`ANNEE ACADEMIQUE ${year}-${year + 1}`, pageW / 2, y + subBandH * 0.82, { align: 'center' });
    y += subBandH + 3 * scale;

    // ── SECTIONS ────────────────────────────────────────────
    const drawSection = (title, rows) => {
      const validRows = rows.filter(([, v]) => v);
      if (validRows.length === 0) return;

      // Barre titre
      doc.setFillColor(60, 60, 60);
      doc.rect(margin, y, contentW, sth, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fs);
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 2, y + sth * 0.75);
      y += sth + 1;

      validRows.forEach(([label, val]) => {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, contentW, rh, 'F');
        doc.setDrawColor(220);
        doc.line(margin, y + rh, margin + contentW, y + rh);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fs);
        doc.setTextColor(80, 80, 80);
        doc.text(String(label), margin + 2, y + rh * 0.72);
        doc.setTextColor(0);
        doc.text(String(val), margin + contentW - 2, y + rh * 0.72, { align: 'right' });
        y += rh;
      });
      y += sg;
    };

    allSections.forEach(s => drawSection(s.title, s.rows));

    // ── BAS DE PAGE — certification + code traçabilité ──────
    const footerY = pageH - footerH;
    doc.setDrawColor(180);
    doc.line(margin, footerY - 2, margin + contentW, footerY - 2);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(60);
    const certLine1 = `Je soussigné(e) ${adminNom}, certifie que le présent document est conforme à l'original.`;
    const certLine2 = `Fait pour servir et valoir ce que de droit. Fait à ${ville}, le ${dateAujourd}.`;
    doc.text(certLine1, pageW / 2, footerY + 3, { align: 'center' });
    doc.text(certLine2, pageW / 2, footerY + 8, { align: 'center' });

    // Code de traçabilité
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120);
    doc.text(`Code de traçabilité : ${traceCode}`, pageW / 2, footerY + 14, { align: 'center' });

    doc.save(`inscription_${d.matricule || d.nom || 'etudiant'}.pdf`);
  };

  // Export Excel (CSV structuré par sections)
  const handleExportExcel = () => {
    const d = editMode ? editedData : ficheData;
    if (!d) return;
    const hash = (d.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const num = String(1000 + (hash % 9000));
    const year = new Date(d.created_date || Date.now()).getFullYear();

    const etabNomExcel = (d.etablissement_nom || user?.etablissement_nom || 'ÉTABLISSEMENT').toUpperCase();
    const rows = [
      [`${etabNomExcel} — FORMULAIRE D'${d.type_utilisateur === 'professeur' ? 'AFFECTATION' : 'INSCRIPTION'}`, ''],
      [`BULLETIN D'${d.type_utilisateur === 'professeur' ? 'AFFECTATION' : 'INSCRIPTION'} N° ${num}/${year}`, ''],
      [`ANNEE ACADEMIQUE ${year}-${year + 1}`, ''],
      ['', ''],
      ['=== INFORMATIONS PERSONNELLES ===', ''],
      ['Nom', d.nom], ['Post-nom', d.post_nom], ['Prénom', d.prenom],
      ['Date de naissance', d.date_naissance], ['Lieu de naissance', d.lieu_naissance],
      ['Sexe', d.sexe === 'M' ? 'Masculin' : d.sexe === 'F' ? 'Féminin' : d.sexe],
      ['Nationalité', d.nationalite], ['État civil', d.etat_civil],
      ['', ''],
      ['=== ORIGINE ===', ''],
      ['Province', d.province_origine], ['District', d.district],
      ['Territoire', d.territoire], ['Adresse', d.adresse_candidat],
      ['', ''],
      ['=== FILIATION ===', ''],
      ['Nom du père', d.nom_pere], ['Nom de la mère', d.nom_mere],
      ['', ''],
      ['=== ÉTUDES SECONDAIRES ===', ''],
      ['École secondaire', d.ecole_secondaire], ['Adresse école', d.adresse_ecole],
      ['Centre EXETAT', d.centre_exetat], ['Section', d.section_secondaire],
      ["Année d'obtention", d.annee_secondaire],
      ['Pourcentage obtenu', d.pourcentage_obtenu ? `${d.pourcentage_obtenu}%` : ''],
      ['Nº Diplôme', d.numero_diplome_secondaire],
      ['', ''],
      [d.type_utilisateur === 'professeur' ? '=== AFFECTATION ACADÉMIQUE ===' : '=== INSCRIPTION ACADÉMIQUE ===', ''],
      ['Matricule', d.matricule], ['Type', d.type_utilisateur],
      ['Faculté', d.faculte], ['Département', d.departement],
      ['Option', d.option], ['Orientation', d.orientation], ['Classe/Niveau', d.classe],
      ['', ''],
      ['=== CONTACT ===', ''],
      ['Email', d.email], ['Téléphone', d.telephone],
    ];
    const csv = rows.map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.type_utilisateur === 'professeur' ? 'affectation' : 'inscription'}_${d.matricule || d.nom || 'etudiant'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Envoi vers l'étudiant : crée dossier "Inscription" avec Formulaire + dossier "Pièces jointes"
  const handleSendToStudent = async () => {
    const d = editMode ? editedData : ficheData;
    if (!d) return;
    setSending(true);
    try {
      // Vérifier s'il y a des PJ rejetées (mode pré-certification)
      const pjRejetes = [
        { field: 'piece_jointe_diplome', statut: d.statut_diplome, motif: d.motif_rejet_diplome, type: 'diplome', nom: 'Diplôme secondaire' },
        { field: 'piece_jointe_bulletin', statut: d.statut_bulletin_1, motif: d.motif_rejet_bulletin_1, type: 'bulletin', nom: 'Bulletin 5ème et 6ème — 1er fichier' },
        { field: 'piece_jointe_bulletin_2', statut: d.statut_bulletin_2, motif: d.motif_rejet_bulletin_2, type: 'bulletin_2', nom: 'Bulletin 5ème et 6ème — 2ème fichier' },
        { field: 'piece_jointe_attestation_naissance', statut: d.statut_attestation_naissance, motif: d.motif_rejet_attestation_naissance, type: 'attestation_naissance', nom: 'Attestation de Naissance' },
        { field: 'piece_jointe_bonne_vie', statut: d.statut_bonne_vie, motif: d.motif_rejet_bonne_vie, type: 'bonne_vie', nom: 'Certificat de Bonne Vie et Mœurs' },
      ].filter(pj => pj.statut === 'rejete');

      const hasRejetes = pjRejetes.length > 0;
      const isCertifie = !hasRejetes; // certifié seulement si tout est approuvé

      const studentUserId = d.user_id || d.id;
      const allDossiers = await dataService.query('DossierInscription', { filters: [{ etudiant_id: studentUserId }], limit: 1000, offset: 0 });
      const allIds = new Set(allDossiers.map(x => x.id));
      const certifieInfo = { 
        certifie: isCertifie, 
        certifie_par: user.full_name || user.email, 
        date_certification: new Date().toISOString(),
        pre_certification: hasRejetes
      };
      const etudiantInfo = { etudiant_id: studentUserId, etudiant_nom: `${d.prenom} ${d.nom}`, etudiant_email: d.email, etablissement_id: d.etablissement_id || user.etablissement_id, etablissement_nom: d.etablissement_nom || user.etablissement_nom || '' };

      // 1. Dossier racine "Mes Dossiers Académiques"
      const isProf = d.type_utilisateur === 'professeur';
      const dossierRootType = isProf ? 'dossier_academique_professeur' : 'dossier_academique_etudiant';
      let rootDossier = allDossiers.find(x => (x.type === 'dossier_academique_etudiant' || x.type === 'dossier_academique_professeur') && (!x.parent_id || !allIds.has(x.parent_id)));
      if (!rootDossier) {
        rootDossier = await dataService.create('DossierInscription', {
          nom: isProf ? 'DOSSIER' : 'Mes Dossiers Académiques', type: dossierRootType, is_fichier: false, ...etudiantInfo,
        });
      }
      const rootId = rootDossier.id;

      // 2. Sous-dossier "Inscription"
      let subDossier = allDossiers.find(x => (x.nom === 'Inscription' || x.nom === 'Affectation') && x.parent_id === rootId && !x.is_fichier);
      if (!subDossier) {
        subDossier = await dataService.create('DossierInscription', {
          nom: isProf ? 'Affectation' : 'Inscription', type: 'mon_inscription', is_fichier: false, parent_id: rootId, ...etudiantInfo, ...certifieInfo,
        });
      }
      const subId = subDossier.id;

      // 3. Formulaire d'inscription (fichier)
      const ficheExiste = allDossiers.find(x => x.fichier_type === 'formulaire_inscription' && x.parent_id === subId);
      const donneesJSON = JSON.stringify({
        id: d.id, nom: d.nom, post_nom: d.post_nom, prenom: d.prenom,
        matricule: d.matricule, email: d.email, telephone: d.telephone,
        date_naissance: d.date_naissance, lieu_naissance: d.lieu_naissance,
        sexe: d.sexe, nationalite: d.nationalite, etat_civil: d.etat_civil,
        nom_pere: d.nom_pere, nom_mere: d.nom_mere,
        province_origine: d.province_origine, district: d.district,
        territoire: d.territoire, adresse_candidat: d.adresse_candidat,
        ecole_secondaire: d.ecole_secondaire, adresse_ecole: d.adresse_ecole,
        centre_exetat: d.centre_exetat, section_secondaire: d.section_secondaire,
        annee_secondaire: d.annee_secondaire, pourcentage_obtenu: d.pourcentage_obtenu,
        numero_diplome_secondaire: d.numero_diplome_secondaire,
        etablissement_nom: d.etablissement_nom, faculte: d.faculte,
        departement: d.departement, orientation: d.orientation,
        option: d.option, classe: d.classe, type_utilisateur: d.type_utilisateur,
        statut_diplome: d.statut_diplome, statut_bulletin_1: d.statut_bulletin_1, statut_bulletin_2: d.statut_bulletin_2, created_date: d.created_date,
      });
      if (ficheExiste) {
        await dataService.update('DossierInscription', ficheExiste.id, { chemin: donneesJSON });
      } else {
        await dataService.create('DossierInscription', {
          nom: isProf ? "Formulaire d'affectation" : "Formulaire d'inscription", type: 'mon_inscription', fichier_type: 'formulaire_inscription',
          is_fichier: true, parent_id: subId, chemin: donneesJSON, ...etudiantInfo, ...certifieInfo,
        });
      }

      // 4. Dossier "Pièces jointes" (sous Inscription)
      const hasPJ = d.piece_jointe_diplome || d.piece_jointe_bulletin || d.piece_jointe_bulletin_2 || d.piece_jointe_attestation_naissance || d.piece_jointe_bonne_vie;
      let pjDossier = allDossiers.find(x => x.nom === 'Pièces jointes' && x.parent_id === subId && !x.is_fichier);
      if (hasPJ && !pjDossier) {
        pjDossier = await dataService.create('DossierInscription', {
          nom: 'Pièces jointes', type: 'mon_inscription', is_fichier: false, parent_id: subId, ...etudiantInfo, ...certifieInfo,
        });
      }
      const pjId = pjDossier?.id;

      // 5. Recharger les dossiers pour avoir les fichiers déjà présents dans "Pièces jointes"
      const allDossiersRefreshed = await dataService.query('DossierInscription', { filters: [{ etudiant_id: studentUserId }], limit: 1000, offset: 0 });

      // 6. Fichiers de pièces jointes (approuvés uniquement) dans le dossier Pièces jointes
      const pjFiles = [
        { field: 'piece_jointe_diplome', statut: d.statut_diplome, nom: 'Diplôme secondaire', type: 'diplome' },
        { field: 'piece_jointe_bulletin', statut: d.statut_bulletin_1, nom: 'Bulletin 5ème et 6ème — 1er fichier', type: 'bulletin' },
        { field: 'piece_jointe_bulletin_2', statut: d.statut_bulletin_2, nom: 'Bulletin 5ème et 6ème — 2ème fichier', type: 'bulletin_2' },
        { field: 'piece_jointe_attestation_naissance', statut: d.statut_attestation_naissance, nom: 'Attestation de Naissance', type: 'attestation_naissance' },
        { field: 'piece_jointe_bonne_vie', statut: d.statut_bonne_vie, nom: 'Certificat de Bonne Vie et Mœurs', type: 'bonne_vie' },
      ];
      for (const pj of pjFiles) {
        if (d[pj.field] && pj.statut === 'approuve' && pjId) {
          const existe = allDossiersRefreshed.find(x => x.fichier_type === pj.type && x.parent_id === pjId);
          if (!existe) {
            await dataService.create('DossierInscription', {
              nom: pj.nom, type: 'mon_inscription', fichier_type: pj.type,
              fichier_url: d[pj.field], is_fichier: true, parent_id: pjId, ...etudiantInfo, ...certifieInfo,
            });
          }
        }
      }

      // Si des PJ sont rejetées, créer les canaux de renvoi
      if (hasRejetes) {
        const etablissementId = d.etablissement_id || user.etablissement_id;
        for (const pj of pjRejetes) {
          // Vérifier si un canal existe déjà
          const existingCanaux = await dataService.query('CanalRenvoi', {
            filters: [{ demande_id: d.id, type_fichier: pj.type, statut: 'ouvert' }],
            limit: 10, offset: 0
          });
          if (existingCanaux.length === 0) {
            await dataService.create('CanalRenvoi', {
              demande_id: d.id,
              etudiant_email: d.email,
              etudiant_nom: `${d.prenom} ${d.nom}`,
              etablissement_id: etablissementId,
              admin_email: user.email,
              admin_nom: user.full_name || user.email,
              type_fichier: pj.type,
              motif_rejet: pj.motif || 'Document non conforme',
              statut: 'ouvert'
            });
          }
        }
      }

      setSendSuccess(true);

      // Notifier l'étudiant
      try {
        await dataService.create('Notification', {
          destinataire_id: d.user_id || d.id,
          type: 'systeme',
          titre: hasRejetes ? 'Pré-certification – pièces à renvoyer' : 'Dossier transmis',
          contenu: hasRejetes
            ? `Votre dossier a été examiné par ${user.full_name || user.email}. ${pjRejetes.length} pièce(s) doivent être renvoyées : ${pjRejetes.map(p => p.nom).join(', ')}.`
            : `Votre dossier d'inscription a été transmis et certifié par ${user.full_name || user.email} (${d.etablissement_nom}).`,
          lien: '/mesdossiersacademiques',
          emetteur_id: user.id,
          emetteur_nom: user.full_name || user.email,
        });
      } catch (notifError) {
        console.warn("Notification non envoyée:", notifError.message);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'envoi : " + e.message);
    } finally {
      setSending(false);
    }
  };

  const currentId = path.length > 0 ? path[path.length - 1].id : null;

  const isSuperAdmin = user?.role === 'super_admin' || user?.role_archive === 'super_admin';
  const hasEtab = !!user?.etablissement_id;

  const rootType = roleFilter === "professeur" ? "dossier_academique_professeur" : "dossier_academique_etudiant";

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["dossiers-inscription", user?.etablissement_id, currentId, isSuperAdmin, roleFilter],
    queryFn: async () => {
      if (!hasEtab && !isSuperAdmin) return [];
      const baseFilter = hasEtab ? { etablissement_id: user.etablissement_id } : {};
      if (currentId) {
        // Dans un sous-dossier : récupérer les enfants
        return await dataService.query('DossierInscription', {
          filters: [{ ...baseFilter, parent_id: currentId }],
          limit: 1000, offset: 0
        });
      } else {
        // Niveau racine : récupérer tous les dossiers de l'établissement et filtrer par type (étudiant ou professeur)
        const all = await dataService.query('DossierInscription', {
          filters: hasEtab ? [{ etablissement_id: user.etablissement_id }] : [],
          limit: 5000, offset: 0
        });
        const allIds = new Set(all.map(x => x.id));
        return all.filter(d => (!d.parent_id || !allIds.has(d.parent_id)) && d.type === rootType);
      }
    },
    enabled: hasEtab || isSuperAdmin
  });

  const navigateTo = (item) => {
    if (!item.is_fichier) setPath(prev => [...prev, { id: item.id, nom: item.nom }]);
  };
  const navigateBack = () => setPath(prev => prev.slice(0, -1));

  const getFileLabel = (fichierType) => {
    if (fichierType === "formulaire_inscription") return roleFilter === 'professeur' ? "Formulaire d'affectation" : "Formulaire d'inscription";
    if (fichierType === "diplome") return "Diplôme";
    if (fichierType === "bulletin") return "Bulletin 5ème et 6ème — 1er fichier";
    if (fichierType === "bulletin_2") return "Bulletin 5ème et 6ème — 2ème fichier";
    if (fichierType === "attestation_naissance") return "Attestation de Naissance";
    if (fichierType === "bonne_vie") return "Certificat de Bonne Vie et Mœurs";
    return "Document";
  };

  const displayData = editMode ? editedData : ficheData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => setPath([])} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
          {roleFilter === 'professeur' ? 'Dossier des Professeurs' : 'Fichier des inscriptions'}
        </button>
        {path.map((p, idx) => (
          <React.Fragment key={p.id}>
            <ChevronRight className="w-4 h-4 text-gray-500" />
            <button onClick={() => setPath(prev => prev.slice(0, idx + 1))} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              {p.nom}
            </button>
          </React.Fragment>
        ))}
      </div>

      {path.length > 0 && (
        <Button variant="outline" onClick={navigateBack} className="mb-4" style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}} size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      )}

      {items.length === 0 ? (
        <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
          <CardContent className="py-12 text-center">
            <Folder className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Dossier vide</p>
            <p className="text-sm text-gray-500 mt-1">Les dossiers sont créés automatiquement lors de l'approbation des inscriptions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1">
           {items
             .sort((a, b) => {
               if (a.is_fichier && !b.is_fichier) return 1;
               if (!a.is_fichier && b.is_fichier) return -1;
               return a.nom.localeCompare(b.nom);
             })
             .map(item => (
               <ContextMenu key={item.id}>
                 <ContextMenuTrigger asChild>
                   <div className="flex flex-col items-center p-2 cursor-pointer"
                     onClick={() => {
                       if (!item.is_fichier) navigateTo(item);
                       else if (item.fichier_type === 'formulaire_inscription') openFicheInscription(item);
                       else if (item.fichier_url) setFileViewer({ url: item.fichier_url, title: item.nom });
                     }}>
                     <div className="flex flex-col items-center rounded-lg px-2 py-1 hover:bg-[#3d3d3d] transition-colors">
                       {item.is_fichier ? (
                         <DocumentThumbnail url={item.fichier_url} fichierType={item.fichier_type} nom={item.nom} width={90} height={110} />
                       ) : (
                         <img src="/assets/icons/d8ad0ef1d_folder3.png" alt="dossier" className="w-[72px] h-[72px] object-contain mb-1" />
                       )}
                       <span className="text-white text-xs text-center font-medium line-clamp-2" style={CG}>{item.nom}</span>
                     </div>
                     {item.etudiant_nom && !item.is_fichier && path.length === 0 && (
                       <span className="text-blue-300 text-xs text-center truncate w-full" style={CG}>{item.etudiant_nom}</span>
                     )}
                   </div>
                   </ContextMenuTrigger>
                  <ContextMenuContent style={{ backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)' }}>
                  {!!item.is_fichier && (
                  <>
                    {item.fichier_type === 'formulaire_inscription' ? (
                      <ContextMenuItem onClick={() => openFicheInscription(item)} className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                        <Eye className="w-3.5 h-3.5 mr-2 text-blue-400" /> Ouvrir
                      </ContextMenuItem>
                    ) : (
                      <ContextMenuItem onClick={() => setFileViewer({ url: item.fichier_url, title: item.nom })} className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                        <Eye className="w-3.5 h-3.5 mr-2 text-blue-400" /> Ouvrir
                      </ContextMenuItem>
                    )}
                  </>
                  )}
                  {!item.is_fichier && (
                    <ContextMenuItem onClick={() => navigateTo(item)} className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                      <Folder className="w-3.5 h-3.5 mr-2 text-yellow-400" /> Ouvrir le dossier
                    </ContextMenuItem>
                  )}
                  <ContextMenuSeparator style={{ backgroundColor: 'var(--ha-bg)' }} />
                  <ContextMenuItem onClick={() => { setRenameItem(item); setNewName(item.nom); }} className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                    <Edit2 className="w-3.5 h-3.5 mr-2 text-blue-400" /> Renommer
                  </ContextMenuItem>
                  <ContextMenuItem onClick={async () => { if (confirm(`Supprimer "${item.nom}" ?`)) { await dataService.delete('DossierInscription', item.id); queryClient.invalidateQueries({ queryKey: ["dossiers-inscription"] }); } }} className="text-red-400 text-xs hover:bg-[#474747] cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
        </div>
      )}

      {/* Lecteur de fichier */}
      {fileViewer && <FileViewer url={fileViewer.url} title={fileViewer.title} onClose={() => setFileViewer(null)} />}

      {/* Dialog Fiche d'inscription */}
      {viewingFiche && (
        <DraggableDialog
          open={!!viewingFiche}
          onOpenChange={() => { setViewingFiche(null); setFicheData(null); setEditMode(false); }}
          title={
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-yellow-400" />
              <span style={CG} className="text-sm">{displayData?.type_utilisateur === 'professeur' ? "Formulaire d'affectation" : "Formulaire d'inscription"} — {viewingFiche.etudiant_nom || viewingFiche.nom}</span>
            </span>
          }
          maxWidth="max-w-2xl"
          resizable={false}
        >
          <DraggableDialogBody>
            {loadingFiche ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayData ? (
              <div className="space-y-3 py-1">

                {/* Barre d'actions */}
                <div className="flex flex-wrap gap-2 pb-2 border-b" style={{ borderColor: '#3d3d3d' }}>
                  {!editMode ? (
                    <Button size="sm" onClick={() => setEditMode(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-2">
                      <Edit2 className="w-3 h-3 mr-1" /> Modifier
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-2">
                        <Save className="w-3 h-3 mr-1" /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                      </Button>
                      <Button size="sm" onClick={() => { setEditMode(false); setEditedData({ ...ficheData }); }} className="bg-gray-600 hover:bg-gray-700 text-white text-xs h-7 px-2">
                        <X className="w-3 h-3 mr-1" /> Annuler
                      </Button>
                    </>
                  )}
                  <Button size="sm" onClick={handleExportPDF} className="bg-red-700 hover:bg-red-800 text-white text-xs h-7 px-2">
                    <Download className="w-3 h-3 mr-1" /> PDF
                  </Button>
                  <Button size="sm" onClick={handleExportExcel} className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-7 px-2">
                    <FileSpreadsheet className="w-3 h-3 mr-1" /> Excel
                  </Button>
                  {(() => {
                    // Bloquer uniquement si des PJ sont encore "en_attente" (pas encore traitées)
                    const pjEnAttente = (
                      (displayData.piece_jointe_diplome && (!displayData.statut_diplome || displayData.statut_diplome === 'en_attente')) ||
                      (displayData.piece_jointe_bulletin && (!displayData.statut_bulletin_1 || displayData.statut_bulletin_1 === 'en_attente')) ||
                      (displayData.piece_jointe_bulletin_2 && (!displayData.statut_bulletin_2 || displayData.statut_bulletin_2 === 'en_attente')) ||
                      (displayData.piece_jointe_attestation_naissance && (!displayData.statut_attestation_naissance || displayData.statut_attestation_naissance === 'en_attente')) ||
                      (displayData.piece_jointe_bonne_vie && (!displayData.statut_bonne_vie || displayData.statut_bonne_vie === 'en_attente'))
                    );
                    const pjRejeteesCount = [
                      displayData.statut_diplome, displayData.statut_bulletin_1, displayData.statut_bulletin_2,
                      displayData.statut_attestation_naissance, displayData.statut_bonne_vie
                    ].filter(s => s === 'rejete').length;
                    return (
                      <div className="relative group/send inline-block">
                        <Button size="sm" onClick={handleSendToStudent}
                          disabled={sending || sendSuccess || !!pjEnAttente}
                          className={`text-white text-xs h-7 px-2 ${sendSuccess ? 'bg-green-700' : pjEnAttente ? 'bg-gray-600 opacity-50 cursor-not-allowed' : pjRejeteesCount > 0 ? 'bg-orange-700 hover:bg-orange-800' : 'bg-purple-700 hover:bg-purple-800'}`}>
                          <Send className="w-3 h-3 mr-1" /> {sending ? 'Envoi...' : sendSuccess ? '✓ Envoyé' : pjRejeteesCount > 0 ? `Envoyer (pré-certification)` : displayData.type_utilisateur === 'professeur' ? "Envoyer au professeur" : "Envoyer à l'étudiant"}
                        </Button>
                        {pjEnAttente && (
                          <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-black text-yellow-300 text-xs rounded whitespace-nowrap hidden group-hover/send:block z-50" style={CG}>
                            ⚠ Approuvez ou rejetez toutes les pièces jointes d'abord
                          </div>
                        )}
                        {!pjEnAttente && pjRejeteesCount > 0 && (
                          <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-black text-orange-300 text-xs rounded whitespace-nowrap hidden group-hover/send:block z-50" style={CG}>
                            ⚠ {pjRejeteesCount} pièce(s) rejetée(s) — l'étudiant devra les renvoyer
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* En-tête standard — nom d'établissement dynamique */}
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #ccc' }}>
                  <div className="px-4 py-3 text-center" style={{ backgroundColor: '#e8e8e8' }}>
                    <p className="font-black text-black tracking-wide uppercase text-sm" style={CG}>{displayData.etablissement_nom || user?.etablissement_nom || 'ÉTABLISSEMENT'}</p>
                    <p className="font-semibold text-blue-700 tracking-wide uppercase text-xs mt-1" style={CG}>{displayData.type_utilisateur === 'professeur' ? "FORMULAIRE D'AFFECTATION" : "FORMULAIRE D'INSCRIPTION"}</p>
                  </div>
                  <div className="px-4 py-1.5 text-center" style={{ backgroundColor: '#d8d8d8' }}>
                    {(() => {
                      const hash = (displayData.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                      const num = String(1000 + (hash % 9000));
                      const year = new Date(displayData.created_date || Date.now()).getFullYear();
                      return (
                        <>
                          <p className="font-bold text-black text-xs" style={CG}>BULLETIN D'{displayData.type_utilisateur === 'professeur' ? 'AFFECTATION' : 'INSCRIPTION'} N° {num}/{year}</p>
                          <p className="text-black text-xs font-semibold underline" style={CG}>ANNEE ACADEMIQUE {year}-{year + 1}</p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Sections */}
                <Section title="Informations Personnelles" icon={<User className="w-3 h-3 text-blue-400" />}>
                  <Row label="Nom" value={displayData.nom} editMode={editMode} fieldKey="nom" onChange={handleFieldChange} />
                  <Row label="Post-nom" value={displayData.post_nom} editMode={editMode} fieldKey="post_nom" onChange={handleFieldChange} />
                  <Row label="Prénom" value={displayData.prenom} editMode={editMode} fieldKey="prenom" onChange={handleFieldChange} />
                  <Row label="Date de naissance" value={displayData.date_naissance} editMode={editMode} fieldKey="date_naissance" onChange={handleFieldChange} />
                  <Row label="Lieu de naissance" value={displayData.lieu_naissance} editMode={editMode} fieldKey="lieu_naissance" onChange={handleFieldChange} />
                  <Row label="Sexe" value={displayData.sexe === 'M' ? 'Masculin' : displayData.sexe === 'F' ? 'Féminin' : displayData.sexe} editMode={editMode} fieldKey="sexe" onChange={handleFieldChange} />
                  <Row label="Nationalité" value={displayData.nationalite} editMode={editMode} fieldKey="nationalite" onChange={handleFieldChange} />
                  <Row label="État civil" value={displayData.etat_civil} editMode={editMode} fieldKey="etat_civil" onChange={handleFieldChange} />
                </Section>

                <Section title="Origine" icon={<MapPin className="w-3 h-3 text-green-400" />}>
                  <Row label="Province" value={displayData.province_origine} editMode={editMode} fieldKey="province_origine" onChange={handleFieldChange} />
                  <Row label="District" value={displayData.district} editMode={editMode} fieldKey="district" onChange={handleFieldChange} />
                  <Row label="Territoire" value={displayData.territoire} editMode={editMode} fieldKey="territoire" onChange={handleFieldChange} />
                  <Row label="Adresse" value={displayData.adresse_candidat} editMode={editMode} fieldKey="adresse_candidat" onChange={handleFieldChange} />
                </Section>

                <Section title="Filiation" icon={<User className="w-3 h-3 text-purple-400" />}>
                  <Row label="Nom du père" value={displayData.nom_pere} editMode={editMode} fieldKey="nom_pere" onChange={handleFieldChange} />
                  <Row label="Nom de la mère" value={displayData.nom_mere} editMode={editMode} fieldKey="nom_mere" onChange={handleFieldChange} />
                </Section>

                <Section title="Études Secondaires" icon={<BookOpen className="w-3 h-3 text-yellow-400" />}>
                  <Row label="École secondaire" value={displayData.ecole_secondaire} editMode={editMode} fieldKey="ecole_secondaire" onChange={handleFieldChange} />
                  <Row label="Adresse école" value={displayData.adresse_ecole} editMode={editMode} fieldKey="adresse_ecole" onChange={handleFieldChange} />
                  <Row label="Centre EXETAT" value={displayData.centre_exetat} editMode={editMode} fieldKey="centre_exetat" onChange={handleFieldChange} />
                  <Row label="Section" value={displayData.section_secondaire} editMode={editMode} fieldKey="section_secondaire" onChange={handleFieldChange} />
                  <Row label="Année d'obtention" value={displayData.annee_secondaire} editMode={editMode} fieldKey="annee_secondaire" onChange={handleFieldChange} />
                  <Row label="Pourcentage obtenu" value={displayData.pourcentage_obtenu ? `${displayData.pourcentage_obtenu}%` : null} editMode={editMode} fieldKey="pourcentage_obtenu" onChange={handleFieldChange} />
                  <Row label="N° Diplôme" value={displayData.numero_diplome_secondaire} editMode={editMode} fieldKey="numero_diplome_secondaire" onChange={handleFieldChange} />
                </Section>

                <Section title="Inscription Académique" icon={<GraduationCap className="w-3 h-3 text-cyan-400" />}>
                  <Row label="Matricule" value={displayData.matricule} highlight editMode={editMode} fieldKey="matricule" onChange={handleFieldChange} />
                  <Row label="Type" value={displayData.type_utilisateur} editMode={editMode} fieldKey="type_utilisateur" onChange={handleFieldChange} />
                  <Row label="Faculté" value={displayData.faculte} editMode={editMode} fieldKey="faculte" onChange={handleFieldChange} />
                  <Row label="Département" value={displayData.departement} editMode={editMode} fieldKey="departement" onChange={handleFieldChange} />
                  <Row label="Orientation" value={displayData.orientation} editMode={editMode} fieldKey="orientation" onChange={handleFieldChange} />
                  <Row label="Option" value={displayData.option} editMode={editMode} fieldKey="option" onChange={handleFieldChange} />
                  <Row label="Classe/Niveau" value={displayData.classe} editMode={editMode} fieldKey="classe" onChange={handleFieldChange} />
                </Section>

                <Section title="Contact" icon={<Mail className="w-3 h-3 text-red-400" />}>
                  <Row label="Email" value={displayData.email} editMode={editMode} fieldKey="email" onChange={handleFieldChange} />
                  <Row label="Téléphone" value={displayData.telephone} editMode={editMode} fieldKey="telephone" onChange={handleFieldChange} />
                </Section>

                {/* Pièces Jointes — Review admin */}
                {(displayData.piece_jointe_diplome || displayData.piece_jointe_bulletin || 
                  displayData.piece_jointe_bulletin_2 || displayData.piece_jointe_attestation_naissance ||
                  displayData.piece_jointe_bonne_vie ||
                  displayData.statut_diplome === 'rejete' || displayData.statut_bulletin_1 === 'rejete' || displayData.statut_bulletin_2 === 'rejete' ||
                  displayData.statut_attestation_naissance === 'rejete' || displayData.statut_bonne_vie === 'rejete') && (
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #4d4d4d' }}>
                    <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: 'var(--ha-surface2)' }}>
                      <FileText className="w-3 h-3 text-orange-400" />
                      <h3 className="text-white font-semibold text-xs" style={CG}>Pièces Jointes — Vérification</h3>
                    </div>
                    <div className="p-2 space-y-2" style={{ backgroundColor: 'var(--ha-surface2)' }}>
                      <PiecesJointesReview
                        data={displayData}
                        adminUser={user}
                        onUpdated={handlePJUpdated}
                      />
                    </div>
                  </div>
                )}

                {/* Statut */}
                <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: 'var(--ha-surface2)' }}>
                  <span className="text-gray-400 text-xs" style={CG}>Statut de la demande</span>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                    displayData.statut === 'approuvee' ? 'bg-green-600 text-white' :
                    displayData.statut === 'rejetee' ? 'bg-red-600 text-white' :
                    'bg-yellow-600 text-white'
                  }`} style={CG}>
                    {displayData.statut === 'approuvee' ? '✓ Approuvée' :
                     displayData.statut === 'rejetee' ? '✗ Rejetée' : '⏳ En attente'}
                  </span>
                </div>

                {sendSuccess && (
                  <div className="p-2 rounded-lg text-center bg-green-900 border border-green-600">
                    <p className="text-green-300 text-xs" style={CG}>✓ Dossier transmis à l'étudiant avec succès. Il peut le consulter dans "Mes Dossiers Académiques".</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Aucune donnée d'inscription trouvée pour ce fichier.</p>
              </div>
            )}
          </DraggableDialogBody>
        </DraggableDialog>
      )}

      {/* Dialog renommage */}
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
              <Button onClick={async () => { if (newName.trim()) { await dataService.update('DossierInscription', renameItem.id, { nom: newName }); queryClient.invalidateQueries({ queryKey: ["dossiers-inscription"] }); setRenameItem(null); } }} className="bg-blue-600 hover:bg-blue-700 text-white">Renommer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}