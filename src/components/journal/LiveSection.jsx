// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { liveService } from "@/api/liveService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/DraggableDialog";
import {
  Radio, Eye, Plus, Loader2, Play, Volume2, VolumeX,
  MessageCircle, Share2, Heart, Send, X, ArrowLeft,
  Camera, CameraOff, Mic, MicOff, Square
} from "lucide-react";
import UserAvatarPopover from "@/components/ui/UserAvatarPopover";
import LiveBroadcaster from "./LiveBroadcaster";

/* ─────────────────── Main Section ─────────────────── */
export default function LiveSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGoLive, setShowGoLive] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatStreamId, setChatStreamId] = useState(null);

  const { data: liveStreams = [], isLoading } = useQuery({
    queryKey: ['live-streams'],
    queryFn: liveService.getActiveStreams,
    refetchInterval: 5000,
    enabled: !!user,
  });

  const handleGoLive = async () => {
    if (!titre.trim()) return;
    setCreating(true);
    try {
      const stream = await liveService.createStream({ titre: titre.trim(), description: description.trim() });
      setActiveStreamId(stream.id);
      setShowGoLive(false);
      setTitre("");
      setDescription("");
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEndLive = useCallback(() => {
    setActiveStreamId(null);
    queryClient.invalidateQueries({ queryKey: ['live-streams'] });
  }, [queryClient]);

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, liveStreams.length - 1));
  }, [liveStreams.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  const openChat = (streamId) => {
    setChatStreamId(streamId);
    setShowChat(true);
  };

  // If broadcasting, show the broadcaster
  if (activeStreamId) {
    return <LiveBroadcaster streamId={activeStreamId} onEnd={handleEndLive} />;
  }

  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : liveStreams.length === 0 ? (
        <LiveEmptyState onGoLive={() => setShowGoLive(true)} />
      ) : (
        <div className="flex justify-center">
          <LiveReelsPlayer
            streams={liveStreams}
            currentIndex={currentIndex}
            goNext={goNext}
            goPrev={goPrev}
            openChat={openChat}
            onGoLive={() => setShowGoLive(true)}
            onEndOwnStream={handleEndLive}
          />
        </div>
      )}

      <LiveChatDialog
        streamId={chatStreamId}
        open={showChat}
        onClose={() => setShowChat(false)}
      />

      {/* Go Live Dialog */}
      <DraggableDialog
        open={showGoLive}
        onOpenChange={setShowGoLive}
        title={<span style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}><Radio className="w-4 h-4 text-red-500 inline mr-2" />Lancer un Live</span>}
        maxWidth="max-w-md"
        resizable={false}
      >
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Titre du live *</label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Cours de mathématiques..."
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 border"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}
              maxLength={200}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre live..."
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 border min-h-[80px] resize-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowGoLive(false)} style={{ color: 'var(--ha-text-muted)' }}>Annuler</Button>
            <Button
              onClick={handleGoLive}
              disabled={!titre.trim() || creating}
              style={{ background: '#ef4444', color: '#fff' }}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Radio className="w-4 h-4 mr-1" />}
              Démarrer le Live
            </Button>
          </div>
        </div>
      </DraggableDialog>
    </div>
  );
}

/* ─────────────────── Empty State ─────────────────── */
function LiveEmptyState({ onGoLive = () => {} }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: '#333' }}>
        <Radio className="w-9 h-9 text-red-500" />
      </div>
      <p className="text-white text-lg font-semibold mb-1">Aucun live en cours</p>
      <p className="text-gray-500 text-sm mb-6">Soyez le premier à lancer un live !</p>
      <button
        onClick={onGoLive}
        className="px-5 py-2.5 rounded-md text-sm font-medium text-white transition hover:brightness-125"
        style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
      >
        <Radio className="w-4 h-4 inline mr-1.5" />
        Lancer un Live
      </button>
    </div>
  );
}

/* ─────────────────── Live Reels Player (same layout as Shorts) ─────────────────── */
function LiveReelsPlayer({ streams = [], currentIndex = 0, goNext = () => {}, goPrev = () => {}, openChat = () => {}, onGoLive = () => {}, onEndOwnStream = () => {} }) {
  const stream = streams[currentIndex];
  const { user } = useAuth();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  const lastWheel = useRef(0);
  const wsRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const chunksQueue = useRef([]);

  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [viewerCount, setViewerCount] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const hideControlsTimerRef = useRef(null);

  const isOwnStream = user && stream && stream.streamer_id === user.id;


  useEffect(() => {
    if (!stream?.id) return;
    setStreamEnded(false);
    setConnected(false);
    setViewerCount(0);

    // Setup MediaSource
    let mediaSource = null;
    if (window.MediaSource) {
      mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;
      if (videoRef.current) {
        videoRef.current.src = URL.createObjectURL(mediaSource);
      }
      mediaSource.addEventListener('sourceopen', () => {
        try {
          const mimeType = 'video/webm;codecs=vp8,opus';
          const fallback = 'video/webm';
          const mime = MediaSource.isTypeSupported(mimeType) ? mimeType : fallback;
          const sb = mediaSource.addSourceBuffer(mime);
          sourceBufferRef.current = sb;
          sb.addEventListener('updateend', () => {
            if (chunksQueue.current.length > 0 && !sb.updating) {
              sb.appendBuffer(chunksQueue.current.shift());
            }
            // Auto-play after first data appended
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
            }
            if (videoRef.current && sb.buffered.length > 0) {
              const bufEnd = sb.buffered.end(sb.buffered.length - 1);
              if (bufEnd > 10) {
                try { sb.remove(0, bufEnd - 5); } catch (e) { /* ignore */ }
              }
              if (videoRef.current.currentTime < bufEnd - 3) {
                videoRef.current.currentTime = bufEnd - 0.5;
              }
            }
          });
        } catch (e) { /* ignore */ }
      });
    }

    // WebSocket
    const wsUrl = liveService.getWebSocketUrl(stream.id, 'viewer');
    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn('WebSocket connection failed:', e.message);
      return;
    }
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const sb = sourceBufferRef.current;
        if (sb && !sb.updating) {
          try { sb.appendBuffer(event.data); } catch { chunksQueue.current.push(event.data); }
        } else {
          chunksQueue.current.push(event.data);
          if (chunksQueue.current.length > 20) chunksQueue.current.shift();
        }
      } else {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'viewer_count' || msg.type === 'stream_joined') setViewerCount(msg.count || msg.viewerCount || 0);
          if (msg.type === 'stream_ended') setStreamEnded(true);
        } catch { /* ignore parse errors */ }
      }
    };
    ws.onerror = () => { /* ignore */ };
    ws.onclose = () => setConnected(false);

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
        try { mediaSourceRef.current.endOfStream(); } catch { /* ignore */ }
      }
      chunksQueue.current = [];
      sourceBufferRef.current = null;
      mediaSourceRef.current = null;
    };
  }, [stream?.id]);

  // Mouse controls
  const handleMouseEnter = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };
  const handleMouseLeave = () => {
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    setShowControls(false);
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    if (v > 0) setMuted(false);
  };

  // Swipe
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 60) goNext();
    else if (dy < -60) goPrev();
  };

  // Scroll
  const onWheel = (e) => {
    const now = Date.now();
    if (now - lastWheel.current < 600) return;
    lastWheel.current = now;
    if (e.deltaY > 0) goNext();
    else if (e.deltaY < 0) goPrev();
  };

  if (!stream) return null;

  return (
    <div className="flex items-center justify-center gap-2.5">
      {/* ===== LIVE VIDEO PLAYER ===== */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden select-none bg-black flex-shrink-0"
        style={{
          height: 'calc(100vh - 160px)',
          aspectRatio: '9 / 16',
          maxHeight: 'calc(100vh - 160px)',
          backgroundColor: '#000',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Video element (live feed) */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted={muted}
        />

        {/* LIVE badge */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold text-white bg-red-600">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          LIVE
        </div>

        {/* Viewer count badge */}
        <div className="absolute top-3 right-20 z-20 flex items-center gap-1 px-2 py-1 rounded text-xs text-white bg-black/60">
          <Eye className="w-3 h-3" />
          {viewerCount}
        </div>

        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

        {/* Mute / Volume controls */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 transition-opacity duration-300" style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition backdrop-blur-sm"
          >
            {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </button>
          <input
            type="range" min="0" max="1" step="0.01" value={volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 rounded-full bg-white/30 appearance-none cursor-pointer slider"
            style={{ background: `linear-gradient(to right, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.6) ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)` }}
          />
        </div>

        {/* Bottom: Title + Streamer */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-10">
            <p className="text-white text-sm font-semibold drop-shadow-lg">{stream.streamer_nom}</p>
            <p className="text-white/80 text-xs mt-1 line-clamp-2 drop-shadow-lg">{stream.titre || 'Live'}</p>
          </div>
        </div>

        {/* Connection overlay */}
        {!connected && !streamEnded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center">
              <Radio className="w-10 h-10 text-red-500 animate-pulse mx-auto mb-2" />
              <p className="text-white text-sm">Connexion au live...</p>
            </div>
          </div>
        )}

        {/* Stream ended overlay */}
        {streamEnded && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60">
            <div className="text-center">
              <Radio className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-white text-base font-semibold">Le live est terminé</p>
              <p className="text-gray-400 text-sm mt-1">Merci d'avoir regardé !</p>
            </div>
          </div>
        )}

        {/* Stream index indicator */}
        {streams.length > 1 && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 text-white/60 text-xs">
            {currentIndex + 1} / {streams.length}
          </div>
        )}
      </div>

      {/* ===== RIGHT SIDEBAR: Action Buttons ===== */}
      <div className="flex flex-col items-center flex-shrink-0 px-0 py-4" style={{ height: 'calc(100vh - 160px)' }}>
        <div className="flex-1 flex flex-col items-center justify-end gap-3 pb-0">

          {/* Viewers */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-[11px]">{viewerCount}</span>
          </div>

          {/* Chat */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); openChat(stream.id); }}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition backdrop-blur-sm active:scale-95"
            >
              <MessageCircle className="w-5 h-5 text-white" strokeWidth={2} />
            </button>
            <span className="text-white text-[11px]">Chat</span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition backdrop-blur-sm active:scale-95"
            >
              <Share2 className="w-5 h-5 text-white" strokeWidth={2} />
            </button>
            <span className="text-white text-[11px]">Partager</span>
          </div>

          {/* Go Live / Stop Live */}
          {isOwnStream ? (
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); setShowStopConfirm(true); }}
                className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition backdrop-blur-sm active:scale-95"
              >
                <Square className="w-5 h-5 text-white fill-white" strokeWidth={2} />
              </button>
              <span className="text-white text-[11px]">Arrêter</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); onGoLive(); }}
                className="w-10 h-10 rounded-full bg-red-600/80 hover:bg-red-600 flex items-center justify-center transition backdrop-blur-sm active:scale-95"
              >
                <Radio className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
              <span className="text-white text-[11px]">Live</span>
            </div>
          )}

          {/* Streamer Avatar */}
          <div className="flex flex-col items-center gap-0.5 mt-1">
            <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: 40, height: 40 }}>
              <UserAvatarPopover
                name={stream.streamer_nom}
                photoUrl={stream.streamer_photo_url}
                size="md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stop Confirmation Dialog (for own stream viewed as viewer) */}
      {isOwnStream && (
        <DraggableDialog
          open={showStopConfirm}
          onOpenChange={setShowStopConfirm}
          title={<span style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}><Square className="w-4 h-4 text-red-500 inline mr-2 fill-red-500" />Arrêter le Live ?</span>}
          maxWidth="max-w-xs"
        >
          <div className="px-6 py-4 space-y-4">
            <p className="text-gray-400 text-sm">Votre live sera terminé et tous les spectateurs seront déconnectés.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowStopConfirm(false)} style={{ color: 'var(--ha-text-muted)' }}>Annuler</Button>
              <Button
                onClick={() => {
                  liveService.endStream(stream.id).catch(() => {});
                  setShowStopConfirm(false);
                  onEndOwnStream();
                }}
                style={{ background: '#ef4444', color: '#fff' }}
              >
                <Square className="w-4 h-4 mr-1 fill-white" />
                Arrêter le Live
              </Button>
            </div>
          </div>
        </DraggableDialog>
      )}
    </div>
  );
}

/* ─────────────────── Chat Dialog (glassmorphism) ─────────────────── */
function LiveChatDialog({ streamId, open = false, onClose = () => {} }) {
  const { user } = useAuth();
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);


  useEffect(() => {
    if (!open || !streamId) return;
    setChatMessages([]);

    const wsUrl = liveService.getWebSocketUrl(streamId, 'viewer');
    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn('Chat WebSocket connection failed:', e.message);
      return;
    }
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'chat' || msg.type === 'reaction' || msg.type === 'system') {
            setChatMessages(prev => [...prev.slice(-200), msg]);
          }
        } catch { /* ignore parse errors */ }
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [open, streamId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', message: chatInput.trim() }));
    setChatInput("");
  };

  const sendReaction = (emoji) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'reaction', emoji }));
  };

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onClose}
      title={<span style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Chat en direct</span>}
      maxWidth="max-w-md"
    >
      {/* Messages */}
      <div className="overflow-y-auto px-6 py-4 space-y-2" style={{ minHeight: 200, maxHeight: '55vh' }}>
        {chatMessages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Aucun message. Soyez le premier !</p>
        ) : (
          chatMessages.map((msg, i) => (
            <div key={msg.id || i} className="text-sm">
              {msg.type === 'system' ? (
                <p className="text-gray-500 text-xs text-center italic">{msg.message}</p>
              ) : msg.type === 'reaction' ? (
                <p className="text-xs">
                  <span className="text-blue-400 font-medium">{msg.user_nom}</span>
                  <span className="ml-1 text-lg">{msg.emoji}</span>
                </p>
              ) : (
                <div className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <span className="text-blue-400 font-medium text-xs">{msg.user_nom}: </span>
                  <span className="text-gray-300 text-xs">{msg.message}</span>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Reactions */}
      <div className="px-6 py-2 border-t flex gap-2" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
        {['❤️', '🔥', '👏', '😂', '😮', '🎉'].map(emoji => (
          <button key={emoji} onClick={() => sendReaction(emoji)} className="text-lg hover:scale-125 transition-transform">{emoji}</button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 items-center px-6 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendChat()}
          placeholder="Envoyer un message..."
          className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-gray-500 border transition focus:outline-none focus:border-blue-500"
          style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}
          maxLength={500}
        />
        <Button
          size="sm"
          onClick={sendChat}
          disabled={!chatInput.trim()}
          className="px-4 py-2 rounded-xl font-medium text-white transition hover:opacity-90 active:scale-95"
          style={{ background: '#2563eb', color: '#fff', border: 'none' }}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </DraggableDialog>
  );
}
