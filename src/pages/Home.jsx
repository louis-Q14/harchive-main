import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { dataService } from '@/api';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, BookOpen, BarChart3, Loader2, LogOut, Archive, School, Heart, UserCheck, Building2, Globe, Newspaper, CalendarDays, Search, MapPin, Filter, Phone, Mail, ChevronRight, X, Play, Radio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatUserName } from '@/components/utils/nameUtils';
import PublicationItem from '@/components/journal/PublicationItem';
import ShortsSection from '@/components/journal/ShortsSection';
import LiveSection from '@/components/journal/LiveSection';
import { DraggableDialog, DraggableDialogBody } from '@/components/ui/DraggableDialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

const HOME_JOURNAL_TABS = [
  { id: 'publications', label: 'Journal', icon: Newspaper },
  { id: 'shorts', label: 'Shorts', icon: Play },
];

export default function Home() {
  const navigate = useNavigate();
  const { user, isLoadingAuth, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('publications');

  // Force dark mode on this page regardless of selected theme
  useEffect(() => {
    const html = document.documentElement;
    const prevTheme = html.getAttribute('data-theme');
    const hadDark = html.classList.contains('dark');

    html.setAttribute('data-theme', 'dark-standard');
    html.classList.add('dark');
    html.style.setProperty('--ha-bg', '#111118');
    html.style.setProperty('--ha-surface', '#1c1c24');
    html.style.setProperty('--ha-surface2', '#2d2d2d');
    html.style.setProperty('--ha-surface3', '#3d3d3d');
    html.style.setProperty('--ha-border', 'rgba(255,255,255,0.07)');
    html.style.setProperty('--ha-text', '#ffffff');
    html.style.setProperty('--ha-text-muted', '#9ca3af');
    html.style.setProperty('--ha-text-faint', '#6b7280');
    html.style.setProperty('--ha-sidebar-bg', '#0e0e14');
    html.style.setProperty('--ha-accent', '#7c3aed');
    html.style.setProperty('--ha-hover', 'rgba(255,255,255,0.06)');
    html.style.setProperty('--card', '0 0% 3.9%');
    html.style.setProperty('--card-foreground', '0 0% 98%');
    html.style.setProperty('--background', '0 0% 3.9%');
    html.style.setProperty('--foreground', '0 0% 98%');
    document.body.style.backgroundColor = '#111118';
    document.body.style.color = '#ffffff';

    return () => {
      // Restore previous theme on unmount
      if (prevTheme) html.setAttribute('data-theme', prevTheme);
      if (!hadDark) html.classList.remove('dark');
      // Re-apply the stored theme
      const stored = localStorage.getItem('harchive-theme');
      if (stored && window.__applyHarchiveTheme) window.__applyHarchiveTheme(stored);
    };
  }, []);

  // Agenda Universitaire modal state
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaData, setAgendaData] = useState([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaStatut, setAgendaStatut] = useState('tous');
  // Statistiques Avancées modal state
  const [statistiquesOpen, setStatistiquesOpen] = useState(false);
  const [agendaProvince, setAgendaProvince] = useState('tous');
  // Detail sub-modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEtab, setDetailEtab] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailExtra, setDetailExtra] = useState(null); // inscription + structure data

  // Espace Parents modal state
  const [espaceparentsOpen, setEspaceparentsOpen] = useState(false);

  const handleOpenAgenda = async () => {
    setAgendaOpen(true);
    if (agendaData.length === 0) {
      setAgendaLoading(true);
      try {
        const data = await dataService.queryPublicEtablissements();
        setAgendaData(data || []);
      } catch (err) {
        console.error('Erreur chargement établissements:', err);
      } finally {
        setAgendaLoading(false);
      }
    }
  };

  const handleViewDetail = async (etab) => {
    setDetailEtab(etab);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailExtra(null);
    try {
      // Use public endpoint for structure (no auth needed)
      const structure = await dataService.queryPublicStructure(etab.id, etab.denomination);
      // Try to get inscription data if user is logged in
      let inscription = null;
      let registered = null;
      if (user) {
        try {
          const [regs, inscs] = await Promise.all([
            dataService.query('Etablissement', { limit: 1000 }),
            dataService.query('DemandeInscriptionEtablissement', { limit: 1000 }),
          ]);
          registered = regs.find(r =>
            r.code === etab.sigle ||
            r.name?.toUpperCase()?.includes(etab.denomination?.toUpperCase()?.substring(0, 20)) ||
            etab.denomination?.toUpperCase()?.includes(r.name?.toUpperCase()?.substring(0, 20))
          ) || null;
          inscription = inscs.find(i =>
            i.code_etablissement === etab.sigle ||
            i.nom_etablissement?.toUpperCase()?.includes(etab.denomination?.toUpperCase()?.substring(0, 20)) ||
            etab.denomination?.toUpperCase()?.includes(i.nom_etablissement?.toUpperCase()?.substring(0, 20))
          ) || null;
        } catch (_) { /* not logged in or no access */ }
      }
      setDetailExtra({ registered, inscription, structure: structure || null });
    } catch (err) {
      console.error('Erreur chargement détails:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const agendaProvinces = [...new Set(agendaData.map(e => e.province).filter(Boolean))].sort();
  const filteredAgenda = agendaData.filter(etab => {
    const matchSearch = agendaSearch === '' ||
      etab.sigle?.toLowerCase().includes(agendaSearch.toLowerCase()) ||
      etab.denomination?.toLowerCase().includes(agendaSearch.toLowerCase()) ||
      etab.territoire?.toLowerCase().includes(agendaSearch.toLowerCase());
    const matchStatut = agendaStatut === 'tous' || etab.statut === agendaStatut;
    const matchProvince = agendaProvince === 'tous' || etab.province === agendaProvince;
    return matchSearch && matchStatut && matchProvince;
  });

  const handleLogin = () => {
    navigate(createPageUrl('Connexion'));
  };

  const features = [
    { icon: GraduationCap, title: 'Gestion des Étudiants', description: 'Suivi complet des parcours académiques et des performances', page: 'MesDossiersAcademiques' },
    { icon: BookOpen, title: 'Gestion des Classes', description: 'Organisation efficace des classes et des matières', page: 'GestionClasse' },
    { icon: BarChart3, title: 'Statistiques Avancées', description: 'Analyses détaillées et reporting en temps réel', page: 'Statistiques' },
    { icon: Users, title: 'Espace Parents', description: 'Suivi de la scolarité de vos enfants en temps réel', page: 'NotesEnfants' },
    { icon: CalendarDays, title: 'Agenda Universitaire', description: 'Consultez la liste des établissements agréés de la RDC', page: 'ListeEtablissements' }
  ];

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ha-surface)'}}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  const displayName = formatUserName(user);

  // Helpers pour parser les JSON
  const tryParseJSON = (val) => {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    try { return JSON.parse(val); } catch { return []; }
  };

  // Même logique de visibilité que le Journal
  const canSeePub = (pub) => {
    // Visiteurs non connectés : uniquement les publications publiques
    if (!user) return pub.visibilite === 'publique';
    // L'auteur voit toujours ses propres publications
    if (pub.auteur_id === user.id) return true;
    // Les admins système voient tout
    if (user.role_archive === 'admin_systeme' || user.role_archive === 'super_admin') return true;

    switch (pub.visibilite) {
      case 'publique':
        return true;
      case 'etablissement':
        return user.etablissement_id && pub.etablissement_id && pub.etablissement_id === user.etablissement_id;
      case 'amis': {
        const mesAmis = Array.isArray(user.amis) ? user.amis : tryParseJSON(user.amis);
        return mesAmis.includes(pub.auteur_id);
      }
      case 'privee': {
        const visibleTo = Array.isArray(pub.visible_to) ? pub.visible_to : tryParseJSON(pub.visible_to);
        return visibleTo.includes(user.id);
      }
      default:
        return true;
    }
  };

  // Charger toutes les publications et filtrer par visibilité
  const { data: publications = [], isLoading: loadingPubs } = useQuery({
    queryKey: ['home-publications', user?.id],
    queryFn: async () => {
      if (!user) {
        // Non connecté : route publique (pas besoin d'auth), hors journal personnel
        const pubs = await dataService.queryPublicPublications({ limit: 200 });
        return pubs.filter(pub => !pub.cible_profil_id);
      }
      // Connecté : toutes les publications filtrées par visibilité (hors journal personnel)
      const allPubs = await dataService.query('Publication', { orderBy: '-created_date', limit: 200 });
      return allPubs.filter(pub => !pub.cible_profil_id && canSeePub(pub));
    },
    enabled: !isLoadingAuth,
    retry: 2,
  });

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--ha-surface)'}}>
      {/* Header */}
      <header style={{backgroundColor: 'var(--ha-surface)', borderBottom: '1px solid #404040'}} className="shadow-sm sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/assets/icons/6153a57fe_logoHARCHIVEF2.png" alt="Harchive Logo" className="h-20 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm text-white hidden sm:inline">
                    {displayName}
                  </span>
                  <Link to={createPageUrl('Journal')}>
                    <Button className="text-white hover:opacity-90" style={{backgroundColor: '#555555'}}>
                      Accéder au Journal
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => logout()}
                    className="text-white hover:opacity-80"
                    style={{backgroundColor: 'var(--ha-surface2)'}}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleLogin}
                  style={{borderColor: 'var(--ha-border)', color: 'white', backgroundColor: 'var(--ha-surface2)'}}
                  className="hover:opacity-80"
                >
                  Connexion
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="w-full text-center">
          <div className="mb-8">
            <img src="/assets/icons/6153a57fe_logoHARCHIVEF2.png" alt="Harchive Logo" className="h-48 w-auto object-contain mx-auto mb-6" />
            <h1 className="text-5xl font-bold text-white mb-4">
              Bienvenue sur Harchive
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Nous gardons trace de votre parcours, vous écrivez votre avenir.
            </p>
          </div>

          {/* Onglets d'inscription */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}} className="shadow-md hover:shadow-lg transition-all">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-white" style={{backgroundColor: '#555555'}}>
                  <School className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Établissements</h3>
                <Link to={createPageUrl('InscriptionEtablissement')}>
                  <Button className="w-full text-white hover:opacity-90 mt-2" style={{backgroundColor: '#555555'}}>
                    <Building2 className="w-4 h-4 mr-2" />
                    Inscription
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}} className="shadow-md hover:shadow-lg transition-all">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-white" style={{backgroundColor: '#555555'}}>
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Étudiants & Professeurs</h3>
                <Link to={createPageUrl('Inscription')}>
                  <Button className="w-full text-white hover:opacity-90 mt-2" style={{backgroundColor: '#555555'}}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Inscription
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}} className="shadow-md hover:shadow-lg transition-all">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-white" style={{backgroundColor: '#555555'}}>
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Parents</h3>
                <Link to={createPageUrl('InscriptionParent')}>
                  <Button className="w-full text-white hover:opacity-90 mt-2" style={{backgroundColor: '#555555'}}>
                    <Heart className="w-4 h-4 mr-2" />
                    Inscription
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Fil d'actualités public */}
          <div className="max-w-4xl mx-auto mt-12 mb-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-white" />
              <h3 className="text-2xl font-bold text-white">Journal communautaire</h3>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              Découvrez les dernières publications de la communauté Harchive
            </p>

            {/* Tabs */}
            <div className="flex items-center gap-0 rounded-full p-1 w-full mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {HOME_JOURNAL_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all"
                    style={isActive
                      ? { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }
                      : { color: 'rgba(255,255,255,0.28)' }
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Shorts Tab */}
            {activeTab === 'shorts' && <ShortsSection />}

            {/* Publications Tab */}
            {activeTab === 'publications' && (
              <>
                {loadingPubs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                ) : publications.length === 0 ? (
                  <div className="p-8 text-center rounded-lg" style={{ backgroundColor: 'var(--ha-surface)', border: '1px solid #404040' }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--ha-surface2)' }}>
                      <Newspaper className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-white text-base mb-1">Aucune publication pour le moment</p>
                    <p className="text-gray-400 text-sm">Inscrivez-vous pour partager avec la communauté !</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto pr-1 home-scroll" style={{ maxHeight: '70vh' }}>
                    {publications.map((pub) => (
                      <PublicationItem key={pub.id} publication={pub} currentUser={user} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-6xl mx-auto mt-16">
            {features.map((f, i) => (
              <div
                key={i}
                onClick={() => f.page === 'ListeEtablissements' ? handleOpenAgenda() : f.page === 'NotesEnfants' ? setEspaceparentsOpen(true) : f.page === 'Statistiques' ? setStatistiquesOpen(true) : navigate(createPageUrl(f.page))}
                className="text-center p-6 rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
                style={{backgroundColor: 'var(--ha-surface)', border: '1px solid #404040'}}
              >
                <f.icon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-white mb-2">{f.title}</h4>
                <p className="text-xs text-gray-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 sm:px-6 lg:px-8" style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
        <div className="w-full text-center">
          <p className="text-gray-300">
            © 2025 Harchive. Tous droits réservés. Plateforme de gestion académique de la RDC.
          </p>
        </div>
      </footer>

      {/* ===== Statistiques Avancées Modal ===== */}
      <DraggableDialog
        open={statistiquesOpen}
        onOpenChange={setStatistiquesOpen}
        title={
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-white font-bold text-base" style={CG}>Statistiques Avancées</div>
              <div className="text-gray-400 text-xs" style={CG}>Analyses détaillées &amp; reporting en temps réel</div>
            </div>
          </div>
        }
        maxWidth="max-w-4xl"
      >
        <DraggableDialogBody>
          <div className="space-y-5 text-sm" style={{ color: '#d1d5db', lineHeight: 1.75 }}>

            {/* Section 1 */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(139,92,246,0.25)' }}>
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#8b5cf6' }}>1</div>
                <h3 className="font-bold text-white text-sm" style={CG}>Le Cœur : Un Système d'Archivage Sémantique et Vivant</h3>
              </div>
              <div className="p-5 space-y-4" style={{ background: 'rgba(139,92,246,0.04)' }}>
                <p style={CG}>Un simple bulletin PDF stocké est une donnée morte. Nous le transformons en un <strong className="text-white">objet de connaissance structuré</strong> — un graphe de compétences.</p>
                <div className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <p className="text-purple-300 font-semibold text-xs uppercase tracking-wider" style={CG}>Modèle de Données Avancé</p>
                  <div className="space-y-2">
                    {[
                      { label: "Entité Événement Académique", text: "L'atome de base. Chaque évaluation, remarque ou absence devient un événement avec des métadonnées riches : type, taxonomie de compétence, vecteur de difficulté." },
                      { label: "Taxonomie de Compétence", text: 'L\'événement est lié à une micro-compétence. Ex : "Français > Lecture > Inférence de cause à effet".' },
                      { label: "Vecteur de Difficulté", text: "Tagué sur la compétence cognitive transversale mobilisée : Mémorisation, Logique séquentielle, Créativité, Gestion du stress." },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#8b5cf6' }} />
                        <span style={CG}><strong className="text-white">{item.label} :</strong> {item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <p className="text-purple-300 font-semibold text-xs uppercase tracking-wider" style={CG}>Moteur d'Archivage Intelligent</p>
                  <div className="space-y-2">
                    {[
                      { label: "OCR / IA pour le Papier", text: "Un enseignant photographie une copie. L'IA lit le nom, la note et les annotations manuscrites (\"Confusion sur les unités\", \"Excellent raisonnement\")." },
                      { label: "Transformation en Données Structurées", text: 'Les commentaires sont analysés par un modèle NLP pour extraire des tags et un score de sentiment. "Confusion..." → Tag: Lacune conceptuelle, Sentiment: -0.5.' },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#8b5cf6' }} />
                        <span style={CG}><strong className="text-white">{item.label} :</strong> {item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#3b82f6' }}>2</div>
                <h3 className="font-bold text-white text-sm" style={CG}>Analyses Détaillées : La Vision du Corps Académique</h3>
              </div>
              <div className="p-5 space-y-4" style={{ background: 'rgba(59,130,246,0.04)' }}>
                <div className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <p className="text-blue-300 font-semibold text-xs uppercase tracking-wider" style={CG}>A. Pour l'Enseignant — Analyse Psycho-Cognitive</p>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#3b82f6' }} />
                      <span style={CG}><strong className="text-white">Cartographie Dynamique :</strong> Carte thermique en temps réel des zones de fragilité. Ex : "60% de la classe échoue sur l'inférence mais réussit la restitution simple."</span>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#3b82f6' }} />
                      <div style={CG}><strong className="text-white">Détection Précoce de Décrochage (CEP) :</strong> Un pattern en 30 jours déclenche une alerte silencieuse :
                        <ol className="mt-2 space-y-1 pl-4 list-decimal text-gray-400">
                          <li style={CG}>Baisse de participation orale</li>
                          <li style={CG}>Glissement d'un quartile en mathématiques</li>
                          <li style={CG}>2 absences non justifiées le lundi matin</li>
                          <li style={CG}>Aucune interaction parentale sur 2 semaines</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <p className="text-blue-300 font-semibold text-xs uppercase tracking-wider" style={CG}>B. Pour la Direction — Statistiques Prédictives</p>
                  <div className="space-y-2">
                    {[
                      { label: "Modélisation de Cohorte", text: "Comparaison en temps réel de la promotion actuelle vs les 3 précédentes sur le rythme d'acquisition des compétences clés." },
                      { label: "Simulation d'Impact (Digital Twin)", text: "Si on ajoute 1h de soutien en petits groupes, quel % d'étudiants basculerait au-dessus du seuil de réussite ? Le modèle se base sur l'historique." },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#3b82f6' }} />
                        <span style={CG}><strong className="text-white">{item.label} :</strong> {item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.25)' }}>
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#10b981' }}>3</div>
                <h3 className="font-bold text-white text-sm" style={CG}>Mise en Relation avec les Parents : Le Reporting Vivant</h3>
              </div>
              <div className="p-5 space-y-4" style={{ background: 'rgba(16,185,129,0.04)' }}>
                <p style={CG}>On remplace le bulletin trimestriel anxiogène par un <strong className="text-white">flux d'information continu, traduit pour les non-experts</strong>.</p>
                <div className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p className="text-emerald-300 font-semibold text-xs uppercase tracking-wider" style={CG}>A. Histoires de Progrès (Jumeau Numérique)</p>
                  <div className="rounded-lg p-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-gray-500 text-xs mb-1" style={CG}>❌ Avant :</p>
                    <p className="text-gray-400 italic text-xs" style={CG}>"Votre enfant a 12/20 en Histoire."</p>
                    <p className="text-gray-500 text-xs mt-2 mb-1" style={CG}>✅ Après :</p>
                    <p className="text-emerald-300 text-xs" style={CG}>"Cet exercice demandait d'analyser des textes pour en tirer une conclusion. C'est une compétence sur laquelle votre enfant a <strong>progressé de 20% ce mois-ci</strong>. Cela l'aidera aussi en Physique."</p>
                  </div>
                </div>
                <div className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p className="text-emerald-300 font-semibold text-xs uppercase tracking-wider" style={CG}>B. Alertes Positives &amp; Nudges Comportementaux</p>
                  <div className="space-y-2">
                    {[
                      { emoji: '🏆', label: 'Fierté Partagée', text: '"Super ! [Prénom] a réussi un exercice jugé difficile par la classe aujourd\'hui. Félicitez-le ce soir !"' },
                      { emoji: '💡', label: 'Coup de Pouce Contextuel', text: '"Cette semaine, la classe travaille les accords du participe passé. Voici une courte vidéo (3 min) pour l\'aider à la maison."' },
                      { emoji: '🔍', label: 'Détection de Curiosité', text: '"[Prénom] a posé une question très intéressante en SVT sur les volcans. Voici un documentaire adapté pour aller plus loin."' },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="text-base flex-shrink-0">{item.emoji}</span>
                        <span style={CG}><strong className="text-white">{item.label} :</strong> <em className="text-emerald-300">{item.text}</em></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#f59e0b' }}>4</div>
                <h3 className="font-bold text-white text-sm" style={CG}>Enrichissements : Le Saut vers l'Intelligence Artificielle</h3>
              </div>
              <div className="p-5 space-y-2" style={{ background: 'rgba(245,158,11,0.04)' }}>
                {[
                  { emoji: '🎯', label: 'Prédicteur de Réussite', text: "Un modèle ML prend en entrée toutes les interactions (notes, temps, participation, absences, sentiment) et prédit la probabilité de succès. Parents et professeurs sont alertés si elle chute." },
                  { emoji: '🎬', label: 'Moteur de Recommandation', text: "Comme un Netflix de la pédagogie. En fonction des micro-lacunes détectées, le système recommande exercices, jeux ou vidéos adaptés au style d'apprentissage de l'étudiant." },
                  { emoji: '💬', label: 'Analyse Sémantique des Échanges', text: "Une IA analyse le ton des messages parent-prof. Alerte discrète pour l'enseignant si un parent semble anxieux et propose des formulations apaisantes." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <span className="text-lg flex-shrink-0">{item.emoji}</span>
                    <span style={CG}><strong className="text-white">{item.label} :</strong> {item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conclusion */}
            <div className="rounded-xl p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}>
              <p className="text-white font-medium" style={CG}>Ce système crée un <strong className="text-purple-300">triangle vertueux Étudiant – Enseignant – Parent</strong> où chaque acteur reçoit la bonne information, au bon moment, pour la bonne action. <br /><span className="text-gray-400">L'archivage se met au service de l'humain.</span></p>
            </div>

          </div>
        </DraggableDialogBody>
      </DraggableDialog>

      {/* ===== Espace Parents Modal ===== */}
      <DraggableDialog
        open={espaceparentsOpen}
        onOpenChange={setEspaceparentsOpen}
        title={
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-white font-bold text-base" style={CG}>Espace Parents</div>
              <div className="text-gray-400 text-xs" style={CG}>Suivi académique en temps réel — vision complète</div>
            </div>
          </div>
        }
        maxWidth="max-w-4xl"
      >
        <DraggableDialogBody>
          <div className="space-y-6 text-sm" style={{ color: '#d1d5db', lineHeight: 1.75 }}>

            {/* Introduction */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <h2 className="text-white font-bold text-base mb-2" style={CG}>Introduction : vers une université transparente et connectée</h2>
              <p style={CG}>L'idée d'un « espace parent » dédié au suivi académique en temps réel dépasse la simple numérisation du relevé de notes. Elle répond à un besoin profond : <strong className="text-white">réduire l'asymétrie d'information</strong> entre l'établissement et la famille, pour faire des parents de véritables <em>copilotes</em> du parcours universitaire de leur enfant. Enrichir ce concept, c'est le transformer en un <strong className="text-white">écosystème intelligent, proactif et humain</strong>, centré sur le bien-être et la réussite de l'étudiant.</p>
            </div>

            {[
              {
                num: '1', color: '#3b82f6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)',
                title: 'Les fondamentaux : un tableau de bord vivant et exhaustif',
                items: [
                  { bold: 'Notes, crédits ECTS et compétences en direct', text: " : Dès qu'un résultat d'examen est saisi, il apparaît avec la note, le barème, l'appréciation détaillée et les crédits ECTS. L'affichage privilégie les courbes de progression et les radars de compétences." },
                  { bold: 'Assiduité et vie universitaire', text: " : Notification instantanée en cas d'absence non justifiée, retard ou absence à un examen. Indicateur « taux de présence » visible en continu." },
                  { bold: 'Espace de cours et travaux à rendre', text: " : L'emploi du temps synchronisé avec les contenus déposés par les professeurs, les travaux à rendre et les ressources complémentaires." },
                  { bold: 'Messagerie unifiée et intelligente', text: " : Canal de communication direct avec chaque enseignant et l'administration, avec traduction automatique pour les familles allophones." },
                ]
              },
              {
                num: '2', color: '#8b5cf6', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.15)',
                title: "L'intelligence artificielle au service de la détection précoce",
                items: [
                  { bold: 'Alerte de décrochage académique', text: " : L'IA analyse les signaux faibles (baisse des résultats, travaux non rendus, isolement). Notification bienveillante dès qu'un schéma à risque est détecté." },
                  { bold: 'Recommandations personnalisées', text: " : Sur la base des lacunes identifiées, l'espace suggère des ressources ciblées : tutoriels, exercices adaptatifs, ateliers de soutien." },
                  { bold: 'Jumeau numérique de progression', text: " : Projection prédictive simulant l'obtention du semestre, couplée à un plan d'action concret." },
                ]
              },
              {
                num: '3', color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)',
                title: "L'étudiant au centre, co-acteur de son suivi",
                items: [
                  { bold: 'Espace « Mon parcours » partagé', text: " : L'étudiant fixe ses objectifs et peut partager certaines réussites. Le parent devient un soutien qui encourage, non un inspecteur." },
                  { bold: 'Portfolio de travaux universitaires', text: " : Projets, rapports de stage, travaux de recherche déposés par l'étudiant, visibles des parents. Les réalisations concrètes dépassent la simple note." },
                  { bold: "Contrat d'objectifs tripartite", text: " : Tuteur pédagogique, étudiant et parents formalisent des objectifs à court terme avec des points d'étape automatiques." },
                ]
              },
              {
                num: '4', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)',
                title: 'Intégration de la vie étudiante et du bien-être',
                items: [
                  { bold: "Vie étudiante en un clin d'œil", text: " : Menu du restaurant universitaire, accès à la bibliothèque, activités culturelles et sportives, alertes d'annulation de TD." },
                  { bold: 'Indicateur de bien-être', text: " : Basé sur des micro-sondages anonymes, affiche un indicateur global sans trahir de détails personnels." },
                  { bold: 'Santé et événements', text: " : Agenda des sorties de terrain, périodes de stage et possibilité de valider en ligne les autorisations." },
                ]
              },
              {
                num: '5', color: '#ec4899', bg: 'rgba(236,72,153,0.06)', border: 'rgba(236,72,153,0.15)',
                title: 'Un écosystème familial et collectif',
                items: [
                  { bold: 'Vue multi-étudiants intelligente', text: " : Tableau de bord consolidé qui met en évidence les urgences pour tous les étudiants de la fratrie, quel que soit leur établissement." },
                  { bold: 'Espace co-parental', text: " : Droits d'accès égaux ou paramétrables pour les parents séparés, avec zone de commentaires partagés." },
                  { bold: "Modules d'auto-formation", text: " : Comprendre le LMD/ECTS, soutenir son enfant en période de partiels, prévenir le burn-out étudiant." },
                ]
              },
              {
                num: '6', color: '#14b8a6', bg: 'rgba(20,184,166,0.06)', border: 'rgba(20,184,166,0.15)',
                title: 'Architecture, sécurité et éthique : les conditions de la confiance',
                items: [
                  { bold: 'RGPD et souveraineté des données', text: " : Consentement éclairé et granulaire de l'étudiant qui décide précisément ce qu'il partage. L'étudiant majeur garde la maîtrise." },
                  { bold: 'Droit à la déconnexion', text: " : Le parent définit les plages horaires et le type d'alertes souhaités. L'outil aide, il ne stresse pas." },
                  { bold: 'Accessibilité universelle', text: " : Interface WCAG, compatible lecteurs d'écran, versions FALC et multilingues." },
                  { bold: 'Interopérabilité', text: " : Connexion aux systèmes existants (ENT, Moodle, Apogée) via API standardisées, sans double saisie." },
                ]
              },
            ].map((section) => (
              <div key={section.num} className="rounded-xl p-5" style={{ background: section.bg, border: `1px solid ${section.border}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: section.color }}>{section.num}</div>
                  <h3 className="font-bold text-white text-sm" style={CG}>{section.title}</h3>
                </div>
                <ul className="space-y-2 pl-10">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2" style={CG}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: section.color }} />
                      <span><strong className="text-white">{item.bold}</strong>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Conclusion */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-white font-bold text-sm mb-2" style={CG}>Conclusion : une alliance éducative augmentée pour la réussite étudiante</h3>
              <p style={CG}>Développer un « espace parent » pour l'enseignement supérieur dépasse la technologie. C'est <strong className="text-white">bâtir un pont de confiance</strong> entre l'université et la famille, où l'information ne sert pas à contrôler un jeune adulte mais à comprendre, prévenir et <strong className="text-white">célébrer ses réussites</strong>. L'université devient ainsi un écosystème transparent, bienveillant et résolument tourné vers l'avenir de chaque étudiant.</p>
            </div>

          </div>
        </DraggableDialogBody>
      </DraggableDialog>

      {/* ===== Agenda Universitaire Modal ===== */}
      <DraggableDialog
        open={agendaOpen}
        onOpenChange={setAgendaOpen}
        title={
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-white font-bold text-base" style={CG}>Agenda Universitaire</div>
              <div className="text-gray-400 text-xs" style={CG}>Établissements agréés de la RDC — {agendaData.length} enregistrés</div>
            </div>
          </div>
        }
        maxWidth="max-w-5xl"
      >
        <DraggableDialogBody>
          {agendaLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-yellow-400 animate-spin mb-3" />
              <span className="text-gray-400 text-sm" style={CG}>Chargement des établissements...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats compactes */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-2xl font-bold text-white" style={CG}>{agendaData.length}</div>
                  <div className="text-gray-400 text-xs" style={CG}>Total</div>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <div className="text-2xl font-bold text-blue-400" style={CG}>{agendaData.filter(e => e.statut === 'Privé').length}</div>
                  <div className="text-blue-300 text-xs" style={CG}>Privés</div>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <div className="text-2xl font-bold text-green-400" style={CG}>{agendaData.filter(e => e.statut === 'Public').length}</div>
                  <div className="text-green-300 text-xs" style={CG}>Publics</div>
                </div>
              </div>

              {/* Filtres */}
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Rechercher..."
                    value={agendaSearch}
                    onChange={(e) => setAgendaSearch(e.target.value)}
                    className="pl-9 text-sm"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', ...CG }}
                  />
                </div>
                <Select value={agendaStatut} onValueChange={setAgendaStatut}>
                  <SelectTrigger style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', ...CG }}>
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous statuts</SelectItem>
                    <SelectItem value="Privé">Privé</SelectItem>
                    <SelectItem value="Public">Public</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={agendaProvince} onValueChange={setAgendaProvince}>
                  <SelectTrigger style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', ...CG }}>
                    <SelectValue placeholder="Province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes provinces</SelectItem>
                    {agendaProvinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Résultats */}
              <div className="text-gray-400 text-xs" style={CG}>{filteredAgenda.length} résultat{filteredAgenda.length > 1 ? 's' : ''}</div>

              {/* Table */}
              <div className="overflow-y-auto rounded-lg" style={{ maxHeight: '45vh', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table className="w-full">
                  <thead className="sticky top-0" style={{ background: 'rgba(30,30,40,0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase" style={CG}>Sigle</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase" style={CG}>Dénomination</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase" style={CG}>Statut</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase" style={CG}>Territoire</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase" style={CG}>Province</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgenda.map((etab) => (
                      <tr
                        key={etab.id}
                        onClick={() => handleViewDetail(etab)}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td className="px-3 py-2.5">
                          <span className="text-white text-sm font-medium" style={CG}>{etab.sigle}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-gray-300 text-sm" style={CG}>{etab.denomination}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge className={etab.statut === 'Privé' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs' : 'bg-green-500/20 text-green-300 border-green-500/30 text-xs'}>
                            {etab.statut}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-gray-400 text-sm flex items-center gap-1" style={CG}><MapPin className="w-3 h-3" />{etab.territoire}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-gray-400 text-sm" style={CG}>{etab.province}</span>
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

      {/* ===== Detail Établissement Modal ===== */}
      <DraggableDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={
          <div className="flex items-center gap-3">
            <School className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-white font-bold text-base" style={CG}>{detailEtab?.sigle}</div>
              <div className="text-gray-400 text-xs" style={CG}>{detailEtab?.denomination}</div>
            </div>
          </div>
        }
        maxWidth="max-w-3xl"
      >
        <DraggableDialogBody>
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
              <span className="text-gray-400 text-sm" style={CG}>Chargement des informations...</span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Informations générales */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2" style={CG}>
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Informations Générales
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-500 text-xs" style={CG}>Sigle</span>
                    <p className="text-white text-sm font-medium" style={CG}>{detailEtab?.sigle || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs" style={CG}>Statut</span>
                    <p className="text-sm" style={CG}>
                      <Badge className={detailEtab?.statut === 'Privé' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}>
                        {detailEtab?.statut}
                      </Badge>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 text-xs" style={CG}>Dénomination complète</span>
                    <p className="text-white text-sm" style={CG}>{detailEtab?.denomination || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2" style={CG}>
                  <MapPin className="w-4 h-4 text-green-400" />
                  Adresse & Localisation
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-500 text-xs" style={CG}>Territoire / Ville</span>
                    <p className="text-white text-sm" style={CG}>{detailEtab?.territoire || detailExtra?.inscription?.ville || detailExtra?.registered?.city || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs" style={CG}>Province</span>
                    <p className="text-white text-sm" style={CG}>{detailEtab?.province || detailExtra?.inscription?.province || detailEtab?.territoire || '—'}</p>
                  </div>
                  {(detailExtra?.inscription?.adresse || detailExtra?.registered?.address || detailEtab?.adresse) && (
                    <div className="col-span-2">
                      <span className="text-gray-500 text-xs" style={CG}>Adresse complète</span>
                      <p className="text-white text-sm" style={CG}>{detailExtra?.inscription?.adresse || detailEtab?.adresse || detailExtra?.registered?.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact */}
              {(detailExtra?.inscription?.telephone || detailExtra?.inscription?.email_etablissement || detailExtra?.inscription?.site_web || detailEtab?.telephone || detailEtab?.email_etablissement || detailEtab?.site_web || detailExtra?.registered?.website) && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2" style={CG}>
                    <Phone className="w-4 h-4 text-purple-400" />
                    Contact
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(detailExtra?.inscription?.telephone || detailExtra?.registered?.phone || detailEtab?.telephone) && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-white text-sm" style={CG}>{detailExtra?.inscription?.telephone || detailEtab?.telephone || detailExtra?.registered?.phone}</span>
                      </div>
                    )}
                    {(detailExtra?.inscription?.email_etablissement || detailExtra?.registered?.email || detailEtab?.email_etablissement) && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-white text-sm" style={CG}>{detailExtra?.inscription?.email_etablissement || detailEtab?.email_etablissement || detailExtra?.registered?.email}</span>
                      </div>
                    )}
                    {(detailExtra?.inscription?.site_web || detailEtab?.site_web || detailExtra?.registered?.website) && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Globe className="w-3.5 h-3.5 text-gray-500" />
                        <a href={detailExtra?.inscription?.site_web || detailEtab?.site_web || detailExtra?.registered?.website} target="_blank" rel="noreferrer" className="text-blue-300 text-sm hover:underline" style={CG}>{detailExtra?.inscription?.site_web || detailEtab?.site_web || detailExtra?.registered?.website}</a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Structure Académique */}
              {detailExtra?.structure?.facultes?.length > 0 ? (
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2" style={CG}>
                    <GraduationCap className="w-4 h-4 text-yellow-400" />
                    Structure Académique
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 ml-auto text-xs">
                      {detailExtra.structure.facultes.length} Faculté{detailExtra.structure.facultes.length > 1 ? 's' : ''}
                    </Badge>
                  </h3>
                  <div className="space-y-3">
                    {detailExtra.structure.facultes.map(fac => {
                      const facDepts = detailExtra.structure.departements.filter(d => d.faculte_id === fac.id);
                      return (
                        <div key={fac.id} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span className="text-white text-sm font-medium" style={CG}>{fac.nom}</span>
                            {facDepts.length > 0 && (
                              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs ml-auto">
                                {facDepts.length} Dept{facDepts.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          {facDepts.length > 0 && (
                            <div className="ml-6 space-y-1.5">
                              {facDepts.map(dept => (
                                <div key={dept.id} className="flex items-center gap-2">
                                  <ChevronRight className="w-3 h-3 text-gray-500" />
                                  <span className="text-gray-300 text-xs" style={CG}>{dept.nom}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : !detailLoading && (
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  <School className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm" style={CG}>
                    Cet établissement n'a pas encore configuré sa structure académique sur H-Archive.
                  </p>
                </div>
              )}

              {/* Statistiques */}
              {detailExtra?.structure?.facultes?.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Facultés', count: detailExtra.structure.facultes?.length || 0, color: 'blue' },
                    { label: 'Départements', count: detailExtra.structure.departements?.length || 0, color: 'green' },
                    { label: 'Orientations', count: detailExtra.structure.orientations?.length || 0, color: 'purple' },
                    { label: 'Promotions', count: detailExtra.structure.promotions?.length || 0, color: 'yellow' },
                  ].map(s => (
                    <div key={s.label} className="text-center rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className={`text-lg font-bold text-${s.color}-400`} style={CG}>{s.count}</div>
                      <div className="text-gray-500 text-xs" style={CG}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DraggableDialogBody>
      </DraggableDialog>
    </div>
  );
}
