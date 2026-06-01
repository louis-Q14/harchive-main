import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX } from "lucide-react";

export default function Parametres() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#333333' }}>
      <div className="max-w-4xl mx-auto flex items-center justify-center" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <Card className="w-full max-w-md text-center" style={{ backgroundColor: '#262626', borderColor: '#404040' }}>
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-red-500/10">
              <ShieldX className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-white text-xl">Accès interdit</CardTitle>
            <p className="text-gray-400">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
