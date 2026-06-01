// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { liveService } from "@/api/liveService";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, MessageCircle, Send, Heart, Radio } from "lucide-react";

export default function LiveViewer({ streamId, onClose }) { // @ts-ignore
  const { user } = useAuth();
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const chunksQueue = useRef([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]); // @ts-ignore
  const [chatInput, setChatInput] = useState(""); // @ts-ignore
  const [connected, setConnected] = useState(false); // @ts-ignore
  const [streamEnded, setStreamEnded] = useState(false); // @ts-ignore
  const [error, setError] = useState(null); // @ts-ignore
  const chatEndRef = useRef(null);

  const { data: streamInfo } = useQuery({
    queryKey: ['stream-info', streamId],
    queryFn: () => liveService.getStream(streamId),
    enabled: !!streamId,
  });



  useEffect(() => {
    const setupMediaSource = () => {
      if (!window.MediaSource) {
        setError("Votre navigateur ne supporte pas le streaming vidéo en direct.");
        return null;
      }

      const mediaSource = new MediaSource();
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
            // Keep latency low by trimming old data
            if (videoRef.current && sb.buffered.length > 0) {
              const bufEnd = sb.buffered.end(sb.buffered.length - 1);
              if (bufEnd > 10) {
                try { sb.remove(0, bufEnd - 5); } catch (e) { /* ignore */ }
              }
              // Seek to live edge if behind
              if (videoRef.current.currentTime < bufEnd - 3) {
                videoRef.current.currentTime = bufEnd - 0.5;
              }
            }
          });
        } catch (e) {
          setError("Erreur d'initialisation du flux vidéo");
        }
      });

      return mediaSource;
    };

    setupMediaSource();

    // Connect WebSocket
    const wsUrl = liveService.getWebSocketUrl(streamId, 'viewer');
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary = video chunk
        // @ts-ignore
        const sb = sourceBufferRef.current;
        if (sb && !sb.updating) {
          try { sb.appendBuffer(event.data); } catch { chunksQueue.current.push(event.data); }
        } else {
          chunksQueue.current.push(event.data);
          // Keep queue bounded
          if (chunksQueue.current.length > 20) chunksQueue.current.shift();
        }
      } else {
        // @ts-ignore
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'viewer_count':
            setViewerCount(msg.count);
            break;
          case 'stream_joined':
            setViewerCount(msg.viewerCount);
            break;
          case 'stream_ended':
            setStreamEnded(true);
            break;
          case 'error':
            setError(msg.message);
            break;
          case 'chat':
          case 'reaction':
          case 'system':
            // @ts-ignore
            setChatMessages(prev => [...prev.slice(-200), msg]);
            break;
        }
      }
    };

    ws.onerror = () => setError("Connexion perdue"); // @ts-ignore
    ws.onclose = () => setConnected(false); // @ts-ignore

    return () => {
      // @ts-ignore
      if (ws.readyState === WebSocket.OPEN) ws.close();
      // @ts-ignore
      if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
        // @ts-ignore
        try { mediaSourceRef.current.endOfStream(); } catch (e) { /* ignore */ }
      }
    };
  }, [streamId]);

  useEffect(() => {
    // @ts-ignore
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = () => {
    // @ts-ignore
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    // @ts-ignore
    wsRef.current.send(JSON.stringify({ type: 'chat', message: chatInput.trim() }));
    setChatInput("");
  };

  const sendReaction = (emoji) => { // @ts-ignore
    // @ts-ignore
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    // @ts-ignore
    wsRef.current.send(JSON.stringify({ type: 'reaction', emoji }));
  };

  if (streamEnded) {
    return (
      <div className="p-12 text-center">
        <Radio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-white text-lg mb-2">Le live est terminé</p>
        <p className="text-gray-400 text-sm mb-4">Merci d'avoir regardé !</p>
        <Button onClick={onClose} style={{ background: '#555', color: '#fff' }}>
          Retour
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={onClose} style={{ background: '#555', color: '#fff' }}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)] min-h-[500px]">
      {/* Video Area */}
      <div className="flex-1 flex flex-col rounded-xl overflow-hidden border" style={{ backgroundColor: '#000', borderColor: '#404040' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between p-3 bg-black/80 z-10">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={onClose} className="text-white p-1">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold text-white bg-red-600">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
            {streamInfo && (
              <span className="text-white text-sm font-medium truncate max-w-[200px]">{streamInfo.titre}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-white text-sm">
            <Eye className="w-4 h-4" />
            {viewerCount}
          </div>
        </div>

        {/* Video */}
        <div className="flex-1 relative flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          {!connected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <Radio className="w-10 h-10 text-red-500 animate-pulse mx-auto mb-2" />
                <p className="text-white text-sm">Connexion au live...</p>
              </div>
            </div>
          )}

          {/* Floating reactions */}
          {chatMessages.filter(m => m.type === 'reaction').slice(-5).map((r, i) => ( // @ts-ignore
            <div
              key={r.id}
              className="absolute text-3xl animate-bounce"
              style={{
                bottom: `${20 + i * 15}%`,
                right: `${10 + (i * 7)}%`,
                animationDuration: '1s',
                opacity: 0.8,
              }}
            >
              {/* @ts-ignore */}
              {r.emoji}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="w-full lg:w-80 flex flex-col rounded-xl border" style={{ backgroundColor: '#262626', borderColor: '#404040' }}>
        <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: '#404040' }}>
          <MessageCircle className="w-4 h-4 text-gray-400" />
          <span className="text-white text-sm font-medium">Chat en direct</span>
          {streamInfo && (
            <span className="text-gray-500 text-xs ml-auto truncate max-w-[100px]">{streamInfo.streamer_nom}</span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[400px] lg:max-h-none">
          {chatMessages.map((msg) => ( // @ts-ignore
            <div key={msg.id} className="text-sm">
              {/* @ts-ignore */}
              {msg.type === 'system' ? (
                // @ts-ignore
                <p className="text-gray-500 text-xs text-center italic">{msg.message}</p>
              ) : msg.type === 'reaction' ? (
                <p className="text-xs">
                  {/* @ts-ignore */}
                  <span className="text-blue-400 font-medium">{msg.user_nom}</span>
                  {/* @ts-ignore */}
                  <span className="ml-1 text-lg">{msg.emoji}</span>
                </p>
              ) : (
                <p>
                  {/* @ts-ignore */}
                  <span className="text-blue-400 font-medium text-xs">{msg.user_nom}: </span>
                  {/* @ts-ignore */}
                  <span className="text-gray-300 text-xs">{msg.message}</span>
                </p>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Reactions */}
        <div className="px-3 py-2 border-t flex gap-2" style={{ borderColor: '#404040' }}>
          {['❤️', '🔥', '👏', '😂', '😮', '🎉'].map(emoji => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="text-lg hover:scale-125 transition-transform"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t flex gap-2" style={{ borderColor: '#404040' }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            placeholder="Envoyer un message..."
            className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 border"
            style={{ backgroundColor: '#1a1a1a', borderColor: '#555' }}
            maxLength={500}
          />
          <Button size="sm" onClick={sendChat} disabled={!chatInput.trim()} className="px-3" style={{ background: '#555', color: '#fff' }}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
