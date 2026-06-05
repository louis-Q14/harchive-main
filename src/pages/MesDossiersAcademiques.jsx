import React, { useState, useEffect, useMemo } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, FileText, ArrowLeft, Download, Eye, ChevronRight, GraduationCap, Shield, AlertTriangle, Upload, XCircle, CheckCircle2 } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { DraggableDialog, DraggableDialogBody } from "@/components/ui/DraggableDialog";
import FileViewer from "@/components/documents/FileViewer";
import PdfThumbnail from "@/components/documents/PdfThumbnail";
import DocumentThumbnail from "@/components/documents/DocumentThumbnail";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

export default function MesDossiersAcademiques() {
  const [user, setUser] = useState(null);
  const [path, setPath] = useState([]);
  const [rootId, setRootId] = useState(null);
  const [viewingFiche, setViewingFiche] = useState(null);
  const [ficheData, setFicheData] = useState(null);
  const [loadingFiche, setLoadingFiche] = useState(false);
  const [uploadingCanal, setUploadingCanal] = useState(null);
  const [fileViewer, setFileViewer] = useState(null); // { url, title }
  const queryClient = useQueryClient();

  useEffect(() => {
    authService.getCurrentUser().then(setUser).catch(() => {});
  }, []);

  // Plus besoin de chercher la demande: on utilise directement user.id comme etudiant_id

  // Canaux de renvoi ouverts pour cet étudiant
  const { data: canaux = [], refetch: refetchCanaux } = useQuery({
    queryKey: ["canaux-renvoi", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await dataService.query('CanalRenvoi', { filters: [{  etudiant_email: user.email, statut: "ouvert"  }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user?.email
  });

  const typeFichierLabel = (type) => {
    const labels = {
      diplome: "Diplôme secondaire",
      bulletin: "Bulletin 5ème et 6ème - 1er fichier",
      bulletin_2: "Bulletin 5ème et 6ème - 2ème fichier",
      attestation_naissance: "Attestation de Naissance",
      bonne_vie: "Certificat de Bonne Vie et Mœurs",
    };
    return labels[type] || type;
  };

  const typeFichierToField = (type) => {
    const map = {
      diplome: { pj: "piece_jointe_diplome", statut: "statut_diplome", motif: "motif_rejet_diplome" },
      bulletin: { pj: "piece_jointe_bulletin", statut: "statut_bulletin_1", motif: "motif_rejet_bulletin_1" },
      bulletin_2: { pj: "piece_jointe_bulletin_2", statut: "statut_bulletin_2", motif: "motif_rejet_bulletin_2" },
      attestation_naissance: { pj: "piece_jointe_attestation_naissance", statut: "statut_attestation_naissance", motif: "motif_rejet_attestation_naissance" },
      bonne_vie: { pj: "piece_jointe_bonne_vie", statut: "statut_bonne_vie", motif: "motif_rejet_bonne_vie" },
    };
    return map[type] || { pj: "piece_jointe_diplome", statut: "statut_diplome", motif: "motif_rejet_diplome" };
  };

  const handleRenvoi = async (canal, file) => {
    if (!file) return;
    setUploadingCanal(canal.id);
    try {
      // Convertir le fichier en data URL pour stockage local
      const file_url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    // Mettre à jour la DemandeInscription avec le nouveau fichier
    const fields = typeFichierToField(canal.type_fichier);
    await dataService.update('DemandeInscription', canal.demande_id, {
      [fields.pj]: file_url,
      [fields.statut]: "en_attente",
      [fields.motif]: "",
    });

    // Fermer le canal
    await dataService.update('CanalRenvoi', canal.id, {
      statut: "renvoye",
      nouveau_fichier_url: file_url,
      date_renvoi: new Date().toISOString(),
    });

    // Mettre à jour aussi le dossier_inscription correspondant (fichier visible immédiatement)
    if (user?.id) {
      const dossiers = await dataService.query('DossierInscription', {
        filters: [{ etudiant_id: user.id, fichier_type: canal.type_fichier, is_fichier: 1 }],
        limit: 1, offset: 0
      });
      if (dossiers.length > 0) {
        await dataService.update('DossierInscription', dossiers[0].id, { fichier_url: file_url });
      }
    }

    // Notifier l'admin établissement
    const adminUsers = await dataService.query('User', { filters: [{  email: canal.admin_email  }],
  limit: 1000, offset: 0 });
    if (adminUsers.length > 0) {
      await dataService.create('Notification', {
        destinataire_id: adminUsers[0].id,
        type: "systeme",
          titre: "Nouveau fichier soumis – à vérifier",
          contenu: `${canal.etudiant_nom} a renvoyé son ${typeFichierLabel(canal.type_fichier)}. Veuillez le vérifier et approuver ou rejeter dans le formulaire d'inscription.`,
          lien: "/documents",
          emetteur_nom: user?.full_name || user?.email,
        });
      }
    } catch (error) {
      console.error('Erreur renvoi fichier:', error);
    } finally {
      setUploadingCanal(null);
      refetchCanaux();
      queryClient.invalidateQueries({ queryKey: ["demande-etudiant"] });
      queryClient.invalidateQueries({ queryKey: ["dossier-academique-all"] });
    }
  };

  // Étape 1 : trouver le dossier racine via user.id (etudiant_id = user.id)
  const { data: dossierRacine, isLoading: loadingRacine } = useQuery({
    queryKey: ["dossier-racine", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const racines = await dataService.query('DossierInscription', { filters: [{ 
        etudiant_id: user.id
       }],
  limit: 1000, offset: 0 });
      return racines.find(r => r.type === 'dossier_academique_etudiant' || r.type === 'dossier_academique_professeur') || null;
    },
    enabled: !!user?.id
  });

  // Étape 2 : charger TOUS les dossiers liés à cet étudiant (par etudiant_id = user.id)
  const { data: tousLesDossiers = [], isLoading: loadingDossiers } = useQuery({
    queryKey: ["dossier-academique-all", user?.id, dossierRacine?.etablissement_id],
    queryFn: async () => {
      if (!dossierRacine || !user?.id) return [];
      const results = await dataService.query('DossierInscription', { filters: [{ etudiant_id: user.id }], limit: 1000, offset: 0 });
      return results || [];
    },
    enabled: !!dossierRacine
  });

  // Le dossier racine est celui trouvé à l'étape 1
  const rootFolder = useMemo(() => {
    if (!dossierRacine) return null;
    if (!rootId) setRootId(dossierRacine.id);
    return dossierRacine;
  }, [dossierRacine]);

  const loadingRoot = loadingRacine || loadingDossiers;
  const currentId = path.length > 0 ? path[path.length - 1].id : rootId;

  // Items du dossier courant filtrés côté JS
  // Les PJ individuelles (is_fichier=1 dans le dossier Pièces jointes) ne sont visibles
  // que si certifiées (certifie=1) par l'admin établissement
  const items = useMemo(() => {
    if (!currentId) return [];
    return tousLesDossiers.filter(d => {
      if (d.parent_id !== currentId) return false;
      // Les fichiers PJ non certifiés sont masqués (en attente d'approbation admin)
      if (d.is_fichier && d.fichier_type && d.fichier_type !== 'formulaire_inscription' && !d.certifie) return false;
      // Masquer le dossier "Pièces jointes" s'il n'a aucun enfant certifié
      if (!d.is_fichier && d.nom === 'Pièces jointes') {
        const hasVisibleChild = tousLesDossiers.some(
          child => child.parent_id === d.id && child.certifie
        );
        if (!hasVisibleChild) return false;
      }
      return true;
    });
  }, [tousLesDossiers, currentId]);

  const isLoading = loadingDossiers;

  const openFiche = async (item) => {
    setViewingFiche(item);
    setLoadingFiche(true);
    try {
      if (item.fichier_type === 'formulaire_inscription') {
        // Récupérer le nom complet de l'admin certifieur via l'établissement
        let adminFullName = item.certifie_par;
        if (item.etablissement_id && item.certifie_par) {
          const etabs = await dataService.query('Etablissement', { filters: [{ id: item.etablissement_id }], limit: 1, offset: 0 });
          const etab = etabs.length > 0 ? etabs[0] : null;
          if (etab && etab.admin_nom) {
            adminFullName = [etab.admin_prenom, etab.admin_nom, etab.admin_post_nom].filter(Boolean).join(' ') || item.certifie_par;
          }
        }
        
        // Priorité 1 : données dans le champ chemin (déjà parsé en objet par le backend, ou JSON string)
        if (item.chemin && typeof item.chemin === 'object') {
          setFicheData(item.chemin);
          setViewingFiche(prev => ({ ...prev, admin_full_name: adminFullName }));
          setLoadingFiche(false);
          return;
        }
        if (item.chemin && typeof item.chemin === 'string' && item.chemin.startsWith('{')) {
          try { 
            const parsed = JSON.parse(item.chemin);
            setFicheData(parsed);
            // Stocker le nom de l'admin pour l'affichage
            setViewingFiche(prev => ({ ...prev, admin_full_name: adminFullName }));
            setLoadingFiche(false);
            return;
          } catch (_e) { /* ignore */ }
        }
        // Priorité 2 : fetch par email
        if (item.etudiant_id) {
          const emailR = item.etudiant_email || user?.email;
          const demandes2 = emailR ? await dataService.query('DemandeInscription', { filters: [{ email: emailR }], limit: 1, offset: 0 }) : [];
          const demande = demandes2.length > 0 ? demandes2[0] : null;
          if (demande) { 
            setFicheData(demande);
            setViewingFiche(prev => ({ ...prev, admin_full_name: adminFullName }));
          }
          else {
            // Priorité 3 : fetch par user_id
            const demandes3 = await dataService.query('DemandeInscription', { filters: [{ user_id: item.etudiant_id }], limit: 1, offset: 0 });
            setFicheData(demandes3.length > 0 ? demandes3[0] : null);
            setViewingFiche(prev => ({ ...prev, admin_full_name: adminFullName }));
          }
        } else {
          const emailR = item.etudiant_email || user?.email;
          const demandes = emailR ? await dataService.query('DemandeInscription', { filters: [{ email: emailR }], limit: 1000, offset: 0 }) : [];
          setFicheData(demandes.length > 0 ? demandes[0] : null);
          setViewingFiche(prev => ({ ...prev, admin_full_name: adminFullName }));
        }

        // Envoyer accusé de réception à l'admin établissement si c'est la première ouverture
        if (item.certifie && item.certifie_par && user) {
          const adminUsers = await dataService.query('User', { filters: [{  email: item.etudiant_email || user.email  }], limit: 1000, offset: 0 });
          // Notifier l'admin via son email stocké dans certifie_par (on cherche par établissement)
          const etablissementUsers = await dataService.query('Etablissement', { filters: [{  id: item.etablissement_id  }], limit: 1000, offset: 0 });
          if (etablissementUsers.length > 0) {
            const adminEtab = await dataService.query('User', { filters: [{  email: etablissementUsers[0].admin_email  }], limit: 1000, offset: 0 });
            if (adminEtab.length > 0) {
              await dataService.create('Notification', {
                destinataire_id: adminEtab[0].id,
                type: "systeme",
                titre: "✅ Accusé de réception – Dossier consulté",
                contenu: `${user.full_name || user.email} a consulté son dossier "${item.nom}" certifié par votre établissement.`,
                emetteur_nom: user.full_name || user.email,
              });
            }
          }
        }
      } else {
        setFicheData(null);
      }
    } catch {
      setFicheData(null);
    } finally {
      setLoadingFiche(false);
    }
  };

  const getFileLabel = (fichierType) => {
    if (fichierType === "formulaire_inscription") return "Formulaire d'inscription";
    if (fichierType === "diplome") return "Diplôme secondaire";
    if (fichierType === "bulletin") return "Bulletin 5ème et 6ème";
    return "Document";
  };

  function Row({ label, value, highlight = false }) {
    if (!value) return null;
    return (
      <div className="flex items-start justify-between py-0.5 border-b last:border-0" style={{ borderColor: '#3d3d3d' }}>
        <span className="text-gray-400 text-xs w-36 flex-shrink-0" style={CG}>{label}</span>
        <span className={`text-xs text-right flex-1 ${highlight ? 'text-blue-300 font-bold' : 'text-white'}`} style={CG}>{value}</span>
      </div>
    );
  }

  function Section({ title, icon, children }) {
    return (
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #4d4d4d' }}>
        <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: 'var(--ha-surface2)' }}>
          {icon}
          <h3 className="text-white font-semibold text-xs" style={CG}>{title}</h3>
        </div>
        <div className="p-2 space-y-0.5" style={{ backgroundColor: 'var(--ha-surface2)' }}>{children}</div>
      </div>
    );
  }

  if (!user || loadingRoot) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--ha-bg)' }}>
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: 'var(--ha-bg)' }}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--ha-surface2)' }}>
          <GraduationCap className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white" style={CG}>Mes Dossiers Académiques</h1>
          <p className="text-gray-400 text-xs" style={CG}>Vos documents officiels certifiés par votre établissement</p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => setPath([])} className="text-blue-400 hover:text-blue-300 text-sm font-medium" style={CG}>
          Mes Dossiers Académiques
        </button>
        {path.map((p, idx) => (
          <React.Fragment key={p.id}>
            <ChevronRight className="w-4 h-4 text-gray-500" />
            <button onClick={() => setPath(prev => prev.slice(0, idx + 1))} className="text-blue-400 hover:text-blue-300 text-sm font-medium" style={CG}>
              {p.nom}
            </button>
          </React.Fragment>
        ))}
      </div>

      {path.length > 0 && (
        <Button variant="outline" onClick={() => setPath(prev => prev.slice(0, -1))} className="mb-4 bg-[#333333] text-white border-[#4d4d4d]" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      )}

      {/* Canaux de renvoi ouverts – pré-certification */}
      {canaux.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="rounded-lg p-3 mb-2" style={{ backgroundColor: '#2d1a00', border: '1px solid #7c4500' }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <h2 className="text-orange-300 font-bold text-sm" style={CG}>Dossier en pré-certification</h2>
            </div>
            <p className="text-orange-200 text-xs" style={CG}>
              Votre dossier a été transmis par votre établissement, mais {canaux.length} pièce(s) jointe(s) nécessitent une correction. 
              Renvoyez les fichiers corrects ci-dessous. L'administrateur sera notifié pour validation finale.
            </p>
          </div>
          {canaux.map(canal => (
            <div key={canal.id} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: '#2d1a0a', border: '1px solid #7c3a0a' }}>
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-xs font-semibold" style={CG}>
                    {typeFichierLabel(canal.type_fichier)} – rejeté
                  </p>
                  {canal.motif_rejet && (
                    <p className="text-orange-300 text-xs mt-0.5" style={CG}>
                      Motif : {canal.motif_rejet}
                    </p>
                  )}
                  {canal.admin_nom && (
                    <p className="text-gray-400 text-xs mt-0.5" style={CG}>
                      Signalé par : {canal.admin_nom}
                    </p>
                  )}
                </div>
              </div>
              <label className="cursor-pointer inline-block">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) await handleRenvoi(canal, file);
                  }}
                  disabled={uploadingCanal === canal.id}
                />
                <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium text-white cursor-pointer"
                  style={{ backgroundColor: uploadingCanal === canal.id ? '#9a5000' : '#c2410c' }}>
                  <Upload className="w-3 h-3" />
                  {uploadingCanal === canal.id ? "Envoi en cours..." : "Renvoyer le fichier correct"}
                </span>
              </label>
            </div>
          ))}
        </div>
      )}

      {!rootFolder && !isLoading ? (
        <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
          <CardContent className="py-16 text-center">
            <GraduationCap className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 font-medium" style={CG}>Aucun dossier académique disponible</p>
            <p className="text-gray-500 text-sm mt-2" style={CG}>
              Vos dossiers seront disponibles après validation de votre inscription par l'administrateur de votre établissement.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
          <CardContent className="py-12 text-center">
            <Folder className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm" style={CG}>Ce dossier est vide</p>
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
                      if (!item.is_fichier) setPath(prev => [...prev, { id: item.id, nom: item.nom }]);
                      else if (item.fichier_type === 'formulaire_inscription') openFiche(item);
                      else if (item.fichier_url) setFileViewer({ url: item.fichier_url, title: item.nom });
                    }}>
                  {/* Bloc hover limité à l'icône + titre */}
                    <div className="flex flex-col items-center rounded-lg px-2 py-1 hover:bg-[#3d3d3d] transition-colors relative">
                  {!!item.certifie && !item.pre_certification && (
                    <div className="absolute top-0 right-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    </div>
                  )}
                  {!!item.pre_certification && (
                    <div className="absolute top-0 right-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                    </div>
                  )}
                  {item.is_fichier ? (
                    <DocumentThumbnail url={item.fichier_url} fichierType={item.fichier_type} nom={item.nom} width={90} height={110} />
                  ) : (
                    <img
                      src="/assets/icons/d8ad0ef1d_folder3.png"
                      alt="dossier"
                      className="w-10 h-10 object-contain mb-1"
                    />
                  )}
                  <span className="text-white text-xs text-center font-medium line-clamp-2" style={CG}>{item.nom}</span>
                  </div>
                  {!!item.certifie && !item.pre_certification && (
                  <span className="flex items-center gap-0.5 text-green-400 text-xs" style={CG}>
                    <Shield className="w-2.5 h-2.5" /> Certifié
                  </span>
                  )}
                  {!!item.pre_certification && (
                   <span className="flex items-center gap-0.5 text-orange-400 text-xs" style={CG}>
                     <AlertTriangle className="w-2.5 h-2.5" /> Pré-certifié
                   </span>
                  )}
                  </div>
                  </ContextMenuTrigger>
                <ContextMenuContent style={{ backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)' }}>
                   {!!item.is_fichier && item.fichier_type === 'formulaire_inscription' && (
                     <ContextMenuItem onClick={() => openFiche(item)} className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                       <Eye className="w-3.5 h-3.5 mr-2 text-blue-400" /> Ouvrir
                     </ContextMenuItem>
                   )}
                   {!!item.is_fichier && item.fichier_type !== 'formulaire_inscription' && (
                     <ContextMenuItem onClick={() => setFileViewer({ url: item.fichier_url, title: item.nom })} className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                       <Eye className="w-3.5 h-3.5 mr-2 text-blue-400" /> Ouvrir
                     </ContextMenuItem>
                   )}
                   {!!item.is_fichier && item.fichier_type !== 'formulaire_inscription' && (
                     <ContextMenuItem asChild className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                       <a href={item.fichier_url} download style={{ display: 'flex', alignItems: 'center' }}>
                         <Download className="w-3.5 h-3.5 mr-2 text-green-400" /> Télécharger
                       </a>
                     </ContextMenuItem>
                   )}
                   {!item.is_fichier && (
                     <ContextMenuItem onClick={() => setPath(prev => [...prev, { id: item.id, nom: item.nom }])} className="text-white text-xs hover:bg-[#474747] cursor-pointer">
                       <Folder className="w-3.5 h-3.5 mr-2 text-yellow-400" /> Ouvrir le dossier
                     </ContextMenuItem>
                   )}
                 </ContextMenuContent>
                </ContextMenu>
                ))}
                </div>
      )}

      {/* Lecteur de fichier */}
      {fileViewer && <FileViewer url={fileViewer.url} title={fileViewer.title} onClose={() => setFileViewer(null)} />}

      {/* Dialog Fiche */}
      {viewingFiche && (
        <DraggableDialog
          open={!!viewingFiche}
          onOpenChange={() => { setViewingFiche(null); setFicheData(null); }}
          title={
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-yellow-400" />
              <span style={CG} className="text-sm">
                {viewingFiche.nom}
                {ficheData && ` – ${[ficheData.prenom, ficheData.nom, ficheData.post_nom].filter(Boolean).join(' ')}`}
              </span>
              {viewingFiche.certifie && !viewingFiche.pre_certification && <span className="flex items-center gap-1 text-xs text-green-400"><Shield className="w-3 h-3" /> Certifié</span>}
              {viewingFiche.pre_certification && <span className="flex items-center gap-1 text-xs text-orange-400"><AlertTriangle className="w-3 h-3" /> Pré-certifié</span>}
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
            ) : ficheData ? (
              <div className="space-y-3 py-1">
                {viewingFiche.pre_certification && (
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#2d1a00', border: '1px solid #7c4500' }}>
                  <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <p className="text-orange-300 text-xs" style={CG}>
                    Document <strong>pré-certifié</strong> par {viewingFiche.certifie_par}. Des pièces jointes ont été rejetées – veuillez les renvoyer via la section ci-dessous.
                  </p>
                </div>
              )}
              {viewingFiche.certifie && !viewingFiche.pre_certification && viewingFiche.certifie_par && (
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#1a3a1a', border: '1px solid #2a6a2a' }}>
                  <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-green-300 text-xs" style={CG}>Document certifié par {viewingFiche.admin_full_name || viewingFiche.certifie_par} le {new Date(viewingFiche.date_certification || '').toLocaleDateString('fr-FR')}</p>
                </div>
              )}

                {ficheData.etablissement_nom?.toUpperCase().includes('BEAUX') ? (
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #ccc' }}>
                    <div className="flex items-center justify-center gap-3 px-4 py-2" style={{ backgroundColor: '#e8e8e8' }}>
                      <img src="/assets/icons/ff5bded4f_Logo-ABA-new.jpg" alt="Logo ABA" style={{ height: '52px', mixBlendMode: 'multiply', filter: 'brightness(1.3) contrast(0.85)' }} className="object-contain" />
                      <div className="text-center">
                        <p className="font-black text-black tracking-wide uppercase text-xs" style={CG}>Académie des Beaux-Arts</p>
                        <p className="font-black text-black tracking-wide uppercase text-xs" style={CG}>Direction Générale</p>
                      </div>
                    </div>
                    <div className="px-4 py-1.5 text-center" style={{ backgroundColor: '#d8d8d8' }}>
                      {(() => {
                        const hash = (ficheData.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                        const num = String(1000 + (hash % 9000));
                        const year = new Date(ficheData.created_date || Date.now()).getFullYear();
                        return <>
                          <p className="font-bold text-black text-xs" style={CG}>BULLETIN D'INSCRIPTION N° {num}/{year}</p>
                          <p className="text-black text-xs font-semibold underline" style={CG}>ANNEE ACADEMIQUE {year}-{year + 1}</p>
                        </>;
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--ha-surface2)', border: '1px solid #4d4d4d' }}>
                    <h2 className="text-sm font-bold text-white" style={CG}>{ficheData.etablissement_nom}</h2>
                    <p className="text-blue-400 font-semibold text-xs mt-0.5" style={CG}>FORMULAIRE D'INSCRIPTION</p>
                  </div>
                )}

                <Section title="Informations Personnelles" icon={<GraduationCap className="w-3 h-3 text-blue-400" />}>
                  <Row label="Nom" value={ficheData.nom} />
                  <Row label="Post-nom" value={ficheData.post_nom} />
                  <Row label="Prénom" value={ficheData.prenom} />
                  <Row label="Date de naissance" value={ficheData.date_naissance} />
                  <Row label="Sexe" value={ficheData.sexe === 'M' ? 'Masculin' : ficheData.sexe === 'F' ? 'Féminin' : ficheData.sexe} />
                  <Row label="Nationalité" value={ficheData.nationalite} />
                  <Row label="État civil" value={ficheData.etat_civil} />
                </Section>

                <Section title="Origine" icon={<span className="text-green-400 text-xs">📍</span>}>
                  <Row label="Province" value={ficheData.province_origine} />
                  <Row label="District" value={ficheData.district} />
                  <Row label="Territoire" value={ficheData.territoire} />
                  <Row label="Adresse" value={ficheData.adresse_candidat} />
                </Section>

                <Section title="Filiation" icon={<span className="text-purple-400 text-xs">👤</span>}>
                  <Row label="Nom du père" value={ficheData.nom_pere} />
                  <Row label="Nom de la mère" value={ficheData.nom_mere} />
                </Section>

                <Section title="Études Secondaires" icon={<span className="text-yellow-400 text-xs">🎓</span>}>
                  <Row label="École secondaire" value={ficheData.ecole_secondaire} />
                  <Row label="Adresse école" value={ficheData.adresse_ecole} />
                  <Row label="Centre EXETAT" value={ficheData.centre_exetat} />
                  <Row label="Section" value={ficheData.section_secondaire} />
                  <Row label="Année d'obtention" value={ficheData.annee_secondaire} />
                  <Row label="Pourcentage obtenu" value={ficheData.pourcentage_obtenu ? `${ficheData.pourcentage_obtenu}%` : null} />
                  <Row label="Nº Diplôme" value={ficheData.numero_diplome_secondaire} />
                </Section>

                <Section title="Inscription Académique" icon={<GraduationCap className="w-3 h-3 text-cyan-400" />}>
                  <Row label="Matricule" value={ficheData.matricule} highlight />
                  <Row label="Type" value={ficheData.type_utilisateur} />
                  <Row label="Faculté" value={ficheData.faculte} />
                  <Row label="Département" value={ficheData.departement} />
                  <Row label="Option" value={ficheData.option} />
                  <Row label="Orientation" value={ficheData.orientation} />
                  <Row label="Classe/Niveau" value={ficheData.classe} />
                </Section>

                <Section title="Contact" icon={<span className="text-red-400 text-xs">✉</span>}>
                  <Row label="Email" value={ficheData.email} />
                  <Row label="Téléphone" value={ficheData.telephone} />
                </Section>
              </div>
            ) : (
              <div className="py-12 text-center">
                <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 text-sm" style={CG}>Aucune donnée disponible</p>
              </div>
            )}
          </DraggableDialogBody>
        </DraggableDialog>
      )}
    </div>
  );
}
