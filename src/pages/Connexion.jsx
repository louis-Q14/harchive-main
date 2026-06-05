import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Loader2, Mail, Lock, Archive, AlertCircle,
  GraduationCap, UserCheck, Building2, School, Heart, LogIn,
  Eye, EyeOff
} from "lucide-react";

export default function Connexion() {
  const navigate = useNavigate();
  const { loginWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Force dark mode on this page
  useEffect(() => {
    const html = document.documentElement;
    const prevTheme = html.getAttribute('data-theme');
    const hadDark = html.classList.contains('dark');
    html.setAttribute('data-theme', 'dark-standard');
    html.classList.add('dark');
    html.style.setProperty('--ha-bg', '#111118');
    html.style.setProperty('--ha-surface', '#1c1c24');
    html.style.setProperty('--ha-surface2', '#2d2d2d');
    html.style.setProperty('--ha-surface3', '#3d3d3d');
    html.style.setProperty('--ha-border', 'rgba(255,255,255,0.07)');
    html.style.setProperty('--ha-text', '#ffffff');
    html.style.setProperty('--ha-text-muted', '#9ca3af');
    html.style.setProperty('--ha-text-faint', '#6b7280');
    html.style.setProperty('--ha-sidebar-bg', '#0e0e14');
    html.style.setProperty('--ha-accent', '#7c3aed');
    html.style.setProperty('--ha-hover', 'rgba(255,255,255,0.06)');
    html.style.setProperty('--card', '0 0% 3.9%');
    html.style.setProperty('--card-foreground', '0 0% 98%');
    html.style.setProperty('--background', '0 0% 3.9%');
    html.style.setProperty('--foreground', '0 0% 98%');
    document.body.style.backgroundColor = '#111118';
    document.body.style.color = '#ffffff';
    return () => {
      if (prevTheme) html.setAttribute('data-theme', prevTheme);
      if (!hadDark) html.classList.remove('dark');
      const stored = localStorage.getItem('harchive-theme');
      if (stored && window.__applyHarchiveTheme) window.__applyHarchiveTheme(stored);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const userData = await loginWithEmail(email, password);
      if (userData?.blocked) {
        navigate(createPageUrl("CompteBloque"), { replace: true });
      } else {
        navigate(createPageUrl("Journal"));
      }
    } catch (err) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--ha-surface)'}}>
      {/* Header - identique au Home */}
      <header style={{backgroundColor: 'var(--ha-surface)', borderBottom: '1px solid #404040'}} className="shadow-sm sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl("Home")} className="flex items-center gap-3">
                <img src="/assets/icons/6153a57fe_logoHARCHIVEF2.png" alt="Harchive Logo" className="h-10 w-auto object-contain" />
              </Link>
            </div>
            <Link to={createPageUrl("Home")}>
              <Button
                variant="outline"
                style={{borderColor: 'var(--ha-border)', color: 'white', backgroundColor: 'var(--ha-surface2)'}}
                className="hover:opacity-80"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Accueil
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero + Formulaire */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full text-center mb-10">
          <img src="/assets/icons/6153a57fe_logoHARCHIVEF2.png" alt="Harchive Logo" className="h-48 w-auto object-contain mx-auto mb-4" />
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Connectez-vous pour accéder à votre espace sur la plateforme Harchive
          </p>
        </div>

        {/* Formulaire de connexion */}
        <div className="max-w-md mx-auto mb-12">
          <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}} className="shadow-md">
            <CardContent className="pt-8 pb-8 px-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{backgroundColor: '#555555'}}>
                <LogIn className="w-7 h-7 text-white" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg text-sm" style={{backgroundColor: '#4a1c1c', border: '1px solid #7f2222'}}>
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-red-300">{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 text-white placeholder:text-gray-500"
                      style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 text-white placeholder:text-gray-500"
                      style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white font-semibold hover:opacity-90"
                  style={{backgroundColor: '#555555', height: '44px'}}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Se connecter
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Cartes d'inscription - style identique au Home */}
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-300 mb-6 text-lg">
            Pas encore de compte ? Inscrivez-vous
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}} className="shadow-md hover:shadow-lg transition-all">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-white" style={{backgroundColor: '#555555'}}>
                  <School className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Établissements</h3>
                <p className="text-sm text-gray-400 mb-4">Inscrivez votre établissement sur la plateforme</p>
                <Link to={createPageUrl("InscriptionEtablissement")}>
                  <Button className="w-full text-white hover:opacity-90 mt-2" style={{backgroundColor: '#555555'}}>
                    <Building2 className="w-4 h-4 mr-2" />
                    Inscription
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}} className="shadow-md hover:shadow-lg transition-all">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-white" style={{backgroundColor: '#555555'}}>
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Étudiants & Professeurs</h3>
                <p className="text-sm text-gray-400 mb-4">Accédez à votre espace académique</p>
                <Link to={createPageUrl("Inscription")}>
                  <Button className="w-full text-white hover:opacity-90 mt-2" style={{backgroundColor: '#555555'}}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Inscription
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card style={{backgroundColor: 'var(--ha-surface)', borderColor: 'var(--ha-border)'}} className="shadow-md hover:shadow-lg transition-all">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-white" style={{backgroundColor: '#555555'}}>
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Parents</h3>
                <p className="text-sm text-gray-400 mb-4">Suivez la scolarité de vos enfants avec assurance</p>
                <Link to={createPageUrl("InscriptionParent")}>
                  <Button className="w-full text-white hover:opacity-90 mt-2" style={{backgroundColor: '#555555'}}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Inscription
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer - identique au Home */}
      <footer style={{backgroundColor: 'var(--ha-surface)', borderTop: '1px solid #404040'}} className="py-6 mt-12">
        <div className="w-full px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Harchive — Plateforme de gestion académique de la RDC
          </p>
        </div>
      </footer>
    </div>
  );
}
