// @ts-nocheck
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { shortsService } from "@/api/liveService";
import { uploadService } from "@/api/uploadService";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Camera, Upload, Play, Pause, Scissors, RotateCcw,
  Check, Loader2, X, Music, Type, Sparkles, Square
} from "lucide-react";
import { formatUserName } from "@/components/utils/nameUtils";

const FILTERS = [
  { name: 'Normal', style: {} },
  { name: 'Noir & Blanc', style: { filter: 'grayscale(100%)' } },
  { name: 'Sépia', style: { filter: 'sepia(80%)' } },
  { name: 'Chaud', style: { filter: 'saturate(150%) hue-rotate(-10deg) brightness(110%)' } },
  { name: 'Froid', style: { filter: 'saturate(120%) hue-rotate(30deg) brightness(105%)' } },
  { name: 'Contraste', style: { filter: 'contrast(140%) saturate(110%)' } },
  { name: 'Vintage', style: { filter: 'sepia(40%) saturate(70%) brightness(90%) contrast(110%)' } },
  { name: 'Dramatique', style: { filter: 'contrast(150%) brightness(80%) saturate(130%)' } },
];

export default function ShortCreator({ onClose, onCreated }) {
  const { user } = useAuth();
  const [step, setStep] = useState('source'); // source | record | edit | publish
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(60);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [musicName, setMusicName] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const streamRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const videoEditRef = useRef(null);
  const recordTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, []);

  // Attach stream to video preview when entering record step
  const previewCallbackRef = useCallback((node) => {
    videoPreviewRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, [step]);

  // ── Source selection ──
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError("Fichier trop volumineux. Maximum 100 MB.");
      return;
    }
    if (!file.type.startsWith('video/')) {
      setError("Veuillez sélectionner un fichier vidéo.");
      return;
    }
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setStep('edit');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1080 }, height: { ideal: 1920 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      setStep('record');

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      recordedChunks.current = [];
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: mimeType });
        const file = new File([blob], `short_${Date.now()}.webm`, { type: mimeType });
        setVideoFile(file);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        stream.getTracks().forEach(t => t.stop());
        setStep('edit');
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 59) { // Max 60 seconds
            stopRecording();
            return 60;
          }
          return t + 1;
        });
      }, 1000);
    } catch {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  // ── Video metadata ──
  const handleVideoLoaded = (e) => {
    const dur = e.target.duration;
    setVideoDuration(dur);
    setTrimEnd(Math.min(dur, 60));
  };

  // ── Publish ──
  const handlePublish = async () => {
    if (!videoFile) return;
    setPublishing(true);
    setError(null);

    try {
      // Upload video
      const uploaded = await uploadService.uploadFile(videoFile, 'posts');

      // Create short
      await shortsService.create({
        titre: titre.trim(),
        description: description.trim(),
        video_url: uploaded.url,
        duration: Math.min(trimEnd - trimStart, 60),
        width: 1080,
        height: 1920,
        music_name: musicName.trim() || undefined,
        tags: [],
      });

      onCreated();
    } catch (err) {
      setError("Erreur lors de la publication: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  // ── Render by step ──
  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button size="sm" variant="ghost" onClick={onClose} className="text-white">
          <ArrowLeft className="w-5 h-5 mr-1" /> Retour
        </Button>
        <h3 className="text-white font-semibold">
          {step === 'source' && 'Nouveau Short'}
          {step === 'record' && 'Enregistrement'}
          {step === 'edit' && 'Édition'}
          {step === 'publish' && 'Publication'}
        </h3>
        <div className="w-20" />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-600/50 bg-red-900/20 text-red-400 text-sm flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step: Choose Source */}
      {step === 'source' && (
        <div className="space-y-4">
          <div
            className="p-8 border-2 border-dashed rounded-xl text-center cursor-pointer hover:border-purple-500/50 transition-colors"
            style={{ borderColor: '#555', backgroundColor: '#1a1a1a' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Importer une vidéo</p>
            <p className="text-gray-500 text-sm">MP4, WebM — Max 100 MB, 60 sec recommandé</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-gray-500 text-sm">ou</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          <Button
            onClick={startRecording}
            className="w-full flex items-center justify-center gap-2 py-6 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#fff' }}
          >
            <Camera className="w-6 h-6" />
            <span className="text-base font-medium">Enregistrer avec la caméra</span>
          </Button>
        </div>
      )}

      {/* Step: Recording */}
      {step === 'record' && (
        <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '70vh' }}>
          <video
            ref={previewCallbackRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {/* Recording indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold text-white bg-red-600">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              REC
            </div>
            <span className="text-white text-sm font-mono bg-black/50 px-2 py-1 rounded">
              {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
            </span>
          </div>
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700">
            <div className="h-full bg-red-500 transition-all" style={{ width: `${(recordingTime / 60) * 100}%` }} />
          </div>
          {/* Stop button */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-red-600 border-4 border-white flex items-center justify-center hover:bg-red-700 transition-colors"
            >
              <Square className="w-6 h-6 text-white fill-white" />
            </button>
          </div>
        </div>
      )}

      {/* Step: Edit */}
      {step === 'edit' && videoUrl && (
        <div className="space-y-4">
          {/* Video Preview with filter */}
          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '50vh' }}>
            <video
              ref={videoEditRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              style={FILTERS[selectedFilter].style}
              controls
              playsInline
              onLoadedMetadata={handleVideoLoaded}
            />
          </div>

          {/* Trim controls */}
          {videoDuration > 0 && (
            <div className="p-3 rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#404040' }}>
              <div className="flex items-center gap-2 mb-2">
                <Scissors className="w-4 h-4 text-gray-400" />
                <span className="text-white text-sm font-medium">Découpage</span>
                <span className="text-gray-500 text-xs ml-auto">
                  {(trimEnd - trimStart).toFixed(1)}s / {videoDuration.toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Début</label>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(videoDuration - 1, 0)}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setTrimStart(Math.min(v, trimEnd - 1));
                    }}
                    className="w-full accent-purple-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Fin</label>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setTrimEnd(Math.max(v, trimStart + 1));
                    }}
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="p-3 rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#404040' }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-gray-400" />
              <span className="text-white text-sm font-medium">Filtres</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f, i) => (
                <button
                  key={f.name}
                  onClick={() => setSelectedFilter(i)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors ${
                    selectedFilter === i
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#333] text-gray-400 hover:bg-[#444]'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => setStep('publish')}
            className="w-full"
            style={{ background: '#8b5cf6', color: '#fff' }}
          >
            <Check className="w-4 h-4 mr-1" />
            Continuer
          </Button>
        </div>
      )}

      {/* Step: Publish */}
      {step === 'publish' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            {/* Mini preview */}
            <div className="w-28 flex-shrink-0 rounded-lg overflow-hidden" style={{ aspectRatio: '9/16' }}>
              <video src={videoUrl} className="w-full h-full object-cover" style={FILTERS[selectedFilter].style} muted />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Titre</label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ajoutez un titre..."
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 border"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#555' }}
                  maxLength={200}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre vidéo..."
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 border min-h-[60px] resize-none"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#555' }}
                  maxLength={500}
                />
              </div>
            </div>
          </div>

          {/* Music */}
          <div className="p-3 rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#404040' }}>
            <div className="flex items-center gap-2 mb-2">
              <Music className="w-4 h-4 text-gray-400" />
              <span className="text-white text-sm font-medium">Musique (optionnel)</span>
            </div>
            <input
              type="text"
              value={musicName}
              onChange={(e) => setMusicName(e.target.value)}
              placeholder="Nom de la musique..."
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 border"
              style={{ backgroundColor: '#262626', borderColor: '#555' }}
              maxLength={200}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep('edit')}
              className="flex-1"
              style={{ color: '#aaa', border: '1px solid #555' }}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#fff' }}
            >
              {publishing ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Publication...</>
              ) : (
                <><Check className="w-4 h-4 mr-1" /> Publier</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
