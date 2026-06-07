import React, { useState } from "react";
import { dataService, socialService } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Users, UserCheck, Mail, Loader2, Sparkles, Search, UserPlus, UserX, MessageCircle, UserMinus, Ban, Shield } from "lucide-react";
import { formatUserName, getInitials } from "@/components/utils/nameUtils";
import { toast } from "sonner";

const CG = { fontFamily: "'Century Gothic', 'CenturyGothic', 'AppleGothic', sans-serif" };
const iconBtn = "flex-1 p-2 rounded text-xs font-medium transition-colors";

// Carte utilisateur réutilisable — définie hors du composant pour éviter les remontages
const UserCard = ({ u, height = 260, actions, navigate }) => (
  <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200">
    <CardContent
      className="p-0 flex flex-col relative cursor-pointer"
      style={{ height }}
      onClick={() => navigate(createPageUrl("Profil") + "?userId=" + u.id)}
    >
      {u.photo_url ? (
        <img src={u.photo_url} alt={formatUserName(u)} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center text-5xl font-bold" style={{ background: 'var(--ha-surface3)', color: 'var(--ha-text)' }}>
          {getInitials(formatUserName(u))}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <p className="font-semibold text-xs truncate" style={{ color: '#ffffff', ...CG }}>{formatUserName(u)}</p>
        {getRoleLabel(u.role_archive) && (
          <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{getRoleLabel(u.role_archive)}</p>
        )}
        <div className="flex gap-1.5 mt-2" onClick={e => e.stopPropagation()}>
          {actions}
        </div>
      </div>
    </CardContent>
  </Card>
);

const getRoleLabel = (role) => {
  const labels = {
    admin_systeme: "Administrateur Système",
    admin_etablissement: "Admin Établissement",
    professeur: "Professeur",
    etudiant: "Étudiant",
    parent: "Parent"
  };
  return labels[role] || null;
};

export default function Amis() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Tous les utilisateurs (sauf soi-même)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => dataService.query('User', { limit: 1000 }),
    enabled: !!user,
    staleTime: 30000,
    select: (rows) => rows
      .filter(u => u.id !== user?.id && u.role_archive !== 'admin_systeme' && u.role_archive !== 'super_admin' && u.role_archive !== 'harchive_officiel')
      .map(u => ({
        ...u,
        amis: typeof u.amis === 'string' ? JSON.parse(u.amis || '[]') : (u.amis || []),
        centres_interet: typeof u.centres_interet === 'string' ? JSON.parse(u.centres_interet || '[]') : (u.centres_interet || []),
      })),
  });

  // Toutes les demandes d'ami impliquant l'utilisateur courant
  const { data: friendRequests = [] } = useQuery({
    queryKey: ['friend-requests', user?.id],
    queryFn: () => socialService.getAllFriendRequests(),
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Utilisateurs bloqués par l'utilisateur courant
  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: () => socialService.getBlockedUsers(),
    enabled: !!user,
    staleTime: 30000,
  });

  // --- Dériver les listes ---
  const myAmis = typeof user?.amis === 'string' ? JSON.parse(user.amis || '[]') : (user?.amis || []);
  const blockedIds = new Set(blockedUsers.map(b => b.id));
  const pendingReceived = friendRequests.filter(r => r.status === 'pending' && r.receiver_id === user?.id);
  const pendingSentIds = new Set(
    friendRequests.filter(r => r.status === 'pending' && r.sender_id === user?.id).map(r => r.receiver_id)
  );

  const demandesRecues = pendingReceived
    .map(req => ({ request: req, userData: allUsers.find(u => u.id === req.sender_id) }))
    .filter(item => item.userData);

  const mesAmis = allUsers.filter(u => myAmis.includes(u.id));

  const suggestions = allUsers.filter(u => {
    if (myAmis.includes(u.id)) return false;
    if (blockedIds.has(u.id)) return false;
    if (pendingSentIds.has(u.id)) return false;
    if (pendingReceived.some(r => r.sender_id === u.id)) return false;
    const memeEtab = u.etablissement_nom && u.etablissement_nom === user?.etablissement_nom;
    const memeClasse = u.classe && u.classe === user?.classe;
    const memeFaculte = u.faculte && u.faculte === user?.faculte;
    const myInterets = typeof user?.centres_interet === 'string' ? JSON.parse(user.centres_interet || '[]') : (user?.centres_interet || []);
    const communs = myInterets.filter(i => u.centres_interet.includes(i));
    return memeEtab || memeClasse || memeFaculte || communs.length > 0;
  }).slice(0, 20);

  const autresUtilisateurs = allUsers.filter(u => {
    if (myAmis.includes(u.id)) return false;
    if (blockedIds.has(u.id)) return false;
    if (pendingSentIds.has(u.id)) return false;
    if (pendingReceived.some(r => r.sender_id === u.id)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return formatUserName(u).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    queryClient.invalidateQueries({ queryKey: ['all-users'] });
    queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    refreshUser();
  };

  const [sendingIds, setSendingIds] = useState(new Set());

  // --- Mutations ---
  const sendRequestMutation = useMutation({
    mutationFn: async (recipientId) => {
      setSendingIds(prev => new Set([...prev, recipientId]));
      try {
        return await socialService.sendFriendRequest(recipientId);
      } finally {
        setSendingIds(prev => { const s = new Set(prev); s.delete(recipientId); return s; });
      }
    },
    onSuccess: () => { toast.success("Demande d'ami envoyée !"); queryClient.invalidateQueries({ queryKey: ['friend-requests'] }); },
    onError: (e) => toast.error(e?.response?.data?.message || e.message || "Erreur lors de l'envoi"),
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId) => socialService.acceptFriendRequest(requestId),
    onSuccess: () => { toast.success("Demande acceptée !"); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Erreur"),
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId) => socialService.rejectFriendRequest(requestId),
    onSuccess: () => { toast.success("Demande refusée"); queryClient.invalidateQueries({ queryKey: ['friend-requests'] }); },
    onError: (e) => toast.error(e?.response?.data?.message || "Erreur"),
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendId) => socialService.removeFriend(friendId),
    onSuccess: () => { toast.success("Ami retiré"); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Erreur"),
  });

  const blockMutation = useMutation({
    mutationFn: (userId) => socialService.blockUser(userId),
    onSuccess: () => { toast.success("Utilisateur bloqué"); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Erreur"),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId) => socialService.unblockUser(userId),
    onSuccess: () => { toast.success("Utilisateur débloqué"); queryClient.invalidateQueries({ queryKey: ['blocked-users'] }); refreshUser(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Erreur"),
  });

  const createConversationMutation = useMutation({
    mutationFn: async (targetUserId) => {
      const targetUser = allUsers.find(u => u.id === targetUserId);
      const conversations = await dataService.query('Conversation');
      const existing = conversations.find(c => {
        const parts = typeof c.participants === 'string' ? JSON.parse(c.participants) : c.participants;
        return parts?.length === 2 && parts.includes(user.id) && parts.includes(targetUserId);
      });
      if (existing) return existing;
      return dataService.create('Conversation', {
        participants: [user.id, targetUserId],
        participants_details: [
          { user_id: user.id, full_name: formatUserName(user), email: user.email },
          { user_id: targetUserId, full_name: formatUserName(targetUser), email: targetUser?.email }
        ],
        non_lu: {}
      });
    },
    onSuccess: () => navigate(createPageUrl("Messagerie")),
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ha-bg)' }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--ha-text-muted)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: 'var(--ha-bg)', ...CG }}>
      <div className="w-full space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--ha-surface3)' }}>
              <Users className="w-5 h-5" style={{ color: 'var(--ha-text)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--ha-text)' }}>Amis</h1>
              <p className="text-xs" style={{ color: 'var(--ha-text-muted)' }}>Gérez vos connexions</p>
            </div>
          </div>
          <Badge style={{ background: 'var(--ha-surface3)', color: 'var(--ha-text)', fontSize: '0.8rem' }} className="px-3 py-1.5">
            {mesAmis.length} ami{mesAmis.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="amis" className="w-full">
          <TabsList className="flex w-full gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--ha-surface2)' }}>
            {[
              { value: 'amis', icon: UserCheck, label: `Mes Amis (${mesAmis.length})` },
              { value: 'demandes', icon: Mail, label: `Demandes (${demandesRecues.length})` },
              { value: 'suggestions', icon: Sparkles, label: `Suggestions (${suggestions.length})` },
              { value: 'recherche', icon: Search, label: 'Rechercher' },
              { value: 'bloques', icon: Ban, label: `Bloqués (${blockedUsers.length})` },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded transition-all data-[state=active]:text-[var(--ha-text)] data-[state=inactive]:text-[var(--ha-text-muted)]"
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Mes Amis */}
          <TabsContent value="amis" className="mt-4">
            <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
              <CardHeader className="py-3 px-4" style={{ borderBottom: '1px solid var(--ha-border)' }}>
                <CardTitle className="text-sm" style={{ color: 'var(--ha-text)' }}>Mes Amis</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {mesAmis.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-14 h-14 mx-auto mb-3" style={{ color: 'var(--ha-text-faint)' }} />
                    <p className="text-sm" style={{ color: 'var(--ha-text-faint)' }}>Vous n'avez pas encore d'amis</p>
                  </div>
                ) : (
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                    {mesAmis.map(friend => (
                      <UserCard key={friend.id} u={friend} navigate={navigate} actions={<>
                        <button onClick={() => createConversationMutation.mutate(friend.id)} className={iconBtn} style={{ background: '#1d4ed8', color: 'var(--ha-text)' }} title="Message">
                          <MessageCircle className="w-3.5 h-3.5 mx-auto" />
                        </button>
                        <button onClick={() => { if (confirm("Retirer cet ami ?")) removeFriendMutation.mutate(friend.id); }} disabled={removeFriendMutation.isPending} className={iconBtn} style={{ background: '#7f1d1d', color: '#fca5a5' }} title="Retirer">
                          <UserMinus className="w-3.5 h-3.5 mx-auto" />
                        </button>
                        <button onClick={() => { if (confirm("Bloquer cet utilisateur ?")) blockMutation.mutate(friend.id); }} disabled={blockMutation.isPending} className={iconBtn} style={{ background: '#431407', color: '#fdba74' }} title="Bloquer">
                          <Ban className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </>} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demandes reçues */}
          <TabsContent value="demandes" className="mt-4">
            <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
              <CardHeader className="py-3 px-4" style={{ borderBottom: '1px solid var(--ha-border)' }}>
                <CardTitle className="text-sm" style={{ color: 'var(--ha-text)' }}>Demandes d'Amis Reçues</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {demandesRecues.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="w-14 h-14 mx-auto mb-3" style={{ color: 'var(--ha-text-faint)' }} />
                    <p className="text-sm" style={{ color: 'var(--ha-text-faint)' }}>Aucune demande en attente</p>
                  </div>
                ) : (
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                    {demandesRecues.map(({ request, userData }) => (
                      <UserCard key={request.id} u={userData} navigate={navigate} actions={<>
                        <button onClick={() => acceptMutation.mutate(request.id)} disabled={acceptMutation.isPending} className={`${iconBtn} flex-1`} style={{ background: '#14532d', color: '#86efac' }} title="Accepter">
                          <UserCheck className="w-3.5 h-3.5 mx-auto" />
                        </button>
                        <button onClick={() => rejectMutation.mutate(request.id)} disabled={rejectMutation.isPending} className={iconBtn} style={{ background: '#7f1d1d', color: '#fca5a5' }} title="Refuser">
                          <UserX className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </>} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suggestions */}
          <TabsContent value="suggestions" className="mt-4">
            <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
              <CardHeader className="py-3 px-4" style={{ borderBottom: '1px solid var(--ha-border)' }}>
                <CardTitle className="text-sm" style={{ color: 'var(--ha-text)' }}>Personnes que vous pourriez connaître</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {suggestions.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-14 h-14 mx-auto mb-3" style={{ color: 'var(--ha-text-faint)' }} />
                    <p className="text-sm" style={{ color: 'var(--ha-text-faint)' }}>Aucune suggestion pour le moment</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ha-text-faint)' }}>Basées sur votre établissement, classe et centres d'intérêt</p>
                  </div>
                ) : (
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                    {suggestions.map(u => (
                      <UserCard key={u.id} u={u} navigate={navigate} actions={<>
                        <button onClick={() => sendRequestMutation.mutate(u.id)} disabled={sendingIds.has(u.id)} className={`${iconBtn} w-full`} style={{ background: '#1d4ed8', color: 'var(--ha-text)' }}>
                          {sendingIds.has(u.id) ? <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mx-auto" />}
                        </button>
                      </>} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rechercher */}
          <TabsContent value="recherche" className="mt-4 space-y-3">
            <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
              <CardContent className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ha-text-faint)' }} />
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 border-0 focus-visible:ring-0"
                    style={{ backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)' }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
              <CardHeader className="py-3 px-4" style={{ borderBottom: '1px solid var(--ha-border)' }}>
                <CardTitle className="text-sm" style={{ color: 'var(--ha-text)' }}>Résultats ({autresUtilisateurs.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {autresUtilisateurs.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-14 h-14 mx-auto mb-3" style={{ color: 'var(--ha-text-faint)' }} />
                    <p className="text-sm" style={{ color: 'var(--ha-text-faint)' }}>{searchQuery ? 'Aucun utilisateur trouvé' : 'Tapez un nom pour rechercher'}</p>
                  </div>
                ) : (
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                    {autresUtilisateurs.slice(0, 30).map(u => {
                      const alreadySent = pendingSentIds.has(u.id);
                      return (
                        <UserCard key={u.id} u={u} navigate={navigate} actions={<>
                          <button
                            onClick={() => !alreadySent && sendRequestMutation.mutate(u.id)}
                            disabled={alreadySent || sendingIds.has(u.id)}
                            className={`${iconBtn} flex-1`}
                            style={{ background: alreadySent ? '#374151' : '#1d4ed8', color: alreadySent ? '#9ca3af' : '#fff' }}
                            title={alreadySent ? 'Demande envoyée' : 'Ajouter'}
                          >
                            {alreadySent ? <UserCheck className="w-3.5 h-3.5 mx-auto" /> : <UserPlus className="w-3.5 h-3.5 mx-auto" />}
                          </button>
                          <button onClick={() => { if (confirm("Bloquer cet utilisateur ?")) blockMutation.mutate(u.id); }} disabled={blockMutation.isPending} className={iconBtn} style={{ background: '#431407', color: '#fdba74' }} title="Bloquer">
                            <Ban className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </>} />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Utilisateurs bloqués */}
          <TabsContent value="bloques" className="mt-4">
            <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
              <CardHeader className="py-3 px-4" style={{ borderBottom: '1px solid var(--ha-border)' }}>
                <CardTitle className="text-sm" style={{ color: 'var(--ha-text)' }}>Utilisateurs Bloqués</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-14 h-14 mx-auto mb-3" style={{ color: 'var(--ha-text-faint)' }} />
                    <p className="text-sm" style={{ color: 'var(--ha-text-faint)' }}>Aucun utilisateur bloqué</p>
                  </div>
                ) : (
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                    {blockedUsers.map(u => (
                      <UserCard key={u.id} u={u} navigate={navigate} actions={<>
                        <button onClick={() => unblockMutation.mutate(u.id)} disabled={unblockMutation.isPending} className={`${iconBtn} w-full`} style={{ background: '#14532d', color: '#86efac' }}>
                          Débloquer
                        </button>
                      </>} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

