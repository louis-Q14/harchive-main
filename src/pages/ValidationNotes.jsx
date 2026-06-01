import React, { useEffect, useMemo, useState, useRef } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, X, Eye, Send, FileSpreadsheet, Filter, Trash2, ChevronDown, ChevronRight, GraduationCap, BookOpen, User, Printer } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter as AlertFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CG = { fontFamily: '"Century Gothic","AppleGothic","Gill Sans","Trebuchet MS",sans-serif' };

function generateBulletinHTML(notes, profNom, matiereNom, classeNom, periode, etabNom) {
  const rows = notes.map((n, i) => `
    <tr style="border-bottom:1px solid #3d3d3d;">
      <td style="padding:6px 10px;color:#6b7280;font-family:monospace;font-size:11px;">${i+1}</td>
      <td style="padding:6px 10px;color:#fff;font-weight:500;">${n.etudiant_nom||''}</td>
      <td style="padding:6px 10px;color:#9ca3af;">${n.etudiant_matricule||'-'}</td>
      <td style="padding:6px 10px;color:#fff;font-weight:700;text-align:center;">${n.note}/${n.note_sur}</td>
      <td style="padding:6px 10px;color:#9ca3af;text-align:center;">${typeof n.pourcentage==='number'?n.pourcentage.toFixed(1)+'%':'-'}</td>
    </tr>
  `).join('');
  return `<div style="font-family:'Century Gothic','Gill Sans',sans-serif;color:#e0e0e0;padding:24px;">
    <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #4d4d4d;padding-bottom:16px;">
      <h1 style="font-size:18px;font-weight:bold;margin:0 0 4px;color:#fff;">${matiereNom||'Notes'}</h1>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:8px;font-size:13px;color:#aaa;">
        <span><strong>Classe :</strong> ${classeNom||''}</span>
        <span><strong>Période :</strong> ${periode||''}</span>
      </div>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:4px;font-size:13px;color:#aaa;">
        <span><strong>Professeur :</strong> ${profNom||''}</span>
        <span><strong>Établissement :</strong> ${etabNom||''}</span>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:rgba(255,255,255,0.06);">
        <th style="padding:6px 10px;text-align:left;color:#9ca3af;font-weight:600;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.08);">N°</th>
        <th style="padding:6px 10px;text-align:left;color:#9ca3af;font-weight:600;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.08);">Étudiant</th>
        <th style="padding:6px 10px;text-align:left;color:#9ca3af;font-weight:600;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.08);">Matricule</th>
        <th style="padding:6px 10px;text-align:center;color:#9ca3af;font-weight:600;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.08);">Note</th>
        <th style="padding:6px 10px;text-align:center;color:#9ca3af;font-weight:600;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.08);">%</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export default function ValidationNotes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [expandedFacultes, setExpandedFacultes] = useState(new Set());
  const [expandedProfs, setExpandedProfs] = useState(new Set());
  const [expandedMatieres, setExpandedMatieres] = useState(new Set());
  const [expandedArchFac, setExpandedArchFac] = useState(new Set());
  const [expandedArchProf, setExpandedArchProf] = useState(new Set());
  const [expandedArchMat, setExpandedArchMat] = useState(new Set());
  const [bulletinDialog, setBulletinDialog] = useState({ open: false, html: '', title: '' });
  const bulletinRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await authService.getCurrentUser();
        if (u.role_archive === 'admin_etablissement' && !u.etablissement_id) {
          const etabs = await dataService.query('Etablissement');
          const match = etabs.find(e => e.admin_id === u.id || e.admin_email?.toLowerCase() === u.email?.toLowerCase());
          if (match) { u.etablissement_id = match.id; u.etablissement_nom = match.nom || match.name; }
        }
        if (!u.etablissement_nom && u.etablissement_id) {
          const etabs = await dataService.query('Etablissement');
          const et = etabs.find(e => e.id === u.etablissement_id);
          if (et) u.etablissement_nom = et.nom || et.name;
        }
        setUser(u);
      } finally { setLoading(false); }
    })();
  }, []);

  const queryClient = useQueryClient();

  const { data: notesSoumises = [] } = useQuery({
    queryKey: ["notes-soumises", user?.etablissement_id],
    queryFn: () => dataService.query('NoteEtudiant', { filters: [{ etablissement_id: user.etablissement_id, statut: "soumis" }], limit: 1000, offset: 0 }),
    enabled: !!user?.etablissement_id,
  });

  const { data: notesValidees = [] } = useQuery({
    queryKey: ["notes-validees", user?.etablissement_id],
    queryFn: () => dataService.query('NoteEtudiant', { filters: [{ etablissement_id: user.etablissement_id, statut: "validé" }], limit: 1000, offset: 0 }),
    enabled: !!user?.etablissement_id,
  });

  const { data: notesPubliees = [] } = useQuery({
    queryKey: ["notes-publiees", user?.etablissement_id],
    queryFn: () => dataService.query('NoteEtudiant', { filters: [{ etablissement_id: user.etablissement_id, statut: "publié" }], limit: 1000, offset: 0 }),
    enabled: !!user?.etablissement_id,
  });

  const { data: archives = [], isLoading: loadingArchives } = useQuery({
    queryKey: ["archives-etab", user?.etablissement_id],
    queryFn: () => dataService.query('NoteArchive', { filters: [{ etablissement_id: user.etablissement_id, statut: 'publié' }], limit: 1000, offset: 0 }),
    enabled: !!user?.etablissement_id,
  });

  const { data: assignations = [] } = useQuery({
    queryKey: ["assignations-etab", user?.etablissement_id],
    queryFn: () => dataService.query('AssignationProfesseur', { filters: [{ etablissement_id: user.etablissement_id }], limit: 1000, offset: 0 }),
    enabled: !!user?.etablissement_id,
  });

  const updateNote = useMutation({
    mutationFn: ({ id, data }) => dataService.update('NoteEtudiant', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes-soumises"] });
      queryClient.invalidateQueries({ queryKey: ["notes-validees"] });
      queryClient.invalidateQueries({ queryKey: ["notes-publiees"] });
      queryClient.invalidateQueries({ queryKey: ["archives-etab"] });
    }
  });

  const purgeArchives = useMutation({
    mutationFn: async () => {
      const all = await dataService.query('NoteArchive', { filters: [{ etablissement_id: user.etablissement_id, statut: 'publié' }], limit: 1000, offset: 0 });
      await Promise.all(all.map(a => dataService.delete('NoteArchive', a.id)));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["archives-etab"] }); setShowPurgeDialog(false); }
  });

  const ensurePublish = async (n) => {
    const patch = { statut: 'publié', visible_etudiant: true, visible_parent: true };
    let matricule = n.etudiant_matricule || null;
    const etuId = String(n.etudiant_id || '');
    if (!matricule) {
      if (etuId.startsWith('dem-')) {
        const demRows = await dataService.query('DemandeInscription', { filters: [{ id: etuId.slice(4) }], limit: 1, offset: 0 });
        matricule = demRows?.[0]?.matricule || null;
      } else if (etuId) {
        const rows = await dataService.query('Etudiant', { filters: [{ id: etuId }], limit: 1, offset: 0 });
        matricule = rows?.[0]?.matricule || null;
      }
    }
    if (matricule) patch.etudiant_matricule = matricule;
    if (etuId.startsWith('dem-') && matricule) {
      const etuRows = await dataService.query('Etudiant', { filters: [{ matricule }], limit: 1, offset: 0 });
      if (etuRows?.[0]?.id) {
        patch.etudiant_id = etuRows[0].id;
        if (!n.etudiant_nom && (etuRows[0].prenom || etuRows[0].nom))
          patch.etudiant_nom = `${etuRows[0].prenom||''} ${etuRows[0].nom||''}`.trim();
      }
    }
    await updateNote.mutateAsync({ id: n.id, data: patch });
    // Marquer les archives correspondantes comme publiées
    try {
      const archRows = await dataService.query('NoteArchive', { filters: [{ source_note_id: n.id }], limit: 100, offset: 0 });
      await Promise.all(archRows.map(a => dataService.update('NoteArchive', a.id, { statut: 'publié' })));
    } catch (_) { /* archive may not exist yet */ }
  };

  const buildFacultyHierarchy = (notes) => {
    const assignMap = {};
    assignations.forEach(a => { assignMap[`${a.professeur_id}__${a.matiere_id}`] = a; });
    const facMap = new Map();
    notes.forEach(n => {
      const assign = assignMap[`${n.professeur_id}__${n.matiere_id}`];
      const facName = assign?.faculte || 'Non assigné';
      const profKey = n.professeur_nom || n.professeur_id || 'Inconnu';
      const matKey = `${n.matiere_nom||'Sans matière'}__${n.classe_nom||''}__${n.periode||''}`;
      if (!facMap.has(facName)) facMap.set(facName, new Map());
      const profMap = facMap.get(facName);
      if (!profMap.has(profKey)) profMap.set(profKey, new Map());
      const matMap = profMap.get(profKey);
      if (!matMap.has(matKey)) matMap.set(matKey, []);
      matMap.get(matKey).push(n);
    });
    return Array.from(facMap.entries()).map(([fac, pm]) => ({
      faculte: fac,
      professeurs: Array.from(pm.entries()).map(([prof, mm]) => ({
        nom: prof,
        matieres: Array.from(mm.entries()).map(([k, items]) => ({
          key: k, nom: k.split('__')[0], classe: k.split('__')[1]||'', periode: k.split('__')[2]||'', items
        }))
      }))
    }));
  };

  const toggleSet = (set, setFn, key) => { const s = new Set(set); s.has(key)?s.delete(key):s.add(key); setFn(s); };

  const filteredSoumises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (notesSoumises||[]).filter(n => !q||(n.etudiant_nom||'').toLowerCase().includes(q)||(n.classe_nom||'').toLowerCase().includes(q)||(n.matiere_nom||'').toLowerCase().includes(q)||(n.professeur_nom||'').toLowerCase().includes(q));
  }, [notesSoumises, search]);

  const filteredValidees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (notesValidees||[]).filter(n => !q||(n.etudiant_nom||'').toLowerCase().includes(q)||(n.classe_nom||'').toLowerCase().includes(q)||(n.matiere_nom||'').toLowerCase().includes(q));
  }, [notesValidees, search]);

  const archivesFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (archives||[]).filter(a => !q||(a.etudiant_nom||'').toLowerCase().includes(q)||(a.classe_nom||'').toLowerCase().includes(q)||(a.matiere_nom||'').toLowerCase().includes(q));
  }, [archives, search]);

  const hierarchy = useMemo(() => buildFacultyHierarchy(filteredSoumises), [filteredSoumises, assignations]);

  const archiveHierarchy = useMemo(() => {
    const assignMap = {};
    assignations.forEach(a => { assignMap[`${a.professeur_id}__${a.matiere_id}`] = a; });
    const facMap = new Map();
    archivesFiltered.forEach(n => {
      const assign = assignMap[`${n.professeur_id}__${n.matiere_id}`];
      const facName = assign?.faculte || 'Non assigné';
      const profKey = n.professeur_nom || n.professeur_id || 'Inconnu';
      const matKey = `${n.matiere_nom||'Sans matière'}__${n.classe_nom||''}__${n.periode||''}`;
      if (!facMap.has(facName)) facMap.set(facName, new Map());
      const profMap = facMap.get(facName);
      if (!profMap.has(profKey)) profMap.set(profKey, new Map());
      const matMap = profMap.get(profKey);
      if (!matMap.has(matKey)) matMap.set(matKey, []);
      matMap.get(matKey).push(n);
    });
    return Array.from(facMap.entries()).map(([fac, pm]) => ({
      faculte: fac,
      professeurs: Array.from(pm.entries()).map(([prof, mm]) => ({
        nom: prof,
        matieres: Array.from(mm.entries()).map(([k, items]) => ({
          key: k, nom: k.split('__')[0], classe: k.split('__')[1]||'', periode: k.split('__')[2]||'', items
        }))
      }))
    }));
  }, [archivesFiltered, assignations]);

  const handlePrintBulletin = (html) => {
    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`<html><head><title>Bulletin</title><style>body{background:#2d2d2d;margin:0;padding:0;}@media print{body{background:#fff;color:#000!important;}td,th,span,div,p,h1,h2{color:#000!important;}tr{border-bottom:1px solid #ccc!important;}}</style></head><body>${html}</body></html>`);
    w.document.close();
    w.print();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor:'#4d4d4d'}}>
      <Loader2 className="w-12 h-12 text-white animate-spin" />
    </div>
  );

  if (user?.role_archive !== 'admin_etablissement') return (
    <div className="p-6">
      <Card style={{backgroundColor:'#3d3d3d',borderColor:'#2d2d2d'}}>
        <CardHeader><CardTitle className="text-white">Accès restreint</CardTitle></CardHeader>
        <CardContent><p className="text-gray-300">Cette page est réservée aux administrateurs d'établissement.</p></CardContent>
      </Card>
    </div>
  );

  const thStyle = { padding:'6px 10px', textAlign:'left', color:'#9ca3af', fontWeight:600, fontSize:11, borderBottom:'1px solid rgba(255,255,255,0.08)' };
  const thCenter = { ...thStyle, textAlign:'center' };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor:'#4d4d4d'}}>
      <div className="w-full px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white" style={CG}>Validation des Notes</h1>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Rechercher (étudiant, classe, matière...)" value={search} onChange={e=>setSearch(e.target.value)} className="pl-10 w-72" />
          </div>
        </div>

        <Tabs defaultValue="recues" className="space-y-6">
          <TabsList className="bg-[#3d3d3d]">
            <TabsTrigger value="recues">Notes Reçues ({filteredSoumises.length})</TabsTrigger>
            <TabsTrigger value="envoyer">Notes à Envoyer ({filteredValidees.length})</TabsTrigger>
            <TabsTrigger value="archives">Notes Archivées ({archivesFiltered.length})</TabsTrigger>
          </TabsList>

          {/* === ONGLET 1 : NOTES REÇUES === */}
          <TabsContent value="recues" className="space-y-4">
            {hierarchy.length === 0 ? (
              <Card style={{backgroundColor:'#3d3d3d',borderColor:'#2d2d2d'}}>
                <CardContent className="py-12 text-center">
                  <FileSpreadsheet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400" style={CG}>Aucune note soumise par les professeurs.</p>
                </CardContent>
              </Card>
            ) : hierarchy.map((fac) => (
              <Card key={fac.faculte} style={{backgroundColor:'#3d3d3d',borderColor:'#2d2d2d'}}>
                <button onClick={()=>toggleSet(expandedFacultes,setExpandedFacultes,fac.faculte)} className="w-full"
                  style={{display:'flex',alignItems:'center',gap:10,padding:'14px 20px',background:'rgba(255,255,255,0.03)',borderRadius:'8px 8px 0 0',border:'none',cursor:'pointer',...CG}}>
                  {expandedFacultes.has(fac.faculte)?<ChevronDown className="w-5 h-5 text-yellow-400"/>:<ChevronRight className="w-5 h-5 text-yellow-400"/>}
                  <GraduationCap className="w-5 h-5 text-yellow-400"/>
                  <span style={{color:'#fff',fontWeight:700,fontSize:15}}>{fac.faculte}</span>
                  <Badge className="bg-[#2d2d2d] ml-2">{fac.professeurs.reduce((s,p)=>s+p.matieres.reduce((s2,m)=>s2+m.items.length,0),0)} notes</Badge>
                </button>
                {expandedFacultes.has(fac.faculte) && (
                  <div style={{padding:'0 12px 12px'}}>
                    {fac.professeurs.map((prof)=>{
                      const profKey = `${fac.faculte}__${prof.nom}`;
                      const profCount = prof.matieres.reduce((s,m)=>s+m.items.length,0);
                      return (
                        <div key={profKey} style={{marginTop:8}}>
                          <button onClick={()=>toggleSet(expandedProfs,setExpandedProfs,profKey)}
                            style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',background:'rgba(255,255,255,0.04)',borderRadius:6,border:'none',cursor:'pointer',width:'100%',...CG}}>
                            {expandedProfs.has(profKey)?<ChevronDown className="w-4 h-4 text-blue-400"/>:<ChevronRight className="w-4 h-4 text-blue-400"/>}
                            <User className="w-4 h-4 text-blue-400"/>
                            <span style={{color:'#e0e0e0',fontWeight:600,fontSize:13}}>{prof.nom}</span>
                            <Badge className="bg-[#2d2d2d] ml-2" style={{fontSize:10}}>{profCount} notes</Badge>
                          </button>
                          {expandedProfs.has(profKey) && (
                            <div style={{paddingLeft:24,paddingTop:4}}>
                              {prof.matieres.map((mat)=>{
                                const matKey = `${profKey}__${mat.key}`;
                                const moy = (mat.items.reduce((s,n)=>s+(typeof n.pourcentage==='number'?n.pourcentage:((n.note||0)/(n.note_sur||20))*100),0)/mat.items.length).toFixed(1);
                                return (
                                  <div key={matKey} style={{marginTop:6}}>
                                    <button onClick={()=>toggleSet(expandedMatieres,setExpandedMatieres,matKey)}
                                      style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',background:'rgba(255,255,255,0.03)',borderRadius:5,border:'none',cursor:'pointer',width:'100%',...CG}}>
                                      {expandedMatieres.has(matKey)?<ChevronDown className="w-3 h-3 text-green-400"/>:<ChevronRight className="w-3 h-3 text-green-400"/>}
                                      <BookOpen className="w-3 h-3 text-green-400"/>
                                      <span style={{color:'#c0c0c0',fontWeight:500,fontSize:12}}>{mat.nom} • {mat.classe} • {mat.periode}</span>
                                      <Badge className="bg-[#2d2d2d] ml-auto" style={{fontSize:10}}>{mat.items.length} notes</Badge>
                                      <Badge className="bg-green-700" style={{fontSize:10}}>Moy {moy}%</Badge>
                                    </button>
                                    {expandedMatieres.has(matKey) && (
                                      <div style={{padding:'8px 0 8px 16px'}}>
                                        <div style={{display:'flex',gap:8,marginBottom:8,justifyContent:'flex-end'}}>
                                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={async()=>{
                                            await Promise.all(mat.items.map(n=>updateNote.mutateAsync({id:n.id,data:{statut:'validé'}})));
                                          }}><Check className="w-3 h-3 mr-1"/> Tout approuver</Button>
                                          <Button size="sm" variant="outline" onClick={()=>{
                                            const html = generateBulletinHTML(mat.items,prof.nom,mat.nom,mat.classe,mat.periode,user?.etablissement_nom||'');
                                            setBulletinDialog({open:true,html,title:`${mat.nom} • ${mat.classe} • ${mat.periode}`});
                                          }}><Eye className="w-3 h-3 mr-1"/> Voir bulletin</Button>
                                        </div>
                                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,...CG}}>
                                          <thead><tr style={{background:'rgba(255,255,255,0.06)'}}>
                                            <th style={thStyle}>N°</th>
                                            <th style={thStyle}>Étudiant</th>
                                            <th style={thStyle}>Évaluation</th>
                                            <th style={thCenter}>Note</th>
                                            <th style={thCenter}>Actions</th>
                                          </tr></thead>
                                          <tbody>
                                            {mat.items.map((n,idx)=>(
                                              <tr key={n.id} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}
                                                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                                                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                                <td style={{padding:'6px 10px',color:'#6b7280',fontFamily:'monospace',fontSize:11}}>{idx+1}</td>
                                                <td style={{padding:'6px 10px',color:'#fff',fontWeight:500}}>{n.etudiant_nom}</td>
                                                <td style={{padding:'6px 10px',color:'#9ca3af'}}>{n.titre_evaluation}</td>
                                                <td style={{padding:'6px 10px',textAlign:'center',color:'#fff',fontWeight:700}}>{n.note}/{n.note_sur}</td>
                                                <td style={{padding:'6px 10px',textAlign:'center'}}>
                                                  <div style={{display:'flex',gap:4,justifyContent:'center'}}>
                                                    <button onClick={()=>updateNote.mutate({id:n.id,data:{statut:'validé'}})} style={{background:'transparent',border:'none',color:'#3b82f6',cursor:'pointer',padding:2}} title="Approuver"><Check style={{width:14,height:14}}/></button>
                                                    <button onClick={()=>updateNote.mutate({id:n.id,data:{statut:'rejeté'}})} style={{background:'transparent',border:'none',color:'#ef4444',cursor:'pointer',padding:2}} title="Rejeter"><X style={{width:14,height:14}}/></button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>

          {/* === ONGLET 2 : NOTES À ENVOYER === */}
          <TabsContent value="envoyer" className="space-y-4">
            {filteredValidees.length === 0 ? (
              <Card style={{backgroundColor:'#3d3d3d',borderColor:'#2d2d2d'}}>
                <CardContent className="py-12 text-center">
                  <FileSpreadsheet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400" style={CG}>Aucune note approuvée à envoyer.</p>
                </CardContent>
              </Card>
            ) : (()=>{
              const grouped = new Map();
              filteredValidees.forEach(n=>{
                const key = `${n.professeur_nom||''}__${n.matiere_nom||''}__${n.classe_nom||''}__${n.periode||''}`;
                if (!grouped.has(key)) grouped.set(key,[]);
                grouped.get(key).push(n);
              });
              return Array.from(grouped.entries()).map(([key,items])=>{
                const [profNom,matNom,classeNom,periode] = key.split('__');
                const allPublished = items.every(n=>n.statut==='publié');
                return (
                  <Card key={key} style={{backgroundColor:'#3d3d3d',borderColor:'#2d2d2d'}}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-3" style={{fontSize:14,...CG}}>
                          <span>{matNom} • {classeNom} • {periode}</span>
                          <Badge className="bg-[#2d2d2d]">{items.length} notes</Badge>
                          <span style={{color:'#9ca3af',fontSize:12}}>Prof: {profNom}</span>
                        </CardTitle>
                        <div className="flex gap-2">
                          {!allPublished && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={async()=>{
                              await Promise.all(items.filter(n=>n.statut!=='publié').map(n=>ensurePublish(n)));
                            }}><Send className="w-4 h-4 mr-2"/> Envoyer (publier)</Button>
                          )}
                          <Button size="sm" variant="outline" onClick={()=>{
                            const html = generateBulletinHTML(items,profNom,matNom,classeNom,periode,user?.etablissement_nom||'');
                            setBulletinDialog({open:true,html,title:`${matNom} • ${classeNom}`});
                          }}><Eye className="w-4 h-4 mr-2"/> Voir bulletin</Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,...CG}}>
                        <thead><tr style={{background:'rgba(255,255,255,0.06)'}}>
                          <th style={thStyle}>N°</th>
                          <th style={thStyle}>Étudiant</th>
                          <th style={thStyle}>Matricule</th>
                          <th style={thCenter}>Note</th>
                          <th style={thCenter}>Statut</th>
                          <th style={thCenter}>Actions</th>
                        </tr></thead>
                        <tbody>
                          {items.map((n,idx)=>(
                            <tr key={n.id} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}
                              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                              <td style={{padding:'6px 10px',color:'#6b7280',fontFamily:'monospace',fontSize:11}}>{idx+1}</td>
                              <td style={{padding:'6px 10px',color:'#fff',fontWeight:500}}>{n.etudiant_nom}</td>
                              <td style={{padding:'6px 10px',color:'#9ca3af'}}>{n.etudiant_matricule||'-'}</td>
                              <td style={{padding:'6px 10px',textAlign:'center',color:'#fff',fontWeight:700}}>{n.note}/{n.note_sur}</td>
                              <td style={{padding:'6px 10px',textAlign:'center'}}>
                                <span style={{color:n.statut==='publié'?'#16a34a':n.statut==='validée'?'#3b82f6':'#eab308',fontSize:11,fontWeight:600}}>{n.statut}</span>
                              </td>
                              <td style={{padding:'6px 10px',textAlign:'center'}}>
                                {n.statut!=='publié' && (
                                  <button onClick={()=>ensurePublish(n)} style={{background:'transparent',border:'none',color:'#16a34a',cursor:'pointer',padding:2}} title="Envoyer"><Send style={{width:14,height:14}}/></button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </TabsContent>

          {/* === ONGLET 3 : NOTES ARCHIVÉES (bulletins approuvés) === */}
          <TabsContent value="archives" className="space-y-4">
            {archives.length > 0 && (
              <div className="flex justify-end">
                <Button variant="outline" className="text-red-400 border-red-600 hover:bg-red-600 hover:text-white" onClick={()=>setShowPurgeDialog(true)}>
                  <Trash2 className="w-4 h-4 mr-2"/> Purger les archives
                </Button>
              </div>
            )}
            {loadingArchives ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-white animate-spin"/></div>
            ) : archiveHierarchy.length === 0 ? (
              <Card style={{backgroundColor:'#3d3d3d',borderColor:'#2d2d2d'}}>
                <CardContent className="py-12 text-center">
                  <FileSpreadsheet className="w-16 h-16 text-gray-500 mx-auto mb-4"/>
                  <p className="text-gray-400" style={CG}>Aucune archive approuvée disponible.</p>
                </CardContent>
              </Card>
            ) : archiveHierarchy.map((fac) => (
              <Card key={fac.faculte} style={{backgroundColor:'#3d3d3d',borderColor:'#2d2d2d'}}>
                <button onClick={()=>toggleSet(expandedArchFac,setExpandedArchFac,fac.faculte)} className="w-full"
                  style={{display:'flex',alignItems:'center',gap:10,padding:'14px 20px',background:'rgba(255,255,255,0.03)',borderRadius:'8px 8px 0 0',border:'none',cursor:'pointer',...CG}}>
                  {expandedArchFac.has(fac.faculte)?<ChevronDown className="w-5 h-5 text-yellow-400"/>:<ChevronRight className="w-5 h-5 text-yellow-400"/>}
                  <GraduationCap className="w-5 h-5 text-yellow-400"/>
                  <span style={{color:'#fff',fontWeight:700,fontSize:15}}>{fac.faculte}</span>
                  <Badge className="bg-[#2d2d2d] ml-2">{fac.professeurs.reduce((s,p)=>s+p.matieres.reduce((s2,m)=>s2+m.items.length,0),0)} notes archivées</Badge>
                </button>
                {expandedArchFac.has(fac.faculte) && (
                  <div style={{padding:'0 12px 12px'}}>
                    {fac.professeurs.map((prof)=>{
                      const profKey = `arch__${fac.faculte}__${prof.nom}`;
                      const profCount = prof.matieres.reduce((s,m)=>s+m.items.length,0);
                      return (
                        <div key={profKey} style={{marginTop:8}}>
                          <button onClick={()=>toggleSet(expandedArchProf,setExpandedArchProf,profKey)}
                            style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',background:'rgba(255,255,255,0.04)',borderRadius:6,border:'none',cursor:'pointer',width:'100%',...CG}}>
                            {expandedArchProf.has(profKey)?<ChevronDown className="w-4 h-4 text-blue-400"/>:<ChevronRight className="w-4 h-4 text-blue-400"/>}
                            <User className="w-4 h-4 text-blue-400"/>
                            <span style={{color:'#e0e0e0',fontWeight:600,fontSize:13}}>{prof.nom}</span>
                            <Badge className="bg-[#2d2d2d] ml-2" style={{fontSize:10}}>{profCount} notes</Badge>
                          </button>
                          {expandedArchProf.has(profKey) && (
                            <div style={{paddingLeft:24,paddingTop:4}}>
                              {prof.matieres.map((mat)=>{
                                const matKey = `arch__${profKey}__${mat.key}`;
                                return (
                                  <div key={matKey} style={{marginTop:6}}>
                                    <button onClick={()=>toggleSet(expandedArchMat,setExpandedArchMat,matKey)}
                                      style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',background:'rgba(255,255,255,0.03)',borderRadius:5,border:'none',cursor:'pointer',width:'100%',...CG}}>
                                      {expandedArchMat.has(matKey)?<ChevronDown className="w-3 h-3 text-green-400"/>:<ChevronRight className="w-3 h-3 text-green-400"/>}
                                      <BookOpen className="w-3 h-3 text-green-400"/>
                                      <span style={{color:'#c0c0c0',fontWeight:500,fontSize:12}}>{mat.nom} • {mat.classe} • {mat.periode}</span>
                                      <Badge className="bg-[#2d2d2d] ml-auto" style={{fontSize:10}}>{mat.items.length} notes</Badge>
                                    </button>
                                    {expandedArchMat.has(matKey) && (
                                      <div style={{padding:'8px 0 8px 16px'}}>
                                        <div style={{display:'flex',gap:8,marginBottom:8,justifyContent:'flex-end'}}>
                                          <Button size="sm" variant="outline" onClick={()=>{
                                            const html = generateBulletinHTML(mat.items,prof.nom,mat.nom,mat.classe,mat.periode,user?.etablissement_nom||'');
                                            setBulletinDialog({open:true,html,title:`${mat.nom} • ${mat.classe} • ${mat.periode}`});
                                          }}><Eye className="w-3 h-3 mr-1"/> Voir bulletin</Button>
                                        </div>
                                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,...CG}}>
                                          <thead><tr style={{background:'rgba(255,255,255,0.06)'}}>
                                            <th style={thStyle}>N°</th>
                                            <th style={thStyle}>Étudiant</th>
                                            <th style={thStyle}>Matricule</th>
                                            <th style={thCenter}>Note</th>
                                            <th style={thCenter}>Archivé le</th>
                                          </tr></thead>
                                          <tbody>
                                            {mat.items.map((n,idx)=>(
                                              <tr key={n.id} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}
                                                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                                                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                                <td style={{padding:'6px 10px',color:'#6b7280',fontFamily:'monospace',fontSize:11}}>{idx+1}</td>
                                                <td style={{padding:'6px 10px',color:'#fff',fontWeight:500}}>{n.etudiant_nom}</td>
                                                <td style={{padding:'6px 10px',color:'#9ca3af'}}>{n.etudiant_matricule||'-'}</td>
                                                <td style={{padding:'6px 10px',textAlign:'center',color:'#fff',fontWeight:700}}>{n.note}/{n.note_sur}</td>
                                                <td style={{padding:'6px 10px',textAlign:'center',color:'#9ca3af',fontSize:11}}>{n.archived_at?new Date(n.archived_at).toLocaleDateString():'-'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Dialog bulletin HTML */}
        <DraggableDialog open={bulletinDialog.open} onOpenChange={v=>setBulletinDialog(p=>({...p,open:v}))} title={
          <span style={{display:'flex',flexDirection:'column'}}>
            <span>Bulletin de notes</span>
            <span style={{fontSize:11,fontWeight:400,color:'#9ca3af'}}>{bulletinDialog.title}</span>
          </span>
        } maxWidth="max-w-2xl">
          <DraggableDialogBody>
            <div style={{maxHeight:'60vh',overflowY:'auto'}}>
              <div ref={bulletinRef} dangerouslySetInnerHTML={{__html:bulletinDialog.html}}/>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="outline" onClick={()=>handlePrintBulletin(bulletinDialog.html)} style={{backgroundColor:'rgba(255,255,255,0.08)',borderColor:'rgba(255,255,255,0.18)',color:'#e0e0e0',...CG}}>
              <Printer className="w-4 h-4 mr-2"/> Imprimer
            </Button>
            <Button variant="outline" onClick={()=>setBulletinDialog({open:false,html:'',title:''})} style={{backgroundColor:'rgba(255,255,255,0.08)',borderColor:'rgba(255,255,255,0.18)',color:'#e0e0e0',...CG}}>Fermer</Button>
          </DraggableDialogFooter>
        </DraggableDialog>

        {/* Dialog purge */}
        <AlertDialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
          <AlertDialogContent style={{backgroundColor:'#3d3d3d',borderColor:'#2d2d2d'}}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Purger toutes les archives ?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Cette action est irréversible. Toutes les notes archivées ({archives?.length||0}) seront définitivement supprimées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertFooter>
              <AlertDialogCancel className="text-white border-gray-600">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={()=>purgeArchives.mutate()} disabled={purgeArchives.isPending} className="bg-red-600 hover:bg-red-700 text-white">
                {purgeArchives.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Suppression...</> : <><Trash2 className="w-4 h-4 mr-2"/>Purger définitivement</>}
              </AlertDialogAction>
            </AlertFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}