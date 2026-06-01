import React, { useState, useRef, useEffect } from "react";
import { authService } from "@/api";
import { Loader2, Mail, CheckCircle, RefreshCw } from "lucide-react";

/**
 * Email Verification Component
 * Shows a 6-digit code input after sending a verification email
 * 
 * @param {{ email: string, onVerified: () => void, disabled: boolean, inputStyle?: object }} props
 */
export default function EmailVerification({ email, onVerified, disabled, inputStyle = {} }) {
  const [step, setStep] = useState("idle"); // idle | sending | code | verified
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [verifying, setVerifying] = useState(false);
  /** @type {React.MutableRefObject<(HTMLInputElement|null)[]>} */
  const inputs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Reset when email changes
  useEffect(() => {
    setStep("idle");
    setCode(["", "", "", "", "", ""]);
    setError("");
  }, [email]);

  const handleSendCode = async () => {
    if (!email || disabled) return;
    setError("");
    setStep("sending");
    try {
      await authService.sendVerificationCode(email);
      setStep("code");
      setCooldown(60);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch (/** @type {any} */ err) {
      setError(err?.response?.data?.message || err.message || "Erreur lors de l'envoi");
      setStep("idle");
    }
  };

  /** @param {number} index @param {string} value */
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    
    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newCode[i] = digits[i] || "";
      }
      setCode(newCode);
      const nextEmpty = newCode.findIndex(d => d === "");
      if (nextEmpty >= 0) inputs.current[nextEmpty]?.focus();
      else inputs.current[5]?.focus();
      
      // Auto-verify if all 6 digits
      if (newCode.every(d => d !== "")) {
        verifyCode(newCode.join(""));
      }
      return;
    }

    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (newCode.every(d => d !== "")) {
      verifyCode(newCode.join(""));
    }
  };

  /** @param {number} index @param {any} e */
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  /** @param {string} fullCode */
  const verifyCode = async (fullCode) => {
    setError("");
    setVerifying(true);
    try {
      await authService.verifyEmailCode(email, fullCode);
      setStep("verified");
      onVerified?.();
    } catch (/** @type {any} */ err) {
      setError(err?.response?.data?.message || err.message || "Code incorrect");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const baseInput = {
    background: "#484848",
    border: "1px solid #5a5a5a",
    borderRadius: 8,
    color: "#f3f4f6",
    fontSize: 24,
    fontWeight: 700,
    /** @type {"center"} */
    textAlign: /** @type {const} */ ("center"),
    width: 48,
    height: 54,
    ...inputStyle,
  };

  if (step === "verified") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
        borderRadius: 10, padding: "10px 16px", color: "#4ade80",
      }}>
        <CheckCircle size={18} />
        <span style={{ fontSize: 14, fontWeight: 500 }}>Email vérifié</span>
      </div>
    );
  }

  if (step === "code" || step === "sending") {
    return (
      <div>
        <div style={{
          background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)",
          borderRadius: 10, padding: "14px 16px", marginBottom: 12,
          display: "flex", alignItems: "center", gap: 8, color: "#93c5fd", fontSize: 13,
        }}>
          <Mail size={16} />
          <span>Un code à 6 chiffres a été envoyé à <strong>{email}</strong></span>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={e => handleCodeChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              disabled={verifying}
              style={{
                ...baseInput,
                borderColor: verifying ? "#3b82f6" : "#5a5a5a",
              }}
            />
          ))}
        </div>

        {verifying && (
          <div style={{ textAlign: "center", color: "#93c5fd", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Loader2 size={14} className="animate-spin" /> Vérification...
          </div>
        )}

        {error && (
          <p style={{ color: "#fca5a5", fontSize: 13, textAlign: "center", marginTop: 4 }}>{error}</p>
        )}

        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button
            type="button"
            onClick={handleSendCode}
            disabled={cooldown > 0}
            style={{
              background: "none", border: "none", color: cooldown > 0 ? "#6b7280" : "#3b82f6",
              fontSize: 13, cursor: cooldown > 0 ? "default" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}
          >
            <RefreshCw size={12} />
            {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : "Renvoyer le code"}
          </button>
        </div>
      </div>
    );
  }

  // idle
  return (
    <div>
      <button
        type="button"
        onClick={handleSendCode}
        disabled={!email || disabled}
        style={{
          background: !email || disabled ? "#4a4a4a" : "#3b82f6",
          color: !email || disabled ? "#6b7280" : "#fff",
          border: "none", borderRadius: 8, fontWeight: 500,
          padding: "10px 20px", fontSize: 14, cursor: !email || disabled ? "default" : "pointer",
          display: "inline-flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center",
        }}
      >
        <Mail size={16} />
        Vérifier cet email
      </button>
      {error && (
        <p style={{ color: "#fca5a5", fontSize: 13, marginTop: 6 }}>{error}</p>
      )}
    </div>
  );
}
