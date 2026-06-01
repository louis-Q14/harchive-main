import { dataService } from "@/api/dataService";
import { createPageUrl } from "@/utils";

export const useNotifications = () => {
  const createNotification = async (notificationData) => {
    try {
      // Serialize metadata to JSON string for storage
      const data = { ...notificationData };
      if (data.metadata && typeof data.metadata === 'object') {
        data.metadata = JSON.stringify(data.metadata);
      }
      await dataService.create('Notification', data);
    } catch (error) {
      console.error("Erreur création notification:", error);
    }
  };

  const notifyFriendRequest = async (destinataireId, emetteurId, emetteurNom) => {
    await createNotification({
      destinataire_id: destinataireId,
      emetteur_id: emetteurId,
      type: "demande_ami",
      titre: "Nouvelle demande d'ami",
      contenu: `${emetteurNom} vous a envoyé une demande d'ami`,
      lien: createPageUrl("Amis"),
    });
  };

  const notifyFriendAccepted = async (destinataireId, emetteurId, emetteurNom) => {
    await createNotification({
      destinataire_id: destinataireId,
      emetteur_id: emetteurId,
      type: "ami_accepte",
      titre: "Demande d'ami acceptée",
      contenu: `${emetteurNom} a accepté votre demande d'ami`,
      lien: createPageUrl("Amis"),
    });
  };

  const notifyNewMessage = async (destinataireId, emetteurId, emetteurNom, conversationId) => {
    await createNotification({
      destinataire_id: destinataireId,
      emetteur_id: emetteurId,
      type: "message",
      titre: "Nouveau message",
      contenu: `${emetteurNom} vous a envoyé un message`,
      lien: createPageUrl("Messagerie"),
      metadata: { conversationId },
    });
  };

  const notifyNewPublication = async (destinataireIds, emetteurId, emetteurNom, publicationId) => {
    await Promise.all(
      destinataireIds.map(destId => createNotification({
        destinataire_id: destId,
        emetteur_id: emetteurId,
        type: "publication",
        titre: "Nouvelle publication",
        contenu: `${emetteurNom} a publié quelque chose`,
        lien: createPageUrl("Journal"),
        metadata: { publicationId },
      }))
    );
  };

  const notifyNewComment = async (destinataireId, emetteurId, emetteurNom, publicationId) => {
    await createNotification({
      destinataire_id: destinataireId,
      emetteur_id: emetteurId,
      type: "commentaire",
      titre: "Nouveau commentaire",
      contenu: `${emetteurNom} a commenté votre publication`,
      lien: createPageUrl("Journal"),
      metadata: { publicationId },
    });
  };

  const notifySystem = async (destinataireId, titre, contenu, lien = null) => {
    await createNotification({
      destinataire_id: destinataireId,
      type: "systeme",
      titre,
      contenu,
      lien,
    });
  };

  return {
    notifyFriendRequest,
    notifyFriendAccepted,
    notifyNewMessage,
    notifyNewPublication,
    notifyNewComment,
    notifySystem,
  };
};