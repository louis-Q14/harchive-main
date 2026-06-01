import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>Bienvenue dans HArchive</h1>

      <Card style={{ marginBottom: '30px' }}>
        <CardHeader>
          <CardTitle>Application en reconstruction</CardTitle>
        </CardHeader>
        <CardContent>
          <p style={{ marginBottom: '20px' }}>
            L'application est actuellement en phase de migration depuis le système Base44 vers une architecture personnalisée.
          </p>
          <p style={{ marginBottom: '20px' }}>
            ✅ <strong>Frontend:</strong> Vite + React + TypeScript
          </p>
          <p style={{ marginBottom: '20px' }}>
            ✅ <strong>Backend:</strong> Express.js + SQLite
          </p>
          <p style={{ marginBottom: '20px' }}>
            ✅ <strong>Services:</strong> dataService, authService, httpClient
          </p>
        </CardContent>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Button onClick={() => navigate('/dashboard')} style={{ padding: '15px' }}>
          Aller au Dashboard
        </Button>
        <Button onClick={() => navigate('/messtatistiques')} style={{ padding: '15px' }}>
          Mes Statistiques
        </Button>
      </div>
    </div>
  );
}
