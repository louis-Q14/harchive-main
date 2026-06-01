/**
 * Formate le nom d'un utilisateur à partir de ses données
 * Gère les cas où full_name est un email ou invalide
 */
export const formatUserName = (user) => {
  if (!user) return 'Utilisateur';
  
  // Construire le nom à partir des parties
  const parts = [user?.prenom, user?.nom, user?.post_nom].filter(Boolean).join(' ').trim();
  if (parts) return parts;
  
  // Si pas de parties mais full_name existe
  if (!user?.full_name) return 'Utilisateur';
  
  // Vérifier si full_name est un email ou un slug
  if (user.full_name.includes('@') || (!user.full_name.includes(' ') && /[._-]/.test(user.full_name))) {
    return 'Utilisateur';
  }
  
  return user.full_name.trim() || 'Utilisateur';
};

/**
 * Obtient les initiales d'un nom
 */
export const getInitials = (name) => {
  if (!name || name === 'Utilisateur') return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || '?';
};