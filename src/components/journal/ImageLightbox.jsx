import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ImageLightbox({ images, currentIndex, onClose, onNavigate, caption, commentaires = [] }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length, onClose, onNavigate]);

  if (!images || images.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Bouton fermer */}
      <Button
        onClick={onClose}
        className="absolute top-4 right-4 bg-white text-black hover:bg-gray-200 rounded-full w-10 h-10 p-0 z-10"
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Flèche gauche */}
      {images.length > 1 && currentIndex > 0 && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex - 1);
          }}
          className="absolute left-4 bg-white text-black hover:bg-gray-200 rounded-full w-12 h-12 p-0 z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      )}

      {/* Conteneur principal */}
      <div 
        className="flex items-start justify-center gap-6 max-w-[95vw] max-h-[90vh] px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image et légende */}
        <div className="flex flex-col items-center justify-center gap-4 flex-shrink-0">
          <img 
            src={images[currentIndex]} 
            alt={`Image ${currentIndex + 1}`}
            className="max-w-[60vw] max-h-[80vh] object-contain rounded-lg"
          />
          {caption && (
            <div className="bg-black bg-opacity-80 text-white px-6 py-3 rounded-lg max-w-[60vw]">
              <p className="text-sm">{caption}</p>
            </div>
          )}
        </div>

        {/* Section commentaires */}
        {commentaires && commentaires.length > 0 && (
          <div 
            className="bg-white rounded-lg w-80 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Commentaires ({commentaires.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {commentaires.map((comment) => {
                const initials = (comment.auteur_nom || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                
                return (
                  <div key={comment.id} className="flex gap-3">
                    {comment.auteur_photo_url ? (
                      <img 
                        src={comment.auteur_photo_url} 
                        alt={comment.auteur_nom} 
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold text-sm text-gray-800">{comment.auteur_nom}</p>
                        <p className="text-sm text-gray-700">{comment.contenu}</p>
                        <span className="text-xs text-gray-500">
                          {format(new Date(comment.created_date), 'PPp', { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Flèche droite */}
      {images.length > 1 && currentIndex < images.length - 1 && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex + 1);
          }}
          className="absolute right-4 bg-white text-black hover:bg-gray-200 rounded-full w-12 h-12 p-0 z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      )}

      {/* Compteur d'images */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}