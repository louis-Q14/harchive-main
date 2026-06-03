import React, { useState, useEffect } from "react";
import { authService, dataService, functionService, apiClient } from "@/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Check, ChevronsUpDown, Paperclip, Lock, AlertCircle, GraduationCap, User, BookOpen, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import EmailVerification from "@/components/EmailVerification";

export default function Inscription() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [openEtab, setOpenEtab] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Styles communs ──────────────────────────────────────────────────────────
  const cardStyle = {
    background: "#3a3a3a",
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
    maxWidth: 700,
    margin: "0 auto",
    padding: "40px 48px",
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
    ...inputStyle,
    display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
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
  const secondaryBtn = {
    background: "#484848", color: "#e5e7eb", border: "1px solid #5a5a5a",
    borderRadius: 8, fontWeight: 500, padding: "10px 20px", fontSize: 14, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 6,
  };
  const nativeSelectStyle = { ...inputStyle, height: 42, appearance: "none" };
  // ────────────────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState({
    type_utilisateur: "etudiant",
    nom: "", post_nom: "", prenom: "",
    date_naissance: "", matricule: "", email: "",
    password: "", password_confirm: "",
    telephone: "", sexe: "", nationalite: "", etat_civil: "",
    nom_pere: "", nom_mere: "",
    province_origine: "", district: "", territoire: "", adresse_candidat: "",
    ecole_secondaire: "", adresse_ecole: "", centre_exetat: "",
    section_secondaire: "", annee_secondaire: "", pourcentage_obtenu: "",
    numero_diplome_secondaire: "", annee_obtention_diplome: "",
    numero_diplome: "", specialite: "",
    piece_jointe_diplome: "", piece_jointe_bulletin: "",
    piece_jointe_bulletin_2: "", piece_jointe_attestation_naissance: "",
    piece_jointe_bonne_vie: "", lieu_naissance: "",
    etablissement_nom: "", etablissement_id: "",
    faculte: "", faculte_id: "", departement: "", departement_id: "",
    orientation: "", orientation_id: "", option: "", option_id: "", classe: ""
  });

  const { data: etablissements = [], isLoading: loadingEtab } = useQuery({
    queryKey: ['etablissements-agrees'],
    queryFn: async () => {
      const res = await apiClient.get('/api/public/etablissements-agrees');
      return Array.isArray(res) ? res : (res?.data || res || []);
    },
    enabled: currentStep === 2
  });

  // Fetch full academic structure for the selected establishment (public, no auth)
  const { data: structure = {} } = useQuery({
    queryKey: ['etablissement-structure', formData.etablissement_id, formData.etablissement_nom],
    queryFn: async () => {
      const nom = encodeURIComponent(formData.etablissement_nom);
      const res = await apiClient.get(`/api/public/structure/${formData.etablissement_id}?nom=${nom}`);
      return res?.data || res || {};
    },
    enabled: !!formData.etablissement_id && currentStep === 2
  });

  const facultes = structure.facultes || [];
  const allDepartements = structure.departements || [];
  const allOrientations = structure.orientations || [];
  const allOptions = structure.options || [];
  const allPromotions = structure.promotions || [];

  // Filter sub-branches based on selected parent
  const departements = formData.faculte_id
    ? allDepartements.filter(d => d.faculte_id === formData.faculte_id)
    : allDepartements;
  const orientations = formData.departement_id
    ? allOrientations.filter(o => o.departement_id === formData.departement_id)
    : [];
  const options = formData.departement_id
    ? allOptions.filter(o =>
        o.departement_id === formData.departement_id &&
        (!formData.orientation_id || o.orientation_id === formData.orientation_id)
      )
    : [];
  const promotions = formData.departement_id
    ? allPromotions.filter(c =>
        c.departement_id === formData.departement_id &&
        (!formData.orientation_id || c.orientation_id === formData.orientation_id) &&
        (!formData.option_id || c.option_id === formData.option_id)
      )
    : [];

  const inscriptionMutation = useMutation({
    mutationFn: async (data) => {
      const { password_confirm, ...payload } = data;
      return await authService.registerUser(payload);
    },
    onSuccess: () => setSubmitted(true),
    onError: (error) => setErrorMsg(error.message || error.data?.message || "Erreur lors de l'inscription"),
  });

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const validateStep1 = () => {
    const required = [
      'type_utilisateur','nom','post_nom','prenom',
      'date_naissance','lieu_naissance','email','sexe','nationalite',
      'etat_civil','province_origine',
      'district','territoire','adresse_candidat'
    ];
    if (formData.type_utilisateur === "etudiant") {
      required.push('matricule','nom_pere','nom_mere',
        'ecole_secondaire','adresse_ecole','centre_exetat',
        'section_secondaire','annee_secondaire','pourcentage_obtenu','numero_diplome_secondaire');
    }
    return required.every(f => formData[f]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!emailVerified) {
      setErrorMsg("Veuillez vérifier votre email avant de soumettre le formulaire."); return;
    }
    if (!formData.password || formData.password.length < 6) {
      setErrorMsg("Le mot de passe doit contenir au moins 6 caractères"); return;
    }
    if (formData.password !== formData.password_confirm) {
      setErrorMsg("Les mots de passe ne correspondent pas"); return;
    }
    await inscriptionMutation.mutateAsync(formData);
  };

  // ── Écran de succès ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "#303030", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...cardStyle, textAlign: "center", maxWidth: 420 }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px auto" }}>
            <CheckCircle style={{ color: "#22c55e", width: 36, height: 36 }} />
          </div>
          <h2 style={{ fontWeight: 700, fontSize: 22, color: "#f3f4f6", marginBottom: 8 }}>Demande soumise avec succès !</h2>
          <p style={{ color: "#9ca3af", marginBottom: 24 }}>
            Votre demande d&rsquo;inscription a bien été envoyée. Un administrateur examinera votre demande. Une fois approuvée, vous pourrez vous connecter.
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
          <GraduationCap style={{ color: "#60a5fa", width: 26, height: 26 }} />
          <h1 style={{ fontWeight: 700, fontSize: 22, color: "#f3f4f6", margin: 0 }}>Demande d&rsquo;Inscription</h1>
        </div>
        <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 4, marginBottom: 24 }}>
          Remplissez le formulaire pour vous inscrire sur Archive
        </p>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          {[1, 2].map((step) => (
            <React.Fragment key={step}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 14,
                background: currentStep === step ? "#3b82f6" : currentStep > step ? "#22c55e" : "#484848",
                color: "#fff",
              }}>
                {currentStep > step ? <Check style={{ width: 16, height: 16 }} /> : step}
              </div>
              <span style={{ fontSize: 13, color: currentStep === step ? "#e5e7eb" : "#6b7280" }}>
                {step === 1 ? "Informations personnelles" : "Établissement"}
              </span>
              {step < 2 && <div style={{ flex: 1, height: 2, background: currentStep > 1 ? "#22c55e" : "#484848", borderRadius: 2 }} />}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          {errorMsg && (
            <div style={errorBox}><AlertCircle style={{ width: 18, height: 18 }} /> {errorMsg}</div>
          )}

          {/* ── Étape 1 : Informations personnelles ── */}
          {currentStep === 1 && (
            <>
              {/* Type + Nom */}
              <div style={{ marginBottom: 36 }}>
                <div style={sectionTitle}>
                  <User style={{ color: "#60a5fa", width: 20, height: 20 }} />
                  Informations Personnelles
                </div>

                {/* Type de compte */}
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Type de Compte <span style={{ color: "#dc2626" }}>*</span></div>
                  <select value={formData.type_utilisateur} onChange={(e) => handleChange("type_utilisateur", e.target.value)} style={nativeSelectStyle} required>
                    <option value="etudiant">Étudiant</option>
                    <option value="professeur">Professeur</option>
                  </select>
                </div>

                {/* Nom / Post-nom */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                  <div>
                    <div style={labelStyle}>Nom <span style={{ color: "#dc2626" }}>*</span></div>
                    <Input required value={formData.nom} onChange={(e) => handleChange("nom", e.target.value.toUpperCase())} style={inputStyle} placeholder="Votre nom" />
                  </div>
                  <div>
                    <div style={labelStyle}>Post-nom <span style={{ color: "#dc2626" }}>*</span></div>
                    <Input required value={formData.post_nom} onChange={(e) => handleChange("post_nom", e.target.value.toUpperCase())} style={inputStyle} placeholder="Votre post-nom" />
                  </div>
                </div>

                {/* Prénom */}
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Prénom <span style={{ color: "#dc2626" }}>*</span></div>
                  <Input required value={formData.prenom} onChange={(e) => handleChange("prenom", e.target.value.toUpperCase())} style={inputStyle} placeholder="Votre prénom" />
                </div>

                {/* Date naissance + Lieu */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                  <div>
                    <div style={labelStyle}>Date de Naissance <span style={{ color: "#dc2626" }}>*</span></div>
                    <Input required type="date" value={formData.date_naissance} onChange={(e) => handleChange("date_naissance", e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <div style={labelStyle}>Lieu de Naissance <span style={{ color: "#dc2626" }}>*</span></div>
                    <Input required value={formData.lieu_naissance} onChange={(e) => handleChange("lieu_naissance", e.target.value.toUpperCase())} style={inputStyle} placeholder="Ville ou région" />
                  </div>
                </div>

                {/* Sexe + Nationalité */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                  <div>
                    <div style={labelStyle}>Sexe <span style={{ color: "#dc2626" }}>*</span></div>
                    <select value={formData.sexe} onChange={(e) => handleChange("sexe", e.target.value)} style={nativeSelectStyle} required>
                      <option value="">Sélectionnez</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                  <div>
                    <div style={labelStyle}>Nationalité <span style={{ color: "#dc2626" }}>*</span></div>
                    <Input required value={formData.nationalite} onChange={(e) => handleChange("nationalite", e.target.value.toUpperCase())} style={inputStyle} placeholder="Ex: Congolaise" />
                  </div>
                </div>

                {/* État civil */}
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>État Civil <span style={{ color: "#dc2626" }}>*</span></div>
                  <select value={formData.etat_civil} onChange={(e) => handleChange("etat_civil", e.target.value)} style={nativeSelectStyle} required>
                    <option value="">Sélectionnez</option>
                    <option value="Célibataire">Célibataire</option>
                    <option value="Marié(e)">Marié(e)</option>
                    <option value="Divorcé(e)">Divorcé(e)</option>
                    <option value="Veuf(ve)">Veuf(ve)</option>
                  </select>
                </div>

                {/* Père + Mère (étudiants uniquement) */}
                {formData.type_utilisateur !== "professeur" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                  <div>
                    <div style={labelStyle}>Nom du Père <span style={{ color: "#dc2626" }}>*</span></div>
                    <Input required value={formData.nom_pere} onChange={(e) => handleChange("nom_pere", e.target.value.toUpperCase())} style={inputStyle} placeholder="Nom complet du père" />
                  </div>
                  <div>
                    <div style={labelStyle}>Nom de la Mère <span style={{ color: "#dc2626" }}>*</span></div>
                    <Input required value={formData.nom_mere} onChange={(e) => handleChange("nom_mere", e.target.value.toUpperCase())} style={inputStyle} placeholder="Nom complet de la mère" />
                  </div>
                </div>
                )}

                {/* Province + District + Territoire */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 16 }}>
                  <div>
                    <div style={labelStyle}>Province d&rsquo;Origine <span style={{ color: "#dc2626" }}>*</span></div>
                    <Input required value={formData.province_origine} onChange={(e) => handleChange("province_origine", e.target.value.toUpperCase())} style={inputStyle} placeholder="Ex: Kinshasa" />
                  </div>
                  <div>
                    <div style={labelStyle}>District <span style={{ color: "#dc2626" }}>*</span></div>
                    <Input required value={formData.district} onChange={(e) => handleChange("district", e.target.value.toUpperCase())} style={inputStyle} placeholder="District" />
                  </div>
                  <div>
                    <div style={labelStyle}>Territoire <span style={{ color: "#dc2626" }}>*</span></div>
                    <Input required value={formData.territoire} onChange={(e) => handleChange("territoire", e.target.value.toUpperCase())} style={inputStyle} placeholder="Territoire" />
                  </div>
                </div>

                {/* Adresse */}
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>{formData.type_utilisateur === "professeur" ? "Adresse" : "Adresse du Candidat"} <span style={{ color: "#dc2626" }}>*</span></div>
                  <Input required value={formData.adresse_candidat} onChange={(e) => handleChange("adresse_candidat", e.target.value.toUpperCase())} style={inputStyle} placeholder="Adresse complète" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: formData.type_utilisateur === "professeur" ? "1fr" : "1fr 1fr", gap: 20, marginBottom: 16 }}>
                  {formData.type_utilisateur !== "professeur" && (
                  <div>
                    <div style={labelStyle}>Matricule <span style={{ color: "#dc2626" }}>*</span></div>
                    <Input required value={formData.matricule} onChange={(e) => handleChange("matricule", e.target.value.toUpperCase())} style={inputStyle} placeholder="Ex: ETU2024001" />
                    <div style={helperText}>Matricule fourni par l&rsquo;établissement</div>
                  </div>
                  )}
                  <div>
                    <div style={labelStyle}>Téléphone</div>
                    <Input value={formData.telephone} onChange={(e) => handleChange("telephone", e.target.value)} style={inputStyle} placeholder="+243 XXX XXX XXX" />
                  </div>
                </div>

                {/* Email + Mot de passe */}
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Adresse Email <span style={{ color: "#dc2626" }}>*</span></div>
                  <Input required type="email" value={formData.email} onChange={(e) => { handleChange("email", e.target.value); setEmailVerified(false); }} style={inputStyle} placeholder="votre.email@exemple.com" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                  <div>
                    <div style={labelStyle}>Mot de passe <span style={{ color: "#dc2626" }}>*</span></div>
                    <div style={{ position: "relative" }}>
                      <Lock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9ca3af", pointerEvents: "none" }} />
                      <Input required type="password" minLength={6} value={formData.password} onChange={(e) => handleChange("password", e.target.value)} style={{ ...inputStyle, paddingLeft: 38 }} placeholder="Minimum 6 caractères" />
                    </div>
                  </div>
                  <div>
                    <div style={labelStyle}>Confirmer le mot de passe <span style={{ color: "#dc2626" }}>*</span></div>
                    <div style={{ position: "relative" }}>
                      <Lock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9ca3af", pointerEvents: "none" }} />
                      <Input required type="password" minLength={6} value={formData.password_confirm} onChange={(e) => handleChange("password_confirm", e.target.value)} style={{ ...inputStyle, paddingLeft: 38 }} placeholder="Répétez le mot de passe" />
                    </div>
                    {formData.password && formData.password_confirm && formData.password !== formData.password_confirm && (
                      <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>Les mots de passe ne correspondent pas</div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <EmailVerification
                    email={formData.email}
                    onVerified={() => setEmailVerified(true)}
                    disabled={!formData.email}
                  />
                </div>
              </div>

              {/* ── Études secondaires (étudiant) ── */}
              {formData.type_utilisateur === "etudiant" && (
                <div style={{ marginBottom: 36 }}>
                  <div style={{ ...sectionTitle, marginTop: 8 }}>
                    <BookOpen style={{ color: "#60a5fa", width: 20, height: 20 }} />
                    Études Secondaires
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                    <div>
                      <div style={labelStyle}>École <span style={{ color: "#dc2626" }}>*</span></div>
                      <Input required value={formData.ecole_secondaire} onChange={(e) => handleChange("ecole_secondaire", e.target.value.toUpperCase())} style={inputStyle} placeholder="Nom de l'école secondaire" />
                    </div>
                    <div>
                      <div style={labelStyle}>Adresse de l&rsquo;école <span style={{ color: "#dc2626" }}>*</span></div>
                      <Input required value={formData.adresse_ecole} onChange={(e) => handleChange("adresse_ecole", e.target.value.toUpperCase())} style={inputStyle} placeholder="Adresse de l'école" />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                    <div>
                      <div style={labelStyle}>Centre Exetat <span style={{ color: "#dc2626" }}>*</span></div>
                      <Input required value={formData.centre_exetat} onChange={(e) => handleChange("centre_exetat", e.target.value.toUpperCase())} style={inputStyle} placeholder="Centre Exetat" />
                    </div>
                    <div>
                      <div style={labelStyle}>Section <span style={{ color: "#dc2626" }}>*</span></div>
                      <Input required value={formData.section_secondaire} onChange={(e) => handleChange("section_secondaire", e.target.value.toUpperCase())} style={inputStyle} placeholder="Ex: Scientifique, Littéraire..." />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 16 }}>
                    <div>
                      <div style={labelStyle}>Année <span style={{ color: "#dc2626" }}>*</span></div>
                      <Input required type="number" value={formData.annee_secondaire} onChange={(e) => handleChange("annee_secondaire", e.target.value)} style={inputStyle} placeholder="Ex: 2024" />
                    </div>
                    <div>
                      <div style={labelStyle}>Pourcentage <span style={{ color: "#dc2626" }}>*</span></div>
                      <Input required value={formData.pourcentage_obtenu} onChange={(e) => handleChange("pourcentage_obtenu", e.target.value)} style={inputStyle} placeholder="Ex: 75%" />
                    </div>
                    <div>
                      <div style={labelStyle}>N° Diplôme <span style={{ color: "#dc2626" }}>*</span></div>
                      <Input required value={formData.numero_diplome_secondaire} onChange={(e) => handleChange("numero_diplome_secondaire", e.target.value.toUpperCase())} style={inputStyle} placeholder="Ex: DIP123456" />
                    </div>
                  </div>

                  {/* Pièces jointes */}
                  <div style={{ ...sectionTitle, fontSize: 15, marginTop: 8 }}>
                    <Paperclip style={{ color: "#60a5fa", width: 18, height: 18 }} />
                    Pièces jointes
                  </div>
                  {[
                    { field: "piece_jointe_diplome", label: "Diplôme" },
                    { field: "piece_jointe_bulletin", label: "Bulletins 5ème et 6ème (fichier 1)" },
                    { field: "piece_jointe_bulletin_2", label: "Bulletins 5ème et 6ème (fichier 2)" },
                    { field: "piece_jointe_attestation_naissance", label: "Attestation de Naissance" },
                    { field: "piece_jointe_bonne_vie", label: "Certificat de Bonne Vie et Mœurs" },
                  ].map(({ field, label }) => (
                    <div key={field} style={{ marginBottom: 12 }}>
                      <div style={labelStyle}>{label}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          style={{ ...inputStyle, padding: "8px 14px", cursor: "pointer" }}
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => handleChange(field, reader.result);
                            reader.readAsDataURL(file);
                          }}
                        />
                        {formData[field] && (
                          <span style={{ color: "#22c55e", fontSize: 13, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                            <CheckCircle style={{ width: 14, height: 14 }} /> Uploadé
                          </span>
                        )}
                      </div>
                      <div style={helperText}>Formats acceptés : PDF, JPG, PNG</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Spécialité (professeur) */}
              {formData.type_utilisateur === "professeur" && (
                <div style={{ marginBottom: 36 }}>
                  <div style={labelStyle}>Spécialité</div>
                  <Input value={formData.specialite} onChange={(e) => handleChange("specialite", e.target.value.toUpperCase())} style={inputStyle} placeholder="Ex: Mathématiques, Physique, Informatique..." />
                </div>
              )}

              {/* Bouton suivant */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => { if (validateStep1()) setCurrentStep(2); }}
                  disabled={!validateStep1()}
                  style={{ ...submitBtn, width: "auto", padding: "12px 28px", display: "inline-flex", alignItems: "center", gap: 8, opacity: validateStep1() ? 1 : 0.5 }}
                >
                  Suivant <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </>
          )}

          {/* ── Étape 2 : Établissement ── */}
          {currentStep === 2 && (
            <>
              <div style={{ marginBottom: 36 }}>
                <div style={sectionTitle}>
                  <GraduationCap style={{ color: "#60a5fa", width: 20, height: 20 }} />
                  Informations de l&rsquo;Établissement
                </div>

                {/* Sélection établissement */}
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Établissement <span style={{ color: "#dc2626" }}>*</span></div>
                  <Popover open={openEtab} onOpenChange={setOpenEtab}>
                    <PopoverTrigger asChild>
                      <button type="button" style={selectBtnStyle} aria-expanded={openEtab}>
                        <span style={{ color: formData.etablissement_nom ? "#f3f4f6" : "#6b7280" }}>
                          {formData.etablissement_nom || "Sélectionnez votre établissement..."}
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
                                  onSelect={() => {
                                    handleChange("etablissement_nom", etab.denomination);
                                    handleChange("etablissement_id", etab.id);
                                    handleChange("faculte", ""); handleChange("faculte_id", "");
                                    handleChange("departement", ""); handleChange("departement_id", "");
                                    handleChange("orientation", ""); handleChange("orientation_id", "");
                                    handleChange("option", ""); handleChange("option_id", "");
                                    handleChange("classe", "");
                                    setOpenEtab(false);
                                  }}
                                  style={{ display: "flex", alignItems: "flex-start", padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #5a5a5a", transition: "background 0.15s" }}
                                >
                                  <Check style={{ marginRight: 12, marginTop: 2, opacity: formData.etablissement_nom === etab.denomination ? 1 : 0, width: 16, height: 16, color: "#3b82f6", flexShrink: 0 }} />
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

                {/* Faculté */}
                {formData.etablissement_nom && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div style={labelStyle}>Faculté {formData.type_utilisateur === "etudiant" && <span style={{ color: "#dc2626" }}>*</span>}</div>
                      <select
                        value={formData.faculte_id}
                        onChange={(e) => {
                          const fac = facultes.find(f => f.id === e.target.value);
                          handleChange("faculte_id", e.target.value);
                          handleChange("faculte", fac?.nom || "");
                          handleChange("departement", ""); handleChange("departement_id", "");
                          handleChange("orientation", ""); handleChange("orientation_id", "");
                          handleChange("option", ""); handleChange("option_id", "");
                          handleChange("classe", "");
                        }}
                        style={nativeSelectStyle}
                      >
                        <option value="">Sélectionnez une faculté</option>
                        {facultes.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                      </select>
                    </div>

                    {formData.faculte_id && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={labelStyle}>Département {formData.type_utilisateur === "etudiant" && <span style={{ color: "#dc2626" }}>*</span>}</div>
                        <select
                          value={formData.departement_id}
                          onChange={(e) => {
                            const dept = departements.find(d => d.id === e.target.value);
                            handleChange("departement_id", e.target.value);
                            handleChange("departement", dept?.nom || "");
                            handleChange("orientation", ""); handleChange("orientation_id", "");
                            handleChange("option", ""); handleChange("option_id", "");
                            handleChange("classe", "");
                          }}
                          style={nativeSelectStyle}
                        >
                          <option value="">Sélectionnez un département</option>
                          {departements.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                        </select>
                      </div>
                    )}

                    {formData.departement_id && orientations.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={labelStyle}>Orientation</div>
                        <select
                          value={formData.orientation_id}
                          onChange={(e) => {
                            const o = orientations.find(x => x.id === e.target.value);
                            handleChange("orientation_id", e.target.value);
                            handleChange("orientation", o?.nom || "");
                            handleChange("option", ""); handleChange("option_id", "");
                            handleChange("classe", "");
                          }}
                          style={nativeSelectStyle}
                        >
                          <option value="">Aucune orientation (optionnel)</option>
                          {orientations.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
                        </select>
                      </div>
                    )}

                    {formData.departement_id && options.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={labelStyle}>Option</div>
                        <select
                          value={formData.option_id}
                          onChange={(e) => {
                            const o = options.find(x => x.id === e.target.value);
                            handleChange("option_id", e.target.value);
                            handleChange("option", o?.nom || "");
                            handleChange("classe", "");
                          }}
                          style={nativeSelectStyle}
                        >
                          <option value="">Aucune option (optionnel)</option>
                          {options.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
                        </select>
                      </div>
                    )}

                    {formData.departement_id && formData.type_utilisateur === "etudiant" && promotions.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={labelStyle}>Promotion <span style={{ color: "#dc2626" }}>*</span></div>
                        <select value={formData.classe} onChange={(e) => handleChange("classe", e.target.value)} style={nativeSelectStyle}>
                          <option value="">Sélectionnez votre promotion</option>
                          {promotions.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Note info */}
              <div style={infoBox}>
                <Info style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0 }} />
                <span>
                  <strong>Note importante :</strong> Après validation de votre demande par un administrateur, vous pourrez vous connecter avec l&rsquo;email et le mot de passe définis à l&rsquo;étape précédente.
                </span>
              </div>

              {/* Boutons */}
              <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
                <button type="button" onClick={() => setCurrentStep(1)} style={{ ...cancelBtn, flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <ArrowLeft style={{ width: 16, height: 16 }} /> Précédent
                </button>
                <button
                  type="submit"
                  disabled={
                    inscriptionMutation.isPending ||
                    !formData.etablissement_nom ||
                    (formData.type_utilisateur === "etudiant" && (!formData.faculte_id || !formData.departement_id))
                  }
                  style={{ ...submitBtn, flex: 1.4, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {inscriptionMutation.isPending
                    ? <><Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> Envoi...</>
                    : <> Soumettre la Demande <ArrowRight style={{ width: 16, height: 16 }} /></>}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
