// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { backendConfig } from "@/api/backendConfig";
import { ShieldAlert, Send, Loader2, LogOut, MessageCircle, Clock } from "lucide-react";

const getBaseUrl = () => backendConfig.useLocalBackend ? backendConfig.localBackendUrl + '/api' : '/api';

export default function CompteBloque() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [blockInfo, setBlockInfo] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Si l'utilisateur n'est pas bloqué, rediriger
  useEffect(() => {
    if (user && !user.blocked) {
      navigate("/journal", { replace: true });
    }
  }, [user, navigate]);

  // Charger les messages
  const fetchMessages = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/moderation/my-blocked-messages`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setBlockInfo(data.blockInfo || null);
      }
    } catch (err) {
      console.error('Erreur chargement messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchMessages();
  }, [user]);

  // Polling toutes les 10s pour les nouvelles réponses
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Scroll to bottom quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`${getBaseUrl()}/moderation/blocked-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: newMessage.trim() })
      });
      if (res.ok) {
        setNewMessage("");
        await fetchMessages();
      }
    } catch (err) {
      console.error('Erreur envoi message:', err);
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1a1a2e' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#16213e', borderBottom: '1px solid #2a2a4a' }}>
        <div className="flex items-center gap-3">
          <img src="/assets/icons/6153a57fe_logoHARCHIVEF2.png" alt="Harchive" className="h-8 w-auto" />
          <span className="text-gray-400 text-sm">|</span>
          <span className="text-red-400 font-semibold text-sm">Compte suspendu</span>
        </div>
        <button
          onClick={() => logout(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 hover:text-white transition-colors text-sm"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 overflow-hidden">
        {/* Alert Box */}
        <div className="w-full max-w-2xl mb-6">
          <div className="rounded-xl p-6" style={{
            background: 'linear-gradient(135deg, rgba(220,38,38,0.15) 0%, rgba(220,38,38,0.05) 100%)',
            border: '1px solid rgba(220,38,38,0.3)'
          }}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(220,38,38,0.2)' }}>
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-red-400 mb-2">Compte suspendu</h1>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Votre compte a été automatiquement suspendu pour violation des règles de la communauté.
                  {blockInfo?.reason && (
                    <span className="block mt-1 text-gray-400">
                      Motif : {blockInfo.reason}
                    </span>
                  )}
                </p>
                {blockInfo && (
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(blockInfo.created_date).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    <span>
                      {blockInfo.violation_count} violation{blockInfo.violation_count > 1 ? 's' : ''} enregistrée{blockInfo.violation_count > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messaging Section */}
        <div className="w-full max-w-2xl flex-1 flex flex-col min-h-0 rounded-xl overflow-hidden" style={{
          backgroundColor: '#16213e',
          border: '1px solid #2a2a4a',
          maxHeight: 'calc(100vh - 320px)'
        }}>
          {/* Chat Header */}
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #2a2a4a' }}>
            <MessageCircle className="w-4 h-4 text-blue-400" />
            <span className="text-white font-medium text-sm">Canal de communication avec l'administration</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a4a transparent' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucun message pour le moment</p>
                <p className="text-gray-600 text-xs mt-1">
                  Expliquez votre situation ci-dessous. Un administrateur examinera votre message.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[80%] rounded-2xl px-4 py-2.5"
                    style={{
                      backgroundColor: msg.sender_type === 'user'
                        ? 'rgba(59,130,246,0.2)'
                        : 'rgba(255,255,255,0.08)',
                      border: msg.sender_type === 'user'
                        ? '1px solid rgba(59,130,246,0.3)'
                        : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${msg.sender_type === 'admin' ? 'text-green-400' : 'text-blue-400'}`}>
                        {msg.sender_type === 'admin' ? `🛡️ ${msg.sender_name}` : 'Vous'}
                      </span>
                      <span className="text-gray-600 text-[10px]">
                        {new Date(msg.created_date).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-gray-200 text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 flex gap-2" style={{ borderTop: '1px solid #2a2a4a' }}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Expliquez votre situation à l'administrateur..."
              rows={2}
              className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="self-end flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ backgroundColor: 'rgba(59,130,246,0.3)', border: '1px solid rgba(59,130,246,0.4)' }}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-blue-400" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
