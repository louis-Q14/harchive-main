import React, { useEffect, useMemo, useState } from "react";
import { dataService, functionService } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, BookOpen, FileDown, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

const DEFAULT_LEVELS = [
  "1ère graduat",
  "2ème graduat",
  "3ème graduat",
  "1ère licence",
  "2ème licence",
  "Master 1",
  "Master 2",
  "1ère doctorat",
  "2ème doctorat",
  "3ème doctorat",
];

const DISPLAY_LEVELS = [
  "1ère graduat",
  "2ème graduat",
  "3ème graduat",
  "1ère licence",
  "2ème licence",
  "Master 1",
  "Master 2",
  "1ère doctorat",
  "2ème doctorat",
  "3ème doctorat",
];

export default function Matieres() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    nom: "",
    code: "",
    coefficient: 1,
    nombre_heures: "",
    couleur: "#1e40af",
    faculte_ids: [],
    departement_ids: [],
    option_ids: [],
    orientation_ids: [],
    niveau_classes: [],
  });

  const [filters, setFilters] = useState({ faculte: 'all', departement: 'all', option: 'all', classe: 'all' });
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [expandedFacultes, setExpandedFacultes] = useState({});

  useEffect(() => {
    (async () => {
      try {
        let currentUser = { ...authUser };
        if (!currentUser || currentUser.role_archive !== "admin_etablissement") {
          navigate(createPageUrl("Dashboard"));
          return;
        }
        if (!currentUser.etablissement_id || !currentUser.etablissement_nom) {
          const etablissements = await dataService.query('Etablissement');
          const etab = etablissements.find(
            (e) =>
              e.admin_id === currentUser.id ||
              e.admin_email?.toLowerCase() === currentUser.email?.toLowerCase()
          );
          if (etab) {
            currentUser = {
              ...currentUser,
              etablissement_id: etab.id,
              etablissement_nom: etab.nom,
            };
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

  const { data: classes = [] } = useQuery({
    queryKey: ["classes", user?.etablissement_id],
    queryFn: async () => {
      const all = await dataService.query('Classe');
      return all.filter((c) => c.etablissement_id === user.etablissement_id);
    },
    enabled: !!user?.etablissement_id,
  });

  const { data: matieres = [], isLoading } = useQuery({
    queryKey: ["matieres", user?.etablissement_id],
    queryFn: async () => {
      return (
        (await dataService.query('Matiere', {
          filters: [{ etablissement_id: user.etablissement_id }],
          orderBy: "-createdAt",
          limit: 1000
        })) || []
      );
    },
    enabled: !!user?.etablissement_id,
  });

  // Professeurs de l'établissement (pour Titulaire / Assistant)
  const { data: professeurs = [] } = useQuery({
    queryKey: ["professeurs", user?.etablissement_id],
    queryFn: async () => {
      const demandes = await dataService.query('DemandeInscription', { filters: [{
        type_utilisateur: 'professeur',
        statut: 'approuvee',
        etablissement_nom: user.etablissement_nom,
      }] });
      return demandes;
    },
    enabled: !!user?.etablissement_id,
  });

  const profById = useMemo(() => {
    const map = {};
    (professeurs || []).forEach((p) => {
      if (p?.id) map[p.id] = p;
    });
    return map;
  }, [professeurs]);

  const formatUserName = (u) => {
    const parts = [u?.prenom, u?.nom, u?.post_nom].filter(Boolean).join(' ').trim();
    if (parts) return parts;
    const raw = (u?.full_name || u?.email || '').trim();
    const base = raw.includes('@') ? raw.split('@')[0] : raw;
    const formatted = base
      .split(/[._-]+/)
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
    return formatted || 'Utilisateur';
  };

  const profLabel = (u) => formatUserName(u);

  // Assignations pour déterminer Titulaire/Assistant
  const { data: assignations = [] } = useQuery({
    queryKey: ['assignations-matieres', user?.etablissement_id],
    queryFn: async () => {
      const all = await dataService.query('AssignationProfesseur', { orderBy: '-createdAt' });
      return all.filter((a) => a.etablissement_id === user.etablissement_id);
    },
    enabled: !!user?.etablissement_id,
  });

  const assignationsByMatiere = useMemo(() => {
    const map = {};
    (assignations || []).forEach((a) => {
      if (!map[a.matiere_id]) map[a.matiere_id] = [];
      map[a.matiere_id].push(a);
    });
    return map;
  }, [assignations]);

  const getProfsForMatiere = (m) => {
    const arr = assignationsByMatiere[m.id] || [];
    let filtered = arr;
    if (filters.classe !== 'all') {
      filtered = arr.filter((a) => a.classe_nom === filters.classe);
    }
    const clean = (name) => {
      if (!name) return '–';
      if (name.includes('@')) return '–';
      if (!name.includes(' ') && /[._-]/.test(name)) {
        return name
          .split(/[._-]+/)
          .filter(Boolean)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ');
      }
      return name;
    };
    const names = Array.from(new Set(filtered.map((a) => a.professeur_nom).filter(Boolean))).map(clean);
    return { titulaire: names[0] || '–', assistant: names[1] || '–' };
  };

  const cleanDisplayName = (name) => {
    if (!name) return '–';
    if (name.includes('@')) return '–';
    if (!name.includes(' ') && /[._-]/.test(name)) {
      return name
        .split(/[._-]+/)
        .filter(Boolean)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
    }
    return name.trim();
  };

  const getTitulaireName = (m) => {
    const prof = profById[m.titulaire_id];
    const fromProf = cleanDisplayName(prof?.full_name || '');
    if (fromProf !== '–') return fromProf;
    const fromEntity = cleanDisplayName(m.titulaire_nom || '');
    if (fromEntity !== '–') return fromEntity;
    const fromAssign = cleanDisplayName(getProfsForMatiere(m).titulaire || '');
    if (fromAssign !== '–') return fromAssign;
    return '–';
  };

  const getAssistantName = (m) => {
    const prof = profById[m.assistant_id];
    const fromProf = cleanDisplayName(prof?.full_name || '');
    if (fromProf !== '–') return fromProf;
    const fromEntity = cleanDisplayName(m.assistant_nom || '');
    if (fromEntity !== '–') return fromEntity;
    const fromAssign = cleanDisplayName(getProfsForMatiere(m).assistant || '');
    if (fromAssign !== '–') return fromAssign;
    return '–';
  };

  // Charger les facultés de l'établissement
  const { data: etablissementFacultes = [] } = useQuery({
    queryKey: ['etablissement-facultes', user?.etablissement_id],
    queryFn: async () => {
      return await dataService.query('EtablissementFaculte', { filters: [{ etablissement_id: user.etablissement_id }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user?.etablissement_id,
  });

  // Charger les départements de l'établissement
  const { data: etablissementDepartements = [] } = useQuery({
    queryKey: ['etablissement-departements', user?.etablissement_id],
    queryFn: async () => {
      return await dataService.query('EtablissementDepartement', { filters: [{ etablissement_id: user.etablissement_id }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user?.etablissement_id,
  });

  // Charger les options de l'établissement
  const { data: etablissementOptions = [] } = useQuery({
    queryKey: ['etablissement-options', user?.etablissement_id],
    queryFn: async () => {
      return await dataService.query('EtablissementOption', { filters: [{ etablissement_id: user.etablissement_id }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user?.etablissement_id,
  });

  // Charger les orientations de l'établissement
  const { data: etablissementOrientations = [] } = useQuery({
    queryKey: ['etablissement-orientations', user?.etablissement_id],
    queryFn: async () => {
      return await dataService.query('EtablissementOrientation', { filters: [{ etablissement_id: user.etablissement_id }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user?.etablissement_id,
  });

  // Charger les promotions
  const { data: salles = [] } = useQuery({
    queryKey: ["promotions", user?.etablissement_id],
    queryFn: async () => {
      return await dataService.query('Promotion', { filters: [{ etablissement_id: user.etablissement_id }], orderBy: "-createdAt" });
    },
    enabled: !!user?.etablissement_id,
  });

  // Charger les classes depuis les inscriptions approuvées
  const { data: classesFromInscriptions = [] } = useQuery({
    queryKey: ['classes-inscriptions', user?.etablissement_nom],
    queryFn: async () => {
      const demandes = await dataService.query('DemandeInscription', { filters: [{
        type_utilisateur: 'etudiant',
        statut: 'approuvee',
        etablissement_nom: user.etablissement_nom,
      }],
  limit: 1000, offset: 0 });
      
      const classesMap = new Map();
      demandes.forEach(d => {
        if (d.classe && !classesMap.has(d.classe)) {
          classesMap.set(d.classe, {
            nom: d.classe,
            faculte: d.faculte || '',
            departement: d.departement || '',
            option: d.option || '',
            orientation: d.orientation || ''
          });
        }
      });
      
      return Array.from(classesMap.values()).sort((a, b) => a.nom.localeCompare(b.nom));
    },
    enabled: !!user?.etablissement_nom,
  });

  const facultiesFromClasses = useMemo(() => {
    const set = new Set();
    
    // Depuis les classes de l'entité Classe
    (classes || [])
      .map((c) => c.faculte)
      .filter((f) => typeof f === "string" && f.trim().length > 0)
      .forEach(f => set.add(f));
    
    // Depuis les classes issues des inscriptions
    (classesFromInscriptions || [])
      .map((c) => c.faculte)
      .filter((f) => typeof f === "string" && f.trim().length > 0)
      .forEach(f => set.add(f));
    
    return Array.from(set).sort();
  }, [classes, classesFromInscriptions]);

  const baseClassesForFaculty = useMemo(() => {
    if (filters.faculte === 'all') return [];
    return (classes || []).filter((c) => c.faculte === filters.faculte);
  }, [classes, filters.faculte]);

  const departementsList = useMemo(() => {
    const set = new Set(
      baseClassesForFaculty
        .map((c) => c.departement)
        .filter((d) => typeof d === 'string' && d.trim().length > 0)
    );
    return Array.from(set).sort();
  }, [baseClassesForFaculty]);

  const optionsList = useMemo(() => {
    let list = baseClassesForFaculty;
    if (filters.departement !== 'all') list = list.filter((c) => c.departement === filters.departement);
    const set = new Set(
      list
        .map((c) => c.option)
        .filter((o) => typeof o === 'string' && o.trim().length > 0)
    );
    return Array.from(set).sort();
  }, [baseClassesForFaculty, filters.departement]);

  const classesList = useMemo(() => {
    let list = baseClassesForFaculty;
    if (filters.departement !== 'all') list = list.filter((c) => c.departement === filters.departement);
    if (filters.option !== 'all') list = list.filter((c) => c.option === filters.option);
    return Array.from(
      new Set(
        list
          .map((c) => c.nom)
          .filter((n) => typeof n === 'string' && n.trim().length > 0)
      )
    ).sort();
  }, [baseClassesForFaculty, filters.departement, filters.option]);

  // Filtrage en cascade pour le formulaire
  const departementsFiltered = useMemo(() => {
    if (formData.faculte_ids.length === 0) return [];
    return (etablissementDepartements || [])
      .filter(d => formData.faculte_ids.includes(d.faculte_id))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [etablissementDepartements, formData.faculte_ids]);

  const orientationsFiltered = useMemo(() => {
    if (formData.departement_ids.length === 0) return [];
    return (etablissementOrientations || [])
      .filter(o => formData.departement_ids.includes(o.departement_id))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [etablissementOrientations, formData.departement_ids]);

  const optionsFiltered = useMemo(() => {
    // Options liées aux orientations
    if (formData.orientation_ids.length > 0) {
      return (etablissementOptions || [])
        .filter(o => formData.orientation_ids.includes(o.orientation_id))
        .sort((a, b) => a.nom.localeCompare(b.nom));
    }
    // Options liées directement aux départements (sans orientation)
    if (formData.departement_ids.length > 0) {
      return (etablissementOptions || [])
        .filter(o => formData.departement_ids.includes(o.departement_id) && !o.orientation_id)
        .sort((a, b) => a.nom.localeCompare(b.nom));
    }
    return [];
  }, [etablissementOptions, formData.departement_ids, formData.orientation_ids]);

  const sortPromotions = (promotions) => {
    const cycleOrder = { 'graduat': 0, 'licence': 1, 'maîtrise': 2, 'maitrise': 2, 'doctorat': 3 };
    
    return promotions.sort((a, b) => {
      const nameA = (a.nom || '').toLowerCase();
      const nameB = (b.nom || '').toLowerCase();
      
      const numA = parseInt((nameA.match(/^(\d+)/) || [])[1]) || 99;
      const numB = parseInt((nameB.match(/^(\d+)/) || [])[1]) || 99;
      
      const cycleA = Object.keys(cycleOrder).find(c => nameA.includes(c));
      const cycleB = Object.keys(cycleOrder).find(c => nameB.includes(c));
      const orderA = cycleA != null ? cycleOrder[cycleA] : 99;
      const orderB = cycleB != null ? cycleOrder[cycleB] : 99;
      
      if (orderA !== orderB) return orderA - orderB;
      if (numA !== numB) return numA - numB;
      return nameA.localeCompare(nameB);
    });
  };

  const sallesFiltered = useMemo(() => {
    // Afficher les niveaux académiques seulement depuis le dernier niveau sélectionné
    
    // Si des options sont sélectionnées → niveaux des options
    if (formData.option_ids.length > 0) {
      const filtered = (salles || []).filter(s => formData.option_ids.includes(s.option_id));
      return sortPromotions(filtered);
    }
    
    // Si des orientations sont sélectionnées mais pas d'options
    if (formData.orientation_ids.length > 0) {
      // Vérifier s'il y a des options disponibles pour ces orientations
      const hasOptions = (etablissementOptions || []).some(o => 
        formData.orientation_ids.includes(o.orientation_id)
      );
      
      // Si des options existent, ne pas afficher les niveaux (attendre sélection d'options)
      if (hasOptions) return [];
      
      // Sinon, afficher les niveaux des orientations
      const filtered = (salles || []).filter(s => formData.orientation_ids.includes(s.orientation_id) && !s.option_id);
      return sortPromotions(filtered);
    }
    
    // Si des départements sont sélectionnés mais pas d'orientations
    if (formData.departement_ids.length > 0) {
      // Vérifier s'il y a des orientations ou options disponibles pour ces départements
      const hasOrientations = (etablissementOrientations || []).some(o => 
        formData.departement_ids.includes(o.departement_id)
      );
      const hasOptions = (etablissementOptions || []).some(o => 
        formData.departement_ids.includes(o.departement_id) && !o.orientation_id
      );
      
      // Si orientations ou options existent, ne pas afficher les niveaux
      if (hasOrientations || hasOptions) return [];
      
      // Sinon, afficher les niveaux des départements
      const filtered = (salles || []).filter(s => formData.departement_ids.includes(s.departement_id) && !s.orientation_id && !s.option_id);
      return sortPromotions(filtered);
    }
    
    // Si seulement des facultés sont sélectionnées → ne rien afficher
    return [];
  }, [salles, etablissementOrientations, etablissementOptions, formData.faculte_ids, formData.departement_ids, formData.orientation_ids, formData.option_ids]);

  const filteredMatieres = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return matieres;
    return (matieres || []).filter((m) => {
      const inNom = (m.nom || "").toLowerCase().includes(q);
      const inCode = (m.code || "").toLowerCase().includes(q);
      const inFac = (m.faculte || "Sans faculté").toLowerCase().includes(q);
      const inNiv = (m.niveaux || []).some((n) => (n || "").toLowerCase().includes(q));
      return inNom || inCode || inFac || inNiv;
    });
  }, [search, matieres]);

  const filteredBySelectors = useMemo(() => {
    if (filters.faculte === 'all') return [];

    const baseMat = (filteredMatieres || []).filter(
      (m) => (m.faculte || 'Sans faculté') === filters.faculte
    );

    let relevant = (classes || []).filter((c) => c.faculte === filters.faculte);
    if (filters.departement !== 'all') relevant = relevant.filter((c) => c.departement === filters.departement);
    if (filters.option !== 'all') relevant = relevant.filter((c) => c.option === filters.option);
    if (filters.classe !== 'all') relevant = relevant.filter((c) => c.nom === filters.classe);

    if (relevant.length === 0) return baseMat;

    return baseMat.filter((m) => {
      const nivs = Array.isArray(m.niveaux) ? m.niveaux : [];
      return relevant.some((c) => nivs.includes(c.niveau));
    });
  }, [filteredMatieres, classes, filters]);

  const displayedMatieres = filteredBySelectors;

  const groupedByFacultyDepartment = useMemo(() => {
    const map = {};
    (filteredMatieres || []).forEach((m) => {
      const fac = m.faculte?.trim() || "Sans faculté";
      const levels = (Array.isArray(m.niveaux) && m.niveaux.length > 0)
        ? m.niveaux
        : ["Non défini"];
      
      if (!map[fac]) map[fac] = {};
      
      // Pour chaque niveau, trouver le département correspondant
      levels.forEach((niveauNom) => {
        const salle = salles.find(s => s.nom === niveauNom);
        const dept = salle?.departement_nom?.trim() || "Sans département";
        
        if (!map[fac][dept]) map[fac][dept] = [];
        map[fac][dept].push({ matiere: m, niveau: niveauNom });
      });
    });
    return map;
  }, [filteredMatieres, salles]);

  // Mutations
  const queryKey = ["matieres", user?.etablissement_id];
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const faculte = payload.faculte_ids?.length > 0 ? etablissementFacultes.find(f => f.id === payload.faculte_ids[0]) : null;
      return dataService.create('Matiere', {
        nom: payload.nom,
        code: payload.code,
        coefficient: Number(payload.coefficient) || 1,
        nombre_heures: Number(payload.nombre_heures) || 0,
        couleur: payload.couleur,
        niveaux: payload.niveau_classes || [],
        faculte: faculte?.nom || "",
        etablissement_id: user.etablissement_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setShowForm(false);
      setEditing(null);
      setFormData({ nom: "", code: "", coefficient: 1, nombre_heures: "", couleur: "#1e40af", faculte_ids: [], departement_ids: [], option_ids: [], orientation_ids: [], niveau_classes: [] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const faculte = payload.faculte_ids?.length > 0 ? etablissementFacultes.find(f => f.id === payload.faculte_ids[0]) : null;
      return dataService.update('Matiere', id, {
        nom: payload.nom,
        code: payload.code,
        coefficient: Number(payload.coefficient) || 1,
        nombre_heures: Number(payload.nombre_heures) || 0,
        couleur: payload.couleur,
        niveaux: payload.niveau_classes || [],
        faculte: faculte?.nom || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setShowForm(false);
      setEditing(null);
      setFormData({ nom: "", code: "", coefficient: 1, nombre_heures: "", couleur: "#1e40af", faculte_ids: [], departement_ids: [], option_ids: [], orientation_ids: [], niveau_classes: [] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => dataService.delete('Matiere', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setShowDelete(false);
      setToDelete(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormData({ nom: "", code: "", coefficient: 1, nombre_heures: "", couleur: "#1e40af", faculte_ids: [], departement_ids: [], option_ids: [], orientation_ids: [], niveau_classes: [] });
    setShowForm(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    const faculte = etablissementFacultes.find(f => f.nom === m.faculte);
    setFormData({
      nom: m.nom || "",
      code: m.code || "",
      coefficient: m.coefficient || 1,
      nombre_heures: m.nombre_heures || "",
      couleur: m.couleur || "#1e40af",
      faculte_ids: faculte?.id ? [faculte.id] : [],
      departement_ids: [],
      option_ids: [],
      orientation_ids: [],
      niveau_classes: Array.isArray(m.niveaux) ? m.niveaux : [],
    });
    setShowForm(true);
  };

  const submitForm = () => {
    if (!formData.nom?.trim()) {
      alert("Veuillez saisir le nom de la matière");
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const [exportingClasse, setExportingClasse] = useState(null);

  const handleExportPDF = async (classe) => {
    setExportingClasse(classe.nom);
    try {
      const rows = (filteredMatieres || []).filter((m) => Array.isArray(m.niveaux) && m.niveaux.includes(classe.nom));
      
      const response = await functionService.exportMatieres({
        classeNom: classe.nom,
        faculte: classe.faculte || '',
        matieres: rows
      });

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matieres-${classe.nom.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setExportingClasse(null);
    } catch (error) {
      setExportingClasse(null);
      console.error("Erreur lors de l'export PDF:", error);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#484848] p-4 md:p-8">
      <div className="w-full px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">Matières</h1>
              <p className="text-white">Filtrez et parcourez les matières</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle matière
          </Button>
        </div>

        {/* Search */}
        <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <Input
                placeholder="Rechercher (nom, code, faculté, niveau) ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-gray-300"
                style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d'}}
              />
              <div className="text-sm" style={{color:'#e0e0e0'}}>Total: {displayedMatieres.length}</div>
            </div>
          </CardContent>
        </Card>

        {/* Matières organisées par Faculté et Niveau */}
        <div className="space-y-6">
          {etablissementFacultes.length === 0 ? (
            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-white mb-2">Aucune structure académique configurée</p>
                <p className="text-gray-400 text-sm">Veuillez d'abord configurer vos facultés et niveaux académiques</p>
              </CardContent>
            </Card>
          ) : (
            etablissementFacultes.map((faculte) => {
              const departementsMap = groupedByFacultyDepartment[faculte.nom];
              if (!departementsMap || Object.keys(departementsMap).length === 0) return null;

              const totalMatieres = Object.values(departementsMap).reduce((sum, items) => {
                const uniqueMatieres = new Set(items.map(item => item.matiere.id));
                return sum + uniqueMatieres.size;
              }, 0);

              const isExpanded = expandedFacultes[faculte.id] !== false;

              return (
                <Card key={faculte.id} style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
                  <CardHeader 
                    style={{backgroundColor:'#2d2d2d', borderColor:'#3d3d3d'}}
                    className="cursor-pointer"
                    onClick={() => setExpandedFacultes(prev => ({ ...prev, [faculte.id]: !isExpanded }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-white flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />
                        )}
                        <div>
                          <CardTitle className="text-white text-xl">{faculte.nom}</CardTitle>
                          {faculte.code && <p className="text-gray-400 text-sm mt-1">Code: {faculte.code}</p>}
                        </div>
                      </div>
                      <Badge className="bg-purple-600 text-white">
                        {totalMatieres} matière(s)
                      </Badge>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="space-y-8 pt-6">
                    {Object.entries(departementsMap).sort(([a], [b]) => a.localeCompare(b)).map(([departementNom, items]) => {
                      // Grouper les matières uniques
                      const matieresMap = new Map();
                      items.forEach(({ matiere, niveau }) => {
                        if (!matieresMap.has(matiere.id)) {
                          matieresMap.set(matiere.id, { ...matiere, niveauxList: [] });
                        }
                        matieresMap.get(matiere.id).niveauxList.push(niveau);
                      });
                      const matieresUniques = Array.from(matieresMap.values());

                      return (
                        <div key={departementNom} className="space-y-3">
                          <div className="flex items-center gap-3 px-2 mb-3">
                            <h3 className="text-white font-semibold text-base">
                              {departementNom}
                            </h3>
                            <Badge className="bg-blue-600 text-white">
                              {matieresUniques.length} matière(s)
                            </Badge>
                          </div>
                          
                          <div className="border border-[#2d2d2d] rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <Table className="text-white [&_*]:text-white">
                                <TableHeader>
                                  <TableRow style={{backgroundColor:'#2d2d2d'}}>
                                    <TableHead className="text-white w-[100px]">Code</TableHead>
                                    <TableHead className="text-white w-[250px]">Nom de la Matière</TableHead>
                                    <TableHead className="text-white w-[300px]">Promotion</TableHead>
                                    <TableHead className="text-white text-center w-[100px]">Heures</TableHead>
                                    <TableHead className="text-white text-center w-[120px]">Coefficient</TableHead>
                                    <TableHead className="text-white text-center w-[100px]">Couleur</TableHead>
                                    <TableHead className="text-right text-white w-[120px]">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {matieresUniques.map((m) => (
                                    <TableRow key={m.id} className="hover:bg-[#2d2d2d]">
                                      <TableCell className="font-medium text-white">
                                        <Badge variant="outline" className="text-white border-gray-500">
                                          {m.code || "-"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-white font-medium">{m.nom}</TableCell>
                                      <TableCell className="text-white text-sm">
                                        {sortPromotions(m.niveauxList.map(n => ({nom: n}))).map(p => p.nom).join(" | ")}
                                      </TableCell>
                                      <TableCell className="text-white text-center">
                                        {m.nombre_heures ? `${m.nombre_heures}h` : "-"}
                                      </TableCell>
                                      <TableCell className="text-white text-center">
                                        <Badge className="bg-green-600 text-white">
                                          {m.coefficient || 1}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <span 
                                            className="h-6 w-6 rounded border border-white" 
                                            style={{ backgroundColor: m.couleur || '#1e40af' }}
                                          />
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center gap-1 justify-end">
                                          <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            onClick={() => openEdit(m)} 
                                            className="h-8 w-8 text-white hover:bg-[#4d4d4d]"
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            onClick={() => { setToDelete(m); setShowDelete(true); }} 
                                            className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}

          {filteredMatieres.length === 0 && etablissementFacultes.length > 0 && (
            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-white mb-2">Aucune matière créée</p>
                <p className="text-gray-400 text-sm">Créez votre première matière en cliquant sur "Nouvelle matière"</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create/Edit dialog */}
        <DraggableDialog
          open={showForm}
          onOpenChange={setShowForm}
          title={
            <div style={CG}>
              <div className="text-base font-semibold text-white">{editing ? "Modifier la matière" : "Nouvelle matière"}</div>
              <div className="text-xs mt-0.5" style={{color: 'var(--ha-text-muted)'}}>Renseignez les informations de la matière et ses rattachements</div>
            </div>
          }
          maxWidth="max-w-2xl"
          resizable={false}
        >
          <DraggableDialogBody>
            <div className="grid gap-4" style={CG}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-white">Nom *</Label>
                  <Input id="nom" value={formData.nom} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d'}} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-white">Code</Label>
                  <Input id="code" value={formData.code} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d'}} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="coef" className="text-white">Coefficient</Label>
                  <Input id="coef" type="number" min={1} value={formData.coefficient} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d'}} onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heures" className="text-white">Nombre d'heures</Label>
                  <Input id="heures" type="number" min={0} value={formData.nombre_heures} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d'}} onChange={(e) => setFormData({ ...formData, nombre_heures: e.target.value })} placeholder="Ex: 60" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Couleur</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={formData.couleur} onChange={(e) => setFormData({ ...formData, couleur: e.target.value })} className="h-10 w-12 p-0 border rounded" />
                    <Input value={formData.couleur} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d'}} onChange={(e) => setFormData({ ...formData, couleur: e.target.value })} />
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Facultés (sélection multiple)</Label>
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                    {etablissementFacultes.length === 0 ? (
                      <p className="text-sm text-gray-400">Aucune faculté disponible</p>
                    ) : (
                      etablissementFacultes.map((f) => (
                        <label key={f.id} className="flex items-center gap-2 p-1 hover:bg-[#3d3d3d] rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.faculte_ids.includes(f.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData, 
                                  faculte_ids: [...formData.faculte_ids, f.id],
                                  departement_ids: [],
                                  orientation_ids: [],
                                  option_ids: [],
                                  niveau_classes: []
                                });
                              } else {
                                setFormData({
                                  ...formData, 
                                  faculte_ids: formData.faculte_ids.filter(id => id !== f.id),
                                  departement_ids: [],
                                  orientation_ids: [],
                                  option_ids: [],
                                  niveau_classes: []
                                });
                              }
                            }}
                          />
                          <span className="text-sm text-white">{f.nom}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Départements (sélection multiple)</Label>
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                    {formData.faculte_ids.length === 0 ? (
                      <p className="text-sm text-gray-400">Sélectionnez d'abord une faculté</p>
                    ) : departementsFiltered.length === 0 ? (
                      <p className="text-sm text-gray-400">Aucun département disponible</p>
                    ) : (
                      departementsFiltered.map((d) => (
                        <label key={d.id} className="flex items-center gap-2 p-1 hover:bg-[#3d3d3d] rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.departement_ids.includes(d.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData, 
                                  departement_ids: [...formData.departement_ids, d.id],
                                  orientation_ids: [],
                                  option_ids: [],
                                  niveau_classes: []
                                });
                              } else {
                                setFormData({
                                  ...formData, 
                                  departement_ids: formData.departement_ids.filter(id => id !== d.id),
                                  orientation_ids: [],
                                  option_ids: [],
                                  niveau_classes: []
                                });
                              }
                            }}
                          />
                          <span className="text-sm text-white">{d.nom}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Orientations (sélection multiple)</Label>
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                    {formData.departement_ids.length === 0 ? (
                      <p className="text-sm text-gray-400">Sélectionnez d'abord un département</p>
                    ) : orientationsFiltered.length === 0 ? (
                      <p className="text-sm text-gray-400">Aucune orientation disponible</p>
                    ) : (
                      orientationsFiltered.map((o) => (
                        <label key={o.id} className="flex items-center gap-2 p-1 hover:bg-[#3d3d3d] rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.orientation_ids.includes(o.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData, 
                                  orientation_ids: [...formData.orientation_ids, o.id],
                                  option_ids: [],
                                  niveau_classes: []
                                });
                              } else {
                                setFormData({
                                  ...formData, 
                                  orientation_ids: formData.orientation_ids.filter(id => id !== o.id),
                                  option_ids: [],
                                  niveau_classes: []
                                });
                              }
                            }}
                          />
                          <span className="text-sm text-white">{o.nom}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Options (sélection multiple)</Label>
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                    {(formData.departement_ids.length === 0 && formData.orientation_ids.length === 0) ? (
                      <p className="text-sm text-gray-400">Sélectionnez d'abord un département ou une orientation</p>
                    ) : optionsFiltered.length === 0 ? (
                      <p className="text-sm text-gray-400">Aucune option disponible</p>
                    ) : (
                      optionsFiltered.map((o) => (
                        <label key={o.id} className="flex items-center gap-2 p-1 hover:bg-[#3d3d3d] rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.option_ids.includes(o.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData, 
                                  option_ids: [...formData.option_ids, o.id],
                                  niveau_classes: []
                                });
                              } else {
                                setFormData({
                                  ...formData, 
                                  option_ids: formData.option_ids.filter(id => id !== o.id),
                                  niveau_classes: []
                                });
                              }
                            }}
                          />
                          <span className="text-sm text-white">{o.nom}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Hiérarchie avec expansion/collapse */}
              <div className="space-y-2">
                <Label className="text-white">Structure Académique</Label>
                <div className="border rounded-md p-2 h-96 overflow-y-auto" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                  {formData.faculte_ids.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Sélectionnez d'abord une ou plusieurs facultés ci-dessus
                    </p>
                  ) : formData.departement_ids.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Sélectionnez ensuite un ou plusieurs départements
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {etablissementFacultes
                        .filter(f => formData.faculte_ids.includes(f.id))
                        .map(faculte => {
                          const depts = departementsFiltered.filter(d => d.faculte_id === faculte.id);
                          return (
                            <div key={faculte.id} className="mb-2">
                              <div className="flex items-center gap-2 p-2 bg-purple-600/20 rounded">
                                <Badge className="bg-purple-600 text-white text-xs">Faculté</Badge>
                                <span className="text-white text-sm font-semibold">{faculte.nom}</span>
                              </div>
                              <div className="ml-4 mt-1 space-y-1">
                                {depts.map(dept => {
                                  const orients = orientationsFiltered.filter(o => o.departement_id === dept.id);
                                  const opts = optionsFiltered.filter(o => o.departement_id === dept.id && !o.orientation_id);
                                  const sallesDirect = sallesFiltered.filter(s => s.departement_id === dept.id && !s.orientation_id && !s.option_id);

                                  return (
                                    <div key={dept.id} className="mb-2">
                                      <div className="flex items-center gap-2 p-2 bg-blue-600/20 rounded">
                                        <Badge className="bg-blue-600 text-white text-xs">Département</Badge>
                                        <span className="text-white text-sm">{dept.nom}</span>
                                      </div>
                                      <div className="ml-4 mt-1 space-y-1">
                                        {/* Niveaux directs du département */}
                                        {sallesDirect.length > 0 && (
                                          <div className="space-y-1 mb-2">
                                            <div className="text-xs text-gray-400 uppercase font-semibold">Niveaux Académiques</div>
                                            {sallesDirect.map(salle => (
                                              <label key={salle.id} className="flex items-center gap-2 p-1.5 hover:bg-[#3d3d3d] rounded cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={formData.niveau_classes.includes(salle.nom)}
                                                  onChange={(e) => {
                                                    if (e.target.checked) {
                                                      setFormData({ ...formData, niveau_classes: [...formData.niveau_classes, salle.nom] });
                                                    } else {
                                                      setFormData({ ...formData, niveau_classes: formData.niveau_classes.filter(n => n !== salle.nom) });
                                                    }
                                                  }}
                                                  className="rounded"
                                                />
                                                <span className="text-sm text-white">{salle.nom}</span>
                                              </label>
                                            ))}
                                          </div>
                                        )}

                                        {/* Orientations */}
                                        {orients.map(orient => {
                                          const optsOrient = optionsFiltered.filter(o => o.orientation_id === orient.id);
                                          const sallesOrient = sallesFiltered.filter(s => s.orientation_id === orient.id && !s.option_id);

                                          return (
                                            <div key={orient.id} className="mb-2">
                                              <div className="flex items-center gap-2 p-1.5 bg-orange-600/20 rounded">
                                                <Badge className="bg-orange-600 text-white text-xs">Orientation</Badge>
                                                <span className="text-white text-sm">{orient.nom}</span>
                                              </div>
                                              <div className="ml-4 mt-1 space-y-1">
                                                {sallesOrient.length > 0 && (
                                                  <div className="space-y-1 mb-2">
                                                    <div className="text-xs text-gray-400 uppercase font-semibold">Niveaux Académiques</div>
                                                    {sallesOrient.map(salle => (
                                                      <label key={salle.id} className="flex items-center gap-2 p-1.5 hover:bg-[#3d3d3d] rounded cursor-pointer">
                                                        <input
                                                          type="checkbox"
                                                          checked={formData.niveau_classes.includes(salle.nom)}
                                                          onChange={(e) => {
                                                            if (e.target.checked) {
                                                              setFormData({ ...formData, niveau_classes: [...formData.niveau_classes, salle.nom] });
                                                            } else {
                                                              setFormData({ ...formData, niveau_classes: formData.niveau_classes.filter(n => n !== salle.nom) });
                                                            }
                                                          }}
                                                          className="rounded"
                                                        />
                                                        <span className="text-sm text-white">{salle.nom}</span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                )}

                                                {optsOrient.map(opt => {
                                                  const sallesOpt = sallesFiltered.filter(s => s.option_id === opt.id);
                                                  return (
                                                    <div key={opt.id} className="mb-1">
                                                      <div className="flex items-center gap-2 p-1.5 bg-green-600/20 rounded">
                                                        <Badge className="bg-green-600 text-white text-xs">Option</Badge>
                                                        <span className="text-white text-xs">{opt.nom}</span>
                                                      </div>
                                                      {sallesOpt.length > 0 && (
                                                        <div className="ml-4 mt-1 space-y-1">
                                                          {sallesOpt.map(salle => (
                                                            <label key={salle.id} className="flex items-center gap-2 p-1 hover:bg-[#3d3d3d] rounded cursor-pointer">
                                                              <input
                                                                type="checkbox"
                                                                checked={formData.niveau_classes.includes(salle.nom)}
                                                                onChange={(e) => {
                                                                  if (e.target.checked) {
                                                                    setFormData({ ...formData, niveau_classes: [...formData.niveau_classes, salle.nom] });
                                                                  } else {
                                                                    setFormData({ ...formData, niveau_classes: formData.niveau_classes.filter(n => n !== salle.nom) });
                                                                  }
                                                                }}
                                                                className="rounded"
                                                              />
                                                              <span className="text-xs text-white">{salle.nom}</span>
                                                            </label>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        })}

                                        {/* Options sans orientation */}
                                        {opts.map(opt => {
                                          const sallesOpt = sallesFiltered.filter(s => s.option_id === opt.id);
                                          return (
                                            <div key={opt.id} className="mb-1">
                                              <div className="flex items-center gap-2 p-1.5 bg-green-600/20 rounded">
                                                <Badge className="bg-green-600 text-white text-xs">Option</Badge>
                                                <span className="text-white text-xs">{opt.nom}</span>
                                              </div>
                                              {sallesOpt.length > 0 && (
                                                <div className="ml-4 mt-1 space-y-1">
                                                  {sallesOpt.map(salle => (
                                                    <label key={salle.id} className="flex items-center gap-2 p-1 hover:bg-[#3d3d3d] rounded cursor-pointer">
                                                      <input
                                                        type="checkbox"
                                                        checked={formData.niveau_classes.includes(salle.nom)}
                                                        onChange={(e) => {
                                                          if (e.target.checked) {
                                                            setFormData({ ...formData, niveau_classes: [...formData.niveau_classes, salle.nom] });
                                                          } else {
                                                            setFormData({ ...formData, niveau_classes: formData.niveau_classes.filter(n => n !== salle.nom) });
                                                          }
                                                        }}
                                                        className="rounded"
                                                      />
                                                      <span className="text-xs text-white">{salle.nom}</span>
                                                    </label>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
                {formData.niveau_classes.length > 0 && (
                 <p className="text-xs text-blue-400 mt-1">
                   {formData.niveau_classes.length} niveau(x) sélectionné(s)
                 </p>
                )}
                </div>
                </div>
                </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} style={{...CG, backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--ha-text)', borderColor: 'rgba(255,255,255,0.15)'}}>
              Annuler
            </Button>
            <Button onClick={submitForm} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...
                </>
              ) : (
                editing ? "Enregistrer" : "Créer"
              )}
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>

        {/* Delete dialog */}
        <DraggableDialog open={showDelete} onOpenChange={setShowDelete} title="Supprimer cette matière ?" subtitle="Cette action est irréversible.">
          <DraggableDialogBody>
            <div className="py-2 text-white" style={CG}>{toDelete?.nom} ({toDelete?.code || "sans code"})</div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>Annuler</Button>
            <Button variant="destructive" onClick={() => toDelete && deleteMutation.mutate(toDelete.id)} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white" style={CG}>
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>
      </div>
    </div>
  );
}
