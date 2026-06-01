import React, { useState, useEffect, useMemo } from "react";
import { authService, dataService } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DraggableDialog, DraggableDialogBody } from "@/components/ui/DraggableDialog";
import {
  School, Search, Loader2, Building, ChevronRight, ChevronDown, BookOpen, User,
  GraduationCap, Users, MapPin, Phone, Mail
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

export default function EtablissementsMinisteriel() {
  const [user, setUser] = useState(/** @type {any} */ (null));
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Expansion state
  const [expandedEtablissements, setExpandedEtablissements] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [expandedFacultes, setExpandedFacultes] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [expandedDepartements, setExpandedDepartements] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [expandedOrientations, setExpandedOrientations] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [expandedOptions, setExpandedOptions] = useState(/** @type {Record<string, boolean>} */ ({}));

  // Dialog pour liste étudiants d'une promotion
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(/** @type {any} */ (null));
  const [selectedEtabNom, setSelectedEtabNom] = useState("");

  useEffect(() => { loadUser(); }, []);

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

  const provinceAffectation = user?.province_affectation || "";

  // --- DATA QUERIES ---
  const { data: etablissementsAgrees = [], isLoading: loadingAgrees } = useQuery({
    queryKey: ['etablissements-agrees'],
    queryFn: () => dataService.query('EtablissementAgree', { limit: 10000 }),
  });
  const { data: etablissements = [] } = useQuery({
    queryKey: ['etablissements'],
    queryFn: () => dataService.query('Etablissement', { limit: 10000 }),
  });
  const { data: demandesEtablissements = [] } = useQuery({
    queryKey: ['demandes-etablissements'],
    queryFn: () => dataService.query('DemandeInscriptionEtablissement', { filters: [{ statut: "approuvee" }] }),
  });
  // Structure académique (all establishments)
  const { data: allFacultes = [] } = useQuery({
    queryKey: ['all-facultes'],
    queryFn: () => dataService.query('EtablissementFaculte', { limit: 10000 }),
  });
  const { data: allDepartements = [] } = useQuery({
    queryKey: ['all-departements'],
    queryFn: () => dataService.query('EtablissementDepartement', { limit: 10000 }),
  });
  const { data: allOrientations = [] } = useQuery({
    queryKey: ['all-orientations'],
    queryFn: () => dataService.query('EtablissementOrientation', { limit: 10000 }),
  });
  const { data: allOptions = [] } = useQuery({
    queryKey: ['all-options'],
    queryFn: () => dataService.query('EtablissementOption', { limit: 10000 }),
  });
  const { data: allPromotions = [] } = useQuery({
    queryKey: ['all-promotions'],
    queryFn: () => dataService.query('Promotion', { limit: 10000 }),
  });
  // Utilisateurs approuvés (étudiants + profs)
  const { data: demandesUtilisateurs = [] } = useQuery({
    queryKey: ['demandes-utilisateurs'],
    queryFn: () => dataService.query('DemandeInscription', { filters: [{ statut: "approuvee" }] }),
  });

  // --- FILTER BY PROVINCE ---
  const provinceAgrees = etablissementsAgrees.filter(e =>
    provinceAffectation && e.province?.toLowerCase() === provinceAffectation.toLowerCase()
  );

  // --- BUILD HIERARCHY ---
  const hierarchie = useMemo(() => provinceAgrees.map(agree => {
    const inscrit = etablissements.find(e =>
      e.code === agree.sigle ||
      e.name?.toUpperCase()?.includes(agree.denomination?.toUpperCase()?.substring(0, 20)) ||
      agree.denomination?.toUpperCase()?.includes(e.name?.toUpperCase()?.substring(0, 20))
    );
    const demandeEtab = demandesEtablissements.find(d =>
      d.code_etablissement === agree.sigle ||
      d.nom_etablissement?.toUpperCase()?.includes(agree.denomination?.toUpperCase()?.substring(0, 20)) ||
      agree.denomination?.toUpperCase()?.includes(d.nom_etablissement?.toUpperCase()?.substring(0, 20))
    );

    const etabId = inscrit?.id;
    const etabNom = inscrit?.name || inscrit?.nom || agree.denomination;

    // Structure académique pour cet établissement
    const facultes = etabId ? allFacultes.filter(f => f.etablissement_id === etabId) : [];
    const departements = etabId ? allDepartements.filter(d => d.etablissement_id === etabId) : [];
    const orientations = etabId ? allOrientations.filter(o => o.etablissement_id === etabId) : [];
    const opts = etabId ? allOptions.filter(o => o.etablissement_id === etabId) : [];
    const promotions = etabId ? allPromotions.filter(p => p.etablissement_id === etabId) : [];

    // Utilisateurs inscrits
    const utilisateurs = demandesUtilisateurs.filter(d => d.etablissement_nom === etabNom);
    const totalProfs = utilisateurs.filter(u => u.type_utilisateur === "professeur").length;
    const totalEtuds = utilisateurs.filter(u => u.type_utilisateur !== "professeur").length;

    return {
      agree, inscrit, demandeEtab, etabId, etabNom,
      facultes, departements, orientations, options: opts, promotions,
      totalProfs, totalEtuds,
    };
  }), [provinceAgrees, etablissements, demandesEtablissements, allFacultes, allDepartements, allOrientations, allOptions, allPromotions, demandesUtilisateurs]);

  // --- SEARCH ---
  const filteredHierarchie = hierarchie.filter(h => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.agree.sigle?.toLowerCase().includes(q) ||
      h.agree.denomination?.toLowerCase().includes(q) ||
      h.agree.territoire?.toLowerCase().includes(q)
    );
  });

  // --- STATS ---
  const totalEtab = provinceAgrees.length;
  const totalProfs = hierarchie.reduce((s, h) => s + h.totalProfs, 0);
  const totalEtuds = hierarchie.reduce((s, h) => s + h.totalEtuds, 0);
  const totalFacultes = hierarchie.reduce((s, h) => s + h.facultes.length, 0);

  // --- TOGGLE HELPERS ---
  const toggle = (/** @type {Function} */ setter, /** @type {string|number} */ id) => setter((/** @type {Record<string, boolean>} */ prev) => ({ ...prev, [id]: !prev[id] }));

  // --- OPEN STUDENTS DIALOG ---
  const openStudentsDialog = (/** @type {any} */ promotion, /** @type {string} */ etabNom) => {
    setSelectedPromotion(promotion);
    setSelectedEtabNom(etabNom);
    setStudentsDialogOpen(true);
  };

  // Students for the selected promotion
  const promotionStudents = useMemo(() => {
    if (!selectedPromotion || !selectedEtabNom) return [];
    return demandesUtilisateurs.filter(d =>
      d.etablissement_nom === selectedEtabNom &&
      d.classe === selectedPromotion.nom &&
      d.type_utilisateur !== "professeur"
    );
  }, [selectedPromotion, selectedEtabNom, demandesUtilisateurs]);

  // --- COUNT REAL STUDENTS FOR A PROMOTION ---
  const countRealStudents = (/** @type {string} */ promotionNom, /** @type {string} */ etabNom) => {
    return demandesUtilisateurs.filter(d =>
      d.etablissement_nom === etabNom &&
      d.classe === promotionNom &&
      d.type_utilisateur !== "professeur"
    ).length;
  };

  // --- RENDER PROMOTION ITEM ---
  const renderPromotion = (/** @type {any} */ salle, /** @type {string} */ etabNom) => {
    const realCount = countRealStudents(salle.nom, etabNom);
    return (
      <button
        key={salle.id}
        onClick={() => openStudentsDialog(salle, etabNom)}
        className="w-full flex items-center gap-2 p-2 rounded hover:bg-[#4d4d4d] transition-colors cursor-pointer"
        style={{ backgroundColor: '#3d3d3d' }}
      >
        <Users className="w-4 h-4 text-pink-400" />
        <span className="text-white text-sm">{salle.nom}</span>
        <Badge variant="outline" className="text-xs ml-auto">{realCount} / {salle.capacite}</Badge>
      </button>
    );
  };

  if (loading || loadingAgrees) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!provinceAffectation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md bg-white border-gray-200">
          <CardContent className="pt-6 text-center">
            <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Province non assignée</h2>
            <p className="text-gray-600">
              Votre compte n'a pas encore de province d'affectation. Veuillez contacter le Super Administrateur.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <School className="w-8 h-8 text-yellow-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800" style={CG}>Établissements — {provinceAffectation}</h1>
            <p className="text-gray-600" style={CG}>Vue hiérarchique des établissements, structure académique et étudiants inscrits</p>
          </div>
        </div>

        {/* Badge info */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-semibold mb-1" style={CG}>
                  Admin Ministériel — Province : {provinceAffectation}
                </p>
                <p className="text-xs text-yellow-700" style={CG}>
                  Accès en lecture à tous les établissements agréés de votre province. Cliquez sur une promotion pour voir la liste des étudiants.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1" style={CG}>Établissements</p>
                  <p className="text-3xl font-bold text-gray-800">{totalEtab}</p>
                </div>
                <Building className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1" style={CG}>Professeurs</p>
                  <p className="text-3xl font-bold text-gray-800">{totalProfs}</p>
                </div>
                <User className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1" style={CG}>Étudiants</p>
                  <p className="text-3xl font-bold text-gray-800">{totalEtuds}</p>
                </div>
                <GraduationCap className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1" style={CG}>Facultés</p>
                  <p className="text-3xl font-bold text-gray-800">{totalFacultes}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recherche */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher un établissement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Vue hiérarchique */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-800" style={CG}>
              Hiérarchie Établissements ({filteredHierarchie.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {filteredHierarchie.length === 0 ? (
              <div className="text-center py-12">
                <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2" style={CG}>Aucun établissement trouvé</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHierarchie.map((h) => {
                  const etabKey = h.agree.id;
                  const isExpanded = expandedEtablissements[etabKey];
                  const displayName = h.agree.denomination || h.agree.sigle;
                  const hasStructure = h.facultes.length > 0 || h.departements.length > 0 || h.promotions.length > 0;

                  return (
                    <div key={etabKey} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* En-tête Établissement */}
                      <div className="w-full bg-gray-100 p-4 flex items-center justify-between">
                        <button
                          onClick={() => toggle(setExpandedEtablissements, etabKey)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
                          <Building className="w-5 h-5 text-gray-700" />
                          <div>
                            <h3 className="font-bold text-gray-800" style={CG}>{displayName}</h3>
                            <p className="text-sm text-gray-600" style={CG}>
                              {h.facultes.length} faculté{h.facultes.length > 1 ? 's' : ''} • {h.totalProfs} prof • {h.totalEtuds} étud
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-600 text-white">Code: {h.agree.sigle}</Badge>
                          <Badge className={h.agree.statut === "Privé" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                            {h.agree.statut}
                          </Badge>
                        </div>
                      </div>

                      {/* Contenu développable */}
                      {isExpanded && (
                        <div className="border-t border-gray-200">
                          {/* Informations établissement */}
                          <div className="bg-[#333333] p-4 border-b border-gray-200">
                            <div className="space-y-4">
                              <div>
                                <h5 className="font-semibold text-white mb-2" style={CG}>Informations de l'établissement</h5>
                                <div className="grid md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-400" style={CG}>Territoire</p>
                                    <p className="font-semibold text-white" style={CG}>{h.agree.territoire || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400" style={CG}>Province</p>
                                    <p className="font-semibold text-white" style={CG}>{h.agree.province || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400" style={CG}>État</p>
                                    <p className="font-semibold text-white" style={CG}>{h.agree.etat || "—"}</p>
                                  </div>
                                </div>
                              </div>
                              {(h.demandeEtab || h.inscrit) && (
                                <div>
                                  <h5 className="font-semibold text-white mb-2" style={CG}>Contact</h5>
                                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                                    {(h.demandeEtab?.telephone || h.inscrit?.telephone) && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-white" style={CG}>{h.demandeEtab?.telephone || h.inscrit?.telephone}</span>
                                      </div>
                                    )}
                                    {(h.demandeEtab?.email_etablissement || h.inscrit?.email) && (
                                      <div className="flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-white" style={CG}>{h.demandeEtab?.email_etablissement || h.inscrit?.email}</span>
                                      </div>
                                    )}
                                    {(h.demandeEtab?.adresse || h.inscrit?.address) && (
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-white" style={CG}>{h.demandeEtab?.adresse || h.inscrit?.address}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {h.inscrit && (h.inscrit.admin_nom || h.inscrit.admin_prenom) && (
                                <div>
                                  <h5 className="font-semibold text-white mb-2" style={CG}>Administrateur</h5>
                                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-400" style={CG}>Nom complet</p>
                                      <p className="font-semibold text-white" style={CG}>
                                        {h.inscrit.admin_prenom} {h.inscrit.admin_post_nom} {h.inscrit.admin_nom}
                                      </p>
                                    </div>
                                    {h.inscrit.admin_email && (
                                      <div>
                                        <p className="text-gray-400" style={CG}>Email</p>
                                        <p className="font-semibold text-white" style={CG}>{h.inscrit.admin_email}</p>
                                      </div>
                                    )}
                                    {h.inscrit.admin_telephone && (
                                      <div>
                                        <p className="text-gray-400" style={CG}>Téléphone</p>
                                        <p className="font-semibold text-white" style={CG}>{h.inscrit.admin_telephone}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Structure académique */}
                          {hasStructure ? (
                            <div className="p-4 space-y-2">
                              <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2" style={CG}>
                                <GraduationCap className="w-5 h-5 text-purple-600" />
                                Structure Académique
                              </h5>

                              {/* Facultés */}
                              {h.facultes.map((faculte) => {
                                const facKey = `${etabKey}-fac-${faculte.id}`;
                                const faculteDepts = h.departements.filter(d => d.faculte_id === faculte.id);
                                const facPromotions = h.promotions.filter(p => p.faculte_id === faculte.id && !p.departement_id && !p.orientation_id && !p.option_id);

                                return (
                                  <div key={facKey} className="border border-[#e0e0e0] rounded-lg p-3 bg-gray-50">
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => toggle(setExpandedFacultes, facKey)} className="text-gray-700">
                                        {expandedFacultes[facKey] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                      </button>
                                      <Badge className="bg-purple-600 text-white">Faculté</Badge>
                                      <span className="text-gray-800 font-semibold" style={CG}>{faculte.nom}</span>
                                      {faculte.code && <span className="text-gray-500 text-sm">({faculte.code})</span>}
                                    </div>

                                    {expandedFacultes[facKey] && (
                                      <div className="ml-7 mt-3 space-y-2">
                                        {/* Promotions directes sous faculté */}
                                        {facPromotions.map(salle => renderPromotion(salle, h.etabNom))}

                                        {/* Départements */}
                                        {faculteDepts.map((dept) => {
                                          const deptKey = `${etabKey}-dept-${dept.id}`;
                                          const deptOrientations = h.orientations.filter(o => o.departement_id === dept.id);
                                          const deptOptions = h.options.filter(o => o.departement_id === dept.id && !o.orientation_id);
                                          const deptPromotions = h.promotions.filter(p => p.departement_id === dept.id && !p.orientation_id && !p.option_id);

                                          return (
                                            <div key={deptKey} className="border border-gray-200 rounded-lg p-3 bg-white">
                                              <div className="flex items-center gap-2">
                                                <button onClick={() => toggle(setExpandedDepartements, deptKey)} className="text-gray-700">
                                                  {expandedDepartements[deptKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </button>
                                                <Badge className="bg-blue-600 text-white">Département</Badge>
                                                <span className="text-gray-800 font-medium" style={CG}>{dept.nom}</span>
                                                {dept.code && <span className="text-gray-500 text-sm">({dept.code})</span>}
                                              </div>

                                              {expandedDepartements[deptKey] && (
                                                <div className="ml-6 mt-3 space-y-2">
                                                  {/* Promotions directes sous département */}
                                                  {deptPromotions.map(salle => renderPromotion(salle, h.etabNom))}

                                                  {/* Orientations */}
                                                  {deptOrientations.map((orientation) => {
                                                    const oriKey = `${etabKey}-ori-${orientation.id}`;
                                                    const oriOptions = h.options.filter(o => o.orientation_id === orientation.id);
                                                    const oriPromotions = h.promotions.filter(p => p.orientation_id === orientation.id && !p.option_id);

                                                    return (
                                                      <div key={oriKey} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                                        <div className="flex items-center gap-2">
                                                          <button onClick={() => toggle(setExpandedOrientations, oriKey)} className="text-gray-700">
                                                            {expandedOrientations[oriKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                          </button>
                                                          <Badge className="bg-orange-600 text-white">Orientation</Badge>
                                                          <span className="text-gray-800 font-medium" style={CG}>{orientation.nom}</span>
                                                        </div>

                                                        {expandedOrientations[oriKey] && (
                                                          <div className="ml-6 mt-3 space-y-2">
                                                            {oriPromotions.map(salle => renderPromotion(salle, h.etabNom))}

                                                            {oriOptions.map((opt) => {
                                                              const optKey = `${etabKey}-opt-${opt.id}`;
                                                              const optPromotions = h.promotions.filter(p => p.option_id === opt.id);

                                                              return (
                                                                <div key={optKey} className="border border-gray-200 rounded-lg p-2 bg-white">
                                                                  <div className="flex items-center gap-2">
                                                                    <button onClick={() => toggle(setExpandedOptions, optKey)} className="text-gray-700">
                                                                      {expandedOptions[optKey] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                                    </button>
                                                                    <Badge className="bg-green-600 text-white text-xs">Option</Badge>
                                                                    <span className="text-gray-800 text-sm font-medium" style={CG}>{opt.nom}</span>
                                                                  </div>
                                                                  {expandedOptions[optKey] && optPromotions.length > 0 && (
                                                                    <div className="ml-5 mt-2 space-y-1">
                                                                      {optPromotions.map(salle => renderPromotion(salle, h.etabNom))}
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

                                                  {/* Options directes (sans orientation) */}
                                                  {deptOptions.map((opt) => {
                                                    const optKey = `${etabKey}-opt-${opt.id}`;
                                                    const optPromotions = h.promotions.filter(p => p.option_id === opt.id);

                                                    return (
                                                      <div key={optKey} className="border border-gray-200 rounded-lg p-2 bg-white">
                                                        <div className="flex items-center gap-2">
                                                          <button onClick={() => toggle(setExpandedOptions, optKey)} className="text-gray-700">
                                                            {expandedOptions[optKey] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                          </button>
                                                          <Badge className="bg-green-600 text-white text-xs">Option</Badge>
                                                          <span className="text-gray-800 text-sm font-medium" style={CG}>{opt.nom}</span>
                                                        </div>
                                                        {expandedOptions[optKey] && optPromotions.length > 0 && (
                                                          <div className="ml-5 mt-2 space-y-1">
                                                            {optPromotions.map(salle => renderPromotion(salle, h.etabNom))}
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
                                  </div>
                                );
                              })}

                              {/* Départements orphelins (sans faculté) */}
                              {h.departements.filter(d => !d.faculte_id).map((dept) => {
                                const deptKey = `${etabKey}-dept-${dept.id}`;
                                const deptPromotions = h.promotions.filter(p => p.departement_id === dept.id && !p.orientation_id && !p.option_id);
                                const deptOrientations = h.orientations.filter(o => o.departement_id === dept.id);
                                const deptOptions = h.options.filter(o => o.departement_id === dept.id && !o.orientation_id);

                                return (
                                  <div key={deptKey} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => toggle(setExpandedDepartements, deptKey)} className="text-gray-700">
                                        {expandedDepartements[deptKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                      </button>
                                      <Badge className="bg-blue-600 text-white">Département</Badge>
                                      <span className="text-gray-800 font-medium" style={CG}>{dept.nom}</span>
                                      {dept.code && <span className="text-gray-500 text-sm">({dept.code})</span>}
                                    </div>
                                    {expandedDepartements[deptKey] && (
                                      <div className="ml-6 mt-3 space-y-2">
                                        {deptPromotions.map(salle => renderPromotion(salle, h.etabNom))}
                                        {deptOrientations.map(ori => (
                                          <div key={ori.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                                            <div className="flex items-center gap-2">
                                              <Badge className="bg-orange-600 text-white">Orientation</Badge>
                                              <span className="text-gray-800 font-medium" style={CG}>{ori.nom}</span>
                                            </div>
                                          </div>
                                        ))}
                                        {deptOptions.map(opt => (
                                          <div key={opt.id} className="border border-gray-200 rounded-lg p-2 bg-white">
                                            <div className="flex items-center gap-2">
                                              <Badge className="bg-green-600 text-white text-xs">Option</Badge>
                                              <span className="text-gray-800 text-sm font-medium" style={CG}>{opt.nom}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-6 text-center text-gray-500 text-sm">
                              <School className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                              {h.inscrit
                                ? <span style={CG}>Aucune structure académique configurée pour le moment.</span>
                                : <span style={CG}>Cet établissement n'est pas encore inscrit sur H-Archive.</span>
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog flottant : Liste des étudiants d'une promotion */}
      <DraggableDialog
        open={studentsDialogOpen}
        onOpenChange={setStudentsDialogOpen}
        title={
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-pink-400" />
            <div>
              <div className="text-white font-bold text-base" style={CG}>{selectedPromotion?.nom}</div>
              <div className="text-gray-400 text-xs" style={CG}>{selectedEtabNom}</div>
            </div>
          </div>
        }
        maxWidth="max-w-5xl"
      >
        <DraggableDialogBody>
          {promotionStudents.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400" style={CG}>Aucun étudiant inscrit dans cette promotion</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm" style={CG}>
                  {promotionStudents.length} étudiant{promotionStudents.length > 1 ? 's' : ''} inscrit{promotionStudents.length > 1 ? 's' : ''}
                </span>
                <Badge className="bg-pink-600 text-white">{promotionStudents.length} / {selectedPromotion?.capacite || '—'}</Badge>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[#3d3d3d]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#2d2d2d]">
                      <th className="text-left px-3 py-2 text-gray-400 font-semibold" style={CG}>#</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-semibold" style={CG}>Nom complet</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-semibold" style={CG}>Email</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-semibold" style={CG}>Matricule</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-semibold" style={CG}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotionStudents.map((etud, idx) => (
                      <tr key={etud.id} className="border-t border-[#3d3d3d] hover:bg-[#2d2d2d]/50">
                        <td className="px-3 py-2 text-gray-500" style={CG}>{idx + 1}</td>
                        <td className="px-3 py-2 text-white font-medium" style={CG}>
                          {etud.prenom} {etud.post_nom} {etud.nom}
                        </td>
                        <td className="px-3 py-2 text-gray-300" style={CG}>{etud.email}</td>
                        <td className="px-3 py-2 text-gray-300" style={CG}>{etud.matricule || '—'}</td>
                        <td className="px-3 py-2 text-gray-400 text-xs" style={CG}>
                          {etud.created_date || etud.createdAt
                            ? format(new Date(etud.created_date || etud.createdAt), 'dd/MM/yyyy', { locale: fr })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DraggableDialogBody>
      </DraggableDialog>
    </div>
  );
}
