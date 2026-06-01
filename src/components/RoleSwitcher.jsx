import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { backendConfig } from '@/api/backendConfig';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS = {
  super_admin: { label: 'Super Admin', color: '#f59e0b', icon: '👑' },
  admin_systeme: { label: 'Admin Système', color: '#ef4444', icon: '🛡️' },
  admin_etablissement: { label: 'Admin Établissement', color: '#f97316', icon: '🏫' },
  professeur: { label: 'Professeur', color: '#3b82f6', icon: '👨‍🏫' },
  etudiant: { label: 'Étudiant', color: '#22c55e', icon: '🎓' },
  parent: { label: 'Parent', color: '#a855f7', icon: '👨‍👩‍👧' },
};

export default function RoleSwitcher() {
  const { user, switchUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (!backendConfig.useLocalBackend) return null;

  const currentRole = user?.role_archive || 'admin_systeme';
  const current = ROLE_LABELS[currentRole];

  const handleSwitch = (role) => {
    switchUser(role);
    setIsOpen(false);
    navigate('/');
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 99999,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Expanded panel */}
      {isOpen && (
        <div style={{
          background: '#1e1e2e',
          border: '1px solid #444',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          minWidth: '220px',
        }}>
          <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Changer de rôle
          </div>
          {Object.entries(ROLE_LABELS).map(([role, { label, color, icon }]) => (
            <button
              key={role}
              onClick={() => handleSwitch(role)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 10px',
                marginBottom: '4px',
                background: role === currentRole ? `${color}22` : 'transparent',
                border: role === currentRole ? `1px solid ${color}` : '1px solid transparent',
                borderRadius: '8px',
                color: role === currentRole ? color : '#ccc',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (role !== currentRole) {
                  e.target.style.background = '#2a2a3e';
                }
              }}
              onMouseLeave={(e) => {
                if (role !== currentRole) {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {role === currentRole && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✓</span>}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #333', marginTop: '8px', paddingTop: '8px' }}>
            <div style={{ color: '#666', fontSize: '11px' }}>
              {user?.prenom} {user?.nom} — {user?.email}
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: current.color,
          color: '#fff',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: `0 4px 16px ${current.color}66`,
          transition: 'all 0.2s',
          float: 'right',
        }}
      >
        <span>{current.icon}</span>
        <span>{current.label}</span>
      </button>
    </div>
  );
}
