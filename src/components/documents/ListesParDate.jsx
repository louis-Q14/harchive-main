import React, { useState } from "react";
import { dataService } from "@/api";
import { CheckCircle2, XCircle, Clock, Trash2, ChevronDown, ChevronRight } from "lucide-react";

function parseTime(t) {
  if (!t) return 9999;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function ListesParDate({ listes, getProfesseurName, queryClient, CG }) {
  const [expandedIds, setExpandedIds] = useState({});

  const toggle = (id) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

  const sortedListes = [...listes].sort((a, b) => parseTime(a.heure_debut) - parseTime(b.heure_debut));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sortedListes.map((liste) => {
        const isExpanded = !!expandedIds[liste.id];
        const heureDebut = liste.heure_debut || '--:--';
        const heureFin = liste.heure_fin || '--:--';

        return (
          <div key={liste.id} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden' }}>
            {/* En-tête cliquable */}
            <button
              onClick={() => toggle(liste.id)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: 'none', ...CG }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isExpanded
                  ? <ChevronDown style={{ width: 12, height: 12, color: '#9ca3af' }} />
                  : <ChevronRight style={{ width: 12, height: 12, color: '#9ca3af' }} />
                }
                {liste.matiere_nom && (
                  <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: 12 }}>{liste.matiere_nom}</span>
                )}
                <span style={{ color: '#fb923c', fontSize: 11, fontFamily: 'monospace' }}>
                  {heureDebut} - {heureFin}
                </span>
                <span style={{ background: '#2563eb', color: '#fff', borderRadius: 9999, padding: '1px 8px', fontSize: 11 }}>
                  {getProfesseurName(liste)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#d1d5db' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <CheckCircle2 style={{ width: 11, height: 11, color: '#4ade80' }} />{liste.total_presents ?? 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <XCircle style={{ width: 11, height: 11, color: '#f87171' }} />{liste.total_absents ?? 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock style={{ width: 11, height: 11, color: '#fb923c' }} />{liste.total_retards ?? 0}
                  </span>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm('Voulez-vous supprimer cette liste de présence ?')) {
                      await dataService.delete('ListePresence', liste.id);
                      queryClient.invalidateQueries({ queryKey: ['listes-presence'] });
                    }
                  }}
                  style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Trash2 style={{ width: 11, height: 11 }} />
                </button>
              </div>
            </button>

            {/* Détail des étudiants (pliable) - tableau */}
            {isExpanded && (
              <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, ...CG }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>N°</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Nom</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Matricule</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center', color: '#9ca3af', fontWeight: 600, fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(liste.presences || []).map((presence, pidx) => (
                      <tr key={pidx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '6px 10px', color: '#6b7280', fontFamily: 'monospace', fontSize: 11 }}>{pidx + 1}</td>
                        <td style={{ padding: '6px 10px', color: '#fff', fontWeight: 500 }}>{presence.etudiant_nom}</td>
                        <td style={{ padding: '6px 10px', color: '#9ca3af' }}>{presence.etudiant_matricule}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <span style={{
                            color: presence.statut === 'present' ? '#16a34a' : presence.statut === 'absent' ? '#dc2626' : presence.statut === 'retard' ? '#ea580c' : '#2563eb',
                            fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, ...CG
                          }}>
                            {presence.statut === 'present' && <CheckCircle2 style={{ width: 12, height: 12 }} />}
                            {presence.statut === 'absent' && <XCircle style={{ width: 12, height: 12 }} />}
                            {presence.statut === 'retard' && <Clock style={{ width: 12, height: 12 }} />}
                            {presence.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}