import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function APropos() {
  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--ha-bg)'}}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">À Propos</h1>
          <p className="text-white">Informations sur l'application</p>
        </div>

        <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}}>
          <CardHeader style={{backgroundColor:'#2d2d2d', borderColor:'#3d3d3d'}}>
            <CardTitle className="text-white flex items-center gap-2">
              <img 
                src="/assets/icons/6153a57fe_logoHARCHIVEF2.png"
                alt="Harchive Logo"
                className="h-16 object-contain"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Application</h3>
                <p className="text-white text-2xl font-bold">HARCHIVE</p>
                <p className="text-gray-400 mt-1">Plateforme de gestion académique complète</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Version</h3>
                <p className="text-white text-2xl font-bold">2.0</p>
                <p className="text-gray-400 mt-1">Dernière mise à jour - Février 2026</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Éditeur</h3>
                <p className="text-white text-2xl font-bold">PRECISIONS GROUP</p>
                <p className="text-gray-400 mt-1">Solutions innovantes sur mesure</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-600">
              <h3 className="text-lg font-semibold text-white mb-3">À propos de HARCHIVE</h3>
              <p className="text-gray-300 leading-relaxed">
                HARCHIVE est une plateforme complète de gestion académique conçue pour moderniser 
                et faciliter la gestion des établissements d'enseignement. Elle offre des outils 
                pour la gestion des étudiants, des professeurs, des cours, des notes, et bien plus encore.
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-600">
              <p className="text-sm text-gray-400 text-center">
                © 2026 PRECISIONS GROUP. Tous droits réservés.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
