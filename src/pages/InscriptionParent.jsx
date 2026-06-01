import React, { useState } from "react";
import { authService, dataService } from "@/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Users, ArrowLeft, CheckCircle, Loader2, UserCheck, Check, ChevronsUpDown, PlusCircle, Trash2, Lock, AlertCircle, Info } from "lucide-react";
import { Link } from "react-router-dom";
import EmailVerification from "@/components/EmailVerification";

const emptyEnfant = () => ({ nom_enfant: "", matricule_enfant: "", etablissement_nom: "", openEtab: false });

export default function InscriptionParent() {
  const [submitted, setSubmitted] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [formData, setFormData] = useState({
    nom: "", post_nom: "", prenom: "", email: "", telephone: "", adresse: "", password: "", password_confirm: "",
  });
  const [enfants, setEnfants] = useState([emptyEnfant()]);
  const [errorMsg, setErrorMsg] = useState("");

  // Charger la liste des établissements
  const { data: etablissements = [], isLoading: loadingEtab } = useQuery({
    queryKey: ['etablissements-agrees'],
    queryFn: () => dataService.queryPublicEtablissements(),
  });

  const inscriptionMutation = useMutation({
    mutationFn: (data) => authService.registerParent(data),
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  // Majuscules auto sauf email
  const handleChange = (field, value) => {
    const upper = field === 'email' ? value : value.toUpperCase();
    if (field === 'email') setEmailVerified(false);
    setFormData(prev => ({ ...prev, [field]: upper }));
  };

  const handleEnfantChange = (idx, field, value) => {
    const upper = value.toUpperCase();
    setEnfants(prev => prev.map((e, i) => i === idx ? { ...e, [field]: upper } : e));
  };

  const handleEnfantEtab = (idx, denomination) => {
    setEnfants(prev => prev.map((e, i) => i === idx ? { ...e, etablissement_nom: denomination, openEtab: false } : e));
  };

  const toggleEnfantEtab = (idx, val) => {
    setEnfants(prev => prev.map((e, i) => i === idx ? { ...e, openEtab: val } : e));
  };

  const addEnfant = () => setEnfants(prev => [...prev, emptyEnfant()]);
  const removeEnfant = (idx) => setEnfants(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (!emailVerified) {
      setErrorMsg("Veuillez vérifier votre email avant de soumettre le formulaire.");
      return;
    }
    if (formData.password.length < 6) {
      setErrorMsg("Le mot de passe doit contenir au moins 6 caracteres.");
      return;
    }
    if (formData.password !== formData.password_confirm) {
      setErrorMsg("Les mots de passe ne correspondent pas.");
      return;
    }
    
    const premier = enfants[0];
    const autresEnfants = enfants.slice(1).filter(en => en.nom_enfant || en.matricule_enfant);
    const data = {
      ...formData,
      nom_enfant: premier.nom_enfant,
      matricule_enfant: premier.matricule_enfant,
      etablissement_nom: premier.etablissement_nom,
      ...(autresEnfants.length > 0 ? { enfants_supplementaires: JSON.stringify(autresEnfants) } : {}),
    };
    delete data.password_confirm;
    await inscriptionMutation.mutateAsync(data);
  };

  // ── Styles communs ──────────────────────────────────────────────────────────
  const cardStyle = {
    background: "#3a3a3a", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
    maxWidth: 700, margin: "0 auto", padding: "40px 48px",
  };
  const sectionTitle = {
    display: "flex", alignItems: "center", gap: 10,
    fontWeight: 600, fontSize: 17, color: "#e5e7eb", marginBottom: 20,
  };
  const labelStyle = { fontWeight: 500, color: "#d1d5db", marginBottom: 4, fontSize: 14 };
  const inputStyle = {
    background: "#484848", border: "1px solid #5a5a5a", borderRadius: 8,
    color: "#f3f4f6", padding: "10px 14px", fontSize: 15, width: "100%",
  };
  const selectBtnStyle = {
    ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
  };
  const helperText = { color: "#6b7280", fontSize: 12, marginTop: 4 };
  const infoBox = {
    background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)",
    color: "#93c5fd", borderRadius: 10, padding: "14px 18px",
    display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, marginTop: 8,
  };
  const errorBox = {
    background: "rgba(220, 38, 38, 0.1)", border: "1px solid rgba(220, 38, 38, 0.3)",
    color: "#fca5a5", borderRadius: 10, padding: "12px 16px",
    display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 16,
  };
  const cancelBtn = {
    background: "#484848", color: "#e5e7eb", border: "1px solid #5a5a5a",
    borderRadius: 8, fontWeight: 500, width: "100%", padding: "12px 0", fontSize: 15, cursor: "pointer",
  };
  const submitBtn = {
    background: "#3b82f6", color: "#fff", border: "none",
    borderRadius: 8, fontWeight: 600, width: "100%", padding: "12px 0", fontSize: 15, cursor: "pointer",
  };
  const dangerBtn = {
    background: "transparent", color: "#f87171", border: "none",
    borderRadius: 6, fontWeight: 500, padding: "4px 10px", fontSize: 13, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 4,
  };
  // ────────────────────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "#303030", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...cardStyle, textAlign: "center", maxWidth: 420 }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px auto" }}>
            <CheckCircle style={{ color: "#22c55e", width: 36, height: 36 }} />
          </div>
          <h2 style={{ fontWeight: 700, fontSize: 22, color: "#f3f4f6", marginBottom: 8 }}>Demande soumise avec succès !</h2>
          <p style={{ color: "#9ca3af", marginBottom: 24 }}>
            Votre demande d&rsquo;inscription parent a bien été envoyée. Un administrateur examinera votre demande. Une fois approuvée, vous pourrez vous connecter.
          </p>
          <Link to={createPageUrl("Connexion")} style={{ textDecoration: "none" }}>
            <button type="button" style={{ ...submitBtn, marginBottom: 10 }}>Aller à la page de connexion</button>
          </Link>
          <Link to={createPageUrl("Home")} style={{ textDecoration: "none" }}>
            <button type="button" style={cancelBtn}>Retour à l&rsquo;accueil</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#303030", padding: "0 16px" }}>
      {/* Retour */}
      <div style={{ maxWidth: 700, margin: "0 auto", paddingTop: 24, paddingBottom: 12 }}>
        <Link to={createPageUrl("Home")} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#d1d5db", textDecoration: "none", fontSize: 15, fontWeight: 500 }}>
          <ArrowLeft style={{ width: 18, height: 18 }} /> Retour
        </Link>
      </div>

      <div style={cardStyle}>
        {/* Titre */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <UserCheck style={{ color: "#60a5fa", width: 26, height: 26 }} />
          <h1 style={{ fontWeight: 700, fontSize: 22, color: "#f3f4f6", margin: 0 }}>Demande d&rsquo;Inscription Parent</h1>
        </div>
        <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 4, marginBottom: 32 }}>
          Inscrivez-vous pour suivre la scolarité de vos enfants sur Archive
        </p>

        <form onSubmit={handleSubmit} autoComplete="off">
          {errorMsg && (
            <div style={errorBox}><AlertCircle style={{ width: 18, height: 18 }} /> {errorMsg}</div>
          )}

          {/* ── Section 1 : Informations du parent ── */}
          <div style={{ marginBottom: 36 }}>
            <div style={sectionTitle}>
              <UserCheck style={{ color: "#60a5fa", width: 20, height: 20 }} />
              Vos Informations
            </div>

            {/* Nom + Post-nom */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
              <div>
                <div style={labelStyle}>Nom <span style={{ color: "#dc2626" }}>*</span></div>
                <Input required value={formData.nom} onChange={(e) => handleChange("nom", e.target.value)} style={inputStyle} placeholder="VOTRE NOM" />
              </div>
              <div>
                <div style={labelStyle}>Post-nom <span style={{ color: "#dc2626" }}>*</span></div>
                <Input required value={formData.post_nom} onChange={(e) => handleChange("post_nom", e.target.value)} style={inputStyle} placeholder="VOTRE POST-NOM" />
              </div>
            </div>

            {/* Prénom */}
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Prénom <span style={{ color: "#dc2626" }}>*</span></div>
              <Input required value={formData.prenom} onChange={(e) => handleChange("prenom", e.target.value)} style={inputStyle} placeholder="VOTRE PRÉNOM" />
            </div>

            {/* Email + Téléphone */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
              <div>
                <div style={labelStyle}>Adresse Email <span style={{ color: "#dc2626" }}>*</span></div>
                <Input required type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} style={inputStyle} placeholder="votre.email@exemple.com" />
              </div>
              <div>
                <div style={labelStyle}>Téléphone <span style={{ color: "#dc2626" }}>*</span></div>
                <Input required type="tel" value={formData.telephone} onChange={(e) => handleChange("telephone", e.target.value)} style={inputStyle} placeholder="+243 XXX XXX XXX" />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <EmailVerification
                email={formData.email}
                onVerified={() => setEmailVerified(true)}
                disabled={!formData.email}
              />
            </div>

            {/* Adresse */}
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Adresse</div>
              <Input value={formData.adresse} onChange={(e) => handleChange("adresse", e.target.value)} style={inputStyle} placeholder="VOTRE ADRESSE COMPLÈTE" />
            </div>

            {/* Mot de passe */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={labelStyle}>Mot de passe <span style={{ color: "#dc2626" }}>*</span></div>
                <div style={{ position: "relative" }}>
                  <Lock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9ca3af", pointerEvents: "none" }} />
                  <Input required type="password" minLength={6} value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} style={{ ...inputStyle, paddingLeft: 38 }} placeholder="Minimum 6 caractères" />
                </div>
              </div>
              <div>
                <div style={labelStyle}>Confirmer le mot de passe <span style={{ color: "#dc2626" }}>*</span></div>
                <div style={{ position: "relative" }}>
                  <Lock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9ca3af", pointerEvents: "none" }} />
                  <Input required type="password" minLength={6} value={formData.password_confirm} onChange={(e) => setFormData(p => ({ ...p, password_confirm: e.target.value }))} style={{ ...inputStyle, paddingLeft: 38 }} placeholder="Répétez le mot de passe" />
                </div>
                {formData.password && formData.password_confirm && formData.password !== formData.password_confirm && (
                  <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>Les mots de passe ne correspondent pas</div>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 2 : Enfants ── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={sectionTitle}>
                <Users style={{ color: "#60a5fa", width: 20, height: 20 }} />
                Informations sur vos Enfants
              </div>
              <button
                type="button"
                onClick={addEnfant}
                style={{ background: "#484848", color: "#93c5fd", border: "1px solid #5a5a5a", borderRadius: 8, fontWeight: 500, padding: "8px 14px", fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <PlusCircle style={{ width: 15, height: 15 }} /> Ajouter un enfant
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {enfants.map((enfant, idx) => (
                <div key={idx} style={{ paddingTop: idx > 0 ? 20 : 0, borderTop: idx > 0 ? "1px dashed #5a5a5a" : "none" }}>
                  {idx > 0 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ color: "#9ca3af", fontSize: 13, fontWeight: 500 }}>Enfant {idx + 1} <span style={{ color: "#6b7280" }}>(optionnel)</span></span>
                      <button type="button" onClick={() => removeEnfant(idx)} style={dangerBtn}>
                        <Trash2 style={{ width: 14, height: 14 }} /> Supprimer
                      </button>
                    </div>
                  )}
                  {idx === 0 && (
                    <div style={{ color: "#d1d5db", fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                      Enfant principal <span style={{ color: "#dc2626" }}>*</span>
                    </div>
                  )}

                  {/* Nom de l'enfant */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={labelStyle}>Nom complet de l&rsquo;enfant {idx === 0 && <span style={{ color: "#dc2626" }}>*</span>}</div>
                    <Input
                      required={idx === 0}
                      value={enfant.nom_enfant}
                      onChange={(e) => handleEnfantChange(idx, "nom_enfant", e.target.value)}
                      style={inputStyle}
                      placeholder="PRÉNOM NOM DE L'ENFANT"
                    />
                  </div>

                  {/* Matricule */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={labelStyle}>Matricule de l&rsquo;enfant {idx === 0 && <span style={{ color: "#dc2626" }}>*</span>}</div>
                    <Input
                      required={idx === 0}
                      value={enfant.matricule_enfant}
                      onChange={(e) => handleEnfantChange(idx, "matricule_enfant", e.target.value)}
                      style={inputStyle}
                      placeholder="EX: ETU2024001"
                    />
                    <div style={helperText}>Le matricule fourni par l&rsquo;établissement scolaire</div>
                  </div>

                  {/* Établissement de l'enfant */}
                  <div>
                    <div style={labelStyle}>Établissement {idx === 0 && <span style={{ color: "#dc2626" }}>*</span>}</div>
                    <Popover open={enfant.openEtab} onOpenChange={(v) => toggleEnfantEtab(idx, v)}>
                      <PopoverTrigger asChild>
                        <button type="button" style={selectBtnStyle}>
                          <span style={{ color: enfant.etablissement_nom ? "#f3f4f6" : "#6b7280" }}>
                            {enfant.etablissement_nom || "Sélectionnez l'établissement..."}
                          </span>
                          <ChevronsUpDown style={{ width: 18, height: 18, color: "#9ca3af" }} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent data-combobox-popover style={{ width: "var(--radix-popover-trigger-width)", minWidth: 350, padding: "8px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", border: "1px solid #7d7d7d" }}>
                        <Command className="!rounded-none !bg-transparent">
                          <CommandInput placeholder="Rechercher un établissement..." style={{ background: "#5a5a5a", border: "1px solid #6b6b6b", borderRadius: "6px 6px 0 0", color: "#e5e7eb", padding: "10px 12px", margin: "8px", fontSize: 14 }} />
                          <CommandList style={{ maxHeight: 360, overflowY: "auto" }}>
                            <CommandEmpty style={{ padding: "20px", textAlign: "center", color: "#a0a0a0", fontSize: 14 }}>Aucun établissement trouvé.</CommandEmpty>
                            <CommandGroup>
                              {loadingEtab ? (
                                <div style={{ padding: 24, textAlign: "center" }}><Loader2 className="animate-spin" style={{ color: "#60a5fa" }} /></div>
                              ) : (
                                etablissements.map((etab) => (
                                  <CommandItem
                                    key={etab.id}
                                    value={`${etab.sigle} ${etab.denomination} ${etab.province}`}
                                    onSelect={() => handleEnfantEtab(idx, etab.denomination)}
                                    style={{ display: "flex", alignItems: "flex-start", padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #5a5a5a", transition: "background 0.15s" }}
                                  >
                                    <Check style={{ marginRight: 12, marginTop: 2, opacity: enfant.etablissement_nom === etab.denomination ? 1 : 0, width: 16, height: 16, color: "#3b82f6", flexShrink: 0 }} />
                                    <div style={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
                                      <span style={{ fontWeight: 700, fontSize: 14, color: "#e5e7eb" }}>{etab.sigle}</span>
                                      <span style={{ fontSize: 13, color: "#b0b0b0", lineHeight: 1.3 }}>{etab.denomination}</span>
                                      <span style={{ fontSize: 12, color: "#888", lineHeight: 1.2 }}>{etab.province || etab.territoire}</span>
                                    </div>
                                  </CommandItem>
                                ))
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div style={helperText}>Liste officielle des établissements agréés de la RDC</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Note info */}
          <div style={infoBox}>
            <Info style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0 }} />
            <span>
              <strong>Note importante :</strong> Après validation de votre demande par un administrateur, vous pourrez vous connecter avec l&rsquo;email et le mot de passe définis ci-dessus pour suivre la scolarité de vos enfants.
            </span>
          </div>

          {/* Boutons */}
          <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
            <Link to={createPageUrl("Home")} style={{ flex: 1, textDecoration: "none" }}>
              <button type="button" style={cancelBtn}>Annuler</button>
            </Link>
            <button type="submit" style={{ ...submitBtn, flex: 1.4 }} disabled={inscriptionMutation.isPending}>
              {inscriptionMutation.isPending
                ? <><Loader2 style={{ width: 18, height: 18, marginRight: 8 }} className="animate-spin" />Envoi...</>
                : "Soumettre la Demande"}
            </button>
          </div>
        </form>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
