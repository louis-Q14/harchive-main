// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { liveService } from "@/api/liveService";
import { Button } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/DraggableDialog";
import {
  Radio, Eye, MessageCircle, Share2, Send, X,
  Camera, CameraOff, Mic, MicOff, Square
} from "lucide-react";
import UserAvatarPopover from "@/components/ui/UserAvatarPopover";

export default function LiveBroadcaster({ streamId, onEnd }) {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const chatEndRef = useRef(null);
  const timerRef = useRef(null);



  // Start camera + mic
  useEffect(() => {
    let cancelled = false;
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 22050 },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        connectWebSocket(stream);
      } catch (err) {
        setError("Impossible d'accéder à la caméra/micro. Vérifiez les permissions.");
      }
    };
    startMedia();
    return () => { cancelled = true; cleanup(); };
  }, []);

  // Timer
  useEffect(() => {
    if (isLive) {
      timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLive]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const connectWebSocket = async (mediaStream) => {
    let wsUrl;
    try {
      const { ticket } = await liveService.getWsTicket();
      wsUrl = liveService.getWebSocketUrl(streamId, 'streamer', ticket);
    } catch {
      wsUrl = liveService.getWebSocketUrl(streamId, 'streamer');
    }
    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      setError('Impossible de se connecter au serveur de streaming.');
      return;
    }
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setIsLive(true);
      startMediaRecorder(mediaStream, ws);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'viewer_count') setViewerCount(msg.count || 0);
          if (msg.type === 'chat' || msg.type === 'reaction' || msg.type === 'system') {
            setChatMessages(prev => [...prev.slice(-200), msg]);
          }
        } catch { /* ignore parse errors */ }
      }
    };

    ws.onerror = () => setError("Connexion WebSocket perdue");
    ws.onclose = () => setIsLive(false);
  };

  const startMediaRecorder = (mediaStream, ws) => {
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(mediaStream, {
        mimeType,
        videoBitsPerSecond: 600000,
        audioBitsPerSecond: 64000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      setError("Erreur lors du démarrage de l'enregistrement: " + err.message);
    }
  };

  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_stream' }));
      wsRef.current.close();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleEndLive = () => {
    cleanup();
    liveService.endStream(streamId).catch(() => {});
    onEnd();
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', message: chatInput.trim() }));
    setChatInput("");
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={onEnd} style={{ background: '#555', color: '#fff' }}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="flex items-center justify-center gap-2.5">
        {/* ===== LIVE VIDEO PLAYER (Reels-style 9:16) ===== */}
        <div
          className="relative rounded-lg overflow-hidden select-none bg-black flex-shrink-0"
          style={{
            height: 'calc(100vh - 160px)',
            aspectRatio: '9 / 16',
            maxHeight: 'calc(100vh - 160px)',
            backgroundColor: '#000',
          }}
        >
          {/* Camera preview */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* LIVE badge + timer */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold text-white bg-red-600">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
          <div className="absolute top-3 right-20 z-20 flex items-center gap-1 px-2 py-1 rounded text-xs text-white bg-black/60">
            {formatTime(elapsedTime)}
          </div>

          {/* Viewer count */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-1 rounded text-xs text-white bg-black/60">
            <Eye className="w-3 h-3" />
            {viewerCount}
          </div>

          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

          {/* Floating reactions */}
          {chatMessages.filter(m => m.type === 'reaction').slice(-5).map((r, i) => (
            <div
              key={r.id || i}
              className="absolute text-3xl animate-bounce z-20"
              style={{
                bottom: `${20 + i * 12}%`,
                left: `${10 + (i * 7)}%`,
                animationDuration: '1s',
                opacity: 0.8,
              }}
            >
              {r.emoji}
            </div>
          ))}

          {/* Bottom: Streamer info */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
            <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-10">
              <p className="text-white text-sm font-semibold drop-shadow-lg">{user?.nom || 'Vous'}</p>
              <p className="text-white/80 text-xs mt-1 drop-shadow-lg">En direct • {viewerCount} spectateur{viewerCount !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Connecting overlay */}
          {!isLive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center">
                <Radio className="w-10 h-10 text-red-500 animate-pulse mx-auto mb-2" />
                <p className="text-white text-sm">Connexion...</p>
              </div>
            </div>
          )}
        </div>

        {/* ===== RIGHT SIDEBAR: Action Buttons ===== */}
        <div className="flex flex-col items-center flex-shrink-0 px-0 py-4" style={{ height: 'calc(100vh - 160px)' }}>
          <div className="flex-1 flex flex-col items-center justify-end gap-3 pb-0">

            {/* Camera toggle */}
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={toggleCamera}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition backdrop-blur-sm active:scale-95 ${cameraOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {cameraOn ? <Camera className="w-5 h-5 text-white" strokeWidth={2} /> : <CameraOff className="w-5 h-5 text-white" strokeWidth={2} />}
              </button>
              <span className="text-white text-[11px]">{cameraOn ? 'Caméra' : 'Off'}</span>
            </div>

            {/* Mic toggle */}
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={toggleMic}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition backdrop-blur-sm active:scale-95 ${micOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {micOn ? <Mic className="w-5 h-5 text-white" strokeWidth={2} /> : <MicOff className="w-5 h-5 text-white" strokeWidth={2} />}
              </button>
              <span className="text-white text-[11px]">{micOn ? 'Micro' : 'Off'}</span>
            </div>

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
                onClick={() => setShowChat(true)}
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition backdrop-blur-sm active:scale-95"
              >
                <MessageCircle className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
              <span className="text-white text-[11px]">Chat</span>
            </div>

            {/* Share */}
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={() => navigator.clipboard.writeText(window.location.href).catch(() => {})}
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition backdrop-blur-sm active:scale-95"
              >
                <Share2 className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
              <span className="text-white text-[11px]">Partager</span>
            </div>

            {/* STOP LIVE BUTTON */}
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={() => setShowStopConfirm(true)}
                className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition backdrop-blur-sm active:scale-95"
              >
                <Square className="w-5 h-5 text-white fill-white" strokeWidth={2} />
              </button>
              <span className="text-white text-[11px]">Arrêter</span>
            </div>

            {/* Your Avatar */}
            <div className="flex flex-col items-center gap-0.5 mt-1">
              <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: 40, height: 40 }}>
                <UserAvatarPopover
                  name={user?.nom}
                  photoUrl={user?.photo_url}
                  size="md"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Dialog (glassmorphism) */}
      <DraggableDialog
        open={showChat}
        onOpenChange={setShowChat}
        title={<span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}><MessageCircle className="w-4 h-4 inline mr-2 text-gray-400" />Chat en direct</span>}
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col" style={{ height: 350 }}>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {chatMessages.filter(m => m.type === 'chat' || m.type === 'system').map((msg, i) => (
              <div key={msg.id || i} className="text-sm">
                {msg.type === 'system' ? (
                  <p className="text-gray-500 text-xs text-center italic">{msg.message}</p>
                ) : (
                  <p>
                    <span className="text-blue-400 font-medium text-xs">{msg.user_nom}: </span>
                    <span className="text-gray-300 text-xs">{msg.message}</span>
                  </p>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Envoyer un message..."
              className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 border"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}
              maxLength={500}
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim()}
              className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition disabled:opacity-40"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </DraggableDialog>

      {/* Stop Confirmation Dialog */}
      <DraggableDialog
        open={showStopConfirm}
        onOpenChange={setShowStopConfirm}
        title={<span style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}><Square className="w-4 h-4 text-red-500 inline mr-2 fill-red-500" />Arrêter le Live ?</span>}
        maxWidth="max-w-xs"
        resizable={false}
      >
        <div className="px-6 py-4 space-y-4">
          <p className="text-gray-400 text-sm">Votre live sera terminé et tous les spectateurs seront déconnectés.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowStopConfirm(false)} style={{ color: '#aaa' }}>Annuler</Button>
            <Button
              onClick={handleEndLive}
              style={{ background: '#ef4444', color: '#fff' }}
            >
              <Square className="w-4 h-4 mr-1 fill-white" />
              Arrêter le Live
            </Button>
          </div>
        </div>
      </DraggableDialog>
    </div>
  );
}
