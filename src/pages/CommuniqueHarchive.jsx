import React, { useState, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { dataService } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Send, Loader2, Image as ImageIcon, Video, X, Globe, Megaphone, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const HARCHIVE_ID = 'harchive-officiel-001';

export default function CommuniqueHarchive() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [contenu, setContenu] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [typeMedia, setTypeMedia] = useState('texte');
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Only harchive_officiel, super_admin, admin_systeme can access
  const canAccess = user?.role_archive === 'harchive_officiel'
    || user?.role_archive === 'super_admin'
    || user?.role_archive === 'admin_systeme';

  const { data: communiques = [], isLoading } = useQuery({
    queryKey: ['communiques-harchive'],
    queryFn: async () => {
      const all = await dataService.query('Publication', { orderBy: '-created_date', limit: 100 });
      return all.filter(p => p.auteur_id === HARCHIVE_ID);
    },
    enabled: !!user,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      let mediaUrl = null;
      let finalType = 'texte';

      if (mediaFile) {
        setUploading(true);
        try {
          const uploaded = await dataService.uploadFile(mediaFile);
          mediaUrl = uploaded?.url || uploaded?.file_url || null;
          finalType = typeMedia;
        } finally {
          setUploading(false);
        }
      }

      return dataService.create('Publication', {
        auteur_id: HARCHIVE_ID,
        auteur_nom: 'HARCHIVE Officiel',
        auteur_role: 'harchive_officiel',
        contenu,
        visibilite: 'publique',
        type_media: finalType,
        media_url: mediaUrl,
        likes: [],
      });
    },
    onSuccess: () => {
      setContenu('');
      setMediaFile(null);
      setMediaPreview(null);
      setTypeMedia('texte');
      queryClient.invalidateQueries(['communiques-harchive']);
      queryClient.invalidateQueries(['journal-commun']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => dataService.delete('Publication', id),
    onSuccess: () => {
      queryClient.invalidateQueries(['communiques-harchive']);
      queryClient.invalidateQueries(['journal-commun']);
    },
  });

  const handleMedia = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setTypeMedia(type);
    const reader = new FileReader();
    reader.onload = (ev) => setMediaPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--ha-bg)' }}>
        <div className="text-center p-8 rounded-2xl" style={{ backgroundColor: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
          <Megaphone className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--ha-text)' }}>Accès refusé</h2>
          <p style={{ color: 'var(--ha-text-muted)' }}>Cette page est réservée au compte Harchive Officiel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--ha-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
          <Megaphone className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ha-text)' }}>Communiqués Harchive</h1>
          <p className="text-sm" style={{ color: 'var(--ha-text-muted)' }}>
            Publiez des annonces officielles visibles par toute la communauté
          </p>
        </div>
      </div>

      {/* Formulaire de publication */}
      <Card className="mb-8" style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
        <CardHeader className="border-b pb-4" style={{ borderColor: 'var(--ha-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
              <img src="/assets/icons/6153a57fe_logoHARCHIVEF2.png" alt="Harchive" className="w-8 h-8 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--ha-text)' }}>HARCHIVE Officiel</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: '#ffffff' }}>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                HARCHIVE
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Rédigez votre communiqué officiel..."
            className="min-h-[120px] resize-none text-base"
            style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)' }}
          />

          {/* Prévisualisation média */}
          {mediaPreview && (
            <div className="relative rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--ha-surface2)' }}>
              {typeMedia === 'image'
                ? <img src={mediaPreview} alt="preview" className="w-full max-h-64 object-contain" />
                : <video src={mediaPreview} controls className="w-full max-h-64" />
              }
              <button
                onClick={() => { setMediaFile(null); setMediaPreview(null); setTypeMedia('texte'); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMedia(e, 'image')} />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleMedia(e, 'video')} />
              <Button variant="ghost" size="sm" onClick={() => imageInputRef.current?.click()} style={{ color: 'var(--ha-text-muted)' }}>
                <ImageIcon className="w-4 h-4 mr-1" /> Photo
              </Button>
              <Button variant="ghost" size="sm" onClick={() => videoInputRef.current?.click()} style={{ color: 'var(--ha-text-muted)' }}>
                <Video className="w-4 h-4 mr-1" /> Vidéo
              </Button>
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text-muted)' }}>
                <Globe className="w-3 h-3" /> Public
              </span>
            </div>
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={!contenu.trim() || publishMutation.isPending || uploading}
              style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: '#ffffff' }}
            >
              {(publishMutation.isPending || uploading)
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Send className="w-4 h-4 mr-2" />Publier</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des communiqués */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--ha-text)' }}>
          <Megaphone className="w-5 h-5" style={{ color: '#7c3aed' }} />
          Communiqués publiés ({communiques.length})
        </h2>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ha-text-muted)' }} />
          </div>
        )}

        {!isLoading && communiques.length === 0 && (
          <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: 'var(--ha-surface)', border: '1px solid var(--ha-border)' }}>
            <Megaphone className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ha-text-faint)' }} />
            <p style={{ color: 'var(--ha-text-muted)' }}>Aucun communiqué publié pour l'instant.</p>
          </div>
        )}

        {communiques.map((pub) => (
          <Card key={pub.id} style={{ backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)' }}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
                    <img src="/assets/icons/6153a57fe_logoHARCHIVEF2.png" alt="Harchive" className="w-8 h-8 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ color: 'var(--ha-text)' }}>HARCHIVE Officiel</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: '#ffffff' }}>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        HARCHIVE
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--ha-text-faint)' }}>
                      {format(new Date(pub.created_date), 'PPp', { locale: fr })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(pub.id)}
                  disabled={deleteMutation.isPending}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <p className="whitespace-pre-wrap mb-3" style={{ color: 'var(--ha-text)' }}>{pub.contenu}</p>

              {pub.media_url && (
                <div className="rounded-lg overflow-hidden">
                  {pub.type_media === 'image'
                    ? <img src={pub.media_url} alt="media" className="w-full h-auto object-contain" />
                    : <video src={pub.media_url} controls className="w-full h-auto" />
                  }
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
