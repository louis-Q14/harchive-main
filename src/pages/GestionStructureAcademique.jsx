import React, { useState, useEffect, useMemo } from "react";
import { dataService } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, School, ChevronRight, ChevronDown, Users, Trash2 } from "lucide-react";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

export default function GestionStructureAcademique() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [currentStep, setCurrentStep] = useState(null); // 'faculte', 'departement', 'option', 'orientation', 'salle'
  const [selectedFaculte, setSelectedFaculte] = useState(null);
  const [selectedDepartement, setSelectedDepartement] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedOrientation, setSelectedOrientation] = useState(null);
  
  const [expandedFacultes, setExpandedFacultes] = useState({});
  const [expandedDepartements, setExpandedDepartements] = useState({});
  const [expandedOptions, setExpandedOptions] = useState({});
  const [expandedOrientations, setExpandedOrientations] = useState({});
  
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({});
  const [etablissementsList, setEtablissementsList] = useState([]);
  const [showEtabSelector, setShowEtabSelector] = useState(false);
  const [showStructureDialog, setShowStructureDialog] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let currentUser = { ...authUser };
        if (!currentUser || (currentUser.role_archive !== "admin_etablissement" && currentUser.role_archive !== "super_admin" && currentUser.role_archive !== "admin_systeme")) {
          navigate(createPageUrl("Dashboard"));
          return;
        }
        if (!currentUser.etablissement_id || !currentUser.etablissement_nom) {
          // For super_admin/admin_systeme, load available establishments for selection
          if (currentUser.role_archive === "super_admin" || currentUser.role_archive === "admin_systeme") {
            const etablissements = await dataService.query('EtablissementAgree');
            setEtablissementsList(etablissements);
            if (etablissements.length === 1) {
              currentUser = { ...currentUser, etablissement_id: etablissements[0].id, etablissement_nom: etablissements[0].denomination || etablissements[0].sigle };
            } else if (etablissements.length > 1) {
              setShowEtabSelector(true);
            }
          } else {
            // Pour admin_etablissement, chercher dans la table Etablissement par email
            const etabs = await dataService.query('Etablissement', { filters: [{ email: currentUser.email }] });
            if (etabs.length > 0) {
              currentUser = { ...currentUser, etablissement_id: etabs[0].id, etablissement_nom: etabs[0].name || etabs[0].nom };
            }
          }
        }
        setUser(currentUser);
      } catch (e) {
        navigate(createPageUrl("Dashboard"));
      } finally {
        setLoading(false);
      }
    })();
  }, [authUser]);

  const selectEtablissement = async (etab) => {
    // Cross-reference avec la table Etablissement (establishments) par denomination
    // pour obtenir l'ID correct lié aux structures académiques
    try {
      const matchingEtabs = await dataService.query('Etablissement', {
        filters: [{ name: etab.denomination || etab.sigle }], limit: 1
      });
      if (matchingEtabs.length > 0) {
        setUser(prev => ({ ...prev, etablissement_id: matchingEtabs[0].id, etablissement_nom: matchingEtabs[0].name }));
      } else {
        setUser(prev => ({ ...prev, etablissement_id: etab.id, etablissement_nom: etab.denomination || etab.sigle }));
      }
    } catch (e) {
      setUser(prev => ({ ...prev, etablissement_id: etab.id, etablissement_nom: etab.denomination || etab.sigle }));
    }
    setShowEtabSelector(false);
  };

  // Queries
  const { data: facultes = [] } = useQuery({
    queryKey: ["etablissement-facultes", user?.etablissement_id],
    queryFn: async () => await dataService.query('EtablissementFaculte', { filters: [{ etablissement_id: user.etablissement_id }] }),
    enabled: !!user?.etablissement_id,
  });

  const { data: departements = [] } = useQuery({
    queryKey: ["etablissement-departements", user?.etablissement_id],
    queryFn: async () => await dataService.query('EtablissementDepartement', { filters: [{ etablissement_id: user.etablissement_id }] }),
    enabled: !!user?.etablissement_id,
  });

  const { data: options = [] } = useQuery({
    queryKey: ["etablissement-options", user?.etablissement_id],
    queryFn: async () => await dataService.query('EtablissementOption', { filters: [{ etablissement_id: user.etablissement_id }] }),
    enabled: !!user?.etablissement_id,
  });

  const { data: orientations = [] } = useQuery({
    queryKey: ["etablissement-orientations", user?.etablissement_id],
    queryFn: async () => await dataService.query('EtablissementOrientation', { filters: [{ etablissement_id: user.etablissement_id }] }),
    enabled: !!user?.etablissement_id,
  });

  const { data: sallesRaw = [] } = useQuery({
    queryKey: ["promotions", user?.etablissement_id],
    queryFn: async () => await dataService.query('Promotion', { filters: [{ etablissement_id: user.etablissement_id }] }),
    enabled: !!user?.etablissement_id,
  });

  // Promotions triées par ordre croissant (1ère, 2ème, 3ème...)
  const salles = useMemo(() =>
    [...sallesRaw].sort((a, b) => {
      const numA = parseInt(a.nom) || 0;
      const numB = parseInt(b.nom) || 0;
      if (numA !== numB) return numA - numB;
      return (a.nom || '').localeCompare(b.nom || '', 'fr');
    }),
    [sallesRaw]
  );

  // Mutations Facultés
  const createFaculteMutation = useMutation({
    mutationFn: async (data) => await dataService.create('EtablissementFaculte', {
      ...data,
      etablissement_id: user.etablissement_id,
      etablissement_nom: user.etablissement_nom,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(["etablissement-facultes"]);
      setShowDialog(false);
      setFormData({});
    },
  });

  const updateFaculteMutation = useMutation({
    mutationFn: async ({ id, data }) => await dataService.update('EtablissementFaculte', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["etablissement-facultes"]);
      setShowDialog(false);
      setFormData({});
    },
  });

  const deleteFaculteMutation = useMutation({
    mutationFn: async (id) => await dataService.delete('EtablissementFaculte', id),
    onSuccess: () => queryClient.invalidateQueries(["etablissement-facultes"]),
  });

  // Mutations Départements
  const createDepartementMutation = useMutation({
    mutationFn: async (data) => {
      const faculte = data.faculte_id ? facultes.find(f => f.id === data.faculte_id) : null;
      return await dataService.create('EtablissementDepartement', {
        ...data,
        etablissement_id: user.etablissement_id,
        etablissement_nom: user.etablissement_nom,
        faculte_nom: faculte?.nom || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["etablissement-departements"]);
      setShowDialog(false);
      setFormData({});
    },
  });

  const updateDepartementMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const faculte = data.faculte_id ? facultes.find(f => f.id === data.faculte_id) : null;
      return await dataService.update('EtablissementDepartement', id, {
        ...data,
        faculte_nom: faculte?.nom || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["etablissement-departements"]);
      setShowDialog(false);
      setFormData({});
    },
  });

  const deleteDepartementMutation = useMutation({
    mutationFn: async (id) => await dataService.delete('EtablissementDepartement', id),
    onSuccess: () => queryClient.invalidateQueries(["etablissement-departements"]),
  });

  // Mutations Options
  const createOptionMutation = useMutation({
    mutationFn: async (data) => {
      const faculte = data.faculte_id ? facultes.find(f => f.id === data.faculte_id) : null;
      const departement = data.departement_id ? departements.find(d => d.id === data.departement_id) : null;
      const orientation = data.orientation_id ? orientations.find(o => o.id === data.orientation_id) : null;
      return await dataService.create('EtablissementOption', {
        ...data,
        etablissement_id: user.etablissement_id,
        etablissement_nom: user.etablissement_nom,
        faculte_nom: faculte?.nom || "",
        departement_nom: departement?.nom || "",
        orientation_nom: orientation?.nom || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["etablissement-options"]);
      setShowDialog(false);
      setFormData({});
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const faculte = data.faculte_id ? facultes.find(f => f.id === data.faculte_id) : null;
      const departement = data.departement_id ? departements.find(d => d.id === data.departement_id) : null;
      const orientation = data.orientation_id ? orientations.find(o => o.id === data.orientation_id) : null;
      return await dataService.update('EtablissementOption', id, {
        ...data,
        faculte_nom: faculte?.nom || "",
        departement_nom: departement?.nom || "",
        orientation_nom: orientation?.nom || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["etablissement-options"]);
      setShowDialog(false);
      setFormData({});
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (id) => await dataService.delete('EtablissementOption', id),
    onSuccess: () => queryClient.invalidateQueries(["etablissement-options"]),
  });

  // Mutations Orientations
  const createOrientationMutation = useMutation({
    mutationFn: async (data) => {
      const faculte = data.faculte_id ? facultes.find(f => f.id === data.faculte_id) : null;
      const departement = data.departement_id ? departements.find(d => d.id === data.departement_id) : null;
      return await dataService.create('EtablissementOrientation', {
        ...data,
        etablissement_id: user.etablissement_id,
        etablissement_nom: user.etablissement_nom,
        faculte_nom: faculte?.nom || "",
        departement_nom: departement?.nom || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["etablissement-orientations"]);
      setShowDialog(false);
      setFormData({});
    },
  });

  const updateOrientationMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const faculte = data.faculte_id ? facultes.find(f => f.id === data.faculte_id) : null;
      const departement = data.departement_id ? departements.find(d => d.id === data.departement_id) : null;
      return await dataService.update('EtablissementOrientation', id, {
        ...data,
        faculte_nom: faculte?.nom || "",
        departement_nom: departement?.nom || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["etablissement-orientations"]);
      setShowDialog(false);
      setFormData({});
    },
  });

  const deleteOrientationMutation = useMutation({
    mutationFn: async (id) => await dataService.delete('EtablissementOrientation', id),
    onSuccess: () => queryClient.invalidateQueries(["etablissement-orientations"]),
  });

  // Mutations Promotions
  const createSalleMutation = useMutation({
    mutationFn: async (data) => {
      // Générer le nom automatiquement : Niveau + Code (ex: "1ère Licence A")
      const nom = data.code 
        ? `${data.niveau_academique} ${data.code}`
        : data.niveau_academique;

      const faculte = data.faculte_id ? facultes.find(f => f.id === data.faculte_id) : null;
      const departement = data.departement_id ? departements.find(d => d.id === data.departement_id) : null;
      const option = data.option_id ? options.find(o => o.id === data.option_id) : null;
      const orientation = data.orientation_id ? orientations.find(o => o.id === data.orientation_id) : null;

      return await dataService.create('Promotion', {
        nom: nom,
        capacite: parseInt(data.capacite),
        nombre_etudiants: parseInt(data.nombre_etudiants) || 0,
        etablissement_id: user.etablissement_id,
        etablissement_nom: user.etablissement_nom,
        faculte_id: data.faculte_id || "",
        faculte_nom: faculte?.nom || "",
        departement_id: data.departement_id || "",
        departement_nom: departement?.nom || "",
        option_id: data.option_id || "",
        option_nom: option?.nom || "",
        orientation_id: data.orientation_id || "",
        orientation_nom: orientation?.nom || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["promotions"]);
      setShowDialog(false);
      setFormData({});
    },
  });

  const updateSalleMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Générer le nom automatiquement : Niveau + Code (ex: "1ère Licence A")
      const nom = data.code 
        ? `${data.niveau_academique} ${data.code}`
        : data.niveau_academique;

      const faculte = data.faculte_id ? facultes.find(f => f.id === data.faculte_id) : null;
      const departement = data.departement_id ? departements.find(d => d.id === data.departement_id) : null;
      const option = data.option_id ? options.find(o => o.id === data.option_id) : null;
      const orientation = data.orientation_id ? orientations.find(o => o.id === data.orientation_id) : null;

      return await dataService.update('Promotion', id, {
        nom: nom,
        capacite: parseInt(data.capacite),
        nombre_etudiants: parseInt(data.nombre_etudiants) || 0,
        faculte_id: data.faculte_id || "",
        faculte_nom: faculte?.nom || "",
        departement_id: data.departement_id || "",
        departement_nom: departement?.nom || "",
        option_id: data.option_id || "",
        option_nom: option?.nom || "",
        orientation_id: data.orientation_id || "",
        orientation_nom: orientation?.nom || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["promotions"]);
      setShowDialog(false);
      setFormData({});
    },
  });

  const deleteSalleMutation = useMutation({
    mutationFn: async (id) => await dataService.delete('Promotion', id),
    onSuccess: () => queryClient.invalidateQueries(["promotions"]),
  });

  const openCreateDialog = (step, context = {}) => {
    setCurrentStep(step);
    setFormData({ ...context });
    setShowDialog(true);
  };

  const openEditDialog = (step, item) => {
    setCurrentStep(step);
    setFormData({ ...item, isEdit: true });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    const { isEdit, id, ...data } = formData;
    
    // Validation pour les salles
    if (currentStep === 'salle') {
      if (!data.niveau_academique) {
        alert("Veuillez sélectionner une promotion");
        return;
      }
      if (!data.capacite || parseInt(data.capacite) <= 0) {
        alert("Veuillez saisir une capacité valide (minimum 1)");
        return;
      }
    }
    
    // Validation pour les autres types
    if (currentStep !== 'salle' && !data.nom) {
      alert("Veuillez saisir un nom");
      return;
    }
    
    if (currentStep === 'faculte') {
      if (isEdit) updateFaculteMutation.mutate({ id, data });
      else createFaculteMutation.mutate(data);
    } else if (currentStep === 'departement') {
      if (isEdit) updateDepartementMutation.mutate({ id, data });
      else createDepartementMutation.mutate(data);
    } else if (currentStep === 'option') {
      if (isEdit) updateOptionMutation.mutate({ id, data });
      else createOptionMutation.mutate(data);
    } else if (currentStep === 'orientation') {
      if (isEdit) updateOrientationMutation.mutate({ id, data });
      else createOrientationMutation.mutate(data);
    } else if (currentStep === 'salle') {
      if (isEdit) updateSalleMutation.mutate({ id, data });
      else createSalleMutation.mutate(data);
    }
  };

  const toggleExpand = (type, id) => {
    if (type === 'faculte') setExpandedFacultes(prev => ({ ...prev, [id]: !prev[id] }));
    else if (type === 'departement') setExpandedDepartements(prev => ({ ...prev, [id]: !prev[id] }));
    else if (type === 'option') setExpandedOptions(prev => ({ ...prev, [id]: !prev[id] }));
    else if (type === 'orientation') setExpandedOrientations(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (showEtabSelector) {
    return (
      <div className="min-h-screen bg-[#484848] p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <School className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white" style={CG}>Sélectionner un établissement</h1>
          </div>
          <div className="space-y-2">
            {etablissementsList.map((etab) => (
              <Card key={etab.id} className="cursor-pointer hover:border-purple-500 transition-colors" style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}} onClick={() => selectEtablissement(etab)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{etab.denomination || etab.sigle}</p>
                    {etab.sigle && etab.denomination && <p className="text-gray-400 text-sm">{etab.sigle}</p>}
                    {etab.province && <p className="text-gray-500 text-xs">{etab.province} - {etab.territoire}</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasStructure = facultes.length > 0 || departements.length > 0 || orientations.length > 0 || options.length > 0 || salles.length > 0;

  return (
    <div className="min-h-screen bg-[#484848] p-4 md:p-8">
      <div className="w-full px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <School className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white" style={CG}>Structure Académique</h1>
              <p className="text-white" style={CG}>Configuration hiérarchique de votre établissement</p>
            </div>
          </div>
          <Button onClick={() => setShowStructureDialog(true)} className="bg-purple-600 hover:bg-purple-700 text-white" style={CG}>
            <Plus className="w-4 h-4 mr-2" /> {hasStructure ? "Gérer votre structure" : "Créer votre structure"}
          </Button>
        </div>

        {/* Read-only summary when structure exists */}
        {hasStructure ? (
          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
            <CardHeader>
              <CardTitle className="text-white" style={CG}>Structure Hiérarchique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {facultes.map((faculte) => {
                const faculteDepts = departements.filter(d => d.faculte_id === faculte.id);
                return (
                  <div key={faculte.id} className="border border-[#2d2d2d] rounded-lg p-3" style={{backgroundColor: 'var(--ha-surface2)'}}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleExpand('faculte', faculte.id)} className="text-white">
                        {expandedFacultes[faculte.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                      <Badge className="bg-purple-600">Faculté</Badge>
                      <span className="text-white font-semibold">{faculte.nom}</span>
                      {faculte.code && <span className="text-gray-400 text-sm">({faculte.code})</span>}
                    </div>
                    {expandedFacultes[faculte.id] && (
                      <div className="ml-7 mt-3 space-y-2">
                        {faculteDepts.map((dept) => (
                          <div key={dept.id} className="border border-[#3d3d3d] rounded-lg p-3" style={{backgroundColor: 'var(--ha-surface)'}}>
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleExpand('departement', dept.id)} className="text-white">
                                {expandedDepartements[dept.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <Badge className="bg-blue-600">Département</Badge>
                              <span className="text-white font-medium">{dept.nom}</span>
                              {dept.code && <span className="text-gray-400 text-sm">({dept.code})</span>}
                            </div>
                            {expandedDepartements[dept.id] && (
                              <div className="ml-6 mt-3 space-y-2">
                                {salles.filter(s => s.departement_id === dept.id && !s.orientation_id && !s.option_id).map((salle) => (
                                  <div key={salle.id} className="flex items-center gap-2 p-2 rounded" style={{backgroundColor: 'var(--ha-surface)'}}>
                                    <Users className="w-4 h-4 text-pink-400" />
                                    <span className="text-white text-sm">{salle.nom}</span>
                                    <Badge variant="outline" className="text-xs">{salle.nombre_etudiants || 0} / {salle.capacite}</Badge>
                                  </div>
                                ))}
                                {orientations.filter(o => o.departement_id === dept.id).map((orientation) => (
                                  <div key={orientation.id} className="border border-[#4d4d4d] rounded-lg p-3" style={{backgroundColor: '#474747'}}>
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => toggleExpand('orientation', orientation.id)} className="text-white">
                                        {expandedOrientations[orientation.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                      </button>
                                      <Badge className="bg-orange-600">Orientation</Badge>
                                      <span className="text-white font-medium">{orientation.nom}</span>
                                    </div>
                                    {expandedOrientations[orientation.id] && (
                                      <div className="ml-6 mt-3 space-y-2">
                                        {salles.filter(s => s.orientation_id === orientation.id && !s.option_id).map((salle) => (
                                          <div key={salle.id} className="flex items-center gap-2 p-2 rounded" style={{backgroundColor: 'var(--ha-surface)'}}>
                                            <Users className="w-4 h-4 text-pink-400" />
                                            <span className="text-white text-sm">{salle.nom}</span>
                                            <Badge variant="outline" className="text-xs">{salle.nombre_etudiants || 0} / {salle.capacite}</Badge>
                                          </div>
                                        ))}
                                        {options.filter(o => o.orientation_id === orientation.id).map((opt) => (
                                          <div key={opt.id} className="border border-[#5a5a5a] rounded-lg p-2" style={{backgroundColor: '#5a5a5a'}}>
                                            <div className="flex items-center gap-2">
                                              <button onClick={() => toggleExpand('option', opt.id)} className="text-white">
                                                {expandedOptions[opt.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                              </button>
                                              <Badge className="bg-green-600 text-xs">Option</Badge>
                                              <span className="text-white text-sm font-medium">{opt.nom}</span>
                                            </div>
                                            {expandedOptions[opt.id] && salles.filter(s => s.option_id === opt.id).length > 0 && (
                                              <div className="ml-5 mt-2 space-y-1">
                                                {salles.filter(s => s.option_id === opt.id).map((salle) => (
                                                  <div key={salle.id} className="flex items-center gap-2 p-2 rounded" style={{backgroundColor: 'var(--ha-bg)'}}>
                                                    <Users className="w-4 h-4 text-pink-400" />
                                                    <span className="text-white text-sm">{salle.nom}</span>
                                                    <Badge variant="outline" className="text-xs">{salle.nombre_etudiants || 0} / {salle.capacite}</Badge>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {options.filter(o => o.departement_id === dept.id && !o.orientation_id).map((opt) => (
                                  <div key={opt.id} className="border border-[#5a5a5a] rounded-lg p-2" style={{backgroundColor: '#5a5a5a'}}>
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => toggleExpand('option', opt.id)} className="text-white">
                                        {expandedOptions[opt.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                      </button>
                                      <Badge className="bg-green-600 text-xs">Option</Badge>
                                      <span className="text-white text-sm font-medium">{opt.nom}</span>
                                    </div>
                                    {expandedOptions[opt.id] && salles.filter(s => s.option_id === opt.id).length > 0 && (
                                      <div className="ml-5 mt-2 space-y-1">
                                        {salles.filter(s => s.option_id === opt.id).map((salle) => (
                                          <div key={salle.id} className="flex items-center gap-2 p-2 rounded" style={{backgroundColor: 'var(--ha-bg)'}}>
                                            <Users className="w-4 h-4 text-pink-400" />
                                            <span className="text-white text-sm">{salle.nom}</span>
                                            <Badge variant="outline" className="text-xs">{salle.nombre_etudiants || 0} / {salle.capacite}</Badge>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {departements.filter(d => !d.faculte_id).map((dept) => (
                <div key={dept.id} className="border border-[#3d3d3d] rounded-lg p-3" style={{backgroundColor: 'var(--ha-surface)'}}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleExpand('departement', dept.id)} className="text-white">
                      {expandedDepartements[dept.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <Badge className="bg-blue-600">Département</Badge>
                    <span className="text-white font-medium">{dept.nom}</span>
                    {dept.code && <span className="text-gray-400 text-sm">({dept.code})</span>}
                  </div>
                  {expandedDepartements[dept.id] && (
                    <div className="ml-6 mt-3 space-y-2">
                      {salles.filter(s => s.departement_id === dept.id && !s.orientation_id && !s.option_id).map((salle) => (
                        <div key={salle.id} className="flex items-center gap-2 p-2 rounded" style={{backgroundColor: 'var(--ha-surface)'}}>
                          <Users className="w-4 h-4 text-pink-400" />
                          <span className="text-white text-sm">{salle.nom}</span>
                          <Badge variant="outline" className="text-xs">{salle.nombre_etudiants || 0} / {salle.capacite}</Badge>
                        </div>
                      ))}
                      {orientations.filter(o => o.departement_id === dept.id).map((orientation) => (
                        <div key={orientation.id} className="border border-[#4d4d4d] rounded-lg p-3" style={{backgroundColor: '#474747'}}>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-600">Orientation</Badge>
                            <span className="text-white font-medium">{orientation.nom}</span>
                          </div>
                        </div>
                      ))}
                      {options.filter(o => o.departement_id === dept.id && !o.orientation_id).map((opt) => (
                        <div key={opt.id} className="border border-[#5a5a5a] rounded-lg p-2" style={{backgroundColor: '#5a5a5a'}}>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-600 text-xs">Option</Badge>
                            <span className="text-white text-sm font-medium">{opt.nom}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-24">
            <School className="w-20 h-20 text-gray-500 mx-auto mb-6" />
            <p className="text-white text-lg mb-2" style={CG}>Aucune structure académique</p>
            <p className="text-gray-400 text-sm mb-6" style={CG}>Commencez par créer votre structure hiérarchique</p>
            <Button onClick={() => setShowStructureDialog(true)} className="bg-purple-600 hover:bg-purple-700 text-white" style={CG}>
              <Plus className="w-4 h-4 mr-2" /> Créer votre structure
            </Button>
          </div>
        )}
      </div>

      {/* ========== DIALOG FLOTTANT : Gestion de la structure ========== */}
      <DraggableDialog
        open={showStructureDialog}
        onOpenChange={setShowStructureDialog}
        title={<span className="text-white text-lg font-semibold" style={CG}>Gestion de la Structure Académique</span>}
        maxWidth="max-w-5xl"
        resizable={false}
      >
        <DraggableDialogBody>
          <div className="space-y-4">
            {/* Boutons de création */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => openCreateDialog('faculte')} className="bg-transparent border border-purple-600 text-purple-600 hover:bg-purple-600/10" style={CG}>
                <Plus className="w-4 h-4 mr-2" /> Faculté
              </Button>
              <Button onClick={() => openCreateDialog('departement')} className="bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-600/10" style={CG}>
                <Plus className="w-4 h-4 mr-2" /> Département
              </Button>
              <Button onClick={() => openCreateDialog('orientation')} className="bg-transparent border border-orange-600 text-orange-600 hover:bg-orange-600/10" style={CG}>
                <Plus className="w-4 h-4 mr-2" /> Orientation
              </Button>
              <Button onClick={() => openCreateDialog('option')} className="bg-transparent border border-green-600 text-green-600 hover:bg-green-600/10" style={CG}>
                <Plus className="w-4 h-4 mr-2" /> Option
              </Button>
              <Button onClick={() => openCreateDialog('salle')} className="bg-transparent border border-pink-600 text-pink-600 hover:bg-pink-600/10" style={CG}>
                <Plus className="w-4 h-4 mr-2" /> Promotion
              </Button>
            </div>

            {/* Arbre hiérarchique */}
            <div className="space-y-2">
            {facultes.map((faculte) => {
              const faculteDepts = departements.filter(d => d.faculte_id === faculte.id);
              return (
                <div key={faculte.id} className="border border-[#2d2d2d] rounded-lg p-3" style={{backgroundColor: 'var(--ha-surface2)'}}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleExpand('faculte', faculte.id)} className="text-white">
                        {expandedFacultes[faculte.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                      <Badge className="bg-purple-600">Faculté</Badge>
                      <span className="text-white font-semibold">{faculte.nom}</span>
                      {faculte.code && <span className="text-gray-400 text-sm">({faculte.code})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => openCreateDialog('departement', { faculte_id: faculte.id })} className="bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-600/10">
                        <Plus className="w-3 h-3 mr-1" /> Département
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog('faculte', faculte)} className="h-8 w-8 text-white">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette faculté ?") && deleteFaculteMutation.mutate(faculte.id)} className="h-8 w-8 text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedFacultes[faculte.id] && (
                    <div className="ml-7 mt-3 space-y-2">
                      {faculteDepts.map((dept) => {
                        const deptOptions = options.filter(o => o.departement_id === dept.id);
                        return (
                          <div key={dept.id} className="border border-[#3d3d3d] rounded-lg p-3" style={{backgroundColor: 'var(--ha-surface)'}}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button onClick={() => toggleExpand('departement', dept.id)} className="text-white">
                                  {expandedDepartements[dept.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <Badge className="bg-blue-600">Département</Badge>
                                <span className="text-white font-medium">{dept.nom}</span>
                                {dept.code && <span className="text-gray-400 text-sm">({dept.code})</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => openCreateDialog('orientation', { faculte_id: faculte.id, departement_id: dept.id })} className="bg-transparent border border-orange-600 text-orange-600 hover:bg-orange-600/10">
                                  <Plus className="w-3 h-3 mr-1" /> Orientation
                                </Button>
                                <Button size="sm" onClick={() => openCreateDialog('option', { faculte_id: faculte.id, departement_id: dept.id })} className="bg-transparent border border-green-600 text-green-600 hover:bg-green-600/10">
                                  <Plus className="w-3 h-3 mr-1" /> Option
                                </Button>
                                <Button size="sm" onClick={() => openCreateDialog('salle', { faculte_id: faculte.id, departement_id: dept.id })} className="bg-transparent border border-pink-600 text-pink-600 hover:bg-pink-600/10">
                                  <Plus className="w-3 h-3 mr-1" /> Promotion
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => openEditDialog('departement', dept)} className="h-8 w-8 text-white">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer ce département ?") && deleteDepartementMutation.mutate(dept.id)} className="h-8 w-8 text-red-500">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {expandedDepartements[dept.id] && (
                              <div className="ml-6 mt-3 space-y-2">
                                {/* Niveaux académiques directs du département */}
                                {salles.filter(s => s.departement_id === dept.id && !s.orientation_id && !s.option_id).length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Niveaux Académiques</div>
                                    {salles.filter(s => s.departement_id === dept.id && !s.orientation_id && !s.option_id).map((salle) => (
                                      <div key={salle.id} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: 'var(--ha-surface)'}}>
                                        <div className="flex items-center gap-2">
                                          <Users className="w-4 h-4 text-pink-400" />
                                          <span className="text-white text-sm">{salle.nom}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {salle.nombre_etudiants || 0} / {salle.capacite}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button size="icon" variant="ghost" onClick={() => openEditDialog('salle', salle)} className="h-7 w-7 text-white">
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette salle ?") && deleteSalleMutation.mutate(salle.id)} className="h-7 w-7 text-red-500">
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Orientations */}
                                {orientations.filter(o => o.departement_id === dept.id).map((orientation) => {
                                 const orientOptions = options.filter(o => o.orientation_id === orientation.id);
                                 const orientSalles = salles.filter(s => s.orientation_id === orientation.id && !s.option_id);
                                 return (
                                   <div key={orientation.id} className="border border-[#4d4d4d] rounded-lg p-3" style={{backgroundColor: '#474747'}}>
                                     <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-2">
                                         <button onClick={() => toggleExpand('orientation', orientation.id)} className="text-white">
                                           {expandedOrientations[orientation.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                         </button>
                                         <Badge className="bg-orange-600">Orientation</Badge>
                                         <span className="text-white font-medium">{orientation.nom}</span>
                                         {orientation.code && <span className="text-gray-400 text-sm">({orientation.code})</span>}
                                       </div>
                                       <div className="flex items-center gap-2">
                                         <Button size="sm" onClick={() => openCreateDialog('option', { faculte_id: faculte.id, departement_id: dept.id, orientation_id: orientation.id })} className="bg-transparent border border-green-600 text-green-600 hover:bg-green-600/10">
                                           <Plus className="w-3 h-3 mr-1" /> Option
                                         </Button>
                                         <Button size="sm" onClick={() => openCreateDialog('salle', { faculte_id: faculte.id, departement_id: dept.id, orientation_id: orientation.id })} className="bg-transparent border border-pink-600 text-pink-600 hover:bg-pink-600/10">
                                           <Plus className="w-3 h-3 mr-1" /> Promotion
                                         </Button>
                                         <Button size="icon" variant="ghost" onClick={() => openEditDialog('orientation', orientation)} className="h-8 w-8 text-white">
                                           <Pencil className="h-4 w-4" />
                                         </Button>
                                         <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette orientation ?") && deleteOrientationMutation.mutate(orientation.id)} className="h-8 w-8 text-red-500">
                                           <Trash2 className="h-4 w-4" />
                                         </Button>
                                       </div>
                                     </div>

                                     {expandedOrientations[orientation.id] && (
                                       <div className="ml-6 mt-3 space-y-2">
                                         {/* Niveaux académiques sans option */}
                                         {orientSalles.length > 0 && (
                                           <div className="space-y-1">
                                             <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Niveaux Académiques</div>
                                             {orientSalles.map((salle) => (
                                               <div key={salle.id} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: 'var(--ha-surface)'}}>
                                                 <div className="flex items-center gap-2">
                                                   <Users className="w-4 h-4 text-pink-400" />
                                                   <span className="text-white text-sm">{salle.nom}</span>
                                                   <Badge variant="outline" className="text-xs">
                                                     {salle.nombre_etudiants || 0} / {salle.capacite}
                                                   </Badge>
                                                 </div>
                                                 <div className="flex items-center gap-1">
                                                   <Button size="icon" variant="ghost" onClick={() => openEditDialog('salle', salle)} className="h-7 w-7 text-white">
                                                     <Pencil className="h-3 w-3" />
                                                   </Button>
                                                   <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette salle ?") && deleteSalleMutation.mutate(salle.id)} className="h-7 w-7 text-red-500">
                                                     <Trash2 className="h-3 w-3" />
                                                   </Button>
                                                 </div>
                                               </div>
                                             ))}
                                           </div>
                                         )}

                                         {/* Options */}
                                         {orientOptions.map((opt) => {
                                           const optSalles = salles.filter(s => s.option_id === opt.id);
                                           return (
                                             <div key={opt.id} className="border border-[#5a5a5a] rounded-lg p-2" style={{backgroundColor: '#5a5a5a'}}>
                                               <div className="flex items-center justify-between">
                                                 <div className="flex items-center gap-2">
                                                   <button onClick={() => toggleExpand('option', opt.id)} className="text-white">
                                                     {expandedOptions[opt.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                   </button>
                                                   <Badge className="bg-green-600 text-xs">Option</Badge>
                                                   <span className="text-white text-sm font-medium">{opt.nom}</span>
                                                 </div>
                                                 <div className="flex items-center gap-1">
                                                   <Button size="sm" onClick={() => openCreateDialog('salle', { faculte_id: faculte.id, departement_id: dept.id, orientation_id: orientation.id, option_id: opt.id })} className="bg-transparent border border-pink-600 text-pink-600 hover:bg-pink-600/10 h-7 text-xs">
                                                     <Plus className="w-3 h-3 mr-1" /> Promotion
                                                   </Button>
                                                   <Button size="icon" variant="ghost" onClick={() => openEditDialog('option', opt)} className="h-7 w-7 text-white">
                                                     <Pencil className="h-3 w-3" />
                                                   </Button>
                                                   <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette option ?") && deleteOptionMutation.mutate(opt.id)} className="h-7 w-7 text-red-500">
                                                     <Trash2 className="h-3 w-3" />
                                                   </Button>
                                                 </div>
                                               </div>

                                               {expandedOptions[opt.id] && optSalles.length > 0 && (
                                                 <div className="ml-5 mt-2 space-y-1">
                                                   {optSalles.map((salle) => (
                                                     <div key={salle.id} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: 'var(--ha-bg)'}}>
                                                       <div className="flex items-center gap-2">
                                                         <Users className="w-4 h-4 text-pink-400" />
                                                         <span className="text-white text-sm">{salle.nom}</span>
                                                         <Badge variant="outline" className="text-xs">
                                                           {salle.nombre_etudiants || 0} / {salle.capacite}
                                                         </Badge>
                                                       </div>
                                                       <div className="flex items-center gap-1">
                                                         <Button size="icon" variant="ghost" onClick={() => openEditDialog('salle', salle)} className="h-7 w-7 text-white">
                                                           <Pencil className="h-3 w-3" />
                                                         </Button>
                                                         <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette salle ?") && deleteSalleMutation.mutate(salle.id)} className="h-7 w-7 text-red-500">
                                                           <Trash2 className="h-3 w-3" />
                                                         </Button>
                                                       </div>
                                                     </div>
                                                   ))}
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

                                {/* Options directement sous département (sans orientation) */}
                                {options.filter(o => o.departement_id === dept.id && !o.orientation_id).map((opt) => {
                                 const optSalles = salles.filter(s => s.option_id === opt.id);
                                 return (
                                   <div key={opt.id} className="border border-[#5a5a5a] rounded-lg p-2" style={{backgroundColor: '#5a5a5a'}}>
                                     <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-2">
                                         <button onClick={() => toggleExpand('option', opt.id)} className="text-white">
                                           {expandedOptions[opt.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                         </button>
                                         <Badge className="bg-green-600 text-xs">Option</Badge>
                                         <span className="text-white text-sm font-medium">{opt.nom}</span>
                                         {opt.code && <span className="text-gray-400 text-xs">({opt.code})</span>}
                                       </div>
                                       <div className="flex items-center gap-1">
                                         <Button size="sm" onClick={() => openCreateDialog('salle', { faculte_id: faculte.id, departement_id: dept.id, option_id: opt.id })} className="bg-transparent border border-pink-600 text-pink-600 hover:bg-pink-600/10 h-7 text-xs">
                                           <Plus className="w-3 h-3 mr-1" /> Niveau Académique
                                         </Button>
                                         <Button size="icon" variant="ghost" onClick={() => openEditDialog('option', opt)} className="h-7 w-7 text-white">
                                           <Pencil className="h-3 w-3" />
                                         </Button>
                                         <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette option ?") && deleteOptionMutation.mutate(opt.id)} className="h-7 w-7 text-red-500">
                                           <Trash2 className="h-3 w-3" />
                                         </Button>
                                       </div>
                                     </div>

                                     {expandedOptions[opt.id] && optSalles.length > 0 && (
                                       <div className="ml-5 mt-2 space-y-1">
                                         {optSalles.map((salle) => (
                                           <div key={salle.id} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: 'var(--ha-bg)'}}>
                                             <div className="flex items-center gap-2">
                                               <Users className="w-4 h-4 text-pink-400" />
                                               <span className="text-white text-sm">{salle.nom}</span>
                                               <Badge variant="outline" className="text-xs">
                                                 {salle.nombre_etudiants || 0} / {salle.capacite}
                                               </Badge>
                                             </div>
                                             <div className="flex items-center gap-1">
                                               <Button size="icon" variant="ghost" onClick={() => openEditDialog('salle', salle)} className="h-7 w-7 text-white">
                                                 <Pencil className="h-3 w-3" />
                                               </Button>
                                               <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette salle ?") && deleteSalleMutation.mutate(salle.id)} className="h-7 w-7 text-red-500">
                                                 <Trash2 className="h-3 w-3" />
                                               </Button>
                                             </div>
                                           </div>
                                         ))}
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

            {/* Départements sans faculté */}
            {departements.filter(d => !d.faculte_id).map((dept) => (
              <div key={dept.id} className="border border-[#3d3d3d] rounded-lg p-3" style={{backgroundColor: 'var(--ha-surface)'}}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleExpand('departement', dept.id)} className="text-white">
                      {expandedDepartements[dept.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <Badge className="bg-blue-600">Département</Badge>
                    <span className="text-white font-medium">{dept.nom}</span>
                    {dept.code && <span className="text-gray-400 text-sm">({dept.code})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => openCreateDialog('orientation', { departement_id: dept.id })} className="bg-transparent border border-orange-600 text-orange-600 hover:bg-orange-600/10">
                      <Plus className="w-3 h-3 mr-1" /> Orientation
                    </Button>
                    <Button size="sm" onClick={() => openCreateDialog('option', { departement_id: dept.id })} className="bg-transparent border border-green-600 text-green-600 hover:bg-green-600/10">
                      <Plus className="w-3 h-3 mr-1" /> Option
                    </Button>
                    <Button size="sm" onClick={() => openCreateDialog('salle', { departement_id: dept.id })} className="bg-transparent border border-pink-600 text-pink-600 hover:bg-pink-600/10">
                      <Plus className="w-3 h-3 mr-1" /> Promotion
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEditDialog('departement', dept)} className="h-8 w-8 text-white">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer ce département ?") && deleteDepartementMutation.mutate(dept.id)} className="h-8 w-8 text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expandedDepartements[dept.id] && (
                  <div className="ml-6 mt-3 space-y-2">
                    {/* Niveaux académiques directs */}
                    {salles.filter(s => s.departement_id === dept.id && !s.orientation_id && !s.option_id).length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Niveaux Académiques</div>
                        {salles.filter(s => s.departement_id === dept.id && !s.orientation_id && !s.option_id).map((salle) => (
                          <div key={salle.id} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: 'var(--ha-surface)'}}>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-pink-400" />
                              <span className="text-white text-sm">{salle.nom}</span>
                              <Badge variant="outline" className="text-xs">{salle.nombre_etudiants || 0} / {salle.capacite}</Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEditDialog('salle', salle)} className="h-7 w-7 text-white">
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette salle ?") && deleteSalleMutation.mutate(salle.id)} className="h-7 w-7 text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Orientations */}
                    {orientations.filter(o => o.departement_id === dept.id).map((orientation) => {
                      const orientOptions = options.filter(o => o.orientation_id === orientation.id);
                      const orientSalles = salles.filter(s => s.orientation_id === orientation.id && !s.option_id);
                      return (
                        <div key={orientation.id} className="border border-[#4d4d4d] rounded-lg p-3" style={{backgroundColor: '#474747'}}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleExpand('orientation', orientation.id)} className="text-white">
                                {expandedOrientations[orientation.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <Badge className="bg-orange-600">Orientation</Badge>
                              <span className="text-white font-medium">{orientation.nom}</span>
                              {orientation.code && <span className="text-gray-400 text-sm">({orientation.code})</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => openCreateDialog('option', { departement_id: dept.id, orientation_id: orientation.id })} className="bg-transparent border border-green-600 text-green-600 hover:bg-green-600/10">
                                <Plus className="w-3 h-3 mr-1" /> Option
                              </Button>
                              <Button size="sm" onClick={() => openCreateDialog('salle', { departement_id: dept.id, orientation_id: orientation.id })} className="bg-transparent border border-pink-600 text-pink-600 hover:bg-pink-600/10">
                                <Plus className="w-3 h-3 mr-1" /> Promotion
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => openEditDialog('orientation', orientation)} className="h-8 w-8 text-white">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette orientation ?") && deleteOrientationMutation.mutate(orientation.id)} className="h-8 w-8 text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {expandedOrientations[orientation.id] && (
                            <div className="ml-6 mt-3 space-y-2">
                              {orientSalles.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Niveaux Académiques</div>
                                  {orientSalles.map((salle) => (
                                    <div key={salle.id} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: 'var(--ha-surface)'}}>
                                      <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-pink-400" />
                                        <span className="text-white text-sm">{salle.nom}</span>
                                        <Badge variant="outline" className="text-xs">{salle.nombre_etudiants || 0} / {salle.capacite}</Badge>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => openEditDialog('salle', salle)} className="h-7 w-7 text-white">
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette salle ?") && deleteSalleMutation.mutate(salle.id)} className="h-7 w-7 text-red-500">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {orientOptions.map((opt) => {
                                const optSalles = salles.filter(s => s.option_id === opt.id);
                                return (
                                  <div key={opt.id} className="border border-[#5a5a5a] rounded-lg p-2" style={{backgroundColor: '#5a5a5a'}}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => toggleExpand('option', opt.id)} className="text-white">
                                          {expandedOptions[opt.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        </button>
                                        <Badge className="bg-green-600 text-xs">Option</Badge>
                                        <span className="text-white text-sm font-medium">{opt.nom}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button size="sm" onClick={() => openCreateDialog('salle', { departement_id: dept.id, orientation_id: orientation.id, option_id: opt.id })} className="bg-transparent border border-pink-600 text-pink-600 hover:bg-pink-600/10 h-7 text-xs">
                                          <Plus className="w-3 h-3 mr-1" /> Promotion
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => openEditDialog('option', opt)} className="h-7 w-7 text-white">
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette option ?") && deleteOptionMutation.mutate(opt.id)} className="h-7 w-7 text-red-500">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {expandedOptions[opt.id] && optSalles.length > 0 && (
                                      <div className="ml-5 mt-2 space-y-1">
                                        {optSalles.map((salle) => (
                                          <div key={salle.id} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: 'var(--ha-bg)'}}>
                                            <div className="flex items-center gap-2">
                                              <Users className="w-4 h-4 text-pink-400" />
                                              <span className="text-white text-sm">{salle.nom}</span>
                                              <Badge variant="outline" className="text-xs">{salle.nombre_etudiants || 0} / {salle.capacite}</Badge>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Button size="icon" variant="ghost" onClick={() => openEditDialog('salle', salle)} className="h-7 w-7 text-white">
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                              <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette salle ?") && deleteSalleMutation.mutate(salle.id)} className="h-7 w-7 text-red-500">
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
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

                    {/* Options sans orientation */}
                    {options.filter(o => o.departement_id === dept.id && !o.orientation_id).map((opt) => {
                      const optSalles = salles.filter(s => s.option_id === opt.id);
                      return (
                        <div key={opt.id} className="border border-[#5a5a5a] rounded-lg p-2" style={{backgroundColor: '#5a5a5a'}}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleExpand('option', opt.id)} className="text-white">
                                {expandedOptions[opt.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                              <Badge className="bg-green-600 text-xs">Option</Badge>
                              <span className="text-white text-sm font-medium">{opt.nom}</span>
                              {opt.code && <span className="text-gray-400 text-xs">({opt.code})</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="sm" onClick={() => openCreateDialog('salle', { departement_id: dept.id, option_id: opt.id })} className="bg-transparent border border-pink-600 text-pink-600 hover:bg-pink-600/10 h-7 text-xs">
                                <Plus className="w-3 h-3 mr-1" /> Promotion
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => openEditDialog('option', opt)} className="h-7 w-7 text-white">
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette option ?") && deleteOptionMutation.mutate(opt.id)} className="h-7 w-7 text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {expandedOptions[opt.id] && optSalles.length > 0 && (
                            <div className="ml-5 mt-2 space-y-1">
                              {optSalles.map((salle) => (
                                <div key={salle.id} className="flex items-center justify-between p-2 rounded" style={{backgroundColor: 'var(--ha-bg)'}}>
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-pink-400" />
                                    <span className="text-white text-sm">{salle.nom}</span>
                                    <Badge variant="outline" className="text-xs">{salle.nombre_etudiants || 0} / {salle.capacite}</Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => openEditDialog('salle', salle)} className="h-7 w-7 text-white">
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => confirm("Supprimer cette salle ?") && deleteSalleMutation.mutate(salle.id)} className="h-7 w-7 text-red-500">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {facultes.length === 0 && departements.filter(d => !d.faculte_id).length === 0 && (
              <div className="text-center py-12">
                <School className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-white mb-2" style={CG}>Aucun élément créé</p>
                <p className="text-gray-400 text-sm" style={CG}>Commencez par créer une faculté ou un département</p>
              </div>
            )}
            </div>
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <Button variant="outline" onClick={() => setShowStructureDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>Fermer</Button>
        </DraggableDialogFooter>
      </DraggableDialog>

        {/* Dialog universel */}
        <DraggableDialog open={showDialog} onOpenChange={setShowDialog} title={<span className="text-white text-lg font-semibold" style={CG}>{formData.isEdit ? "Modifier" : "Créer"} {currentStep === 'faculte' ? 'une Faculté' : currentStep === 'departement' ? 'un Département' : currentStep === 'option' ? 'une Option' : currentStep === 'orientation' ? 'une Orientation' : 'une Promotion'}</span>}>
          <DraggableDialogBody>
            <div className="space-y-4">
              {currentStep !== 'salle' && (
                <>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Nom *</Label>
                    <Input value={formData.nom || ""} onChange={(e) => setFormData({...formData, nom: e.target.value})} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                  </div>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Code</Label>
                    <Input value={formData.code || ""} onChange={(e) => setFormData({...formData, code: e.target.value})} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                  </div>
                </>
              )}

              {/* Sélection hiérarchique optionnelle */}
              {currentStep === 'departement' && (
                <div>
                  <Label className="text-white text-xs font-medium" style={CG}>Faculté (optionnel)</Label>
                  <Select value={formData.faculte_id || ""} onValueChange={(v) => setFormData({...formData, faculte_id: v || undefined})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}>
                      <SelectValue placeholder="Sans faculté" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sans faculté</SelectItem>
                      {facultes.map((f) => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {currentStep === 'orientation' && (
                <>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Faculté (optionnel)</Label>
                    <Select value={formData.faculte_id || ""} onValueChange={(v) => setFormData({...formData, faculte_id: v || undefined, departement_id: undefined})}>
                      <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}>
                        <SelectValue placeholder="Sans faculté" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Sans faculté</SelectItem>
                        {facultes.map((f) => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Département (optionnel)</Label>
                    <Select value={formData.departement_id || ""} onValueChange={(v) => setFormData({...formData, departement_id: v || undefined})}>
                      <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}>
                        <SelectValue placeholder="Sans département" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Sans département</SelectItem>
                        {departements.filter(d => !formData.faculte_id || d.faculte_id === formData.faculte_id).map((d) => <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {currentStep === 'option' && (
                <>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Faculté (optionnel)</Label>
                    <Select value={formData.faculte_id || ""} onValueChange={(v) => setFormData({...formData, faculte_id: v || undefined, departement_id: undefined, orientation_id: undefined})}>
                      <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}>
                        <SelectValue placeholder="Sans faculté" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Sans faculté</SelectItem>
                        {facultes.map((f) => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Département (optionnel)</Label>
                    <Select value={formData.departement_id || ""} onValueChange={(v) => setFormData({...formData, departement_id: v || undefined, orientation_id: undefined})}>
                      <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}>
                        <SelectValue placeholder="Sans département" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Sans département</SelectItem>
                        {departements.filter(d => !formData.faculte_id || d.faculte_id === formData.faculte_id).map((d) => <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Orientation (optionnel)</Label>
                    <Select value={formData.orientation_id || ""} onValueChange={(v) => setFormData({...formData, orientation_id: v || undefined})}>
                      <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}>
                        <SelectValue placeholder="Sans orientation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Sans orientation</SelectItem>
                        {orientations.filter(o => (!formData.faculte_id || o.faculte_id === formData.faculte_id) && (!formData.departement_id || o.departement_id === formData.departement_id)).map((o) => <SelectItem key={o.id} value={o.id}>{o.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {currentStep === 'salle' && (
                <>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Promotion *</Label>
                    <Select value={formData.niveau_academique || ""} onValueChange={(v) => setFormData({...formData, niveau_academique: v})}>
                      <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}>
                        <SelectValue placeholder="Sélectionnez la promotion du système LMD" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1ère Licence">1ère Licence</SelectItem>
                        <SelectItem value="2ème Licence">2ème Licence</SelectItem>
                        <SelectItem value="3ème Licence">3ème Licence</SelectItem>
                        <SelectItem value="1ère Maîtrise">1ère Maîtrise</SelectItem>
                        <SelectItem value="2ème Maîtrise">2ème Maîtrise</SelectItem>
                        <SelectItem value="3ème Maîtrise">3ème Maîtrise</SelectItem>
                        <SelectItem value="1ère Doctorat">1ère Doctorat</SelectItem>
                        <SelectItem value="2ème Doctorat">2ème Doctorat</SelectItem>
                        <SelectItem value="3ème Doctorat">3ème Doctorat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Code</Label>
                    <Input value={formData.code || ""} onChange={(e) => setFormData({...formData, code: e.target.value})} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} placeholder="Ex: A, B, C" />
                  </div>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Capacité (nombre max d'étudiants) *</Label>
                    <Input type="number" value={formData.capacite || ""} onChange={(e) => setFormData({...formData, capacite: e.target.value})} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                  </div>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Nombre actuel d'étudiants</Label>
                    <Input type="number" value={formData.nombre_etudiants || 0} onChange={(e) => setFormData({...formData, nombre_etudiants: e.target.value})} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                  </div>
                </>
              )}

              {currentStep !== 'salle' && (
                <>
                  <div>
                    <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
                    <Input value={formData.description || ""} onChange={(e) => setFormData({...formData, description: e.target.value})} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                  </div>
                </>
              )}
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>Annuler</Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
                {formData.isEdit ? "Modifier" : "Créer"}
              </Button>
          </DraggableDialogFooter>
        </DraggableDialog>
    </div>
  );
}
