import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Loader2, FileText, BookOpen, User, GraduationCap, Hash, School, ChevronDown, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

function EnfantCard({ enfant, selected, onClick }) {
  const initiales = (enfant.nom || "?")
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl p-4 flex items-center gap-4 transition-all duration-200 border-2"
      style={{
        backgroundColor: selected ? "#1a1a1a" : "#2d2d2d",
        borderColor: selected ? "#60a5fa" : "#3d3d3d",
        boxShadow: selected ? "0 0 0 2px rgba(96,165,250,0.3)" : "none",
      }}
    >
      <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden">
        {enfant.photo_url ? (
          <img src={enfant.photo_url} alt={enfant.nom} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: selected ? "#1e3a5f" : "#3d3d3d", color: selected ? "#60a5fa" : "#b0b0b0" }}
          >
            {initiales}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{enfant.nom}</p>
        <p className="text-xs text-gray-400 truncate">{enfant.etablissement_nom}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#3d3d3d", color: "#b0b0b0" }}>
            #{enfant.matricule}
          </span>
          {enfant.classe && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#3d3d3d", color: "#b0b0b0" }}>
              {enfant.classe}
            </span>
          )}
        </div>
      </div>
      {selected && (
        <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
      )}
    </div>
  );
}


function NotesView({ enfant }) {
  const [selectedMatiere, setSelectedMatiere] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedMatieres, setCollapsedMatieres] = useState({});
  const toggleMatiere = (matiere) => {
    setCollapsedMatieres(prev => ({ ...prev, [matiere]: !prev[matiere] }));
  };

  // Réinitialiser le filtre quand l'enfant change
  useEffect(() => {
    setSelectedMatiere("");
    setSearchQuery("");
  }, [enfant.matricule]);

  const { data: allNotes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ["notesEnfant", enfant.matricule, enfant.etablissement_id],
    queryFn: async () => {
      const notesPubliees = await dataService.query('NoteEtudiant', { filters: [{
        etablissement_id: enfant.etablissement_id,
        etudiant_matricule: enfant.matricule,
        statut: 'publié'
      }],
  limit: 1000, offset: 0 });

      const notesArchive = await dataService.query('NoteArchive', { filters: [{
        etablissement_id: enfant.etablissement_id,
        etudiant_matricule: enfant.matricule,
        statut: 'publié'
      }],
  limit: 1000, offset: 0 });

      const toutesNotes = [
        ...notesPubliees,
        ...notesArchive,
      ];

      const combinedNotes = {};
      toutesNotes.forEach(note => {
        const key = `${note.matiere_nom}-${note.periode}-${note.titre_evaluation}`;
        if (!combinedNotes[key]) combinedNotes[key] = note;
      });

      return Object.values(combinedNotes);
    },
    enabled: !!enfant.etablissement_id && !!enfant.matricule,
  });

  const { data: matieresEtablissement = [] } = useQuery({
    queryKey: ["matieresEnfant", enfant.etablissement_id, enfant.classe],
    queryFn: async () => {
      const matieres = await dataService.query('Matiere', { filters: [{
        etablissement_id: enfant.etablissement_id,
      }],
  limit: 1000, offset: 0 });
      // Filtrer par niveau (classe) de l'enfant si disponible
      if (enfant.classe) {
        return matieres.filter(m =>
          Array.isArray(m.niveaux) && m.niveaux.includes(enfant.classe)
        );
      }
      // Fallback : filtrer par faculté si pas de classe
      if (enfant.faculte) return matieres.filter(m => m.faculte === enfant.faculte);
      return matieres;
    },
    enabled: !!enfant.etablissement_id,
  });

  const matieres = matieresEtablissement.map(m => m.nom).sort();

  const filteredNotes = allNotes.filter(note =>
    (!selectedMatiere || note.matiere_nom === selectedMatiere) &&
    ((note.titre_evaluation || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
     (note.periode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
     (note.matiere_nom || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedNotes = filteredNotes.reduce((acc, note) => {
    const matiere = note.matiere_nom || "Sans matière";
    const periode = note.periode || "Sans période";
    if (!acc[matiere]) acc[matiere] = {};
    if (!acc[matiere][periode]) acc[matiere][periode] = [];
    acc[matiere][periode].push(note);
    return acc;
  }, {});

  const ordrePeriodes = [
    '1er trimestre', '2ème trimestre', '3ème trimestre',
    '1er semestre', '2ème semestre',
    'Session 1', 'Session 2', 'Examen final'
  ];

  const sortedMatieres = Object.keys(groupedNotes).sort();
  const sortedGroupedNotes = {};
  sortedMatieres.forEach(matiere => {
    sortedGroupedNotes[matiere] = {};
    const periodesTriees = Object.keys(groupedNotes[matiere]).sort((a, b) => {
      const iA = ordrePeriodes.indexOf(a);
      const iB = ordrePeriodes.indexOf(b);
      if (iA === -1 && iB === -1) return a.localeCompare(b);
      if (iA === -1) return 1;
      if (iB === -1) return -1;
      return iA - iB;
    });
    periodesTriees.forEach(periode => {
      sortedGroupedNotes[matiere][periode] = groupedNotes[matiere][periode].sort(
        (a, b) => new Date(b.date_evaluation || b.updated_date) - new Date(a.date_evaluation || a.updated_date)
      );
    });
  });

  // Calcul stats
  const totalNotes = allNotes.length;
  const moyenne = totalNotes > 0
    ? (allNotes.reduce((sum, n) => sum + (n.note_sur > 0 ? (n.note / n.note_sur) * 20 : 0), 0) / totalNotes).toFixed(1)
    : null;

  if (isLoadingNotes) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#2d2d2d" }}>
          <p className="text-2xl font-bold text-white">{totalNotes}</p>
          <p className="text-xs text-gray-400">Évaluations</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#2d2d2d" }}>
          <p className="text-2xl font-bold" style={{ color: moyenne >= 10 ? "#4ade80" : "#f87171" }}>
            {moyenne ?? "–"}/20
          </p>
          <p className="text-xs text-gray-400">Moyenne générale</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#2d2d2d" }}>
          <p className="text-2xl font-bold text-white">{sortedMatieres.length}</p>
          <p className="text-xs text-gray-400">Matières</p>
        </div>
      </div>

      {/* Filtres */}
      <Card style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <BookOpen className="w-4 h-4" /> Filtrer
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={selectedMatiere} onValueChange={setSelectedMatiere}>
            <SelectTrigger>
              <SelectValue placeholder="Toutes les matières" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Toutes les matières</SelectItem>
              {matieres.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Rechercher une évaluation..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      {Object.keys(sortedGroupedNotes).length === 0 ? (
        <Card style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }}>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Aucune cote publiée pour cet enfant.</p>
          </CardContent>
        </Card>
      ) : (
        Object.keys(sortedGroupedNotes).map(matiere => (
          <Card key={matiere} style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }}>
            <CardHeader
              className={`bg-[#2d2d2d] py-3 cursor-pointer select-none ${collapsedMatieres[matiere] ? 'rounded-lg' : 'rounded-t-lg'}`}
              onClick={() => toggleMatiere(matiere)}
            >
              <CardTitle className="text-base font-bold text-white flex items-center justify-between">
                <span>{matiere}</span>
                {collapsedMatieres[matiere] ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </CardTitle>
            </CardHeader>
            {!collapsedMatieres[matiere] && (
              <CardContent className="p-3 space-y-3">
                {Object.keys(sortedGroupedNotes[matiere]).map(periode => (
                  <div key={periode}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: "#2d2d2d", color: "#60a5fa" }}>
                        {periode}
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                      <table className="min-w-full">
                        <thead>
                          <tr style={{ backgroundColor: "#2d2d2d" }}>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Évaluation</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedGroupedNotes[matiere][periode].map(note => {
                            const pct = note.note_sur > 0 ? (note.note / note.note_sur) : 0;
                            const couleur = pct >= 0.5 ? "#4ade80" : "#f87171";
                            return (
                              <tr key={note.id} className="border-t" style={{ borderColor: "#2d2d2d" }}>
                                <td className="px-4 py-2 text-sm text-white">
                                  {note.titre_evaluation}
                                  {note.type_evaluation && (
                                    <span className="ml-2 text-xs text-gray-500">({note.type_evaluation})</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-400">{note.date_evaluation || "–"}</td>
                                <td className="px-4 py-2 text-sm text-center font-bold" style={{ color: couleur }}>
                                  {note.note}/{note.note_sur}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

export default function NotesEnfants() {
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enfants, setEnfants] = useState([]);
  const [selectedEnfantIndex, setSelectedEnfantIndex] = useState(0);

  useEffect(() => {
    loadParent();
  }, []);

  const loadParent = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setParent(currentUser);

      // Source 1 : données synchronisées sur le profil
      const matriculesDepuisProfil = [];
      if (currentUser.enfant_matricule) {
        matriculesDepuisProfil.push({
          matricule: currentUser.enfant_matricule,
          nom: currentUser.enfant_nom || currentUser.enfant_matricule,
          etablissement_id: currentUser.etablissement_id,
          etablissement_nom: currentUser.etablissement_nom,
        });
      }

      // Source 2 : toutes les DemandeInscriptionParent approuvées (comparaison email insensible casse)
      const toutesDemandesParent = await dataService.query('DemandeInscriptionParent', { filters: [{  statut: "approuvee"  }],
  limit: 1000, offset: 0 });
      const emailLower = currentUser.email.toLowerCase();
      const demandesParent = toutesDemandesParent.filter(d => (d.email || "").toLowerCase() === emailLower);

      const enfantsDepuisDemandes = await Promise.all(
        demandesParent.map(async (demande) => {
          const demandesEnfant = await dataService.query('DemandeInscription', { filters: [{ 
            matricule: demande.matricule_enfant,
            statut: "approuvee",
           }],
  limit: 1000, offset: 0 });

          let etablissement_id = null;
          let faculte = null;
          let classe = null;

          let photo_url = null;
          if (demandesEnfant.length > 0) {
            const de = demandesEnfant[0];
            faculte = de.faculte || null;
            classe = de.classe || null;
            photo_url = de.photo_url || null;
            const etabs = await dataService.query('Etablissement', { filters: [{  nom: de.etablissement_nom  }],
  limit: 1000, offset: 0 });
            if (etabs.length > 0) etablissement_id = etabs[0].id;
            // Si pas de photo sur DemandeInscription, chercher via fonction backend
            if (!photo_url && de.email) {
              try {
                // TODO: Implement getStudentPhoto
                const res = null; // await functionService.getStudentPhoto({ email: de.email });
                photo_url = res?.data?.photo_url || null;
              } catch (e) { /* ignore */ }
            }
          }

          if (!etablissement_id && demande.etablissement_nom) {
            const etabs = await dataService.query('Etablissement', { filters: [{  nom: demande.etablissement_nom  }],
  limit: 1000, offset: 0 });
            if (etabs.length > 0) etablissement_id = etabs[0].id;
          }

          return {
            matricule: demande.matricule_enfant,
            nom: demande.nom_enfant,
            etablissement_nom: demande.etablissement_nom,
            etablissement_id,
            faculte,
            classe,
            photo_url,
            demande_id: demande.id,
          };
        })
      );

      // Source 3 : chercher via nom_pere dans DemandeInscription
      // Le nom complet du parent : "PRENOM NOM" ou "PRENOM NOM POST_NOM"
      const nomParent = currentUser.full_name || "";
      const nomFamille = (currentUser.data?.nom || currentUser.nom || "").trim().toUpperCase();
      const prenomParent = (currentUser.data?.prenom || currentUser.prenom || "").trim().toUpperCase();

      let enfantsViaFiliation = [];
      if (nomFamille || prenomParent) {
        const toutesDemandesEtudiant = await dataService.query('DemandeInscription', { filters: [{  statut: "approuvee"  }],
  limit: 1000, offset: 0 });
        const matchParNomPere = toutesDemandesEtudiant.filter(d => {
          const nomPere = (d.nom_pere || "").toUpperCase();
          return nomFamille && prenomParent
            ? nomPere.includes(nomFamille) && nomPere.includes(prenomParent)
            : nomFamille
            ? nomPere.includes(nomFamille)
            : false;
        });

        const etabsCache = {};
        enfantsViaFiliation = await Promise.all(
          matchParNomPere.map(async (de) => {
            let etablissement_id = null;
            if (etabsCache[de.etablissement_nom]) {
              etablissement_id = etabsCache[de.etablissement_nom];
            } else {
              const etabs = await dataService.query('Etablissement', { filters: [{  nom: de.etablissement_nom  }],
  limit: 1000, offset: 0 });
              if (etabs.length > 0) {
                etablissement_id = etabs[0].id;
                etabsCache[de.etablissement_nom] = etablissement_id;
              }
            }
            const fullNom = [de.prenom, de.nom, de.post_nom].filter(Boolean).join(" ");
            let photo_url_filiation = de.photo_url || null;
            if (!photo_url_filiation && de.email) {
              try {
                // TODO: Implement getStudentPhoto
                const res = null; // await functionService.getStudentPhoto({ email: de.email });
                photo_url_filiation = res?.data?.photo_url || null;
              } catch (e) { /* ignore */ }
            }
            return {
              matricule: de.matricule,
              nom: fullNom,
              etablissement_nom: de.etablissement_nom,
              etablissement_id,
              faculte: de.faculte || null,
              classe: de.classe || null,
              photo_url: photo_url_filiation,
              demande_id: `filiation_${de.id}`,
            };
          })
        );
      }

      // Fusion + déduplication par matricule (toutes sources)
      const tousEnfants = [...enfantsDepuisDemandes];
      [...matriculesDepuisProfil, ...enfantsViaFiliation].forEach(ep => {
        if (!tousEnfants.find(e => e.matricule === ep.matricule)) {
          tousEnfants.push({ ...ep, demande_id: ep.demande_id || `extra_${ep.matricule}` });
        }
      });

      setEnfants(tousEnfants.filter(e => e.etablissement_id && e.matricule));
    } catch (error) {
      console.error("Erreur chargement parent:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: "#4d4d4d" }}>
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#2d2d2d" }}>
          <GraduationCap className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Notes de mes Enfants</h1>
          <p className="text-gray-400 text-sm">Suivez les résultats scolaires de vos enfants</p>
        </div>
      </div>

      {enfants.length === 0 ? (
        <Card style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }}>
          <CardContent className="text-center py-16">
            <User className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-white font-semibold mb-2">Aucun enfant trouvé</p>
            <p className="text-gray-400 text-sm">
              Votre demande d'inscription en tant que parent doit être approuvée par l'établissement.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Colonne gauche : liste des enfants */}
          <div className="lg:w-72 flex-shrink-0 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 px-1">
              Mes enfants ({enfants.length})
            </h2>
            {enfants.map((enfant, i) => (
              <EnfantCard
                key={enfant.demande_id}
                enfant={enfant}
                selected={selectedEnfantIndex === i}
                onClick={() => setSelectedEnfantIndex(i)}
              />
            ))}
          </div>

          {/* Colonne droite : notes de l'enfant sélectionné */}
          <div className="flex-1 min-w-0">
            {enfants[selectedEnfantIndex] ? (
              <>
                {/* Bandeau enfant sélectionné */}
                <div className="rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3" style={{ backgroundColor: "#1a1a1a", border: "1px solid #60a5fa33" }}>
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    {enfants[selectedEnfantIndex].photo_url ? (
                      <img src={enfants[selectedEnfantIndex].photo_url} alt={enfants[selectedEnfantIndex].nom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: "#1e3a5f", color: "#60a5fa" }}>
                        {(enfants[selectedEnfantIndex].nom || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{enfants[selectedEnfantIndex].nom}</p>
                    <p className="text-gray-400 text-xs">{enfants[selectedEnfantIndex].etablissement_nom}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap ml-auto">
                    <Badge style={{ backgroundColor: "#2d2d2d", color: "#b0b0b0" }}>
                      <Hash className="w-3 h-3 mr-1" />{enfants[selectedEnfantIndex].matricule}
                    </Badge>
                    {enfants[selectedEnfantIndex].classe && (
                      <Badge style={{ backgroundColor: "#2d2d2d", color: "#b0b0b0" }}>
                        <School className="w-3 h-3 mr-1" />{enfants[selectedEnfantIndex].classe}
                      </Badge>
                    )}
                  </div>
                </div>
                <NotesView enfant={enfants[selectedEnfantIndex]} />
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
