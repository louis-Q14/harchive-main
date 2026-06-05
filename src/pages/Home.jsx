import React, { useState } from 'react';
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

  // Agenda Universitaire modal state
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaData, setAgendaData] = useState([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaStatut, setAgendaStatut] = useState('tous');
  const [agendaProvince, setAgendaProvince] = useState('tous');
  // Detail sub-modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEtab, setDetailEtab] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailExtra, setDetailExtra] = useState(null); // inscription + structure data

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
            <div className="flex items-center gap-0 rounded-full p-1 w-full mb-6" style={{ backgroundColor: 'var(--ha-surface)' }}>
              {HOME_JOURNAL_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#3d3d3d] text-white shadow-lg'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
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
                  <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '70vh' }}>
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
                onClick={() => f.page === 'ListeEtablissements' ? handleOpenAgenda() : navigate(createPageUrl(f.page))}
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
