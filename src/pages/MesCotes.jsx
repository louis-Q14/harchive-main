import React, { useState, useEffect, useMemo } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, BookOpen, ChevronDown, ChevronRight, School } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function MesCotes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatiere, setSelectedMatiere] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();

      // Si les données sont déjé  synchronisées sur le profil, on les utilise directement
      if (currentUser.etablissement_id && currentUser.matricule) {
        setUser(currentUser);
        setLoading(false);
        return;
      }

      // Sinon, chercher dans DemandeInscription
      const demandes = await dataService.query('DemandeInscription', { filters: [{ 
        email: currentUser.email, 
        statut: 'approuvee'
      }],
  limit: 1000, offset: 0 });
      
      if (demandes.length > 0) {
        const demande = demandes[0];
        currentUser.role_archive = demande.type_utilisateur;
        currentUser.matricule = currentUser.matricule || demande.matricule;
        currentUser.faculte = currentUser.faculte || (demande.faculte ? demande.faculte.split(' - ')[0] : '');
        
        if (!currentUser.etablissement_id && demande.etablissement_nom) {
          const etablissements = await dataService.query('Etablissement', { filters: [{ 
            nom: demande.etablissement_nom 
          }],
  limit: 1000, offset: 0 });
          if (etablissements.length > 0) {
            currentUser.etablissement_id = etablissements[0].id;
          }
        }
      }

      setUser(currentUser);
    } catch (error) {
      console.error("Erreur chargement utilisateur:", error);
    } finally {
      setLoading(false);
    }
  };

  const {
    data: allNotes = [],
    isLoading: isLoadingNotes,
    error: notesError,
  } = useQuery({
    queryKey: ["mesCotes", user?.id, user?.etablissement_id, user?.matricule],
    queryFn: async () => {
      if (!user?.etablissement_id) {
        console.log("❌ Pas d'établissement_id");
        return [];
      }

      if (!user?.matricule) {
        console.log("❌ Pas de matricule");
        return [];
      }

      console.log("🔍 Recherche des notes pour:", {
        etablissement_id: user.etablissement_id,
        matricule: user.matricule
      });

      // Chercher uniquement les notes publiées
      const notesPubliees = await dataService.query('NoteEtudiant', { filters: [{
        etablissement_id: user.etablissement_id,
        etudiant_matricule: user.matricule,
        statut: 'publié'
      }],
  limit: 10000, offset: 0 });

      console.log("✅ Notes publiées:", notesPubliees.length);

      // Chercher aussi dans les archives publiées
      const notesArchive = await dataService.query('NoteArchive', { filters: [{
        etablissement_id: user.etablissement_id,
        etudiant_matricule: user.matricule,
        statut: 'publié'
      }],
  limit: 10000, offset: 0 });

      console.log("📦 Notes archivées:", notesArchive.length);

      // Combiner
      const toutesNotes = [...notesPubliees, ...notesArchive];
      
      // Dédupliquer
      const combinedNotes = {};
      toutesNotes.forEach(note => {
          const key = `${note.matiere_nom}-${note.periode}-${note.titre_evaluation}`;
          if (!combinedNotes[key]) {
              combinedNotes[key] = note;
          }
      });
      
      return Object.values(combinedNotes);

    },
    enabled: !!user && !!user.etablissement_id && !!user.matricule && user.role_archive === "etudiant",
  });

  // Récupérer les matières de l'établissement filtrées par la faculté de l'étudiant
  const { data: matieresEtablissement = [] } = useQuery({
    queryKey: ["matieres", user?.etablissement_id, user?.faculte],
    queryFn: async () => {
      if (!user?.etablissement_id) return [];
      const matieres = await dataService.query('Matiere', { filters: [{
        etablissement_id: user.etablissement_id
      }],
  limit: 1000, offset: 0 });
      
      // Filtrer par faculté de l'étudiant
      if (user.faculte) {
        return matieres.filter(m => m.faculte === user.faculte);
      }
      
      // Si pas de faculté, filtrer par niveau de classe si disponible
      if (user.classe_niveau) {
        return matieres.filter(m => {
          const nivs = Array.isArray(m.niveaux) ? m.niveaux : [];
          return nivs.includes(user.classe_niveau);
        });
      }
      
      return matieres;
    },
    enabled: !!user?.etablissement_id,
  });

  const matieres = matieresEtablissement.map(m => m.nom).sort();

  const filteredNotes = allNotes.filter(
    (note) =>
      (!selectedMatiere || note.matiere_nom === selectedMatiere) &&
      ((note.titre_evaluation || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
       (note.periode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
       (note.matiere_nom || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedNotes = filteredNotes.reduce((acc, note) => {
    const matiere = note.matiere_nom || "Sans matière";
    const periode = note.periode || "Sans période";

    if (!acc[matiere]) {
      acc[matiere] = {};
    }
    if (!acc[matiere][periode]) {
      acc[matiere][periode] = [];
    }
    acc[matiere][periode].push(note);
    return acc;
  }, {});

  const sortedMatieres = Object.keys(groupedNotes).sort();
  const sortedGroupedNotes = {};
  sortedMatieres.forEach((matiere) => {
    sortedGroupedNotes[matiere] = {};
    const ordrePeriodes = [
      '1er trimestre', '2ème trimestre', '3ème trimestre',
      '1er semestre', '2ème semestre',
      'Session 1', 'Session 2', 'Examen final'
    ];
    const periodesTriees = Object.keys(groupedNotes[matiere]).sort((a, b) => {
      const indexA = ordrePeriodes.indexOf(a);
      const indexB = ordrePeriodes.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    periodesTriees.forEach((periode) => {
      sortedGroupedNotes[matiere][periode] = groupedNotes[matiere][periode].sort((a,b) => 
        new Date(b.date_evaluation || b.updated_date || b.created_date).getTime() - new Date(a.date_evaluation || a.updated_date || a.created_date).getTime()
      );
    });
  });

  const [collapsedMatieres, setCollapsedMatieres] = useState({});
  const toggleMatiere = (matiere) => {
    setCollapsedMatieres(prev => ({ ...prev, [matiere]: !prev[matiere] }));
  };

  if (loading || isLoadingNotes) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (notesError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-red-100 border-red-400 text-red-700">
          <CardHeader>
            <CardTitle>Erreur de chargement</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Une erreur est survenue lors du chargement de vos notes. Veuillez réessayer plus tard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Accès Restreint</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Cette page est réservée aux étudiants connectés.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="w-full px-4 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <img 
            src="/assets/icons/8d37e796f_note.png"
            alt="Mes Cotes"
            className="w-12 h-12"
          />
          <div>
            <h1 className="text-3xl font-bold text-white">Mes Cotes</h1>
            <p className="text-gray-300">Consultez vos résultats d'évaluation par matière et période.</p>
          </div>
        </div>

        <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <BookOpen className="w-5 h-5" />
              Filtrer et Rechercher
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="matiere-select" className="block text-sm font-medium mb-1 text-white">
                Matière
              </label>
              <Select value={selectedMatiere} onValueChange={setSelectedMatiere}>
                <SelectTrigger id="matiere-select">
                  <SelectValue placeholder="Toutes les matières" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Toutes les matières</SelectItem>
                  {matieres.map((matiere) => (
                    <SelectItem key={matiere} value={matiere}>
                      {matiere}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="search-input" className="block text-sm font-medium mb-1 text-white">
                Rechercher une évaluation
              </label>
              <Input
                id="search-input"
                placeholder="Rechercher par titre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {Object.keys(sortedGroupedNotes).length === 0 ? (
          <Card style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}}>
            <CardHeader>
              <CardTitle className="text-white">Aucune cote disponible</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">
                Aucune de vos cotes n'a encore été publiée. Veuillez vérifier
                plus tard ou contacter votre administration.
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.keys(sortedGroupedNotes).map((matiere) => (
            <Card key={matiere} style={{backgroundColor: '#3d3d3d', borderColor: '#2d2d2d'}} className="mb-3">
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
                <CardContent className="p-4 space-y-4">
                  {Object.keys(sortedGroupedNotes[matiere]).map((periode) => (
                    <div key={periode} className="border-b border-gray-700 pb-4 last:border-b-0">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Période: {periode}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-[#2d2d2d]">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Évaluation
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Note
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedGroupedNotes[matiere][periode].map((note) => (
                              <tr key={note.id} className="border-t border-[#2d2d2d] hover:bg-[#474747]">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                                  {note.titre_evaluation} ({note.type_evaluation})
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  {note.date_evaluation || "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-white">
                                  {note.note}/{note.note_sur}
                                </td>
                              </tr>
                            ))}
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
    </div>
  );
}
