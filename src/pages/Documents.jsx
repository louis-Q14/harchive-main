import React, { useState } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FichiersInscriptions from "@/components/documents/FichiersInscriptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Folder, FileText, ArrowLeft, Download, Trash2, CheckCircle2, XCircle, Eye, BookOpen, Calendar, Clock, User, GraduationCap, ClipboardList, FileCheck, Users, ChevronRight } from "lucide-react";
import RessourcePDFViewer from "@/components/planification/RessourcePDFViewer";
import QuestionnaireViewer from "@/components/planification/QuestionnaireViewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatUserName } from "@/components/utils/nameUtils";
import FichesFolderView from "@/components/documents/FichesFolderView";
import ListesParDate from "@/components/documents/ListesParDate";

const CG = { fontFamily: '"Century Gothic", CenturyGothic, AppleGothic, sans-serif' };

export default function Documents() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [viewingFiche, setViewingFiche] = useState(null);
  const [expandedFiches, setExpandedFiches] = useState({});
  const [viewingQuestionnairePDF, setViewingQuestionnairePDF] = useState(null);
  const [expandedFacultes, setExpandedFacultes] = useState(new Set());
  const [expandedDepartements, setExpandedDepartements] = useState(new Set());
  const [expandedClasses, setExpandedClasses] = useState(new Set());
  const [expandedListes, setExpandedListes] = useState(new Set());
  const queryClient = useQueryClient();

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les fiches transmises é  l'admin établissement (non masquées par l'admin)
  const { data: fiches = [] } = useQuery({
    queryKey: ['fiches-documents', user?.etablissement_id],
    queryFn: async () => {
      if (!user?.etablissement_id) return [];
      const allFiches = await dataService.query('FichePreparation', { filters: [{
        etablissement_id: user.etablissement_id,
        transmise_admin: true
      }],
  limit: 1000, offset: 0 });
      // Filtrer celles qui ne sont pas masquées par l'admin
      return allFiches.filter(f => !f.masque_par_admin);
    },
    enabled: !!user?.etablissement_id
  });

  // Charger les questionnaires transmis é  l'admin établissement (non masqués par l'admin)
  const { data: questionnaires = [] } = useQuery({
    queryKey: ['questionnaires-documents', user?.etablissement_id],
    queryFn: async () => {
      if (!user?.etablissement_id) return [];
      const allQuestionnaires = await dataService.query('QuestionnaireExamen', { filters: [{
        etablissement_id: user.etablissement_id,
        transmis_admin: true
      }],
  limit: 1000, offset: 0 });
      // Filtrer ceux qui ne sont pas masqués par l'admin
      return allQuestionnaires.filter(q => !q.masque_par_admin);
    },
    enabled: !!user?.etablissement_id
  });

  // Charger le calendrier académique pour enrichir les listes sans heures
  const { data: calendrier = [] } = useQuery({
    queryKey: ['calendrier-documents', user?.etablissement_id],
    queryFn: async () => {
      if (!user?.etablissement_id) return [];
      return await dataService.query('CalendrierAcademique', { filters: [{ etablissement_id: user.etablissement_id, type: 'cours' }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user?.etablissement_id
  });

  // Charger les listes de présence - double requête pour attraper toutes les listes
  // (certaines peuvent avoir établissement_id vide mais etablissement_nom correct)
  const { data: listesPresence = [] } = useQuery({
    queryKey: ['listes-presence', user?.etablissement_id, user?.etablissement_nom, calendrier.length],
    queryFn: async () => {
      if (!user?.etablissement_id && !user?.etablissement_nom) return [];

      const results = await Promise.allSettled([
        user?.etablissement_id
          ? dataService.query('ListePresence', { filters: [{ etablissement_id: user.etablissement_id }] })
          : Promise.resolve([]),
        user?.etablissement_nom
          ? dataService.query('ListePresence', { filters: [{ etablissement_nom: user.etablissement_nom }] })
          : Promise.resolve([]),
      ]);

      const byId = new Map();
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          r.value.forEach(liste => byId.set(liste.id, liste));
        }
      });

      const listes = Array.from(byId.values()).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

      // Enrichir les listes qui n'ont pas d'heures en cherchant dans le calendrier
      if (calendrier.length > 0) {
        return listes.map(liste => {
          if (liste.heure_debut && liste.heure_fin) return liste;

          const listeDate = liste.date;
          const listeDayOfWeek = listeDate ? new Date(listeDate).getDay() : null;

          // Chercher un créneau correspondant (classe + matière)
          const matching = calendrier.filter(c =>
            c.classe_id === liste.classe_id && c.matiere_id === liste.matiere_id
          );

          // 1. Correspondance exacte de date
          let found = matching.find(c => c.date_debut?.split('T')[0] === listeDate);

          // 2. Sinon, correspondance récurrente par jour de la semaine
          if (!found && listeDayOfWeek !== null) {
            found = matching.find(c => {
              if (!c.recurrence?.active) return false;
              const jours = c.recurrence?.jours_semaine || [];
              if (!jours.includes(listeDayOfWeek)) return false;
              const debutDate = c.date_debut?.split('T')[0];
              if (!debutDate || debutDate > listeDate) return false;
              const finDate = c.recurrence?.date_fin_recurrence;
              if (finDate && listeDate > finDate) return false;
              return true;
            });
          }

          if (found) {
            return { ...liste, heure_debut: found.heure_debut || liste.heure_debut, heure_fin: found.heure_fin || liste.heure_fin };
          }
          return liste;
        });
      }

      return listes;
    },
    enabled: !!(user?.etablissement_id || user?.etablissement_nom)
  });

  // Charger les professeurs pour afficher leurs vrais noms
  const { data: professeurs = [] } = useQuery({
    queryKey: ['professeurs-inscriptions', user?.etablissement_nom],
    queryFn: async () => {
      if (!user?.etablissement_nom) return [];
      return await dataService.query('DemandeInscription', { filters: [{
        type_utilisateur: 'professeur',
        statut: 'approuvee',
        etablissement_nom: user.etablissement_nom,
      }]});
    },
    enabled: !!user?.etablissement_nom
  });

  // Créer un mapping des noms de professeurs par ID
  const professeurNamesMap = React.useMemo(() => {
    const map = {};
    professeurs.forEach(prof => {
      map[prof.id] = formatUserName({ prenom: prof.prenom, nom: prof.nom, post_nom: prof.post_nom });
    });
    return map;
  }, [professeurs]);

  // Fonction pour obtenir le nom propre du professeur
  const getProfesseurName = (liste) => {
    if (liste.professeur_id && professeurNamesMap[liste.professeur_id]) {
      return professeurNamesMap[liste.professeur_id];
    }
    if (liste.professeur_nom && !liste.professeur_nom.includes('@')) {
      return liste.professeur_nom;
    }
    return 'Professeur';
  };

  const folders = [
    {
      id: "fiche-preparation",
      nom: "Fiche de préparation pédagogique",
      icon: "/assets/icons/d8ad0ef1d_folder3.png",
      description: "Fiches de préparation transmises par les professeurs"
    },
    {
      id: "questionnaire-examen",
      nom: "Questionnaire des examens et Interrogation",
      icon: "/assets/icons/d8ad0ef1d_folder3.png",
      description: "Questionnaires d'examens transmis par les professeurs"
    },
    {
      id: "liste-presence",
      nom: "Liste de présence",
      icon: "/assets/icons/d8ad0ef1d_folder3.png",
      description: "Listes de présence des étudiants"
    },
    {
      id: "fichier-inscriptions",
      nom: "Fichier des inscriptions",
      icon: "/assets/icons/d8ad0ef1d_folder3.png",
      description: "Dossiers des étudiants inscrits"
    },
    {
      id: "dossier-professeurs",
      nom: "Dossier des Professeurs",
      icon: "/assets/icons/d8ad0ef1d_folder3.png",
      description: "Dossiers des professeurs inscrits"
    }
  ];

  const getFichesForFolder = (folderId) => {
    if (folderId === "fiche-preparation") {
      return fiches;
    }
    if (folderId === "questionnaire-examen") {
      return questionnaires;
    }
    if (folderId === "liste-presence") {
      return listesPresence;
    }
    if (folderId === "fichier-inscriptions") {
      return []; // géré séparément par FichiersInscriptions
    }
    if (folderId === "dossier-professeurs") {
      return []; // géré séparément par FichiersInscriptions avec roleFilter
    }
    return [];
  };

  // Organiser les listes de présence par faculté/département
  // Pour chaque classe_nom, on détermine sa vraie faculté/département
  // en cherchant d'abord dans les listes qui ont ces champs remplis.
  const organizeListesPresence = () => {
    // Étape 1 : construire un mapping classe_nom → {faculte, departement} depuis les listes qui ont ces champs
    const classeMetaMap = {};
    listesPresence.forEach(liste => {
      const classe = liste.classe_nom;
      if (!classe) return;
      if (!classeMetaMap[classe] && liste.faculte) {
        classeMetaMap[classe] = {
          faculte: liste.faculte || 'Non spécifié',
          departement: liste.departement || 'Non spécifié'
        };
      }
    });

    // Étape 2 : grouper toutes les listes en utilisant le mapping pour les listes sans faculté
    const organized = {};
    listesPresence.forEach(liste => {
      const classe = liste.classe_nom;
      const meta = classeMetaMap[classe] || {};
      const faculte = liste.faculte || meta.faculte || 'Non spécifié';
      const departement = liste.departement || meta.departement || 'Non spécifié';
      
      if (!organized[faculte]) organized[faculte] = {};
      if (!organized[faculte][departement]) organized[faculte][departement] = {};
      if (!organized[faculte][departement][classe]) organized[faculte][departement][classe] = [];
      
      organized[faculte][departement][classe].push(liste);
    });
    
    return organized;
  };

  const toggleFicheExpand = (ficheId) => {
    setExpandedFiches(prev => ({
      ...prev,
      [ficheId]: !prev[ficheId]
    }));
  };

  const toggleFaculte = (faculte) => {
    const newExpanded = new Set(expandedFacultes);
    if (newExpanded.has(faculte)) {
      newExpanded.delete(faculte);
    } else {
      newExpanded.add(faculte);
    }
    setExpandedFacultes(newExpanded);
  };

  const toggleDepartement = (key) => {
    const newExpanded = new Set(expandedDepartements);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDepartements(newExpanded);
  };

  const toggleClasse = (key) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedClasses(newExpanded);
  };

  const toggleListe = (key) => {
    const newExpanded = new Set(expandedListes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedListes(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--ha-bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: 'var(--ha-bg)' }}>
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--ha-surface2)' }}>
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Documents</h1>
            <p className="text-gray-400 text-xs">{selectedFolder?.id === "fichier-inscriptions" ? "Dossiers des étudiants inscrits" : selectedFolder?.id === "dossier-professeurs" ? "Dossiers des professeurs inscrits" : "Bibliothèque de documents transmis par les professeurs"}</p>
          </div>
        </div>

        {!selectedFolder ? (
          // Vue des dossiers
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="flex flex-col items-center p-2 cursor-pointer"
                onClick={() => setSelectedFolder(folder)}
              >
                <div className="flex flex-col items-center rounded-lg px-2 py-1 hover:bg-[#3d3d3d] transition-colors">
                  <img src={folder.icon} alt={folder.nom} className="w-10 h-10 object-contain mb-1" />
                  <span className="text-white text-xs text-center font-medium line-clamp-2">{folder.nom}</span>
                </div>
              </div>
            ))}
          </div>
        ) : selectedFolder.id === "fichier-inscriptions" || selectedFolder.id === "dossier-professeurs" ? (
          <div>
            <Button
              variant="outline"
              onClick={() => setSelectedFolder(null)}
              className="mb-6 px-4 py-2 text-sm font-medium rounded-md"
              style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux dossiers
            </Button>
            <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }} className="mb-6">
              <CardHeader>
                <CardTitle className="text-white text-2xl">{selectedFolder.nom}</CardTitle>
              </CardHeader>
            </Card>
            <FichiersInscriptions user={user} onBack={() => setSelectedFolder(null)} roleFilter={selectedFolder.id === "dossier-professeurs" ? "professeur" : "etudiant"} />
          </div>
        ) : (
          // Vue du contenu du dossier
          <div>
            <Button
              variant="outline"
              onClick={() => setSelectedFolder(null)}
              className="mb-6 px-4 py-2 text-sm font-medium rounded-md"
              style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)'}}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux dossiers
            </Button>

            <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }} className="mb-6">
              <CardHeader>
                <CardTitle className="text-white text-2xl">{selectedFolder.nom}</CardTitle>
              </CardHeader>
            </Card>

            {getFichesForFolder(selectedFolder.id).length === 0 ? (
              <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">Aucun document</p>
                  <p className="text-sm text-gray-500">Les documents seront affichés ici une fois transmis</p>
                </CardContent>
              </Card>
            ) : selectedFolder.id === "liste-presence" ? (
              // Vue organisée pour les listes de présence
              <div className="space-y-2">
                {Object.entries(organizeListesPresence()).map(([faculte, departements]) => {
                  const isFaculteExpanded = expandedFacultes.has(faculte);
                  return (
                    <div key={faculte}>
                      <button
                        onClick={() => toggleFaculte(faculte)}
                        className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-[#5a5a5a] transition-colors"
                        style={{ background: '#474747', ...CG }}
                      >
                        <ChevronRight className="w-5 h-5 text-gray-400" style={{ transform: isFaculteExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                        <BookOpen className="w-5 h-5 text-blue-400" />
                        <span className="font-semibold text-white text-base">{faculte}</span>
                      </button>
                      {isFaculteExpanded && (
                        <div className="space-y-3" style={{ padding: '10px 12px' }}>
                          {Object.entries(departements).map(([departement, classes]) => {
                            const departementKey = `${faculte}-${departement}`;
                            const isDepartementExpanded = expandedDepartements.has(departementKey);
                            return (
                              <div key={departement} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
                                <button
                                  onClick={() => toggleDepartement(departementKey)}
                                  style={{ width: '100%', background: 'rgba(255,255,255,0.07)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', ...CG }}
                                >
                                  <ChevronRight style={{ width: 14, height: 14, color: '#9ca3af', transform: isDepartementExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                  <GraduationCap style={{ width: 14, height: 14, color: '#c084fc' }} />
                                  <span style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{departement}</span>
                                </button>
                                {isDepartementExpanded && (
                                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {Object.entries(classes).map(([classe, listes]) => {
                                      const classeKey = `${faculte}-${departement}-${classe}`;
                                      const isClasseExpanded = expandedClasses.has(classeKey);
                                      return (
                                        <div key={classe} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' }}>
                                          <button
                                            onClick={() => toggleClasse(classeKey)}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', ...CG }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                              <ChevronRight style={{ width: 12, height: 12, color: '#9ca3af', transform: isClasseExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                              <Users style={{ width: 12, height: 12, color: '#4ade80' }} />
                                              <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{classe}</span>
                                            </div>
                                            <span style={{ background: '#16a34a', color: '#fff', borderRadius: 9999, padding: '1px 8px', fontSize: 11, ...CG }}>{listes.length} liste{listes.length > 1 ? 's' : ''}</span>
                                          </button>
                                          {isClasseExpanded && (() => {
                                            const listesByDate = {};
                                            listes.forEach(liste => {
                                              const dateKey = liste.date || 'unknown';
                                              if (!listesByDate[dateKey]) listesByDate[dateKey] = [];
                                              listesByDate[dateKey].push(liste);
                                            });
                                            const sortedDates = Object.keys(listesByDate).sort((a, b) => a.localeCompare(b));
                                            const defaultTab = sortedDates[0] || '';
                                            return (
                                              <div style={{ padding: '10px 8px' }}>
                                                <Tabs defaultValue={defaultTab}>
                                                  <TabsList style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: 'rgba(255,255,255,0.06)', padding: 6, borderRadius: 8, height: 'auto', marginBottom: 10 }}>
                                                    {sortedDates.map(dateKey => (
                                                      <TabsTrigger
                                                        key={dateKey}
                                                        value={dateKey}
                                                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, color: '#d1d5db', ...CG }}
                                                      >
                                                        <Calendar style={{ width: 10, height: 10, marginRight: 4, color: '#fb923c' }} />
                                                        {dateKey !== 'unknown' ? format(new Date(dateKey), 'EEEE dd/MM/yyyy', { locale: fr }) : 'Sans date'}
                                                        <span style={{ marginLeft: 5, background: '#374151', borderRadius: 9999, padding: '0 5px', fontSize: 10 }}>{listesByDate[dateKey].length}</span>
                                                      </TabsTrigger>
                                                    ))}
                                                  </TabsList>
                                                  {sortedDates.map(dateKey => (
                                                    <TabsContent key={dateKey} value={dateKey} style={{ marginTop: 0 }}>
                                                      <ListesParDate
                                                        listes={listesByDate[dateKey]}
                                                        getProfesseurName={getProfesseurName}
                                                        queryClient={queryClient}
                                                        CG={CG}
                                                      />
                                                    </TabsContent>
                                                  ))}
                                                </Tabs>
                                              </div>
                                            );
                                          })()}
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
                    </div>
                  );
                })}
              </div>
                ) : selectedFolder.id === "questionnaire-examen" ? (
              <div className="space-y-3">
                {getFichesForFolder(selectedFolder.id).map((questionnaire) => (
                  <Card 
                    key={questionnaire.id} 
                    style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }} 
                    className="hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => questionnaire.fichier_url && setViewingQuestionnairePDF(questionnaire)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {questionnaire.type_evaluation === 'examen' ? (
                            <img 
                              src="/assets/icons/47dbdd7fa_file.png" 
                              alt="Examen" 
                              className="w-12 h-12"
                            />
                          ) : (
                            <img 
                              src="/assets/icons/7de2b8aae_google-docs.png" 
                              alt="Interrogation" 
                              className="w-12 h-12"
                            />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base mb-2 text-white">
                            {questionnaire.titre}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                              #{questionnaire.numero_identification}
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-300">
                              <BookOpen className="w-3 h-3 text-blue-400" />
                              {questionnaire.type_evaluation}
                            </span>
                            {questionnaire.matiere_nom && (
                              <span className="flex items-center gap-1.5 text-gray-300">
                                <GraduationCap className="w-3 h-3 text-purple-400" />
                                {questionnaire.matiere_nom}
                              </span>
                            )}
                            {questionnaire.classe_nom && (
                              <span className="flex items-center gap-1.5 text-gray-300">
                                <Users className="w-3 h-3 text-green-400" />
                                {questionnaire.classe_nom}
                              </span>
                            )}
                            {questionnaire.date_examen && (
                              <span className="flex items-center gap-1.5 text-gray-300">
                                <Calendar className="w-3 h-3 text-orange-400" />
                                {format(new Date(questionnaire.date_examen), 'dd/MM/yyyy')}
                              </span>
                            )}
                            {questionnaire.duree && (
                              <span className="flex items-center gap-1.5 text-gray-300">
                                <Clock className="w-3 h-3 text-yellow-400" />
                                {questionnaire.duree}
                              </span>
                            )}
                            {questionnaire.professeur_nom && (
                              <span className="flex items-center gap-1.5 text-gray-300">
                                <User className="w-3 h-3 text-pink-400" />
                                {questionnaire.professeur_nom}
                              </span>
                            )}
                            {questionnaire.bareme_total && (
                              <span className="flex items-center gap-1.5 text-gray-300">
                                <span className="text-cyan-400">🎯</span>
                                {questionnaire.bareme_total} pts
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            onClick={() => setViewingQuestionnairePDF(questionnaire)}
                            className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white h-9 w-9">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Approuver ce questionnaire ?')) {
                                await dataService.update('QuestionnaireExamen', questionnaire.id, { approuve_admin: true });
                                
                                await dataService.create('Notification', {
                                  destinataire_id: questionnaire.professeur_id,
                                  type: "systeme",
                                  titre: "Questionnaire approuvé",
                                  contenu: `Votre questionnaire "${questionnaire.titre}" a été approuvé par l'administration.`,
                                  emetteur_id: user.id,
                                  emetteur_nom: user.full_name
                                });
                                
                                queryClient.invalidateQueries({ queryKey: ['questionnaires-documents'] });
                                alert('Questionnaire approuvé et notification envoyée');
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 border-green-600 text-white h-9 w-9">
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Voulez-vous supprimer ce document de votre vue ?')) {
                                await dataService.update('QuestionnaireExamen', questionnaire.id, { masque_par_admin: true });
                                queryClient.invalidateQueries({ queryKey: ['questionnaires-documents'] });
                                alert('Document masqué de votre vue');
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 border-red-600 text-white h-9 w-9">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <FichesFolderView
                fiches={getFichesForFolder(selectedFolder.id)}
                user={user}
                queryClient={queryClient}
                createPageUrl={createPageUrl}
              />
            )}
          </div>
        )}
      </div>

      {/* Dialog détail fiche */}
      {viewingFiche && (
        <Dialog open={!!viewingFiche} onOpenChange={() => setViewingFiche(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--ha-surface)' }}>
            <DialogHeader>
              <DialogTitle className="text-white text-xl">
                {viewingFiche.titre_seance}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Numéro ID</p>
                  <p className="text-white font-semibold">{viewingFiche.numero_identification}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Date</p>
                  <p className="text-white font-semibold">{format(new Date(viewingFiche.date_seance), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Professeur</p>
                  <p className="text-white font-semibold">{viewingFiche.professeur_nom}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Module</p>
                  <p className="text-white font-semibold">{viewingFiche.module || '-'}</p>
                </div>
              </div>

              <div className="border-t pt-4" style={{ borderColor: 'var(--ha-border)' }}>
                <p className="text-gray-400 text-sm mb-2">Objectifs</p>
                <p className="text-gray-300">{viewingFiche.objectifs_seance || '-'}</p>
              </div>

              <div className="border-t pt-4" style={{ borderColor: 'var(--ha-border)' }}>
                <p className="text-gray-400 text-sm mb-2">Remarques</p>
                <p className="text-gray-300">{viewingFiche.remarques || '-'}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Visionneuse Questionnaires */}
      <QuestionnaireViewer
        questionnaire={viewingQuestionnairePDF}
        isOpen={!!viewingQuestionnairePDF}
        onClose={() => setViewingQuestionnairePDF(null)}
        userRole={user?.role_archive}
        onApprove={async (q) => {
          if (!confirm('Approuver ce questionnaire ?')) return;
          await dataService.update('QuestionnaireExamen', q.id, { approuve_admin: true, date_approbation: new Date().toLocaleDateString('fr-FR') });
          if (q.professeur_id) {
            await dataService.create('Notification', {
              destinataire_id: q.professeur_id, type: 'systeme',
              titre: 'Questionnaire approuvé',
              contenu: `Votre questionnaire "${q.titre}" a été approuvé par l'administration.`,
              emetteur_id: user.id, emetteur_nom: user.full_name
            });
          }
          queryClient.invalidateQueries({ queryKey: ['questionnaires-documents'] });
          setViewingQuestionnairePDF(null);
          alert('Questionnaire approuvé');
        }}
        onReject={async (q) => {
          const motif = prompt('Motif du rejet (optionnel):');
          await dataService.update('QuestionnaireExamen', q.id, { transmis_admin: false, approuve_admin: false });
          if (q.professeur_id) {
            await dataService.create('Notification', {
              destinataire_id: q.professeur_id, type: 'systeme',
              titre: 'Questionnaire rejeté',
              contenu: `Votre questionnaire "${q.titre}" a été rejeté.${motif ? ' Motif: ' + motif : ''}`,
              emetteur_id: user.id, emetteur_nom: user.full_name
            });
          }
          queryClient.invalidateQueries({ queryKey: ['questionnaires-documents'] });
          setViewingQuestionnairePDF(null);
          alert('Questionnaire rejeté');
        }}
      />
    </div>
  );
}

// Badge component simple
function Badge({ children, className }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}
