import React from "react";
import PdfThumbnail from "./PdfThumbnail";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

/** @type {Record<string, string>} */
const typeColors = {
  diplome:                 '#ef4444',
  bulletin:                '#3b82f6',
  bulletin_2:              '#3b82f6',
  attestation_naissance:   '#10b981',
  bonne_vie:               '#8b5cf6',
  formulaire_inscription:  '#f59e0b',
};

/** @param {{ url?: string, fichierType: string, nom?: string, width?: number, height?: number }} props */
export default function DocumentThumbnail({ url, fichierType, nom, width = 90, height = 110 }) {
  const hasUrl = url && url.length > 0;
  const color = typeColors[fichierType] || '#6b7280';

  /* ── Real content available → image preview or PdfThumbnail ── */
  if (hasUrl) {
    const isImage =
      url.startsWith("data:image/") ||
      /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

    if (isImage) {
      return (
        <div
          className="rounded overflow-hidden border border-[#4d4d4d] mb-1 flex-shrink-0"
          style={{ width, height, position: 'relative' }}
        >
          <img src={url} alt={nom} className="w-full h-full object-cover" />
          <Badge color={color} label={fichierType === 'formulaire_inscription' ? 'FORM' : 'IMG'} />
        </div>
      );
    }

    return (
      <div className="mb-1 relative" style={{ width, height }}>
        <PdfThumbnail url={url} width={width} height={height} />
        <Badge color={color} label="PDF" />
      </div>
    );
  }

  /* ── No data yet → styled document page placeholder ── */
  return (
    <div className="mb-1 flex-shrink-0" style={{ width, height }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#f5f5ee',
          borderRadius: 4,
          border: '1px solid #4d4d4d',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,.35)',
        }}
      >
        {/* Corner fold */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 18,
            height: 18,
            background: 'linear-gradient(135deg, transparent 50%, #d4d4c8 50%, #c8c8bc 100%)',
          }}
        />

        {/* Decorative text lines */}
        <div style={{ padding: '20px 10px 8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[80, 100, 55, 90, 65, 100, 45].map((w, i) => (
            <div
              key={i}
              style={{
                height: 3,
                borderRadius: 1,
                width: `${w}%`,
                backgroundColor: i % 3 === 0 ? '#c7c7bc' : '#d9d9ce',
              }}
            />
          ))}
        </div>

        {/* File-type badge */}
        <Badge color={color} label={fichierType === 'formulaire_inscription' ? 'FORM' : 'PDF'} />
      </div>
    </div>
  );
}

/* Small coloured badge in the bottom-right corner */
/** @param {{ color: string, label: string }} props */
function Badge({ color, label }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: color,
        borderRadius: 3,
        padding: '1px 6px',
        lineHeight: 1,
      }}
    >
      <span style={{ color: '#fff', fontSize: 8, fontWeight: 800, ...CG }}>{label}</span>
    </div>
  );
}
