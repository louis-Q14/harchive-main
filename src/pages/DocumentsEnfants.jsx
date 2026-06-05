import React, { useState, useEffect, useMemo } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, FileText, ArrowLeft, Eye, ChevronRight, GraduationCap, Shield, AlertTriangle, CheckCircle2, Users } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DraggableDialog, DraggableDialogBody } from "@/components/ui/DraggableDialog";
import FileViewer from "@/components/documents/FileViewer";
import PdfThumbnail from "@/components/documents/PdfThumbnail";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

function Row({ label, value, highlight }) {
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

function DossierEnfant({ demande, etablissementId }) {
  const [path, setPath] = useState([]);
  const [rootId, setRootId] = useState(null);
  const [viewingFiche, setViewingFiche] = useState(null);
  const [ficheData, setFicheData] = useState(null);
  const [loadingFiche, setLoadingFiche] = useState(false);
  const [fileViewer, setFileViewer] = useState(null);

  const { data: dossierRacine, isLoading: loadingRacine } = useQuery({
    queryKey: ["dossier-racine-parent", demande.id],
    queryFn: async () => {
      const racines = await dataService.query('DossierInscription', { filters: [{ 
        etudiant_id: demande.id
       }],
  limit: 1000, offset: 0 });
      return racines.find(r => r.type === 'dossier_academique_etudiant' || r.type === 'dossier_academique_professeur') || null;
    },
    enabled: !!demande.id
  });

  const { data: tousLesDossiers = [], isLoading: loadingDossiers } = useQuery({
    queryKey: ["dossier-academique-all-parent", dossierRacine?.etablissement_id],
    queryFn: async () => {
      if (!dossierRacine?.etablissement_id) return [];
      return await dataService.query('DossierInscription', { filters: [{  etablissement_id: dossierRacine.etablissement_id  }],
  limit: 1000, offset: 0 });
    },
    enabled: !!dossierRacine?.etablissement_id
  });

  const rootFolder = useMemo(() => {
    if (!dossierRacine) return null;
    if (!rootId) setRootId(dossierRacine.id);
    return dossierRacine;
  }, [dossierRacine]);

  const currentId = path.length > 0 ? path[path.length - 1].id : rootId;
  // Les PJ individuelles ne sont visibles que si certifiées par l'admin établissement
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

  const getFileLabel = (fichierType) => {
    if (fichierType === "formulaire_inscription") return "Formulaire d'inscription";
    if (fichierType === "diplome") return "Diplôme secondaire";
    if (fichierType === "bulletin") return "Bulletin 5ème et 6ème";
    return "Document";
  };

  const openFiche = async (item) => {
    setViewingFiche(item);
    setLoadingFiche(true);
    try {
      let adminFullName = item.certifie_par;
      if (item.etablissement_id && item.certifie_par) {
        const etab = await dataService.getById('Etablissement', item.etablissement_id);
        if (etab?.admin_nom) {
          adminFullName = [etab.admin_prenom, etab.admin_nom, etab.admin_post_nom].filter(Boolean).join(' ') || item.certifie_par;
        }
      }
      if (item.etudiant_id) {
        const d = await dataService.getById('DemandeInscription', item.etudiant_id);
        setFicheData(d || null);
      } else {
        const ds = item.etudiant_email ? await dataService.query('DemandeInscription', { filters: [{ email: item.etudiant_email }] }) : [];
        setFicheData(ds.length > 0 ? ds[0] : null);
      }
      setViewingFiche(prev => ({ ...prev, admin_full_name: adminFullName }));
    } catch { setFicheData(null); }
    finally { setLoadingFiche(false); }
  };

  const isLoading = loadingRacine || loadingDossiers;

  return (
    <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'var(--ha-surface)', border: '1px solid #2d2d2d' }}>
      {/* En-tête étudiant */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--ha-surface2)' }}>
          <GraduationCap className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-sm" style={CG}>
            {[demande.prenom, demande.nom, demande.post_nom].filter(Boolean).join(' ')}
          </h2>
          <p className="text-gray-400 text-xs" style={CG}>{demande.matricule} – {demande.etablissement_nom}</p>
        </div>
      </div>

      {/* Breadcrumb */}
      {path.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button onClick={() => setPath([])} className="text-blue-400 hover:text-blue-300 text-xs" style={CG}>Dossiers</button>
          {path.map((p, idx) => (
            <React.Fragment key={p.id}>
              <ChevronRight className="w-3 h-3 text-gray-500" />
              <button onClick={() => setPath(prev => prev.slice(0, idx + 1))} className="text-blue-400 hover:text-blue-300 text-xs" style={CG}>{p.nom}</button>
            </React.Fragment>
          ))}
        </div>
      )}
      {path.length > 0 && (
        <Button variant="outline" onClick={() => setPath(prev => prev.slice(0, -1))} className="mb-3 bg-[#333333] text-white border-[#4d4d4d]" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !rootFolder ? (
        <div className="py-8 text-center">
          <Folder className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm" style={CG}>Aucun dossier disponible pour cet étudiant</p>
          <p className="text-gray-500 text-xs mt-1" style={CG}>Le dossier sera disponible après validation par l'établissement.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center">
          <Folder className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm" style={CG}>Ce dossier est vide</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
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
                    }}>
                    <div className="flex flex-col items-center rounded-lg px-2 py-1 hover:bg-[#474747] transition-colors relative">
                      {!!item.certifie && !item.pre_certification && (
                        <div className="absolute top-0 right-0"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /></div>
                      )}
                      {!!item.pre_certification && (
                        <div className="absolute top-0 right-0"><AlertTriangle className="w-3.5 h-3.5 text-orange-400" /></div>
                      )}
                      {!!item.is_fichier && item.fichier_url ? (
                        /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(item.fichier_url) ? (
                          <div className="rounded overflow-hidden border border-[#4d4d4d] mb-1" style={{ width: 72, height: 72 }}>
                            <img src={item.fichier_url} alt={item.nom} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="mb-1"><PdfThumbnail url={item.fichier_url} width={72} height={72} /></div>
                        )
                      ) : item.is_fichier ? (
                        <FileText className="w-9 h-9 text-yellow-400 mb-1" />
                      ) : (
                        <img
                          src="/assets/icons/d8ad0ef1d_folder3.png"
                          alt="dossier" className="w-9 h-9 object-contain mb-1"
                        />
                      )}
                      <span className="text-white text-xs text-center font-medium line-clamp-2" style={CG}>{item.nom}</span>
                    </div>
                    {!!item.certifie && !item.pre_certification && (
                      <span className="flex items-center gap-0.5 text-green-400 text-xs" style={CG}><Shield className="w-2.5 h-2.5" /> Certifié</span>
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
                      <Eye className="w-3.5 h-3.5 mr-2 text-blue-400" /> Ouvrir (lecture seule)
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

      {fileViewer && <FileViewer url={fileViewer.url} title={fileViewer.title} onClose={() => setFileViewer(null)} />}

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
              {viewingFiche.certifie && !viewingFiche.pre_certification && (
                <span className="flex items-center gap-1 text-xs text-green-400"><Shield className="w-3 h-3" /> Certifié</span>
              )}
            </span>
          }
          maxWidth="max-w-2xl"
        >
          <DraggableDialogBody>
            {loadingFiche ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : ficheData ? (
              <div className="space-y-3 py-1">
                {viewingFiche.certifie && viewingFiche.certifie_par && (
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#1a3a1a', border: '1px solid #2a6a2a' }}>
                    <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-green-300 text-xs" style={CG}>
                      Document certifié par {viewingFiche.admin_full_name || viewingFiche.certifie_par} le {new Date(viewingFiche.date_certification || '').toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#1a2a3a', border: '1px solid #2a4a6a' }}>
                  <Eye className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <p className="text-blue-300 text-xs" style={CG}>Mode lecture seule – consultation parent</p>
                </div>
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
                <Section title="Inscription Académique" icon={<GraduationCap className="w-3 h-3 text-cyan-400" />}>
                  <Row label="Matricule" value={ficheData.matricule} highlight />
                  <Row label="Faculté" value={ficheData.faculte} />
                  <Row label="Département" value={ficheData.departement} />
                  <Row label="Option" value={ficheData.option} />
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

export default function DocumentsEnfants() {
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    authService.getCurrentUser().then(u => { setUser(u); setUserLoaded(true); }).catch(() => setUserLoaded(true));
  }, []);

  // Récupérer toutes les demandes parent et filtrer côté JS (insensible é  la casse)
  const { data: demandesParent = [], isLoading: loadingParent } = useQuery({
    queryKey: ["demandes-parent-all", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await dataService.query('DemandeInscriptionParent');
      return all.filter(d => d.email?.toLowerCase() === user.email?.toLowerCase());
    },
    enabled: !!user?.email
  });

  // Construire la liste des enfants (matricule + nom) depuis toutes les demandes parent
  const enfantsInfo = useMemo(() => {
    const map = new Map(); // matricule -> nom_enfant
    for (const dp of demandesParent) {
      // Enfant principal
      if (dp.matricule_enfant) {
        map.set(dp.matricule_enfant.trim(), dp.nom_enfant || dp.matricule_enfant);
      }
      // Enfants supplémentaires (champ JSON ou tableau)
      if (dp.enfants_supplementaires) {
        try {
          const extras = typeof dp.enfants_supplementaires === 'string'
            ? JSON.parse(dp.enfants_supplementaires)
            : dp.enfants_supplementaires;
          if (Array.isArray(extras)) {
            for (const e of extras) {
              if (e.matricule_enfant) map.set(e.matricule_enfant.trim(), e.nom_enfant || e.matricule_enfant);
            }
          }
        } catch {}
      }
    }
    return map; // Map<matricule, nom>
  }, [demandesParent]);

  const matriculesEnfants = useMemo(() => [...enfantsInfo.keys()], [enfantsInfo]);

  // Construire les infos du parent pour retrouver les enfants par nom de père aussi
  const parentInfo = useMemo(() => {
    if (!demandesParent.length) return null;
    const dp = demandesParent[0];
    // Nom complet du parent ex: "LOUIS KAZADI NUINGA" ou "KAZADI LOUIS"
    return {
      nom: dp.nom?.trim().toUpperCase(),
      prenom: dp.prenom?.trim().toUpperCase(),
      post_nom: dp.post_nom?.trim().toUpperCase(),
    };
  }, [demandesParent]);

  // Chercher les DemandeInscription : par matricule OU par nom_pere correspondant au parent
  const { data: demandesEtudiants = [], isLoading: loadingEtudiants } = useQuery({
    queryKey: ["demandes-etudiants-parent", matriculesEnfants.join(','), parentInfo?.nom, parentInfo?.prenom],
    queryFn: async () => {
      const all = await dataService.query('DemandeInscription');
      const approuvees = all.filter(d => d.statut === 'approuvee' && d.type_utilisateur === 'etudiant');

      const matriculesLower = matriculesEnfants.map(m => m.toLowerCase());

      return approuvees.filter(d => {
        // Match par matricule enregistré
        if (d.matricule && matriculesLower.includes(d.matricule.trim().toLowerCase())) return true;

        // Match par nom_pere : contient le nom + prénom du parent
        if (parentInfo && d.nom_pere) {
          const nomPere = d.nom_pere.trim().toUpperCase();
          const nomParent = parentInfo.nom || '';
          const prenomParent = parentInfo.prenom || '';
          if (nomParent && nomPere.includes(nomParent) && prenomParent && nomPere.includes(prenomParent)) return true;
        }

        return false;
      });
    },
    enabled: !!demandesParent.length
  });

  const isLoading = !userLoaded || loadingParent || (demandesParent.length > 0 && loadingEtudiants);

  if (isLoading) {
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
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white" style={CG}>Documents de mes Enfants</h1>
          <p className="text-gray-400 text-xs" style={CG}>Consultation en lecture seule des dossiers académiques de vos enfants</p>
        </div>
      </div>

      {demandesParent.length === 0 ? (
        <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 font-medium" style={CG}>Aucune demande d'inscription parent trouvée</p>
            <p className="text-gray-400 text-xs mt-1" style={CG}>Email connecté : {user?.email}</p>
            <p className="text-gray-500 text-sm mt-2" style={CG}>Veuillez soumettre une demande d'inscription parent avec cet email.</p>
          </CardContent>
        </Card>
      ) : demandesEtudiants.length === 0 ? (
        <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
          <CardContent className="py-16 text-center">
            <GraduationCap className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 font-medium" style={CG}>Aucun dossier disponible</p>
            <p className="text-gray-500 text-sm mt-2" style={CG}>
              Les dossiers seront disponibles une fois que la demande d'inscription de votre enfant aura été approuvée et son dossier créé par l'établissement.
            </p>
            <div className="mt-4 p-3 rounded-lg mx-auto max-w-sm" style={{ backgroundColor: 'var(--ha-surface2)', border: '1px solid #4d4d4d' }}>
              <p className="text-gray-400 text-xs" style={CG}>Matricules enregistrés :</p>
              {matriculesEnfants.length > 0 ? matriculesEnfants.map(m => (
                <p key={m} className="text-white text-xs font-medium mt-1" style={CG}>{m}</p>
              )) : <p className="text-gray-500 text-xs mt-1" style={CG}>Aucun matricule trouvé</p>}
            </div>
          </CardContent>
        </Card>
      ) : (
        demandesEtudiants.map(demande => (
          <DossierEnfant key={demande.id} demande={demande} etablissementId={demande.etablissement_id} />
        ))
      )}
    </div>
  );
}

