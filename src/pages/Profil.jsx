import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { authService, dataService } from "@/api";
import { uploadFile, uploadProfilePhoto } from "@/api/uploadService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Pencil, Save, X, Camera, MapPin, Briefcase, GraduationCap, Award,
  Globe, Linkedin, Twitter, Phone, Mail, Users, Plus, Trash2, Languages,
  Heart, Loader2, Lock, Unlock, Send, Image as ImageIcon, Video,
  BookOpen, ChevronDown, Check
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfilPublicationItem from "@/components/journal/ProfilPublicationItem";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

class ProfilErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Profil crash:', error, info); }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, background: 'var(--ha-bg)', color: 'var(--ha-text)', minHeight: '100vh' }}>
        <h2 style={{ color: '#ef4444' }}>Erreur dans la page Profil</h2>
        <pre style={{ color: '#fca5a5', whiteSpace: 'pre-wrap', marginTop: 16 }}>{this.state.error.message}</pre>
        <pre style={{ color: 'var(--ha-text-faint)', fontSize: 12, marginTop: 8 }}>{this.state.error.stack}</pre>
        <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '8px 16px', background: '#555', color: 'var(--ha-text)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Reessayer</button>
      </div>
    );
    return this.props.children;
  }
}

function ProfilInner() {
  const { user: authUser, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const userIdFromUrl = urlParams.get('userId');

  const { data: user, isLoading: loading } = useQuery({
    queryKey: ['currentUser', userIdFromUrl],
    queryFn: async () => {
      if (userIdFromUrl) {
        const allUsers = await dataService.query('User', {});
        return allUsers.find(u => u.id === userIdFromUrl) || null;
      }
      const resp = await authService.getCurrentUser();
      return resp.data || resp;
    },
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBanniere, setUploadingBanniere] = useState(false);
  const [activeSection, setActiveSection] = useState("journal");

  useEffect(() => {
    authService.getCurrentUser().then(resp => setCurrentUser(resp)).catch(() => {});
  }, []);

  const [showExpDialog, setShowExpDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showCompDialog, setShowCompDialog] = useState(false);
  const [showLangueDialog, setShowLangueDialog] = useState(false);

  const [formData, setFormData] = useState({
    nom: "", prenom: "", post_nom: "", date_naissance: "", sexe: "", matricule: "",
    etablissement_nom: "", faculte: "", departement: "", option_filiere: "", orientation: "", classe: "",
    telephone: "", adresse: "", ville: "", province: "", pays: "",
    bio: "", titre_professionnel: "", headline: "",
    site_web: "", linkedin: "", twitter: "", facebook: "", instagram: "", github: "",
    competences: [], langues: [], centres_interet: [], experiences: [], formations: [],
    nationalite: "", lieu_naissance: "", etat_civil: "",
    nom_pere: "", nom_mere: "",
    personne_urgence_nom: "", personne_urgence_telephone: "", personne_urgence_relation: ""
  });

  const [newExperience, setNewExperience] = useState({ poste: "", entreprise: "", date_debut: "", date_fin: "", en_cours: false, description: "" });
  const [newFormation, setNewFormation] = useState({ diplome: "", etablissement: "", date_debut: "", date_fin: "", en_cours: false, description: "" });
  const [newCompetence, setNewCompetence] = useState("");
  const [newLangue, setNewLangue] = useState({ langue: "", niveau: "Intermediaire" });
  const [newInteret, setNewInteret] = useState("");

  const [contenu, setContenu] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [typeMedia, setTypeMedia] = useState("texte");
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const parseJsonField = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
    return [];
  };

  useEffect(() => {
    if (user) {
      setFormData({
        nom: user.nom || "", prenom: user.prenom || "", post_nom: user.post_nom || "",
        date_naissance: user.date_naissance || "", sexe: user.sexe || "", matricule: user.matricule || "",
        etablissement_nom: user.etablissement_nom || "", faculte: user.faculte || "",
        departement: user.departement || "", option_filiere: user.option_filiere || "",
        orientation: user.orientation || "", classe: user.classe || "",
        telephone: user.telephone || "", adresse: user.adresse || "",
        ville: user.ville || "", province: user.province || "", pays: user.pays || "RDC",
        bio: user.bio || "", titre_professionnel: user.titre_professionnel || "",
        headline: user.headline || "",
        site_web: user.site_web || "", linkedin: user.linkedin || "",
        twitter: user.twitter || "", facebook: user.facebook || "",
        instagram: user.instagram || "", github: user.github || "",
        competences: parseJsonField(user.competences), langues: parseJsonField(user.langues),
        centres_interet: parseJsonField(user.centres_interet),
        experiences: parseJsonField(user.experiences), formations: parseJsonField(user.formations),
        nationalite: user.nationalite || "", lieu_naissance: user.lieu_naissance || "",
        etat_civil: user.etat_civil || "",
        nom_pere: user.nom_pere || "", nom_mere: user.nom_mere || "",
        personne_urgence_nom: user.personne_urgence_nom || "",
        personne_urgence_telephone: user.personne_urgence_telephone || "",
        personne_urgence_relation: user.personne_urgence_relation || ""
      });
    }
  }, [user]);

  const profileUserId = userIdFromUrl || currentUser?.id || authUser?.id;
  const isOwnProfile = !userIdFromUrl || userIdFromUrl === currentUser?.id || userIdFromUrl === authUser?.id;
  const isFriend = currentUser?.amis ? parseJsonField(currentUser.amis).includes(profileUserId) : false;
  const journalPublic = user?.journal_public !== undefined ? (user.journal_public === 1 || user.journal_public === true) : true;
  // journal_ouvert: allow any logged-in user to post on this profile. Default true if not set.
  const journalOuvert = user?.journal_ouvert !== undefined ? (user.journal_ouvert === 1 || user.journal_ouvert === true) : true;

  // info_privacy: controls which personal info fields are visible to others
  const defaultPrivacy = { email: true, telephone: true, adresse: true, etablissement: true, bio: true, reseaux: true, famille: false, urgence: false };
  const infoPrivacy = useMemo(() => {
    if (!user?.info_privacy) return defaultPrivacy;
    try {
      const parsed = typeof user.info_privacy === 'string' ? JSON.parse(user.info_privacy) : user.info_privacy;
      return { ...defaultPrivacy, ...parsed };
    } catch { return defaultPrivacy; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.info_privacy]);

  const tryParseArray = (val) => {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    try { return JSON.parse(val); } catch { return []; }
  };

  const canSeePubOnProfile = (pub, viewer) => {
    // Always show own posts on own profile
    if (isOwnProfile && pub.auteur_id === profileUserId) return true;
    // Viewer sees their own posts on others' profiles
    if (viewer && pub.auteur_id === viewer.id) return true;
    // Admins see everything
    if (viewer && (viewer.role_archive === 'admin_systeme' || viewer.role_archive === 'super_admin')) return true;
    // Apply visibility rules
    switch (pub.visibilite) {
      case 'publique': return true;
      case 'etablissement':
        return !!(viewer?.etablissement_id && pub.etablissement_id && pub.etablissement_id === viewer.etablissement_id);
      case 'amis': {
        const mesAmis = tryParseArray(viewer?.amis);
        return mesAmis.includes(pub.auteur_id);
      }
      case 'privee': {
        const visibleTo = tryParseArray(pub.visible_to);
        return viewer ? visibleTo.includes(viewer.id) : false;
      }
      default: return true;
    }
  };

  const { data: publications = [], isLoading: loadingPubs } = useQuery({
    queryKey: ['profil-publications', profileUserId, authUser?.id],
    queryFn: async () => {
      const allPubs = await dataService.query('Publication', {});
      const viewer = authUser || currentUser;
      return allPubs
        .filter(pub => {
          // Show on this profile if:
          // 1. Author wrote it for this profile wall (cible_profil_id === profileUserId)
          // 2. Author wrote it with no specific target (own post, no cible_profil_id)
          // Never show a wall post meant for another profile on the author's own profile
          const isOwnPost = pub.auteur_id === profileUserId && !pub.cible_profil_id;
          const isWallPost = pub.cible_profil_id === profileUserId;
          if (!isOwnPost && !isWallPost) return false;
          // Non-owners cannot see masked publications
          const viewerIsOwner = viewer?.id === profileUserId;
          if (!viewerIsOwner && (pub.masque === 1 || pub.masque === true)) return false;
          return canSeePubOnProfile(pub, viewer);
        })
        .sort((a, b) => {
          // Pinned first, then by date
          const aPinned = a.epingle === 1 || a.epingle === true ? 1 : 0;
          const bPinned = b.epingle === 1 || b.epingle === true ? 1 : 0;
          if (bPinned !== aPinned) return bPinned - aPinned;
          return new Date(b.created_date) - new Date(a.created_date);
        });
    },
    enabled: !!profileUserId,
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const updateProfileMutation = useMutation({
    mutationFn: (data) => authService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser', userIdFromUrl] });
      authService.getCurrentUser().then(resp => setCurrentUser(resp)).catch(() => {});
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setEditMode(false); }, 1500);
    },
    onError: (error) => {
      console.error('Save profile error:', error);
    },
  });

  const toggleJournalOuvert = useMutation({
    mutationFn: async (val) => authService.updateProfile({ journal_ouvert: val ? 1 : 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser', userIdFromUrl] });
      authService.getCurrentUser().then(resp => setCurrentUser(resp)).catch(() => {});
    },
  });

  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const updateInfoPrivacy = useMutation({
    mutationFn: (privacy) => authService.updateProfile({ info_privacy: JSON.stringify(privacy) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser', userIdFromUrl] });
      authService.getCurrentUser().then(resp => setCurrentUser(resp)).catch(() => {});
    },
  });
  const togglePrivacyField = (field) => {
    const next = { ...infoPrivacy, [field]: !infoPrivacy[field] };
    updateInfoPrivacy.mutate(next);
  };

  const toggleJournalPublic = useMutation({
    mutationFn: async (val) => {
      const result = await authService.updateProfile({ journal_public: val ? 1 : 0 });
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['currentUser', userIdFromUrl] });
      authService.getCurrentUser().then(resp => setCurrentUser(resp)).catch(() => {});
    },
    onError: (error) => {
      console.error('Toggle journal_public failed:', error);
    },
  });

  const createPublicationMutation = useMutation({
    mutationFn: (pubData) => dataService.create('Publication', pubData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profil-publications'] });
      queryClient.invalidateQueries({ queryKey: ['journal-commun'] });
      setContenu(""); setMediaFile(null); setMediaPreview(null); setTypeMedia("texte");
    }
  });

  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!contenu.trim() && !mediaFile) return;
    const author = authUser || currentUser;
    if (!author?.id) { alert('Erreur: utilisateur non identifié'); return; }
    setPublishing(true);
    try {
      let mediaUrl = null;
      if (mediaFile) {
        try {
          const { uploadService } = await import('@/api');
          const uploadResult = await uploadService.uploadFile(mediaFile, 'posts');
          mediaUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Erreur upload:', uploadError);
          alert(uploadError.message || 'Erreur lors de l\'upload du fichier.');
          return;
        }
      }
      await createPublicationMutation.mutateAsync({
        auteur_id: author.id,
        auteur_nom: [author.prenom, author.nom].filter(Boolean).join(' ') || author.email,
        auteur_photo_url: author.photo_url || null,
        contenu: contenu.trim() || (mediaFile ? (typeMedia === 'image' ? 'Photo partagée' : 'Vidéo partagée') : ''),
        visibilite: 'publique',
        type_media: mediaFile ? typeMedia : 'texte',
        media_url: mediaUrl,
        cible_profil_id: profileUserId || author.id,
        created_date: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erreur publication:', error);
      alert('Erreur lors de la publication.');
    } finally {
      setPublishing(false);
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert("Fichier trop volumineux. Maximum: 50 MB"); return; }
    setMediaFile(file); setTypeMedia(type);
    const reader = new FileReader();
    reader.onloadend = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePhotoUpload = async (e) => {
    if (!isOwnProfile) return;
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Fichier trop volumineux. Maximum: 10 MB"); return; }
    setUploadingPhoto(true);
    try {
      await uploadProfilePhoto(file);
      queryClient.invalidateQueries({ queryKey: ['currentUser', userIdFromUrl] });
    } catch (err) {
      console.error('Erreur upload photo:', err);
      alert('Erreur lors du chargement de la photo');
    }
    finally { setUploadingPhoto(false); }
  };

  const handleBanniereUpload = async (e) => {
    if (!isOwnProfile) return;
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Fichier trop volumineux. Maximum: 10 MB"); return; }
    setUploadingBanniere(true);
    try {
      const result = await uploadFile(file, 'profil');
      await authService.updateProfile({ banner_url: result.url });
      queryClient.invalidateQueries({ queryKey: ['currentUser', userIdFromUrl] });
    } catch (err) {
      console.error('Erreur upload bannière:', err);
      alert('Erreur lors du chargement de la bannière');
    }
    finally { setUploadingBanniere(false); }
  };

  const handleSave = () => {
    if (!isOwnProfile) return;
    const computedFullName = [formData.prenom, formData.nom, formData.post_nom].filter(Boolean).join(' ').trim();
    updateProfileMutation.mutate({ ...formData, full_name: computedFullName || user?.full_name });
  };

  const handleAddExperience = () => {
    const u = [...formData.experiences, newExperience];
    setFormData({ ...formData, experiences: u });
    updateProfileMutation.mutate({ experiences: u });
    setNewExperience({ poste: "", entreprise: "", date_debut: "", date_fin: "", en_cours: false, description: "" });
    setShowExpDialog(false);
  };
  const handleDeleteExperience = (i) => { const u = formData.experiences.filter((_, idx) => idx !== i); setFormData({ ...formData, experiences: u }); updateProfileMutation.mutate({ experiences: u }); };
  const handleAddFormation = () => {
    const u = [...formData.formations, newFormation];
    setFormData({ ...formData, formations: u });
    updateProfileMutation.mutate({ formations: u });
    setNewFormation({ diplome: "", etablissement: "", date_debut: "", date_fin: "", en_cours: false, description: "" });
    setShowFormDialog(false);
  };
  const handleDeleteFormation = (i) => { const u = formData.formations.filter((_, idx) => idx !== i); setFormData({ ...formData, formations: u }); updateProfileMutation.mutate({ formations: u }); };
  const handleAddCompetence = () => {
    if (!newCompetence.trim()) return;
    const u = [...formData.competences, newCompetence.trim()];
    setFormData({ ...formData, competences: u });
    updateProfileMutation.mutate({ competences: u });
    setNewCompetence(""); setShowCompDialog(false);
  };
  const handleDeleteCompetence = (i) => { const u = formData.competences.filter((_, idx) => idx !== i); setFormData({ ...formData, competences: u }); updateProfileMutation.mutate({ competences: u }); };
  const handleAddLangue = () => {
    if (!newLangue.langue.trim()) return;
    const u = [...formData.langues, newLangue];
    setFormData({ ...formData, langues: u });
    updateProfileMutation.mutate({ langues: u });
    setNewLangue({ langue: "", niveau: "Intermediaire" }); setShowLangueDialog(false);
  };
  const handleDeleteLangue = (i) => { const u = formData.langues.filter((_, idx) => idx !== i); setFormData({ ...formData, langues: u }); updateProfileMutation.mutate({ langues: u }); };
  const handleAddInteret = () => {
    if (!newInteret.trim()) return;
    const u = [...formData.centres_interet, newInteret.trim()];
    setFormData({ ...formData, centres_interet: u });
    updateProfileMutation.mutate({ centres_interet: u });
    setNewInteret("");
  };
  const handleDeleteInteret = (i) => { const u = formData.centres_interet.filter((_, idx) => idx !== i); setFormData({ ...formData, centres_interet: u }); updateProfileMutation.mutate({ centres_interet: u }); };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U';
  const getRoleLabel = (role) => ({ admin_systeme: "Administrateur Systeme", admin_etablissement: "Admin Etablissement", professeur: "Professeur", etudiant: "Etudiant", parent: "Parent" })[role] || role;
  const getVisibiliteLabel = (v) => v === 'publique' ? 'Journal Commun' : v === 'etablissement' ? 'Journal Officiel' : 'Personnel';
  const formatDate = (d) => { if (!d) return ''; return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

  if (loading || isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ha-bg)' }}><Loader2 className="w-12 h-12 text-gray-400 animate-spin" /></div>;
  }

  // ============================================================
  // VUE DÉDIÉE HARCHIVE OFFICIEL
  // ============================================================
  if (user?.role_archive === 'harchive_officiel' && isOwnProfile) {
    const [hoEdit, setHoEdit] = React.useState(false);
    const [hoForm, setHoForm] = React.useState({
      nom_org: user?.prenom || 'HARCHIVE',
      description: user?.bio || '',
      slogan: user?.titre_professionnel || '',
      email_contact: user?.email || '',
      telephone: user?.telephone || '',
      site_web: user?.site_web || '',
      linkedin: user?.linkedin || '',
      twitter: user?.twitter || '',
      facebook: user?.facebook || '',
      instagram: user?.instagram || '',
    });
    const [hoSaving, setHoSaving] = React.useState(false);
    const [hoSuccess, setHoSuccess] = React.useState(false);

    const handleHoSave = async () => {
      setHoSaving(true);
      try {
        await authService.updateProfile({
          prenom: hoForm.nom_org,
          bio: hoForm.description,
          titre_professionnel: hoForm.slogan,
          telephone: hoForm.telephone,
          site_web: hoForm.site_web,
          linkedin: hoForm.linkedin,
          twitter: hoForm.twitter,
          facebook: hoForm.facebook,
          instagram: hoForm.instagram,
        });
        queryClient.invalidateQueries({ queryKey: ['currentUser', null] });
        setHoSuccess(true);
        setTimeout(() => { setHoSuccess(false); setHoEdit(false); }, 1500);
      } catch (e) {
        alert('Erreur lors de la sauvegarde');
      } finally {
        setHoSaving(false);
      }
    };

    return (
      <div className="min-h-screen pb-12" style={{ background: 'var(--ha-bg)' }}>
        {/* Bannière */}
        <div className="relative overflow-hidden" style={{ height: 200 }}>
          {user?.banner_url
            ? <img src={user.banner_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f3460 100%)' }} />
          }
          <div className="absolute top-3 right-3">
            <input type="file" accept="image/*" id="ho-banniere-upload" className="hidden" onChange={handleBanniereUpload} disabled={uploadingBanniere} />
            <label htmlFor="ho-banniere-upload" className="cursor-pointer">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                {uploadingBanniere ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                Changer la bannière
              </div>
            </label>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 md:px-6">
          {/* En-tête organisation */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4" style={{ marginTop: -48 }}>
            <div className="relative flex-shrink-0">
              {user?.photo_url
                ? <img src={user.photo_url} alt="" className="w-24 h-24 rounded-2xl object-cover border-4 shadow-xl" style={{ borderColor: 'var(--ha-bg)' }} />
                : <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold border-4 shadow-xl" style={{ background: '#1e3a5f', color: '#fff', borderColor: 'var(--ha-bg)' }}>H</div>
              }
              <input type="file" accept="image/*" id="ho-logo-upload" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              <label htmlFor="ho-logo-upload" className="absolute bottom-1 right-1 cursor-pointer">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-md" style={{ background: 'var(--ha-surface3)', color: 'var(--ha-text)' }}>
                  {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </div>
              </label>
            </div>
            <div className="flex-1 pb-2 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--ha-text)' }}>{user?.prenom || 'HARCHIVE'} {user?.nom || 'Officiel'}</h1>
                <Badge style={{ background: '#1e3a5f', color: '#60a5fa', fontSize: '0.65rem', letterSpacing: '0.05em' }}>✦ OFFICIEL</Badge>
              </div>
              {user?.titre_professionnel && <p className="text-sm italic mt-0.5" style={{ color: 'var(--ha-text-muted)' }}>{user.titre_professionnel}</p>}
              {user?.bio && <p className="text-sm mt-1 leading-relaxed max-w-lg" style={{ color: 'var(--ha-text-muted)' }}>{user.bio}</p>}
            </div>
            <div className="flex-shrink-0">
              <Button size="sm" onClick={() => setHoEdit(!hoEdit)} style={{ background: hoEdit ? '#ef4444' : 'var(--ha-surface3)', color: 'var(--ha-text)' }}>
                {hoEdit ? <><X className="w-4 h-4 mr-1" /> Annuler</> : <><Pencil className="w-4 h-4 mr-1" /> Modifier</>}
              </Button>
            </div>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-6">
            {/* Formulaire d'édition */}
            {hoEdit ? (
              <div className="md:col-span-2">
                <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                  <CardHeader>
                    <CardTitle style={{ color: 'var(--ha-text)', fontSize: '1rem' }}>Modifier le profil officiel</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Nom de l'organisation</Label>
                        <Input value={hoForm.nom_org} onChange={(e) => setHoForm({ ...hoForm, nom_org: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Slogan / accroche</Label>
                        <Input value={hoForm.slogan} onChange={(e) => setHoForm({ ...hoForm, slogan: e.target.value })} placeholder="Ex: L'éducation pour tous" style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Description / à propos</Label>
                      <Textarea value={hoForm.description} onChange={(e) => setHoForm({ ...hoForm, description: e.target.value })} rows={4} placeholder="Décrivez la mission et les valeurs de HARCHIVE..." style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                    </div>
                    <div className="pt-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--ha-text)' }}>Contact</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Téléphone / WhatsApp</Label>
                          <Input value={hoForm.telephone} onChange={(e) => setHoForm({ ...hoForm, telephone: e.target.value })} placeholder="+243 XXX XXX XXX" style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Site web</Label>
                          <Input value={hoForm.site_web} onChange={(e) => setHoForm({ ...hoForm, site_web: e.target.value })} placeholder="https://harchive.net" style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                        </div>
                      </div>
                    </div>
                    <div className="pt-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--ha-text)' }}>Réseaux sociaux</h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        {[['LinkedIn', 'linkedin', 'https://linkedin.com/company/...'],['Twitter / X', 'twitter', 'https://twitter.com/...'],['Facebook', 'facebook', 'https://facebook.com/...'],['Instagram', 'instagram', 'https://instagram.com/...']].map(([label, key, ph]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>{label}</Label>
                            <Input value={hoForm[key]} onChange={(e) => setHoForm({ ...hoForm, [key]: e.target.value })} placeholder={ph} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleHoSave} disabled={hoSaving || hoSuccess} className="w-full mt-2" style={{ background: hoSuccess ? '#16a34a' : 'var(--ha-surface3)', color: 'var(--ha-text)' }}>
                      {hoSuccess ? <><Check className="w-4 h-4 mr-2" /> Enregistré !</> : hoSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                {/* Carte À propos */}
                <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                  <CardHeader>
                    <CardTitle className="text-sm" style={{ color: 'var(--ha-text)' }}>À propos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {user?.bio ? (
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--ha-text-muted)' }}>{user.bio}</p>
                    ) : (
                      <p className="text-sm italic" style={{ color: 'var(--ha-text-faint)' }}>Aucune description renseignée.</p>
                    )}
                    {user?.email && (
                      <div className="flex items-center gap-2 text-sm pt-2" style={{ borderTop: '1px solid var(--ha-border)' }}>
                        <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ha-text-faint)' }} />
                        <span style={{ color: 'var(--ha-text-muted)' }}>{user.email}</span>
                      </div>
                    )}
                    {user?.telephone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ha-text-faint)' }} />
                        <span style={{ color: 'var(--ha-text-muted)' }}>{user.telephone}</span>
                      </div>
                    )}
                    {user?.site_web && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ha-text-faint)' }} />
                        <a href={user.site_web} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--ha-accent)' }}>{user.site_web}</a>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Carte Réseaux sociaux */}
                <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                  <CardHeader>
                    <CardTitle className="text-sm" style={{ color: 'var(--ha-text)' }}>Réseaux sociaux</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(user?.linkedin || user?.twitter || user?.facebook || user?.instagram) ? (
                      <div className="space-y-3">
                        {user?.linkedin && (
                          <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:underline" style={{ color: 'var(--ha-text-muted)' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0077b5' }}><Linkedin className="w-4 h-4 text-white" /></div>
                            LinkedIn
                          </a>
                        )}
                        {user?.twitter && (
                          <a href={user.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:underline" style={{ color: 'var(--ha-text-muted)' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#000' }}><Twitter className="w-4 h-4 text-white" /></div>
                            Twitter / X
                          </a>
                        )}
                        {user?.facebook && (
                          <a href={user.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:underline" style={{ color: 'var(--ha-text-muted)' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1877f2' }}><Globe className="w-4 h-4 text-white" /></div>
                            Facebook
                          </a>
                        )}
                        {user?.instagram && (
                          <a href={user.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:underline" style={{ color: 'var(--ha-text-muted)' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}><Globe className="w-4 h-4 text-white" /></div>
                            Instagram
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm italic" style={{ color: 'var(--ha-text-faint)' }}>Aucun réseau social renseigné.</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
  // ============================================================
    const parts = [user?.prenom, user?.nom, user?.post_nom].filter(Boolean).join(' ').trim();
    if (parts && parts !== 'null') return parts;
    const fn = user?.full_name;
    if (fn && !fn.includes('@') && fn.trim().length > 0) return fn.trim();
    return 'Utilisateur';
  })();

  const canSeeJournal = isOwnProfile || journalPublic || isFriend;
  // Any logged-in user can post if journal_ouvert is on; otherwise only owner and friends
  const viewerLoggedIn = !!(authUser || currentUser);
  const canPublishOnProfile = isOwnProfile || isFriend || (journalOuvert && viewerLoggedIn);

  const sectionBtns = [
    { key: "journal", label: "Journal Personnel", icon: BookOpen },
    { key: "infos", label: "Informations", icon: Users },
    { key: "parcours", label: "Parcours", icon: Briefcase },
    { key: "competences", label: "Competences", icon: Award },
  ];

  return (
    <div className="min-h-screen pb-12" style={{ background: 'var(--ha-bg)', fontFamily: 'Century Gothic, sans-serif' }}>

      {/* === EN-TETE PROFIL === */}
      <div style={{ background: 'var(--ha-surface2)' }}>
        {/* Banniere */}
        <div className="relative overflow-hidden" style={{ height: 220 }}>
          {user?.banner_url
            ? <img src={user.banner_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }} />
          }
          {isOwnProfile && (
            <div className="absolute top-3 right-3">
              <input type="file" accept="image/*" id="banniere-upload" className="hidden" onChange={handleBanniereUpload} disabled={uploadingBanniere} />
              <label htmlFor="banniere-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium" style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--ha-text)' }}>
                  {uploadingBanniere ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                  Banniere
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Bande infos profil — sous la banniere */}
        <div className="px-6 py-2" style={{ background: 'var(--ha-bg)', borderBottom: '1px solid var(--ha-border)' }}>
          <div className="flex flex-col md:flex-row items-center md:items-center gap-3">
            {/* Photo — chevauchement avec la banniere */}
            <div className="relative flex-shrink-0" style={{ marginTop: -40 }}>
              {user?.photo_url ? (
                <img src={user.photo_url} alt="" className="w-20 h-20 rounded-full object-cover border-4 shadow-xl" style={{ borderColor: 'var(--ha-bg)' }} />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-4 shadow-xl" style={{ background: 'var(--ha-surface3)', color: 'var(--ha-text)', borderColor: 'var(--ha-bg)' }}>
                  {getInitials(displayName)}
                </div>
              )}
              {isOwnProfile && (
                <>
                  <input type="file" accept="image/*" id="photo-upload" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  <label htmlFor="photo-upload" className="absolute bottom-0 right-0 cursor-pointer">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ background: 'var(--ha-surface3)', color: 'var(--ha-text)' }}>
                      {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    </div>
                  </label>
                </>
              )}
            </div>

            {/* Nom + role */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-bold leading-tight" style={{ color: 'var(--ha-text)' }}>{displayName}</h1>
              <div className="flex items-center gap-2 mt-0.5 justify-center md:justify-start flex-wrap">
                <Badge style={{ background: 'var(--ha-surface3)', color: 'var(--ha-text)', fontSize: '0.68rem' }}>{getRoleLabel(user?.role_archive)}</Badge>
                {user?.titre_professionnel && <span className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>{user.titre_professionnel}</span>}
              </div>
              {user?.headline && <p className="text-xs italic mt-0.5" style={{ color: 'var(--ha-text-faint)' }}>"{user.headline}"</p>}
            </div>

            {/* Boutons actions */}
            <div className="flex gap-2 flex-shrink-0">
              {isOwnProfile && (
                <Button size="sm" onClick={() => { setActiveSection("infos"); setEditMode(!editMode); }} style={{ background: editMode ? '#ef4444' : 'var(--ha-surface3)', color: 'var(--ha-text)' }}>
                  {editMode ? <><X className="w-4 h-4 mr-1" /> Annuler</> : <><Pencil className="w-4 h-4 mr-1" /> Modifier</>}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === NAVIGATION SECTIONS === */}
      <div className="px-4 md:px-6 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
          {sectionBtns.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
              style={{
                background: activeSection === s.key ? 'var(--ha-surface3)' : 'var(--ha-surface)',
                color: activeSection === s.key ? '#ffffff' : '#b0b0b0',
                border: activeSection === s.key ? '1px solid var(--ha-border)' : '1px solid var(--ha-border)',
              }}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* === CONTENU PRINCIPAL === */}
      <div className="px-4 md:px-6 mt-4">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* COLONNE GAUCHE - Infos rapides */}
          <div className="lg:col-span-1 space-y-4">
            {/* Contact */}
            <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
              <CardContent className="pt-5 space-y-3">
                {/* Email */}
                {(isOwnProfile || infoPrivacy.email) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ha-text-faint)' }} />
                    <span className="break-all" style={{ color: 'var(--ha-text-muted)' }}>{user?.email || 'Non renseigne'}</span>
                    {isOwnProfile && !infoPrivacy.email && <Lock className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: 'var(--ha-text-faint)' }} title="Masque aux autres" />}
                  </div>
                )}
                {/* Telephone */}
                {(isOwnProfile || infoPrivacy.telephone) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ha-text-faint)' }} />
                    <span style={{ color: 'var(--ha-text-muted)' }}>{user?.telephone || 'Non renseigne'}</span>
                    {isOwnProfile && !infoPrivacy.telephone && <Lock className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: 'var(--ha-text-faint)' }} title="Masque aux autres" />}
                  </div>
                )}
                {/* Adresse */}
                {(isOwnProfile || infoPrivacy.adresse) && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--ha-text-faint)' }} />
                    <span style={{ color: 'var(--ha-text-muted)' }}>
                      {[user?.adresse, user?.ville, user?.province, user?.pays].filter(Boolean).join(', ') || 'Non renseigne'}
                    </span>
                    {isOwnProfile && !infoPrivacy.adresse && <Lock className="w-3 h-3 mt-0.5 ml-auto flex-shrink-0" style={{ color: 'var(--ha-text-faint)' }} title="Masque aux autres" />}
                  </div>
                )}
                {/* Etablissement */}
                {user?.etablissement_nom && (isOwnProfile || infoPrivacy.etablissement) && (
                  <div className="flex items-center gap-3 text-sm">
                    <GraduationCap className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ha-text-faint)' }} />
                    <span style={{ color: 'var(--ha-text-muted)' }}>{user.etablissement_nom}</span>
                    {isOwnProfile && !infoPrivacy.etablissement && <Lock className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: 'var(--ha-text-faint)' }} title="Masque aux autres" />}
                  </div>
                )}
                {user?.liste_amis && parseJsonField(user.liste_amis).length > 0 && (
                  <div className="flex items-center gap-3 text-sm pt-2" style={{ borderTop: '1px solid var(--ha-border)' }}>
                    <Users className="w-4 h-4" style={{ color: 'var(--ha-text-faint)' }} />
                    <span style={{ color: 'var(--ha-text-muted)' }}>{parseJsonField(user.liste_amis).length} ami(s)</span>
                  </div>
                )}

                {/* Liens sociaux */}
                {(isOwnProfile || infoPrivacy.reseaux) && (user?.site_web || user?.linkedin || user?.twitter || user?.github) && (
                  <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                    {user?.site_web && <a href={user.site_web} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg" style={{ background: 'var(--ha-surface2)', color: 'var(--ha-text-muted)' }}><Globe className="w-4 h-4" /></a>}
                    {user?.linkedin && <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg" style={{ background: '#0077b5', color: 'var(--ha-text)' }}><Linkedin className="w-4 h-4" /></a>}
                    {user?.twitter && <a href={user.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg" style={{ background: '#1da1f2', color: 'var(--ha-text)' }}><Twitter className="w-4 h-4" /></a>}
                    {isOwnProfile && !infoPrivacy.reseaux && <Lock className="w-3 h-3 self-center ml-1" style={{ color: 'var(--ha-text-faint)' }} title="Masque aux autres" />}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Confidentialite Journal */}
            {isOwnProfile && (
              <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                <CardContent className="pt-5 space-y-4">
                  {/* Visibilite du journal */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {journalPublic ? <Unlock className="w-4 h-4" style={{ color: '#4ade80' }} /> : <Lock className="w-4 h-4" style={{ color: '#ef4444' }} />}
                        <span className="text-sm font-medium" style={{ color: 'var(--ha-text-muted)' }}>Journal {journalPublic ? 'public' : 'prive'}</span>
                      </div>
                      <Switch checked={journalPublic} onCheckedChange={(v) => toggleJournalPublic.mutate(v)} disabled={toggleJournalPublic.isPending}
                        className={journalPublic ? "data-[state=checked]:bg-green-600" : "data-[state=unchecked]:bg-[#555]"}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--ha-text-faint)' }}>
                      {journalPublic ? "Tout le monde peut voir votre journal" : "Seuls vos amis peuvent voir votre journal"}
                    </p>
                  </div>
                  {/* Autoriser les publications externes */}
                  <div style={{ borderTop: '1px solid var(--ha-border)', paddingTop: 12 }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" style={{ color: journalOuvert ? '#60a5fa' : '#888' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--ha-text-muted)' }}>Journal ouvert</span>
                      </div>
                      <Switch checked={journalOuvert} onCheckedChange={(v) => toggleJournalOuvert.mutate(v)} disabled={toggleJournalOuvert.isPending}
                        className={journalOuvert ? "data-[state=checked]:bg-blue-600" : "data-[state=unchecked]:bg-[#555]"}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--ha-text-faint)' }}>
                      {journalOuvert ? "Les autres utilisateurs peuvent publier sur votre journal" : "Seuls vous et vos amis pouvez publier"}
                    </p>
                  </div>
                  {/* Confidentialite des informations personnelles */}
                  <div style={{ borderTop: '1px solid var(--ha-border)', paddingTop: 12 }}>
                    <button
                      onClick={() => setShowPrivacyDetails(v => !v)}
                      className="flex items-center justify-between w-full"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" style={{ color: 'var(--ha-text-faint)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--ha-text-muted)' }}>Infos personnelles</span>
                      </div>
                      <ChevronDown className="w-4 h-4" style={{ color: 'var(--ha-text-faint)', transform: showPrivacyDetails ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </button>
                    <p className="text-xs mt-1" style={{ color: 'var(--ha-text-faint)' }}>Choisissez ce que les autres voient</p>
                    {showPrivacyDetails && (
                      <div className="mt-3 space-y-2.5">
                        {[
                          { key: 'email', label: 'Adresse email' },
                          { key: 'telephone', label: 'Téléphone' },
                          { key: 'adresse', label: 'Adresse / Ville' },
                          { key: 'etablissement', label: 'Établissement' },
                          { key: 'bio', label: 'Biographie' },
                          { key: 'reseaux', label: 'Réseaux sociaux' },
                          { key: 'famille', label: 'Infos famille' },
                          { key: 'urgence', label: 'Contact urgence' },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>{label}</span>
                            <Switch
                              checked={infoPrivacy[key]}
                              onCheckedChange={() => togglePrivacyField(key)}
                              disabled={updateInfoPrivacy.isPending}
                              className={infoPrivacy[key] ? 'data-[state=checked]:bg-green-600' : 'data-[state=unchecked]:bg-[#555]'}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Langues */}
            {formData.langues.length > 0 && (
              <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2 text-sm" style={{ color: 'var(--ha-text)' }}><Languages className="w-4 h-4" /> Langues</h3>
                    {isOwnProfile && <Button size="sm" variant="ghost" onClick={() => setShowLangueDialog(true)} style={{ color: 'var(--ha-text-muted)' }}><Plus className="w-4 h-4" /></Button>}
                  </div>
                  <div className="space-y-2">
                    {formData.langues.map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div><p style={{ color: 'var(--ha-text-muted)' }}>{l.langue}</p><p className="text-xs" style={{ color: 'var(--ha-text-faint)' }}>{l.niveau}</p></div>
                        {isOwnProfile && <button onClick={() => handleDeleteLangue(i)}><Trash2 className="w-3 h-3" style={{ color: '#ef4444' }} /></button>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Centres d'interet */}
            {formData.centres_interet.length > 0 && (
              <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                <CardContent className="pt-5">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--ha-text)' }}><Heart className="w-4 h-4" /> Centres d'interet</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.centres_interet.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-xs" style={{ borderColor: 'var(--ha-border)', color: 'var(--ha-text-muted)' }}>
                        {c}
                        {isOwnProfile && <button onClick={() => handleDeleteInteret(i)} className="ml-1"><X className="w-3 h-3" style={{ color: '#ef4444' }} /></button>}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* COLONNE DROITE - Contenu principal */}
          <div className="lg:col-span-2 space-y-4">

            {/* ===================== JOURNAL PERSONNEL ===================== */}
            {activeSection === "journal" && (
              <>
                {!canSeeJournal ? (
                  <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                    <CardContent className="py-16 text-center">
                      <Lock className="w-16 h-16 mx-auto mb-4" style={{ color: '#555' }} />
                      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--ha-text)' }}>Journal prive</h3>
                      <p style={{ color: 'var(--ha-text-muted)' }}>Ce journal est prive. Seuls les amis peuvent le consulter.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {canPublishOnProfile && (
                      <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                        <CardContent className="pt-4 pb-3">
                          <div className="flex gap-3">
                            {currentUser?.photo_url ? (
                              <img src={currentUser.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold" style={{ background: '#555', color: 'var(--ha-text)' }}>
                                {getInitials([currentUser?.prenom, currentUser?.nom].filter(Boolean).join(' ') || 'U')}
                              </div>
                            )}
                            <div className="flex-1">
                              <Textarea value={contenu} onChange={(e) => setContenu(e.target.value)}
                                placeholder={isOwnProfile ? "Ecrivez sur votre journal personnel..." : "Ecrivez sur le journal de " + displayName + "..."}
                                rows={3} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)', resize: 'none' }} />
                              {mediaPreview && (
                                <div className="relative mt-2 inline-block">
                                  {typeMedia === 'image' ? <img src={mediaPreview} alt="" className="max-h-40 rounded-lg" /> : <video src={mediaPreview} controls className="max-h-40 rounded-lg" />}
                                  <button onClick={() => { setMediaFile(null); setMediaPreview(null); setTypeMedia("texte"); }} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)' }}><X className="w-3 h-3" /></button>
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex gap-1">
                                  <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                                  <Button size="sm" variant="ghost" onClick={() => imageInputRef.current?.click()} style={{ color: 'var(--ha-text-muted)', padding: '4px 8px' }}><ImageIcon className="w-4 h-4 mr-1" /> Photo</Button>
                                  <input type="file" accept="video/*" ref={videoInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
                                  <Button size="sm" variant="ghost" onClick={() => videoInputRef.current?.click()} style={{ color: 'var(--ha-text-muted)', padding: '4px 8px' }}><Video className="w-4 h-4 mr-1" /> Video</Button>
                                </div>
                                <Button size="sm" onClick={handlePublish} disabled={(!contenu.trim() && !mediaFile) || publishing} style={{ background: '#555', color: 'var(--ha-text)' }}>
                                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" /> Publier</>}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {loadingPubs ? (
                      <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--ha-text-faint)' }} /></div>
                    ) : publications.length === 0 ? (
                      <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                        <CardContent className="py-16 text-center">
                          <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: '#555' }} />
                          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--ha-text)' }}>Aucune publication</h3>
                          <p style={{ color: 'var(--ha-text-muted)' }}>{isOwnProfile ? "Votre journal personnel est vide. Commencez a ecrire !" : "Ce journal ne contient aucune publication."}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      publications.map(pub => (
                        <ProfilPublicationItem
                          key={pub.id}
                          pub={pub}
                          currentUser={authUser || currentUser}
                          isProfileOwner={isOwnProfile}
                          profileUserId={profileUserId}
                        />
                      ))
                    )}
                  </>
                )}
              </>
            )}

            {/* ===================== INFORMATIONS ===================== */}
            {activeSection === "infos" && (
              <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--ha-text)' }}><Users className="w-5 h-5" /> Informations personnelles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editMode ? (
                    <>
                      <div className="grid md:grid-cols-3 gap-4">
                        {[["Nom","nom"],["Prenom","prenom"],["Post-nom","post_nom"]].map(([label,key]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>{label}</Label>
                            <Input value={formData[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                          </div>
                        ))}
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Matricule (non modifiable)</Label>
                          <Input value={formData.matricule} disabled style={{ background: 'var(--ha-bg)', color: 'var(--ha-text-faint)', border: '1px solid var(--ha-border)' }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Date de naissance</Label>
                          <Input type="date" value={formData.date_naissance} onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Sexe</Label>
                          <Select value={formData.sexe} onValueChange={(v) => setFormData({ ...formData, sexe: v })}>
                            <SelectTrigger style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }}><SelectValue placeholder="Selectionner" /></SelectTrigger>
                            <SelectContent><SelectItem value="M">Masculin</SelectItem><SelectItem value="F">Feminin</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Lieu de naissance</Label>
                          <Input value={formData.lieu_naissance} onChange={(e) => setFormData({ ...formData, lieu_naissance: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Nationalite</Label>
                          <Input value={formData.nationalite} onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Etat civil</Label>
                          <Select value={formData.etat_civil} onValueChange={(v) => setFormData({ ...formData, etat_civil: v })}>
                            <SelectTrigger style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }}><SelectValue placeholder="Selectionner" /></SelectTrigger>
                            <SelectContent><SelectItem value="Celibataire">Celibataire</SelectItem><SelectItem value="Marie(e)">Marie(e)</SelectItem><SelectItem value="Divorce(e)">Divorce(e)</SelectItem><SelectItem value="Veuf(ve)">Veuf(ve)</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Telephone</Label>
                        <Input value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} placeholder="+243 XXX XXX XXX" style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        {[["Adresse","adresse"],["Ville","ville"],["Province","province"]].map(([label,key]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>{label}</Label>
                            <Input value={formData[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                          </div>
                        ))}
                      </div>
                      <div className="pt-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                        <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--ha-text)' }}>Etablissement</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          {[["Etablissement","etablissement_nom"],["Faculte","faculte"],["Departement","departement"],["Option","option_filiere"],["Orientation","orientation"],["Classe","classe"]].map(([label,key]) => (
                            <div key={key} className="space-y-1">
                              <Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>{label}</Label>
                              <Input value={formData[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                        <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--ha-text)' }}>A propos</h4>
                        <div className="space-y-3">
                          <div className="space-y-1"><Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Titre professionnel</Label><Input value={formData.titre_professionnel} onChange={(e) => setFormData({ ...formData, titre_professionnel: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} /></div>
                          <div className="space-y-1"><Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Phrase d'accroche</Label><Input value={formData.headline} onChange={(e) => setFormData({ ...formData, headline: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} /></div>
                          <div className="space-y-1"><Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Biographie</Label><Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={4} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} /></div>
                        </div>
                      </div>
                      <div className="pt-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                        <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--ha-text)' }}>Liens sociaux</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          {[["Site web","site_web"],["LinkedIn","linkedin"],["Twitter","twitter"],["Facebook","facebook"],["Instagram","instagram"],["GitHub","github"]].map(([label,key]) => (
                            <div key={key} className="space-y-1"><Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>{label}</Label><Input value={formData[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} /></div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                        <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--ha-text)' }}>Famille</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1"><Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Nom du pere</Label><Input value={formData.nom_pere} onChange={(e) => setFormData({ ...formData, nom_pere: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} /></div>
                          <div className="space-y-1"><Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Nom de la mere</Label><Input value={formData.nom_mere} onChange={(e) => setFormData({ ...formData, nom_mere: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} /></div>
                        </div>
                      </div>
                      <div className="pt-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                        <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--ha-text)' }}>Urgence</h4>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-1"><Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Nom</Label><Input value={formData.personne_urgence_nom} onChange={(e) => setFormData({ ...formData, personne_urgence_nom: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} /></div>
                          <div className="space-y-1"><Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Telephone</Label><Input value={formData.personne_urgence_telephone} onChange={(e) => setFormData({ ...formData, personne_urgence_telephone: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} /></div>
                          <div className="space-y-1"><Label className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Relation</Label><Input value={formData.personne_urgence_relation} onChange={(e) => setFormData({ ...formData, personne_urgence_relation: e.target.value })} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} /></div>
                        </div>
                      </div>
                      <Button onClick={handleSave} disabled={updateProfileMutation.isPending || saveSuccess} className="w-full mt-4" style={{ background: saveSuccess ? '#16a34a' : updateProfileMutation.isPending ? '#3b82f6' : '#2563eb', color: 'var(--ha-text)', transition: 'background 0.3s ease' }}>
                        {saveSuccess ? <><Check className="w-4 h-4 mr-2" /> Enregistre avec succes !</> : updateProfileMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                        {[["Nom complet", [user?.nom, user?.prenom, user?.post_nom].filter(Boolean).join(' ') || 'Non renseigne'],
                          ["Matricule", user?.matricule || 'Non renseigne'],
                          ["Date de naissance", user?.date_naissance ? new Date(user.date_naissance).toLocaleDateString('fr-FR') : 'Non renseigne'],
                          ["Sexe", user?.sexe === 'M' ? 'Masculin' : user?.sexe === 'F' ? 'Feminin' : 'Non renseigne'],
                          ["Lieu de naissance", user?.lieu_naissance || 'Non renseigne'],
                          ["Nationalite", user?.nationalite || 'Non renseigne'],
                          ["Etat civil", user?.etat_civil || 'Non renseigne'],
                        ].map(([label, val]) => (
                          <div key={label}><p className="text-xs mb-0.5" style={{ color: 'var(--ha-text-faint)' }}>{label}</p><p className="text-sm font-medium" style={{ color: 'var(--ha-text-muted)' }}>{val}</p></div>
                        ))}
                      </div>
                      {user?.etablissement_nom && (isOwnProfile || infoPrivacy.etablissement) && (
                        <div className="pt-3 space-y-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                          <h4 className="font-semibold text-sm" style={{ color: 'var(--ha-text)' }}>Etablissement</h4>
                          <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                            {[["Etablissement", user?.etablissement_nom],["Faculte", user?.faculte],["Departement", user?.departement],["Option", user?.option_filiere],["Orientation", user?.orientation],["Classe", user?.classe]]
                              .filter(([,v]) => v)
                              .map(([label, val]) => (
                                <div key={label}><p className="text-xs mb-0.5" style={{ color: 'var(--ha-text-faint)' }}>{label}</p><p className="text-sm font-medium" style={{ color: 'var(--ha-text-muted)' }}>{val}</p></div>
                              ))}
                          </div>
                        </div>
                      )}
                      {user?.bio && (isOwnProfile || infoPrivacy.bio) && (
                        <div className="pt-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                          <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--ha-text)' }}>Biographie</h4>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--ha-text-muted)' }}>{user.bio}</p>
                        </div>
                      )}
                      {(user?.nom_pere || user?.nom_mere) && (isOwnProfile || infoPrivacy.famille) && (
                        <div className="pt-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                          <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--ha-text)' }}>Famille</h4>
                          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
                            {user?.nom_pere && <div><p className="text-xs" style={{ color: 'var(--ha-text-faint)' }}>Pere</p><p className="text-sm" style={{ color: 'var(--ha-text-muted)' }}>{user.nom_pere}</p></div>}
                            {user?.nom_mere && <div><p className="text-xs" style={{ color: 'var(--ha-text-faint)' }}>Mere</p><p className="text-sm" style={{ color: 'var(--ha-text-muted)' }}>{user.nom_mere}</p></div>}
                          </div>
                        </div>
                      )}
                      {user?.personne_urgence_nom && (isOwnProfile || infoPrivacy.urgence) && (
                        <div className="pt-3" style={{ borderTop: '1px solid var(--ha-border)' }}>
                          <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--ha-text)' }}>Contact d'urgence</h4>
                          <div className="grid md:grid-cols-3 gap-x-6 gap-y-2">
                            <div><p className="text-xs" style={{ color: 'var(--ha-text-faint)' }}>Nom</p><p className="text-sm" style={{ color: 'var(--ha-text-muted)' }}>{user.personne_urgence_nom}</p></div>
                            {user?.personne_urgence_telephone && <div><p className="text-xs" style={{ color: 'var(--ha-text-faint)' }}>Telephone</p><p className="text-sm" style={{ color: 'var(--ha-text-muted)' }}>{user.personne_urgence_telephone}</p></div>}
                            {user?.personne_urgence_relation && <div><p className="text-xs" style={{ color: 'var(--ha-text-faint)' }}>Relation</p><p className="text-sm" style={{ color: 'var(--ha-text-muted)' }}>{user.personne_urgence_relation}</p></div>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ===================== PARCOURS ===================== */}
            {activeSection === "parcours" && (
              <div className="space-y-4">
                {/* Experience */}
                <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="flex items-center gap-2 text-base" style={{ color: 'var(--ha-text)' }}><Briefcase className="w-5 h-5" /> Experience professionnelle</CardTitle>
                    {isOwnProfile && <Button size="sm" onClick={() => setShowExpDialog(true)} style={{ background: '#555', color: 'var(--ha-text)' }}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>}
                  </CardHeader>
                  <CardContent>
                    {formData.experiences.length > 0 ? (
                      <div className="space-y-4">
                        {formData.experiences.map((exp, i) => (
                          <div key={i} className="flex gap-3 pb-4" style={{ borderBottom: i < formData.experiences.length - 1 ? '1px solid var(--ha-border)' : 'none' }}>
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ha-surface2)' }}><Briefcase className="w-5 h-5" style={{ color: 'var(--ha-text-muted)' }} /></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div><h4 className="font-semibold text-sm" style={{ color: 'var(--ha-text)' }}>{exp.poste}</h4><p className="text-sm" style={{ color: 'var(--ha-text-muted)' }}>{exp.entreprise}</p><p className="text-xs mt-0.5" style={{ color: 'var(--ha-text-faint)' }}>{exp.date_debut} - {exp.en_cours ? "Present" : exp.date_fin}</p></div>
                                {isOwnProfile && <button onClick={() => handleDeleteExperience(i)}><Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} /></button>}
                              </div>
                              {exp.description && <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'var(--ha-text-muted)' }}>{exp.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-center py-6 text-sm" style={{ color: 'var(--ha-text-faint)' }}>Aucune experience ajoutee</p>}
                  </CardContent>
                </Card>

                {/* Formation */}
                <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="flex items-center gap-2 text-base" style={{ color: 'var(--ha-text)' }}><GraduationCap className="w-5 h-5" /> Formation</CardTitle>
                    {isOwnProfile && <Button size="sm" onClick={() => setShowFormDialog(true)} style={{ background: '#555', color: 'var(--ha-text)' }}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>}
                  </CardHeader>
                  <CardContent>
                    {formData.formations.length > 0 ? (
                      <div className="space-y-4">
                        {formData.formations.map((f, i) => (
                          <div key={i} className="flex gap-3 pb-4" style={{ borderBottom: i < formData.formations.length - 1 ? '1px solid var(--ha-border)' : 'none' }}>
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ha-surface2)' }}><GraduationCap className="w-5 h-5" style={{ color: 'var(--ha-text-muted)' }} /></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div><h4 className="font-semibold text-sm" style={{ color: 'var(--ha-text)' }}>{f.diplome}</h4><p className="text-sm" style={{ color: 'var(--ha-text-muted)' }}>{f.etablissement}</p><p className="text-xs mt-0.5" style={{ color: 'var(--ha-text-faint)' }}>{f.date_debut} - {f.en_cours ? "En cours" : f.date_fin}</p></div>
                                {isOwnProfile && <button onClick={() => handleDeleteFormation(i)}><Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} /></button>}
                              </div>
                              {f.description && <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'var(--ha-text-muted)' }}>{f.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-center py-6 text-sm" style={{ color: 'var(--ha-text-faint)' }}>Aucune formation ajoutee</p>}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ===================== COMPETENCES ===================== */}
            {activeSection === "competences" && (
              <div className="space-y-4">
                <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="flex items-center gap-2 text-base" style={{ color: 'var(--ha-text)' }}><Award className="w-5 h-5" /> Competences</CardTitle>
                    {isOwnProfile && <Button size="sm" onClick={() => setShowCompDialog(true)} style={{ background: '#555', color: 'var(--ha-text)' }}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>}
                  </CardHeader>
                  <CardContent>
                    {formData.competences.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.competences.map((c, i) => (
                          <Badge key={i} className="text-sm px-3 py-1" style={{ background: '#555', color: 'var(--ha-text)' }}>
                            {c}
                            {isOwnProfile && <button onClick={() => handleDeleteCompetence(i)} className="ml-2"><X className="w-3 h-3" style={{ color: '#ef4444' }} /></button>}
                          </Badge>
                        ))}
                      </div>
                    ) : <p className="text-center py-6 text-sm" style={{ color: 'var(--ha-text-faint)' }}>Aucune competence ajoutee</p>}
                  </CardContent>
                </Card>

                <Card style={{ background: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base" style={{ color: 'var(--ha-text)' }}><Heart className="w-5 h-5" /> Centres d'interet</CardTitle></CardHeader>
                  <CardContent>
                    {isOwnProfile && (
                      <div className="flex gap-2 mb-4">
                        <Input value={newInteret} onChange={(e) => setNewInteret(e.target.value)} placeholder="Ex: Lecture, Sport..." onKeyPress={(e) => e.key === 'Enter' && handleAddInteret()} style={{ background: 'var(--ha-bg)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)' }} />
                        <Button onClick={handleAddInteret} disabled={!newInteret.trim()} style={{ background: '#555', color: 'var(--ha-text)' }}><Plus className="w-4 h-4" /></Button>
                      </div>
                    )}
                    {formData.centres_interet.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.centres_interet.map((c, i) => (
                          <Badge key={i} variant="outline" style={{ borderColor: 'var(--ha-border)', color: 'var(--ha-text-muted)' }}>
                            {c}
                            {isOwnProfile && <button onClick={() => handleDeleteInteret(i)} className="ml-1"><X className="w-3 h-3" style={{ color: '#ef4444' }} /></button>}
                          </Badge>
                        ))}
                      </div>
                    ) : <p className="text-center py-4 text-sm" style={{ color: 'var(--ha-text-faint)' }}>Aucun centre d'interet</p>}
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ===== DIALOGS ===== */}
      <DraggableDialog
        open={showExpDialog}
        onOpenChange={setShowExpDialog}
        title={
          <div style={CG}>
            <div className="text-base font-semibold text-white">Ajouter une experience</div>
            <div className="text-xs mt-0.5" style={{color: 'var(--ha-text-muted)'}}>Renseignez les détails de votre expérience professionnelle</div>
          </div>
        }
        maxWidth="max-w-2xl"
      >
        <DraggableDialogBody>
          <div className="grid gap-4" style={CG}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Poste *</Label>
                <Input value={newExperience.poste} onChange={(e) => setNewExperience({ ...newExperience, poste: e.target.value })} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d'}} />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Entreprise *</Label>
                <Input value={newExperience.entreprise} onChange={(e) => setNewExperience({ ...newExperience, entreprise: e.target.value })} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d'}} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Début *</Label>
                <Input type="month" value={newExperience.date_debut} onChange={(e) => setNewExperience({ ...newExperience, date_debut: e.target.value })} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d'}} />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Fin</Label>
                <Input type="month" value={newExperience.date_fin} onChange={(e) => setNewExperience({ ...newExperience, date_fin: e.target.value })} disabled={newExperience.en_cours} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', opacity: newExperience.en_cours ? 0.4 : 1}} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={newExperience.en_cours} onChange={(e) => setNewExperience({ ...newExperience, en_cours: e.target.checked })} style={{ accentColor: '#888' }} />
              <Label className="text-white text-sm">Poste actuel</Label>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Textarea value={newExperience.description} onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })} rows={3} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d'}} />
            </div>
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <Button variant="outline" onClick={() => setShowExpDialog(false)} style={{...CG, backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--ha-text)', borderColor: 'rgba(255,255,255,0.15)'}}>Annuler</Button>
          <Button onClick={handleAddExperience} disabled={!newExperience.poste || !newExperience.entreprise || !newExperience.date_debut} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>Ajouter</Button>
        </DraggableDialogFooter>
      </DraggableDialog>

      <DraggableDialog open={showFormDialog} onOpenChange={setShowFormDialog}
        title={<div style={CG}>
          <div className="text-base font-semibold text-white">Ajouter une formation</div>
          <div className="text-xs mt-0.5" style={{color: 'var(--ha-text-muted)'}}>Renseignez les détails de votre formation académique</div>
        </div>}
        maxWidth="max-w-2xl">
        <DraggableDialogBody>
          <div className="grid gap-4" style={CG}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white text-xs font-medium" style={CG}>Diplôme *</Label>
                <Input value={newFormation.diplome} onChange={(e) => setNewFormation({ ...newFormation, diplome: e.target.value })} placeholder="Ex: Licence en Informatique" style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white text-xs font-medium" style={CG}>Établissement *</Label>
                <Input value={newFormation.etablissement} onChange={(e) => setNewFormation({ ...newFormation, etablissement: e.target.value })} placeholder="Ex: Université de Kinshasa" style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white text-xs font-medium" style={CG}>Début *</Label>
                <Input type="month" value={newFormation.date_debut} onChange={(e) => setNewFormation({ ...newFormation, date_debut: e.target.value })} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white text-xs font-medium" style={CG}>Fin</Label>
                <Input type="month" value={newFormation.date_fin} onChange={(e) => setNewFormation({ ...newFormation, date_fin: e.target.value })} disabled={newFormation.en_cours} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', opacity: newFormation.en_cours ? 0.4 : 1, ...CG}} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={newFormation.en_cours} onChange={(e) => setNewFormation({ ...newFormation, en_cours: e.target.checked })} style={{ accentColor: '#3b82f6' }} />
              <Label className="text-white text-xs" style={CG}>En cours</Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
              <Textarea value={newFormation.description} onChange={(e) => setNewFormation({ ...newFormation, description: e.target.value })} rows={3} placeholder="Décrivez votre formation..." style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
            </div>
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <Button variant="outline" onClick={() => setShowFormDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>Annuler</Button>
          <Button onClick={handleAddFormation} disabled={!newFormation.diplome || !newFormation.etablissement || !newFormation.date_debut} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>Ajouter</Button>
        </DraggableDialogFooter>
      </DraggableDialog>

      <DraggableDialog open={showCompDialog} onOpenChange={setShowCompDialog}
        title={<div style={CG}>
          <div className="text-base font-semibold text-white">Ajouter une compétence</div>
          <div className="text-xs mt-0.5" style={{color: 'var(--ha-text-muted)'}}>Ajoutez une compétence à votre profil</div>
        </div>}
        maxWidth="max-w-md">
        <DraggableDialogBody>
          <div className="grid gap-4" style={CG}>
            <div className="space-y-1.5">
              <Label className="text-white text-xs font-medium" style={CG}>Compétence *</Label>
              <Input value={newCompetence} onChange={(e) => setNewCompetence(e.target.value)} placeholder="Ex: JavaScript, Communication..." style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
            </div>
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <Button variant="outline" onClick={() => setShowCompDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>Annuler</Button>
          <Button onClick={handleAddCompetence} disabled={!newCompetence.trim()} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>Ajouter</Button>
        </DraggableDialogFooter>
      </DraggableDialog>

      <DraggableDialog open={showLangueDialog} onOpenChange={setShowLangueDialog} title="Ajouter une langue" subtitle="Définissez vos compétences linguistiques">
        <DraggableDialogBody>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-white text-xs font-medium" style={CG}>Langue</Label>
              <Input value={newLangue.langue} onChange={(e) => setNewLangue({ ...newLangue, langue: e.target.value })} placeholder="Ex: Francais, Anglais..." style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}} />
            </div>
            <div className="space-y-1">
              <Label className="text-white text-xs font-medium" style={CG}>Niveau</Label>
              <Select value={newLangue.niveau} onValueChange={(v) => setNewLangue({ ...newLangue, niveau: v })}>
                <SelectTrigger style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Debutant">Débutant</SelectItem>
                  <SelectItem value="Intermediaire">Intermédiaire</SelectItem>
                  <SelectItem value="Avance">Avancé</SelectItem>
                  <SelectItem value="Courant">Courant</SelectItem>
                  <SelectItem value="Bilingue">Bilingue</SelectItem>
                  <SelectItem value="Langue maternelle">Langue maternelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <Button variant="outline" onClick={() => setShowLangueDialog(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>Annuler</Button>
          <Button onClick={handleAddLangue} disabled={!newLangue.langue.trim()} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>Ajouter</Button>
        </DraggableDialogFooter>
      </DraggableDialog>
    </div>
  );
}

export default function Profil() {
  return <ProfilErrorBoundary><ProfilInner /></ProfilErrorBoundary>;
}
