import React, { useEffect, useRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

const roleLabels = {
  admin_systeme: "Administrateur Système",
  admin_etablissement: "Administrateur Établissement",
  professeur: "Professeur",
  etudiant: "Étudiant",
  parent: "Parent",
};

const sizeClasses = {
  sm: { width: 32, height: 32, fontSize: 11 },
  md: { width: 48, height: 48, fontSize: 13 },
  lg: { width: 64, height: 64, fontSize: 15 },
};

function GlassContent({ name, role, photoUrl }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    // Remonter jusqu'au vrai conteneur Radix (data-radix-popper-content-wrapper ou le content lui-même)
    let el = ref.current.parentElement;
    // Appliquer sur le content Radix directement
    const applyGlass = (node) => {
      if (!node) return;
      node.style.setProperty("background", "rgba(12, 12, 22, 0.22)", "important");
      node.style.setProperty("background-color", "rgba(12, 12, 22, 0.22)", "important");
      node.style.setProperty("backdrop-filter", "blur(10px) saturate(150%)", "important");
      node.style.setProperty("-webkit-backdrop-filter", "blur(10px) saturate(150%)", "important");
      node.style.setProperty("border", "1px solid rgba(255,255,255,0.12)", "important");
      node.style.setProperty("outline", "none", "important");
      node.style.setProperty("box-shadow", "0 8px 40px rgba(0,0,0,0.70)", "important");
      node.style.setProperty("border-radius", "50%", "important");
      node.style.setProperty("overflow", "hidden", "important");
      node.style.setProperty("color", "#ffffff", "important");
      node.style.setProperty("width", "210px", "important");
      node.style.setProperty("height", "210px", "important");
      node.style.setProperty("padding", "0", "important");
      node.style.setProperty("display", "flex", "important");
      node.style.setProperty("align-items", "center", "important");
      node.style.setProperty("justify-content", "center", "important");
    };
    applyGlass(el);
    // Appliquer aussi sur le wrapper Radix (data-radix-popper-content-wrapper)
    if (el?.parentElement) {
      el.parentElement.style.setProperty("border", "none", "important");
      el.parentElement.style.setProperty("outline", "none", "important");
    }
  }, []);

  const initiales = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const roleLabel = roleLabels[role] || role || "Utilisateur";

  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 210, height: 210, padding: 0 }}>
      <div style={{ width: 145, height: 145, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.35)", filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6))" }}>
        {photoUrl ? (
          <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: "bold", backgroundColor: "#1e3a5f", color: "#60a5fa" }}>
            {initiales}
          </div>
        )}
      </div>

    </div>
  );
}

export default function UserAvatarPopover({ name, role, photoUrl, size = "md", className = "", onClick }) {
  const dim = sizeClasses[size] || sizeClasses.md;
  const initiales = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <div
          style={{ width: dim.width, height: dim.height, borderRadius: "50%", overflow: "hidden", flexShrink: 0, cursor: "pointer" }}
          className={className}
          onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
        >
          {photoUrl ? (
            <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: dim.fontSize, backgroundColor: "#2d2d2d", color: "#b0b0b0" }}>
              {initiales}
            </div>
          )}
        </div>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          style={{
            background: "rgba(12, 12, 22, 0.22)",
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.70)",
            borderRadius: "50%",
            overflow: "hidden",
            color: "#ffffff",
            width: 210,
            height: 210,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <GlassContent name={name} role={role} photoUrl={photoUrl} />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}