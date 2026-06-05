import React from 'react';

export default function Diagnostic() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: 'var(--ha-surface2)', color: '#00ff00', minHeight: '100vh' }}>
      <h1>🔍 Diagnostic</h1>
      <p>Si tu vois ceci, React marche !</p>
      
      <h2>Vérifications:</h2>
      <p>✓ React charge correctement</p>
      <p>✓ Router fonctionne (tu accès /diagnostic)</p>
      
      <h2>Procédure:</h2>
      <ol>
        <li>Va sur <code>/</code> dans le navigateur</li>
        <li>Ouvre la console du navigateur (F12)</li>
        <li>Dis-moi le premier message d'erreur qu'tu vois</li>
      </ol>
    </div>
  );
}
