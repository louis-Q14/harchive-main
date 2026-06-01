// @ts-nocheck
import React, { useState, useMemo } from "react";
import { apiClient } from "@/api/httpClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Search, Trash2, Loader2, AlertCircle, MessageCircle, Heart, Eye,
  Video, Radio, EyeOff, StopCircle, FileText, Film, Wifi, Play, X, Volume2, VolumeX, Maximize2,
  ChevronDown, ChevronRight, User, Image, Link2, Ban, CheckCircle, RotateCcw, Unlock, Lock, Clock,
  Send, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

const api = {
  get: async (path) => { const r = await apiClient.get(path); return r.data || r; },
  del: async (path) => { const r = await apiClient.delete(path); return r.data || r; },
  post: async (path) => { const r = await apiClient.post(path); return r.data || r; },
};

const TABS = [
  { key: "publications", label: "Publications", icon: FileText },
  { key: "shorts", label: "Shorts", icon: Film },
  { key: "lives", label: "Lives", icon: Wifi },
  { key: "violations", label: "Violations NSFW", icon: AlertCircle },
  { key: "blocked", label: "Comptes bloqués", icon: Ban },
  { key: "reviewed", label: "Cas traités", icon: CheckCircle },
];

function safeParseJSON(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

export default function Moderation() {
  const [activeTab, setActiveTab] = useState("publications");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToDelete, setItemToDelete] = useState(null);
  const [filterVisibility, setFilterVisibility] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedUsers, setExpandedUsers] = useState({});
  const [mediaPreview, setMediaPreview] = useState(null);
  const [selectedViolations, setSelectedViolations] = useState(null);
  const [showViolationsDialog, setShowViolationsDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [chatAccount, setChatAccount] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatReply, setChatReply] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const queryClient = useQueryClient();

  const toggleUser = (userId) => setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));

  // ── Fetch data ──
  const { data: stats = {} } = useQuery({
    queryKey: ['moderation-stats'],
    queryFn: () => api.get('/api/moderation/stats'),
    staleTime: 30000,
  });

  const { data: publications = [], isLoading: loadingPubs } = useQuery({
    queryKey: ['moderation-publications'],
    queryFn: () => api.get('/api/moderation/publications?limit=500'),
    staleTime: 30000,
  });

  const { data: shorts = [], isLoading: loadingShorts } = useQuery({
    queryKey: ['moderation-shorts'],
    queryFn: () => api.get('/api/moderation/shorts?limit=500'),
    staleTime: 30000,
  });

  const { data: lives = [], isLoading: loadingLives } = useQuery({
    queryKey: ['moderation-lives'],
    queryFn: () => api.get('/api/moderation/lives?limit=500'),
    staleTime: 30000,
  });

  const { data: violations = [], isLoading: loadingViolations } = useQuery({
    queryKey: ['moderation-violations'],
    queryFn: async () => { const d = await api.get('/api/moderation/violations'); return Array.isArray(d) ? d : []; },
    staleTime: 30000,
  });

  const { data: autoBlocked = [], isLoading: loadingBlocked } = useQuery({
    queryKey: ['moderation-auto-blocked'],
    queryFn: async () => { const d = await api.get('/api/moderation/auto-blocked'); return Array.isArray(d) ? d : []; },
    staleTime: 30000,
  });

  // ── Mutations ──
  const deletePubMutation = useMutation({
    mutationFn: (id) => api.del(`/api/moderation/publications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-publications'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
      setItemToDelete(null);
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: (id) => api.post(`/api/moderation/publications/${id}/toggle-visibility`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-publications'] });
    },
  });

  const deleteShortMutation = useMutation({
    mutationFn: (id) => api.del(`/api/moderation/shorts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-shorts'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
      setItemToDelete(null);
    },
  });

  const deleteLiveMutation = useMutation({
    mutationFn: (id) => api.del(`/api/moderation/lives/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-lives'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
      setItemToDelete(null);
    },
  });

  const forceEndLiveMutation = useMutation({
    mutationFn: (id) => api.post(`/api/moderation/lives/${id}/force-end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-lives'] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, note }) => apiClient.post(`/api/moderation/auto-blocked/${id}/review`, { action, note }).then(r => r.data || r),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-auto-blocked'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
    },
  });

  const resetViolationsMutation = useMutation({
    mutationFn: (id) => api.post(`/api/moderation/auto-blocked/${id}/reset-violations`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-auto-blocked'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-violations'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
    },
  });

  // ── Violations detail + Chat handlers ──
  const handleViewViolations = async (account) => {
    try {
      const data = await api.get(`/api/moderation/violations/${account.user_id}`);
      setSelectedViolations({ account, violations: Array.isArray(data) ? data : [] });
      setShowViolationsDialog(true);
    } catch { /* ignore */ }
  };

  const handleOpenChat = async (account) => {
    setChatAccount(account);
    setShowChatDialog(true);
    setChatLoading(true);
    setChatReply('');
    try {
      const data = await api.get(`/api/moderation/blocked-messages/${account.user_id}`);
      setChatMessages(Array.isArray(data) ? data : []);
      setUnreadCounts(prev => ({ ...prev, [account.user_id]: 0 }));
    } catch { /* ignore */ }
    finally { setChatLoading(false); }
  };

  const handleSendReply = async () => {
    if (!chatReply.trim() || !chatAccount || chatSending) return;
    setChatSending(true);
    try {
      await apiClient.post(`/api/moderation/blocked-messages/${chatAccount.user_id}/reply`, { message: chatReply.trim() });
      setChatReply('');
      const data = await api.get(`/api/moderation/blocked-messages/${chatAccount.user_id}`);
      setChatMessages(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setChatSending(false); }
  };

  // Fetch unread counts for blocked tab
  React.useEffect(() => {
    if (activeTab !== 'blocked') return;
    const fetchUnread = async () => {
      try {
        const data = await api.get('/api/moderation/blocked-messages-unread');
        const map = {};
        if (Array.isArray(data)) data.forEach(u => { map[u.user_id] = u.unread_count; });
        setUnreadCounts(map);
      } catch { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // ── Handle delete ──
  const handleDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'publication') deletePubMutation.mutate(itemToDelete.id);
    else if (itemToDelete.type === 'short') deleteShortMutation.mutate(itemToDelete.id);
    else if (itemToDelete.type === 'live') deleteLiveMutation.mutate(itemToDelete.id);
  };

  const isDeleting = deletePubMutation.isPending || deleteShortMutation.isPending || deleteLiveMutation.isPending;

  // ── Filtered data ──
  const filteredPubs = useMemo(() => {
    let items = publications;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(p => p.auteur_nom?.toLowerCase().includes(q) || p.contenu?.toLowerCase().includes(q));
    }
    if (filterVisibility !== "all") {
      items = items.filter(p => p.visibilite === filterVisibility);
    }
    return items;
  }, [publications, searchQuery, filterVisibility]);

  const filteredShorts = useMemo(() => {
    let items = shorts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(s => s.creator_nom?.toLowerCase().includes(q) || s.titre?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
    }
    if (filterStatus !== "all") {
      items = items.filter(s => s.status === filterStatus);
    }
    return items;
  }, [shorts, searchQuery, filterStatus]);

  const filteredLives = useMemo(() => {
    let items = lives;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(l => l.streamer_nom?.toLowerCase().includes(q) || l.titre?.toLowerCase().includes(q));
    }
    if (filterStatus !== "all") {
      items = items.filter(l => l.status === filterStatus);
    }
    return items;
  }, [lives, searchQuery, filterStatus]);

  const blockedAccounts = useMemo(() => autoBlocked.filter(a => a.status === 'blocked'), [autoBlocked]);
  const reviewedAccounts = useMemo(() => autoBlocked.filter(a => a.status === 'unblocked' || a.status === 'confirmed'), [autoBlocked]);

  const filteredViolations = useMemo(() => {
    if (!searchQuery) return violations;
    const q = searchQuery.toLowerCase();
    return violations.filter(v => v.user_nom?.toLowerCase().includes(q) || v.user_email?.toLowerCase().includes(q) || v.reason?.toLowerCase().includes(q) || v.filename?.toLowerCase().includes(q));
  }, [violations, searchQuery]);

  const filteredBlocked = useMemo(() => {
    if (!searchQuery) return blockedAccounts;
    const q = searchQuery.toLowerCase();
    return blockedAccounts.filter(a => a.user_nom?.toLowerCase().includes(q) || a.user_email?.toLowerCase().includes(q));
  }, [blockedAccounts, searchQuery]);

  const filteredReviewed = useMemo(() => {
    if (!searchQuery) return reviewedAccounts;
    const q = searchQuery.toLowerCase();
    return reviewedAccounts.filter(a => a.user_nom?.toLowerCase().includes(q) || a.user_email?.toLowerCase().includes(q));
  }, [reviewedAccounts, searchQuery]);

  const isLoading = activeTab === "publications" ? loadingPubs : activeTab === "shorts" ? loadingShorts : activeTab === "lives" ? loadingLives : activeTab === "violations" ? loadingViolations : loadingBlocked;

  // ── Group by user ──
  const groupedPubs = useMemo(() => {
    const map = {};
    for (const p of filteredPubs) {
      const uid = p.auteur_id || p.auteur_nom || 'unknown';
      if (!map[uid]) map[uid] = { userId: uid, name: p.auteur_nom || 'Inconnu', photo: p.auteur_photo_url, role: p.auteur_role, items: [] };
      map[uid].items.push(p);
    }
    return Object.values(map).sort((a, b) => b.items.length - a.items.length);
  }, [filteredPubs]);

  const groupedShorts = useMemo(() => {
    const map = {};
    for (const s of filteredShorts) {
      const uid = s.creator_id || s.creator_nom || 'unknown';
      if (!map[uid]) map[uid] = { userId: uid, name: s.creator_nom || 'Inconnu', photo: s.creator_photo_url, items: [] };
      map[uid].items.push(s);
    }
    return Object.values(map).sort((a, b) => b.items.length - a.items.length);
  }, [filteredShorts]);

  const groupedLives = useMemo(() => {
    const map = {};
    for (const l of filteredLives) {
      const uid = l.streamer_id || l.streamer_nom || 'unknown';
      if (!map[uid]) map[uid] = { userId: uid, name: l.streamer_nom || 'Inconnu', photo: l.streamer_photo_url, items: [] };
      map[uid].items.push(l);
    }
    return Object.values(map).sort((a, b) => b.items.length - a.items.length);
  }, [filteredLives]);

  const getRoleLabel = (role) => {
    const labels = { super_admin: "Super Admin", admin_systeme: "Admin Système", admin_etablissement: "Admin Étab.", professeur: "Professeur", etudiant: "Étudiant", parent: "Parent" };
    return labels[role] || role || "—";
  };

  const getVisBadge = (vis) => {
    if (vis === "etablissement") return { label: "Établissement", cls: "bg-blue-600/20 text-blue-300 border-blue-500/30" };
    if (vis === "classe") return { label: "Classe", cls: "bg-purple-600/20 text-purple-300 border-purple-500/30" };
    return { label: "Public", cls: "bg-green-600/20 text-green-300 border-green-500/30" };
  };

  return (
    <div className="min-h-screen" style={{ background: "#111118", color: "#e0e0e0", ...CG }}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-400" />
            <div>
              <h1 className="text-2xl font-bold text-white" style={CG}>Modération</h1>
              <p className="text-gray-400 text-sm" style={CG}>Contrôle des publications, shorts et lives</p>
            </div>
          </div>
        </div>

        {/* ═══ Stats Cards ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Publications", value: stats.totalPubs || publications.length, icon: FileText, color: "text-blue-400" },
            { label: "Shorts", value: stats.totalShorts || shorts.filter(s => s.status === 'published').length, icon: Film, color: "text-orange-400" },
            { label: "Lives", value: stats.totalLives || lives.length, icon: Wifi, color: "text-green-400" },
            { label: "Violations NSFW", value: stats.totalViolations || 0, icon: AlertCircle, color: "text-red-400" },
            { label: "Comptes bloqués", value: stats.totalBlocked || 0, icon: EyeOff, color: "text-yellow-400" },
            { label: "Cas traités", value: stats.totalReviewed || 0, icon: Shield, color: "text-emerald-400" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ═══ Tabs ═══ */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchQuery(""); setFilterVisibility("all"); setFilterStatus("all"); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
              style={CG}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <Badge className="ml-1 text-xs px-1.5 py-0 bg-white/10 text-gray-400 border-0">
                {tab.key === "publications" ? publications.length : tab.key === "shorts" ? shorts.filter(s => s.status === 'published').length : tab.key === "lives" ? lives.length : tab.key === "violations" ? (stats.totalViolations || 0) : tab.key === "blocked" ? (stats.totalBlocked || 0) : (stats.totalReviewed || 0)}
              </Badge>
            </button>
          ))}
        </div>

        {/* ═══ Filters + Search ═══ */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder={activeTab === "publications" ? "Rechercher par auteur ou contenu..." : activeTab === "shorts" ? "Rechercher par créateur ou titre..." : "Rechercher par streamer ou titre..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              style={CG}
            />
          </div>
          {activeTab === "publications" && (
            <select
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 text-gray-300"
              style={CG}
            >
              <option value="all">Toutes les visibilités</option>
              <option value="publique">Public</option>
              <option value="etablissement">Établissement</option>
              <option value="classe">Classe</option>
            </select>
          )}
          {(activeTab === "shorts") && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 text-gray-300"
              style={CG}
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publiés</option>
              <option value="processing">En traitement</option>
              <option value="deleted">Supprimés</option>
            </select>
          )}
          {(activeTab === "lives") && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 text-gray-300"
              style={CG}
            >
              <option value="all">Tous les statuts</option>
              <option value="live">En direct</option>
              <option value="ended">Terminés</option>
            </select>
          )}
        </div>

        {/* ═══ Content ═══ */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Publications Tab ── */}
            {activeTab === "publications" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500" style={CG}>{filteredPubs.length} publication{filteredPubs.length > 1 ? 's' : ''} · {groupedPubs.length} utilisateur{groupedPubs.length > 1 ? 's' : ''}</p>
                {groupedPubs.length === 0 ? (
                  <EmptyState icon={FileText} text="Aucune publication trouvée" />
                ) : (
                  groupedPubs.map(group => {
                    const images = group.items.filter(p => p.type_media === 'image' || p.type_media === 'photo');
                    const videos = group.items.filter(p => p.type_media === 'video');
                    const links = group.items.filter(p => !p.media_url && p.contenu && /(https?:\/\/[^\s]+)/i.test(p.contenu));
                    const others = group.items.filter(p => !images.includes(p) && !videos.includes(p) && !links.includes(p));
                    const categories = [
                      { key: 'images', label: 'Images', icon: Image, items: images, color: 'text-blue-400' },
                      { key: 'videos', label: 'Vidéos', icon: Film, items: videos, color: 'text-orange-400' },
                      { key: 'links', label: 'Liens', icon: Link2, items: links, color: 'text-emerald-400' },
                      { key: 'others', label: 'Autres', icon: FileText, items: others, color: 'text-gray-400' },
                    ].filter(c => c.items.length > 0);

                    return (
                    <UserGroup
                      key={group.userId}
                      group={group}
                      expanded={!!expandedUsers[group.userId]}
                      onToggle={() => toggleUser(group.userId)}
                      icon={FileText}
                      label="publication"
                    >
                      {categories.map(cat => (
                        <MediaCategory key={cat.key} label={cat.label} icon={cat.icon} count={cat.items.length} color={cat.color}
                          expanded={!!expandedUsers[`${group.userId}_${cat.key}`]}
                          onToggle={() => toggleUser(`${group.userId}_${cat.key}`)}>
                          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                            {cat.items.map(pub => (
                              <PubThumbnail
                                key={pub.id}
                                pub={pub}
                                catKey={cat.key}
                                onClick={() => setMediaPreview({ pub, catKey: cat.key })}
                              />
                            ))}
                          </div>
                        </MediaCategory>
                      ))}
                    </UserGroup>
                  );})
                )}
              </div>
            )}

            {/* ── Shorts Tab ── */}
            {activeTab === "shorts" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500" style={CG}>{filteredShorts.length} short{filteredShorts.length > 1 ? 's' : ''} · {groupedShorts.length} utilisateur{groupedShorts.length > 1 ? 's' : ''}</p>
                {groupedShorts.length === 0 ? (
                  <EmptyState icon={Film} text="Aucun short trouvé" />
                ) : (
                  groupedShorts.map(group => (
                    <UserGroup
                      key={group.userId}
                      group={group}
                      expanded={!!expandedUsers[group.userId]}
                      onToggle={() => toggleUser(group.userId)}
                      icon={Film}
                      label="short"
                    >
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 pt-2">
                        {group.items.map(short => (
                          <ShortThumbnail
                            key={short.id}
                            short={short}
                            onClick={() => setMediaPreview({ pub: { ...short, auteur_nom: short.creator_nom, auteur_photo_url: short.creator_photo_url, media_url: short.video_url, contenu: short.titre }, catKey: 'short', short })}
                          />
                        ))}
                      </div>
                    </UserGroup>
                  ))
                )}
              </div>
            )}

            {/* ── Lives Tab ── */}
            {activeTab === "lives" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500" style={CG}>{filteredLives.length} live{filteredLives.length > 1 ? 's' : ''} · {groupedLives.length} utilisateur{groupedLives.length > 1 ? 's' : ''}</p>
                {groupedLives.length === 0 ? (
                  <EmptyState icon={Wifi} text="Aucun live trouvé" />
                ) : (
                  groupedLives.map(group => (
                    <UserGroup
                      key={group.userId}
                      group={group}
                      expanded={!!expandedUsers[group.userId]}
                      onToggle={() => toggleUser(group.userId)}
                      icon={Wifi}
                      label="live"
                    >
                      {group.items.map(live => (
                        <LiveCard
                          key={live.id}
                          live={live}
                          onDelete={() => setItemToDelete({ type: 'live', id: live.id, label: live.streamer_nom, detail: live.titre })}
                          onForceEnd={() => forceEndLiveMutation.mutate(live.id)}
                          isEndingLive={forceEndLiveMutation.isPending}
                        />
                      ))}
                    </UserGroup>
                  ))
                )}
              </div>
            )}

            {/* ── Violations NSFW Tab ── */}
            {activeTab === "violations" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500" style={CG}>{filteredViolations.length} violation{filteredViolations.length > 1 ? 's' : ''}</p>
                {filteredViolations.length === 0 ? (
                  <EmptyState icon={AlertCircle} text="Aucune violation NSFW enregistrée" />
                ) : (
                  filteredViolations.map(v => (
                    <ViolationCard key={v.id} violation={v} />
                  ))
                )}
              </div>
            )}

            {/* ── Comptes bloqués Tab ── */}
            {activeTab === "blocked" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500" style={CG}>{filteredBlocked.length} compte{filteredBlocked.length > 1 ? 's' : ''} bloqué{filteredBlocked.length > 1 ? 's' : ''}</p>
                {filteredBlocked.length === 0 ? (
                  <EmptyState icon={Ban} text="Aucun compte bloqué automatiquement" />
                ) : (
                  filteredBlocked.map(account => (
                    <BlockedAccountCard
                      key={account.id}
                      account={account}
                      onReview={(action, note) => reviewMutation.mutate({ id: account.id, action, note })}
                      onReset={() => resetViolationsMutation.mutate(account.id)}
                      onViewViolations={() => handleViewViolations(account)}
                      onOpenChat={() => handleOpenChat(account)}
                      unreadCount={unreadCounts[account.user_id] || 0}
                      isReviewing={reviewMutation.isPending}
                      isResetting={resetViolationsMutation.isPending}
                    />
                  ))
                )}
              </div>
            )}

            {/* ── Cas traités Tab ── */}
            {activeTab === "reviewed" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500" style={CG}>{filteredReviewed.length} cas traité{filteredReviewed.length > 1 ? 's' : ''}</p>
                {filteredReviewed.length === 0 ? (
                  <EmptyState icon={CheckCircle} text="Aucun cas traité" />
                ) : (
                  filteredReviewed.map(account => (
                    <ReviewedAccountCard key={account.id} account={account} />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ Media Preview Dialog ═══ */}
      <DraggableDialog
        open={!!mediaPreview}
        onOpenChange={() => setMediaPreview(null)}
        maxWidth="max-w-3xl"
        resizable={false}
        title={
          mediaPreview ? (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#333' }}>
                {mediaPreview.pub.auteur_photo_url ? <img src={mediaPreview.pub.auteur_photo_url} alt="" className="w-full h-full rounded-full object-cover" /> : (mediaPreview.pub.auteur_nom?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U')}
              </div>
              <span className="text-white text-sm font-semibold" style={CG}>{mediaPreview.pub.auteur_nom || 'Inconnu'}</span>
              <span className="text-gray-500 text-xs">{mediaPreview.pub.created_date ? format(new Date(mediaPreview.pub.created_date), 'dd/MM/yyyy HH:mm', { locale: fr }) : ''}</span>
            </div>
          ) : null
        }
      >
        {mediaPreview && (
          <>
            <DraggableDialogBody className="!p-0">
              <div className="flex items-center justify-center bg-black/80 rounded-sm overflow-hidden">
                {mediaPreview.catKey === 'images' && mediaPreview.pub.media_url ? (
                  <img src={mediaPreview.pub.media_url} alt="" className="max-h-[60vh] max-w-full object-contain" />
                ) : (mediaPreview.catKey === 'videos' || mediaPreview.catKey === 'short') && mediaPreview.pub.media_url ? (
                  <video src={mediaPreview.pub.media_url} controls autoPlay className="max-h-[60vh] max-w-full" />
                ) : null}
              </div>

              {/* Info section */}
              <div className="px-5 py-3 space-y-2">
                {/* Title / Content */}
                {(mediaPreview.short?.titre || mediaPreview.pub.contenu) && (
                  <p className="text-white text-sm font-medium" style={CG}>
                    {mediaPreview.short?.titre || mediaPreview.pub.contenu}
                  </p>
                )}
                {mediaPreview.short?.description && mediaPreview.short.description !== mediaPreview.short.titre && (
                  <p className="text-gray-400 text-xs" style={CG}>{mediaPreview.short.description}</p>
                )}

                {/* Stats for shorts */}
                {mediaPreview.catKey === 'short' && mediaPreview.short && (
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {mediaPreview.short.views || 0} vues</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {safeParseJSON(mediaPreview.short.likes).length}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {mediaPreview.short.nb_commentaires || 0}</span>
                    {mediaPreview.short.duration > 0 && <span>{Math.round(mediaPreview.short.duration)}s</span>}
                    {mediaPreview.short.status && (
                      <Badge className="text-[10px] bg-white/5 text-gray-400 border-white/10 border">{mediaPreview.short.status}</Badge>
                    )}
                  </div>
                )}

                {/* Stats for publications */}
                {mediaPreview.catKey !== 'short' && (
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {safeParseJSON(mediaPreview.pub.likes).length}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {mediaPreview.pub.nb_commentaires || 0}</span>
                    {mediaPreview.pub.visibilite && (
                      <Badge className="text-[10px] bg-white/5 text-gray-400 border-white/10 border">{mediaPreview.pub.visibilite}</Badge>
                    )}
                  </div>
                )}
              </div>
            </DraggableDialogBody>
            <DraggableDialogFooter>
              {mediaPreview.catKey !== 'short' && (
                <Button size="sm"
                  onClick={() => { toggleVisibilityMutation.mutate(mediaPreview.pub.id); setMediaPreview(null); }}
                  className="bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-600/30"
                  title={mediaPreview.pub.masque ? 'Démasquer' : 'Masquer'}>
                  {mediaPreview.pub.masque ? <Eye className="w-4 h-4 mr-1.5" /> : <EyeOff className="w-4 h-4 mr-1.5" />}
                  {mediaPreview.pub.masque ? 'Démasquer' : 'Masquer'}
                </Button>
              )}
              <Button size="sm"
                onClick={() => { setItemToDelete({ type: mediaPreview.catKey === 'short' ? 'short' : 'publication', id: mediaPreview.short?.id || mediaPreview.pub.id, label: mediaPreview.pub.auteur_nom, detail: mediaPreview.pub.contenu?.slice(0, 80) }); setMediaPreview(null); }}
                className="bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30">
                <Trash2 className="w-4 h-4 mr-1.5" /> Supprimer
              </Button>
            </DraggableDialogFooter>
          </>
        )}
      </DraggableDialog>

      {/* ═══ Delete Dialog ═══ */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", color: "#e0e0e0" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2" style={CG}>
              <AlertCircle className="w-5 h-5 text-red-400" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400" style={CG}>
              Supprimer {itemToDelete?.type === 'publication' ? 'la publication' : itemToDelete?.type === 'short' ? 'le short' : 'le live'} de <strong className="text-white">{itemToDelete?.label}</strong> ?
              {itemToDelete?.detail && <><br/><span className="text-gray-500 text-xs">"{itemToDelete.detail}..."</span></>}
              <br/><br/>Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ccc", ...CG }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              style={CG}
            >
              {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Suppression...</> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ Violations Detail Dialog ═══ */}
      <DraggableDialog open={showViolationsDialog} onOpenChange={setShowViolationsDialog} resizable={false} title={<span className="text-white text-xl font-semibold" style={CG}>Détails des violations</span>}>
        <DraggableDialogBody>
          {selectedViolations && (
            <div className="space-y-4 py-4" style={CG}>
              <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-white font-semibold">{selectedViolations.account.user_nom}</p>
                <p className="text-gray-400 text-sm">{selectedViolations.account.user_email}</p>
                <p className="text-red-400 text-sm mt-1">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  {selectedViolations.violations.length} violation(s) enregistrée(s)
                </p>
              </div>
              {selectedViolations.violations.map((v, i) => (
                <div key={v.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-400 text-xs font-medium">Violation #{selectedViolations.violations.length - i}</span>
                    <span className="text-gray-500 text-xs">
                      {v.created_date ? format(new Date(v.created_date), 'dd/MM/yyyy HH:mm', { locale: fr }) : ''}
                    </span>
                  </div>
                  <p className="text-white text-sm">{v.reason}</p>
                  <p className="text-gray-400 text-xs mt-1">Fichier: {v.filename}</p>
                  <p className="text-gray-500 text-xs">Catégorie: {v.category || 'N/A'}</p>
                  {v.scores && (() => {
                    try {
                      const scores = JSON.parse(v.scores);
                      return (
                        <div className="flex gap-2 mt-2">
                          {(Array.isArray(scores) ? scores : Object.entries(scores).map(([cls, prob]) => ({ class: cls, prob: typeof prob === 'number' ? prob * 100 : prob }))).map((s, j) => (
                            <span key={j} className={`text-xs px-2 py-0.5 rounded ${(s.prob > 50) ? 'bg-red-900/50 text-red-300' : 'bg-gray-800 text-gray-400'}`}>
                              {s.class}: {typeof s.prob === 'number' ? s.prob.toFixed(1) : String(s.prob)}%
                            </span>
                          ))}
                        </div>
                      );
                    } catch { return null; }
                  })()}
                </div>
              ))}
            </div>
          )}
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <Button onClick={() => setShowViolationsDialog(false)}
            className="bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10" style={CG}>
            Fermer
          </Button>
        </DraggableDialogFooter>
      </DraggableDialog>

      {/* ═══ Chat Dialog ═══ */}
      <DraggableDialog open={showChatDialog} onOpenChange={setShowChatDialog} resizable={false} title={
        <span className="text-white text-xl font-semibold flex items-center gap-2" style={CG}>
          <MessageCircle className="w-5 h-5 text-blue-400" />
          Messages — {chatAccount?.user_nom || ''}
        </span>
      }>
        <DraggableDialogBody style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div className="flex flex-col" style={{ ...CG, flex: 1, minHeight: 0 }}>
            {/* User info */}
            <div className="p-3 rounded-lg mb-3 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-white text-sm font-medium">{chatAccount?.user_nom}</p>
              <p className="text-gray-400 text-xs">{chatAccount?.user_email}</p>
              <p className="text-xs mt-1">
                {chatAccount?.status === 'blocked' && <span className="text-red-400">● Bloqué</span>}
                {chatAccount?.status === 'unblocked' && <span className="text-green-400">● Débloqué</span>}
                {chatAccount?.status === 'confirmed' && <span className="text-orange-400">● Confirmé</span>}
              </p>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent', minHeight: 0 }}>
              {chatLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Aucun message</p>
                  <p className="text-gray-600 text-xs mt-1">L'utilisateur n'a pas encore envoyé de message</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%] rounded-2xl px-3 py-2" style={{
                      backgroundColor: msg.sender_type === 'admin' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.08)',
                      border: msg.sender_type === 'admin' ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[11px] font-medium ${msg.sender_type === 'admin' ? 'text-blue-400' : 'text-gray-400'}`}>
                          {msg.sender_type === 'admin' ? `🛡️ ${msg.sender_name}` : `👤 ${msg.sender_name}`}
                        </span>
                        <span className="text-gray-600 text-[10px]">
                          {msg.created_date ? format(new Date(msg.created_date), 'dd/MM HH:mm', { locale: fr }) : ''}
                        </span>
                      </div>
                      <p className="text-gray-200 text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <div className="flex gap-2 w-full" style={CG}>
            <textarea
              value={chatReply}
              onChange={(e) => setChatReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
              placeholder="Répondre à l'utilisateur..."
              rows={2}
              className="flex-1 resize-none rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              onClick={handleSendReply}
              disabled={!chatReply.trim() || chatSending}
              className="self-end flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer"
              style={{ backgroundColor: 'rgba(59,130,246,0.3)', border: '1px solid rgba(59,130,246,0.4)' }}
            >
              {chatSending ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> : <Send className="w-4 h-4 text-blue-400" />}
            </button>
          </div>
        </DraggableDialogFooter>
      </DraggableDialog>
    </div>
  );
}

// ═══════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════

function UserGroup({ group, expanded, onToggle, icon: Icon, label, children }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Header – click to expand/collapse */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ background: "#333" }}>
          {group.photo ? (
            <img src={group.photo} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0 text-left">
          <span className="font-semibold text-white text-sm" style={CG}>{group.name}</span>
          {group.role && (
            <span className="ml-2 text-xs text-gray-500">({group.role})</span>
          )}
        </div>

        {/* Count badge */}
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
          <Badge className="text-xs bg-white/5 text-gray-300 border-white/10 border">{group.items.length} {label}{group.items.length > 1 ? 's' : ''}</Badge>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/[0.04]">
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center py-16">
      <Icon className="w-12 h-12 text-gray-700 mb-3" />
      <p className="text-gray-500" style={CG}>{text}</p>
    </div>
  );
}

function MediaCategory({ label, icon: Icon, count, color, expanded, onToggle, children }) {
  return (
    <div className="rounded-lg mt-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] transition-colors cursor-pointer rounded-lg"
      >
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm font-medium text-gray-300" style={CG}>{label}</span>
        <Badge className="text-xs bg-white/5 text-gray-400 border-white/10 border ml-1">{count}</Badge>
        <div className="flex-1" />
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

function PubThumbnail({ pub, catKey, onClick }) {
  const extractUrl = (text) => { const m = text?.match(/(https?:\/\/[^\s]+)/i); return m ? m[1] : null; };

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer aspect-square hover:ring-2 hover:ring-white/30 transition-all"
      style={{ background: pub.masque ? "rgba(255,60,60,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${pub.masque ? "rgba(255,60,60,0.25)" : "rgba(255,255,255,0.08)"}` }}
      onClick={onClick}
    >
      {catKey === 'images' && pub.media_url ? (
        <img src={pub.media_url} alt="" className="w-full h-full object-cover" />
      ) : catKey === 'videos' && pub.media_url ? (
        <div className="w-full h-full flex items-center justify-center bg-black/40">
          <video src={pub.media_url} className="w-full h-full object-cover" muted />
          <Play className="absolute w-6 h-6 text-white/80 drop-shadow" />
        </div>
      ) : catKey === 'links' ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
          <Link2 className="w-5 h-5 text-emerald-400 mb-1" />
          <p className="text-[10px] text-gray-400 line-clamp-3 break-all">{extractUrl(pub.contenu) || pub.contenu?.slice(0, 60)}</p>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center p-2">
          <p className="text-[10px] text-gray-500 line-clamp-4 text-center">{pub.contenu?.slice(0, 80) || '—'}</p>
        </div>
      )}

      {pub.masque && (
        <div className="absolute top-1 left-1">
          <EyeOff className="w-3 h-3 text-red-400" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[9px] text-gray-400 text-center">
        {pub.created_date ? format(new Date(pub.created_date), 'dd/MM HH:mm', { locale: fr }) : ''}
      </div>
    </div>
  );
}

function ShortThumbnail({ short, onClick }) {
  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer aspect-square hover:ring-2 hover:ring-white/30 transition-all"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      onClick={onClick}
    >
      {short.thumbnail_url ? (
        <img src={short.thumbnail_url} alt="" className="w-full h-full object-cover" />
      ) : short.video_url ? (
        <video src={short.video_url} muted preload="metadata" className="w-full h-full object-cover" onLoadedData={(e) => { e.target.currentTime = 0.5; }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black/40">
          <Film className="w-6 h-6 text-gray-600" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
          <Play className="w-4 h-4 text-white ml-0.5" />
        </div>
      </div>
      {short.titre && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent px-1.5 pt-1 pb-3">
          <p className="text-[9px] text-white line-clamp-2 font-medium">{short.titre}</p>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3 flex items-end justify-between">
        <span className="text-[9px] text-gray-300">{short.created_date ? format(new Date(short.created_date), 'dd/MM HH:mm', { locale: fr }) : ''}</span>
        {short.duration > 0 && <span className="text-[9px] text-gray-300">{Math.round(short.duration)}s</span>}
      </div>
    </div>
  );
}

function PubCard({ pub, getRoleLabel, getVisBadge, onDelete, onToggleVisibility, isTogglingVis }) {
  const likes = safeParseJSON(pub.likes);
  const vis = getVisBadge(pub.visibilite);

  return (
    <div className="rounded-xl p-4 flex gap-4" style={{ background: pub.masque ? "rgba(255,60,60,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${pub.masque ? "rgba(255,60,60,0.15)" : "rgba(255,255,255,0.06)"}` }}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ background: "#333" }}>
        {pub.auteur_photo_url ? (
          <img src={pub.auteur_photo_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          pub.auteur_nom?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-white text-sm" style={CG}>{pub.auteur_nom || "Inconnu"}</span>
          <Badge variant="outline" className="text-xs border-white/10 text-gray-400" style={CG}>{getRoleLabel(pub.auteur_role)}</Badge>
          <Badge className={`text-xs border ${vis.cls}`}>{vis.label}</Badge>
          {pub.masque ? <Badge className="text-xs bg-red-600/20 text-red-300 border-red-500/30 border">Masquée</Badge> : null}
          <span className="text-xs text-gray-600 ml-auto">{pub.created_date ? format(new Date(pub.created_date), 'dd/MM/yyyy HH:mm', { locale: fr }) : ""}</span>
        </div>

        {pub.contenu && <p className="text-sm text-gray-300 line-clamp-2 mb-2" style={CG}>{pub.contenu}</p>}

        {pub.media_url && (
          <div className="mb-2 rounded-lg overflow-hidden inline-block" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            {(pub.type_media === "image" || pub.type_media === "photo") ? (
              <img src={pub.media_url} alt="" className="max-h-40 object-cover rounded-lg cursor-pointer hover:opacity-80 transition" />
            ) : pub.type_media === "video" ? (
              <video src={pub.media_url} controls className="max-h-48 rounded-lg" style={{ maxWidth: 320 }} />
            ) : null}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {likes.length}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {pub.nb_commentaires || 0}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <Button size="sm" variant="ghost" onClick={onToggleVisibility} disabled={isTogglingVis}
          className="text-xs h-7 px-2 text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/10" title={pub.masque ? "Démasquer" : "Masquer"}>
          {pub.masque ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}
          className="text-xs h-7 px-2 text-gray-400 hover:text-red-300 hover:bg-red-500/10">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ShortCard({ short, onDelete }) {
  const [showVideo, setShowVideo] = useState(false);
  const likes = safeParseJSON(short.likes);
  const statusConfig = {
    published: { label: "Publié", cls: "bg-green-600/20 text-green-300 border-green-500/30" },
    processing: { label: "En traitement", cls: "bg-yellow-600/20 text-yellow-300 border-yellow-500/30" },
    deleted: { label: "Supprimé", cls: "bg-red-600/20 text-red-300 border-red-500/30" },
  };
  const st = statusConfig[short.status] || statusConfig.published;

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ background: "#333" }}>
          {short.creator_photo_url ? (
            <img src={short.creator_photo_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            short.creator_nom?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-white text-sm" style={CG}>{short.creator_nom || "Inconnu"}</span>
            <Badge className={`text-xs border ${st.cls}`}>{st.label}</Badge>
            {short.is_from_live ? <Badge className="text-xs bg-purple-600/20 text-purple-300 border-purple-500/30 border">Depuis Live</Badge> : null}
            <span className="text-xs text-gray-600 ml-auto">{short.created_date ? format(new Date(short.created_date), 'dd/MM/yyyy HH:mm', { locale: fr }) : ""}</span>
          </div>

          {short.titre && <p className="text-sm text-gray-300 line-clamp-1 mb-1" style={CG}>{short.titre}</p>}
          {short.description && <p className="text-xs text-gray-500 line-clamp-1 mb-2" style={CG}>{short.description}</p>}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {short.views || 0} vues</span>
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {likes.length}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {short.nb_commentaires || 0}</span>
            {short.duration > 0 && <span className="text-gray-600">{Math.round(short.duration)}s</span>}
          </div>
        </div>

        {/* Thumbnail + Actions */}
        <div className="flex items-start gap-2 flex-shrink-0">
          <div
            className="w-16 h-24 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer relative group"
            style={{ background: "#222" }}
            onClick={() => short.video_url && setShowVideo(!showVideo)}
          >
            {short.thumbnail_url ? (
              <img src={short.thumbnail_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Film className="w-5 h-5 text-gray-600" />
            )}
            {short.video_url && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                <Play className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Button size="sm" variant="ghost" onClick={onDelete}
              className="text-xs h-7 px-2 text-gray-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Video Player */}
      {showVideo && short.video_url && (
        <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <video src={short.video_url} controls autoPlay className="w-full max-h-[400px] rounded-lg" style={{ background: "#000" }} />
        </div>
      )}
    </div>
  );
}

function LiveCard({ live, onDelete, onForceEnd, isEndingLive }) {
  const [showReplay, setShowReplay] = useState(false);
  const isLive = live.status === 'live';

  return (
    <div className="rounded-xl p-4" style={{ background: isLive ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${isLive ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)"}` }}>
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ background: "#333" }}>
          {live.streamer_photo_url ? (
            <img src={live.streamer_photo_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            live.streamer_nom?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-white text-sm" style={CG}>{live.streamer_nom || "Inconnu"}</span>
            {isLive ? (
              <Badge className="text-xs bg-red-600/20 text-red-300 border-red-500/30 border animate-pulse">EN DIRECT</Badge>
            ) : (
              <Badge className="text-xs bg-gray-600/20 text-gray-400 border-gray-500/30 border">Terminé</Badge>
            )}
            <span className="text-xs text-gray-600 ml-auto">{live.started_at ? format(new Date(live.started_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : ""}</span>
          </div>

          {live.titre && <p className="text-sm text-gray-300 line-clamp-1 mb-1" style={CG}>{live.titre}</p>}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {live.peak_viewers || 0} pic</span>
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {live.total_likes || 0}</span>
            {live.duration > 0 && <span>{Math.floor(live.duration / 60)}min</span>}
            {live.recording_url && (
              <button
                onClick={() => setShowReplay(!showReplay)}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition cursor-pointer"
              >
                <Film className="w-3 h-3" /> {showReplay ? 'Masquer' : 'Voir'} Replay
              </button>
            )}
          </div>
        </div>

        {/* Thumbnail + Actions */}
        <div className="flex items-start gap-2 flex-shrink-0">
          {live.thumbnail_url && (
            <div className="w-20 h-12 rounded-lg overflow-hidden" style={{ background: "#222" }}>
              <img src={live.thumbnail_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {!live.thumbnail_url && (
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "#222" }}>
              <Radio className={`w-5 h-5 ${isLive ? "text-red-400 animate-pulse" : "text-gray-600"}`} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {isLive && (
              <Button size="sm" variant="ghost" onClick={onForceEnd} disabled={isEndingLive}
                className="text-xs h-7 px-2 text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/10" title="Forcer l'arrêt">
                <StopCircle className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onDelete}
              className="text-xs h-7 px-2 text-gray-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Replay Video Player */}
      {showReplay && live.recording_url && (
        <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <video src={live.recording_url} controls className="w-full max-h-[400px] rounded-lg" style={{ background: "#000" }} />
        </div>
      )}
    </div>
  );
}

function ViolationCard({ violation }) {
  const scores = (() => { try { return JSON.parse(violation.scores || '{}'); } catch { return {}; } })();
  const categoryColors = {
    Porn: 'text-red-400 bg-red-600/20 border-red-500/30',
    Hentai: 'text-pink-400 bg-pink-600/20 border-pink-500/30',
    Sexy: 'text-orange-400 bg-orange-600/20 border-orange-500/30',
  };
  const catCls = categoryColors[violation.category] || 'text-red-400 bg-red-600/20 border-red-500/30';

  return (
    <div className="rounded-xl p-4 flex gap-4" style={{ background: "rgba(255,60,60,0.04)", border: "1px solid rgba(255,60,60,0.12)" }}>
      <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ background: "#333" }}>
        {violation.user_photo ? (
          <img src={violation.user_photo} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          <User className="w-4 h-4 text-gray-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-white text-sm" style={CG}>{violation.user_nom || 'Inconnu'}</span>
          <span className="text-xs text-gray-500">{violation.user_email}</span>
          <Badge className={`text-xs border ${catCls}`}>{violation.category || 'NSFW'}</Badge>
          <span className="text-xs text-gray-600 ml-auto">{violation.created_date ? format(new Date(violation.created_date), 'dd/MM/yyyy HH:mm', { locale: fr }) : ''}</span>
        </div>
        <p className="text-sm text-gray-400 mb-1" style={CG}>{violation.reason}</p>
        {violation.filename && <p className="text-xs text-gray-600 mb-1" style={CG}>Fichier: {violation.filename}</p>}
        {Object.keys(scores).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(scores).map(([key, val]) => (
              <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-white/10">
                {key}: {typeof val === 'number' ? (val * 100).toFixed(1) + '%' : String(val)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockedAccountCard({ account, onReview, onReset, onViewViolations, onOpenChat, unreadCount, isReviewing, isResetting }) {
  const [note, setNote] = useState('');

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "#333" }}>
          <Ban className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-white text-sm" style={CG}>{account.user_nom || 'Inconnu'}</span>
            <span className="text-xs text-gray-500">{account.user_email}</span>
            {account.user_role && <Badge variant="outline" className="text-xs border-white/10 text-gray-400">{account.user_role}</Badge>}
            <Badge className="text-xs bg-red-600/20 text-red-300 border-red-500/30 border">Bloqué</Badge>
            <span className="text-xs text-gray-600 ml-auto">{account.created_date ? format(new Date(account.created_date), 'dd/MM/yyyy HH:mm', { locale: fr }) : ''}</span>
          </div>
          <p className="text-sm text-gray-400 mb-1" style={CG}>{account.reason || 'Tentatives répétées de contenu NSFW'}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-400" /> {account.violation_count || account.total_violations || 0} violation(s)</span>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap gap-2 items-center">
            <Button size="sm" onClick={onViewViolations}
              className="h-8 text-xs bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10">
              <Eye className="w-3 h-3 mr-1" /> Violations
            </Button>
            <Button size="sm" onClick={onOpenChat}
              className="h-8 text-xs bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 relative">
              <MessageCircle className="w-3 h-3 mr-1" /> Messages
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{unreadCount}</span>
              )}
            </Button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <Input
              placeholder="Note (optionnel)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 min-w-[120px] max-w-[200px] h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              style={CG}
            />
            <Button size="sm" onClick={() => onReview('unblock', note)} disabled={isReviewing}
              className="h-8 text-xs bg-green-600/20 text-green-300 border border-green-500/30 hover:bg-green-600/30">
              {isReviewing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
              Débloquer
            </Button>
            <Button size="sm" onClick={() => onReview('confirm', note)} disabled={isReviewing}
              className="h-8 text-xs bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30">
              {isReviewing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
              Confirmer
            </Button>
            <Button size="sm" onClick={onReset} disabled={isResetting}
              className="h-8 text-xs bg-orange-600/20 text-orange-300 border border-orange-500/30 hover:bg-orange-600/30">
              {isResetting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewedAccountCard({ account }) {
  const isUnblocked = account.status === 'unblocked' || account.review_action === 'unblock';

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "#333" }}>
          {isUnblocked ? <Unlock className="w-5 h-5 text-green-400" /> : <Lock className="w-5 h-5 text-red-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-white text-sm" style={CG}>{account.user_nom || 'Inconnu'}</span>
            <span className="text-xs text-gray-500">{account.user_email}</span>
            {account.user_role && <Badge variant="outline" className="text-xs border-white/10 text-gray-400">{account.user_role}</Badge>}
            {isUnblocked ? (
              <Badge className="text-xs bg-green-600/20 text-green-300 border-green-500/30 border">Débloqué</Badge>
            ) : (
              <Badge className="text-xs bg-red-600/20 text-red-300 border-red-500/30 border">Blocage confirmé</Badge>
            )}
            <span className="text-xs text-gray-600 ml-auto">{account.reviewed_at ? format(new Date(account.reviewed_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : ''}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {account.violation_count || account.total_violations || 0} violation(s)</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Bloqué le {account.created_date ? format(new Date(account.created_date), 'dd/MM/yyyy', { locale: fr }) : '—'}</span>
          </div>
          {account.review_note && (
            <p className="text-xs text-gray-500 italic mt-1" style={CG}>Note: {account.review_note}</p>
          )}
        </div>
      </div>
    </div>
  );
}

