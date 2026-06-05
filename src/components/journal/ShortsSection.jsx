// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { shortsService } from "@/api/liveService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/DraggableDialog";
import {
  Heart, MessageCircle, Share2, Play, Volume2, VolumeX,
  Plus, Loader2, X, Music, Send, ChevronLeft, ChevronRight
} from "lucide-react";
import UserAvatarPopover from "@/components/ui/UserAvatarPopover";
import ShortCreator from "./ShortCreator";

/* ─────────────────── Main Section ─────────────────── */
export default function ShortsSection() {
  // @ts-ignore
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCreator, setShowCreator] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsShortId, setCommentsShortId] = useState(null);

  const { data: shorts = [], isLoading } = useQuery({
    queryKey: ['shorts-feed', !!user],
    queryFn: () => user ? shortsService.getFeed(30) : shortsService.getPublicFeed(30),
  });

  const handleCreated = useCallback(() => {
    setShowCreator(false);
    queryClient.invalidateQueries({ queryKey: ['shorts-feed'] });
  }, [queryClient]);

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, shorts.length - 1));
  }, [shorts.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  const openComments = (shortId) => {
    // @ts-ignore
    setCommentsShortId(shortId);
    setShowComments(true);
  };

  if (showCreator) {
    return <ShortCreator onClose={() => setShowCreator(false)} onCreated={handleCreated} />;
  }

  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : shorts.length === 0 ? (
        <EmptyState onCreateClick={() => setShowCreator(true)} />
      ) : (
        <div className="flex justify-center">
          <ReelsPlayer
            shorts={shorts}
            currentIndex={currentIndex}
            goNext={goNext}
            goPrev={goPrev}
            openComments={openComments}
            onCreateClick={() => setShowCreator(true)}
          />
        </div>
      )}

      <CommentsDialog
        shortId={commentsShortId}
        open={showComments}
        onClose={() => setShowComments(false)}
      />
    </div>
  );
}

/* ─────────────────── Empty State ─────────────────── */
function EmptyState({ onCreateClick = () => {} }) {
  // @ts-ignore
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: 'var(--ha-surface)' }}>
        <Play className="w-9 h-9 text-gray-500" />
      </div>
      <p className="text-white text-lg font-semibold mb-1">Aucun short pour le moment</p>
      <p className="text-gray-500 text-sm mb-6">Soyez le premier à partager un short !</p>
      <button
        onClick={onCreateClick}
        className="px-5 py-2.5 rounded-md text-sm font-medium text-white transition hover:brightness-125"
        style={{ backgroundColor: 'var(--ha-surface)' }}
      >
        <Plus className="w-4 h-4 inline mr-1.5" />
        Créer un Short
      </button>
    </div>
  );
}

/* ─────────────────── YouTube Shorts Player ─────────────────── */
function ReelsPlayer({ shorts = [], currentIndex = 0, goNext = () => {}, goPrev = () => {}, openComments = () => {}, onCreateClick = () => {} }) {
  // @ts-ignore
  const short = shorts[currentIndex];
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  const viewRecorded = useRef(false);
  const progressRef = useRef(null);
  const progressInterval = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showCaptions, setShowCaptions] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const hideControlsTimerRef = useRef(null);

  // Sync state when short changes
  useEffect(() => {
    if (short) {
      setLiked(short.is_liked || false);
      setLikeCount(Array.isArray(short.likes) ? short.likes.length : (short.nb_likes || 0));
      viewRecorded.current = false;
      setProgress(0);
    }
  }, [short?.id]);

  // Video autoplay + view tracking
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !short) return;
    // @ts-ignore

    vid.currentTime = 0;
    vid.play().then(() => setPlaying(true)).catch(() => setPlaying(false));

    // Record view after 2s
    const viewTimer = setTimeout(() => {
      if (!viewRecorded.current && short.id) {
        shortsService.recordView(short.id).catch(() => {});
        viewRecorded.current = true;
      }
    }, 2000);

    // Progress bar
    progressInterval.current = setInterval(() => {
      if (vid.duration) setProgress((vid.currentTime / vid.duration) * 100);
    }, 200);

    return () => {
      clearTimeout(viewTimer);
      clearInterval(progressInterval.current);
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
      vid.pause();
    };
  }, [short?.id]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    // @ts-ignore
    if (playing) vid.pause();
    else vid.play().catch(() => {});
    setPlaying(p => !p);
  };

  const toggleLike = async () => {
    if (!short?.id) return;
    try {
      const res = await shortsService.toggleLike(short.id);
      setLiked(res.liked);
      setLikeCount(res.count);
      queryClient.invalidateQueries({ queryKey: ['shorts-feed'] });
    } catch (e) { /* ignore */ }
  };

  // Mouse controls - show/hide on hover
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
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (newVolume > 0) setMuted(false);
  };

  // Swipe (touch)
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; }; // @ts-ignore
  const onTouchEnd = (e) => { // @ts-ignore
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 60) goNext();
    else if (dy < -60) goPrev();
  };

  if (!short) return null;

  // @ts-ignore
  const backendBase = import.meta.env.VITE_BASE44_BACKEND_URL || '';
  const videoSrc = short.video_url?.startsWith('/') ? `${backendBase}${short.video_url}` : short.video_url;

  return (
    <div className="flex items-center justify-center gap-2.5">
      {/* ===== VIDEO PLAYER ===== */}
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Video element */}
        <video
          ref={videoRef}
          src={videoSrc}
          className="absolute inset-0 w-full h-full object-cover"
          onClick={togglePlay}
          loop
          playsInline
          muted={muted}
        />

        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

        {/* ===== LEFT ARROW (overlay) ===== */}
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          disabled={currentIndex === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full flex items-center justify-center transition"
          style={{
            background: 'transparent',
            opacity: currentIndex === 0 ? 0.25 : 1,
            cursor: currentIndex === 0 ? 'default' : 'pointer',
          }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        {/* ===== RIGHT ARROW (overlay) ===== */}
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          disabled={currentIndex === shorts.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full flex items-center justify-center transition"
          style={{
            background: 'transparent',
            opacity: currentIndex === shorts.length - 1 ? 0.25 : 1,
            cursor: currentIndex === shorts.length - 1 ? 'default' : 'pointer',
          }}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* ===== TOP LEFT: Play / Mute Controls ===== */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 transition-opacity duration-300" style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition backdrop-blur-sm"
          >
            {muted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
          
          {/* Volume Slider */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 rounded-full bg-white/30 appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, rgb(255,255,255,0.6) 0%, rgb(255,255,255,0.6) ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
            }}
          />
        </div>

        {/* ===== BOTTOM: Title + Creator ===== */}
        <div className="absolute bottom-0 left-0 z-20 pointer-events-none" style={{ maxWidth: '75%' }}>
          <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-10">
            <p className="text-white text-sm font-semibold drop-shadow-lg">{short.creator_nom}</p>
            <p className="text-white/80 text-xs mt-1 line-clamp-2 drop-shadow-lg">{short.titre || 'Sans titre'}</p>
          </div>
        </div>

        {/* Tap-to-pause overlay */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            </div>
          </div>
        )}
      </div>

      {/* ===== RIGHT SIDEBAR: Action Buttons (OUTSIDE VIDEO) ===== */}
      <div className="flex flex-col items-center flex-shrink-0 px-0 py-4" style={{ height: 'calc(100vh - 160px)' }}>

        {/* Icons at bottom of video */}
        <div className="flex-1 flex flex-col items-center justify-end gap-3 pb-0">
          {/* Like */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={toggleLike}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition backdrop-blur-sm active:scale-95"
            >
              <Heart
                className="w-5 h-5"
                fill={liked ? '#ff4458' : 'none'}
                stroke={liked ? '#ff4458' : 'white'}
                strokeWidth={2}
              />
            </button>
            <span className="text-white text-[11px]">{likeCount > 999 ? `${(likeCount/1000).toFixed(1)}k` : likeCount}</span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); openComments(short.id); }}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition backdrop-blur-sm active:scale-95"
            >
              <MessageCircle className="w-5 h-5 text-white" strokeWidth={2} />
            </button>
            <span className="text-white text-[11px]">{short.nb_commentaires || 0}</span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center gap-0.5 relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowShareDialog(prev => !prev);
                setLinkCopied(false);
              }}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition backdrop-blur-sm active:scale-95"
            >
              <Share2 className="w-5 h-5 text-white" strokeWidth={2} />
            </button>
            <span className="text-white text-[11px]">Partager</span>

            {/* Share Dialog Popup */}
            {showShareDialog && (
              <SharePopup
                title={short.titre || 'Short'}
                url={window.location.href}
                linkCopied={linkCopied}
                onCopy={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  });
                }}
                onClose={() => setShowShareDialog(false)}
              />
            )}
          </div>

          {/* Créer un Short */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onCreateClick(); }}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition backdrop-blur-sm active:scale-95"
            >
              <Plus className="w-5 h-5 text-white" strokeWidth={2} />
            </button>
            <span className="text-white text-[11px]">Créer</span>
          </div>

          {/* Creator Avatar (Bottom) */}
          <div className="flex flex-col items-center gap-0.5 mt-1">
            <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: 40, height: 40 }}>
              {short.creator_photo_url ? (
                <img src={short.creator_photo_url} alt={short.creator_nom} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{short.creator_nom?.[0]?.toUpperCase() || '?'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Share Popup ─────────────────── */
function SharePopup({ title, url, linkCopied, onCopy, onClose }) {
  const shareRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const socials = [
    { name: 'WhatsApp', color: '#25D366', icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    ), href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { name: 'Facebook', color: '#1877F2', icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    ), href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { name: 'X', color: '#000000', icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    ), href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { name: 'Email', color: '#666666', icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
    ), href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
    { name: 'Reddit', color: '#FF4500', icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
    ), href: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}` },
    { name: 'LinkedIn', color: '#0A66C2', icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
    ), href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
  ];

  return (
    <div
      ref={shareRef}
      className="absolute bottom-full right-0 mb-2 z-50"
      style={{
        width: '340px',
        background: 'rgba(18, 18, 28, 0.25)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)' }}>
        <span className="text-white font-semibold text-sm">Partager</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Social Icons */}
      <div className="flex gap-3 px-5 py-4 overflow-x-auto">
        {socials.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 min-w-[48px] group"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: s.color }}
            >
              {s.icon}
            </div>
            <span className="text-white text-[10px]">{s.name}</span>
          </a>
        ))}
      </div>

      {/* Copy Link */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 px-3 py-2.5 text-xs text-gray-300 bg-transparent border-none outline-none truncate"
          />
          <button
            onClick={onCopy}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg mr-1 transition"
            style={{ background: linkCopied ? '#16a34a' : '#2563eb', color: '#fff' }}
          >
            {linkCopied ? 'Copié !' : 'Copier'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Comments Dialog ─────────────────── */
function CommentsDialog({ shortId, open = false, onClose = () => {} }) { // @ts-ignore
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const scrollRef = useRef(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['short-comments', shortId],
    queryFn: () => shortsService.getComments(shortId),
    enabled: !!shortId && open,
  });

  // @ts-ignore
  const addCommentMutation = useMutation({
    mutationFn: ({ id, contenu }) => shortsService.addComment(id, contenu),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-comments', shortId] });
      queryClient.invalidateQueries({ queryKey: ['shorts-feed'] });
      setCommentText("");
    },
  });

  const handleSubmit = () => {
    if (!commentText.trim() || !shortId) return;
    addCommentMutation.mutate({ id: shortId, contenu: commentText.trim() });
  };

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onClose}
      title={<span style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Commentaires ({comments.length})</span>}
      maxWidth="max-w-md"
    >
      {/* Comments List */}
      <div ref={scrollRef} className="overflow-y-auto px-6 py-4 space-y-3 flex-1" style={{ minHeight: 200 }}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Aucun commentaire. Soyez le premier !</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {/* @ts-ignore */}
                  <UserAvatarPopover name={c.user_nom} photoUrl={c.user_photo_url} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{c.user_nom}</span>
                    <span className="text-xs text-gray-500">{formatTimeAgo(c.created_date)}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1 break-words">{c.contenu}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Section */}
      <div className="flex gap-2 items-center px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Ajouter un commentaire..."
          className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-gray-500 border transition focus:outline-none focus:border-blue-500"
          style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}
          maxLength={1000}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!commentText.trim() || addCommentMutation.isPending}
          className="px-4 py-2 rounded-xl font-medium text-white transition hover:opacity-90 active:scale-95"
          style={{ background: '#2563eb', color: '#fff', border: 'none' }}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </DraggableDialog>
  );
}

function formatTimeAgo(dateStr) { // @ts-ignore
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}
