import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataService } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  UserPlus,
  MessageCircle,
  Users,
  Newspaper,
  AlertCircle,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function NotificationCenter({ userId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const prevUnreadCountRef = useRef(null);
  const audioRef = useRef(null);

  // Preload notification sound
  useEffect(() => {
    audioRef.current = new Audio('/notification-tone.mp3');
    audioRef.current.volume = 1.0;
    audioRef.current.load();
  }, []);

  // Charger les notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const result = await dataService.query('Notification', {
        filters: [{ field: 'destinataire_id', value: userId }],
        orderBy: '-created_date',
        limit: 50,
      });
      return Array.isArray(result) ? result : result?.data || [];
    },
    enabled: !!userId,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const unreadCount = notifications.filter(n => !n.lue).length;

  // Play sound when new unread notifications arrive
  useEffect(() => {
    if (prevUnreadCountRef.current !== null && unreadCount > prevUnreadCountRef.current) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Marquer comme lue
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await dataService.update('Notification', notificationId, { lue: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Marquer toutes comme lues
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.lue);
      await Promise.all(
        unread.map(n => dataService.update('Notification', n.id, { lue: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Supprimer une notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      await dataService.delete('Notification', notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getNotificationIcon = (type) => {
    const icons = {
      demande_ami: UserPlus,
      message: MessageCircle,
      ami_accepte: Users,
      publication: Newspaper,
      commentaire: MessageCircle,
      systeme: AlertCircle,
    };
    return icons[type] || Bell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      demande_ami: "text-blue-600",
      message: "text-green-600",
      ami_accepte: "text-purple-600",
      publication: "text-orange-600",
      commentaire: "text-pink-600",
      systeme: "text-red-600",
    };
    return colors[type] || "text-gray-600";
  };

  const handleNotificationClick = (notification) => {
    if (!notification.lue) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.lien) {
      navigate(notification.lien);
      setOpen(false);
    }
  };

  const panelRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        style={{color: '#ffffff'}}
        onClick={() => setOpen(o => !o)}
      >
        <img 
          src="/assets/icons/6074e3425_notification-bell.png" 
          alt="Notifications" 
          className="w-5 h-5"
        />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            style={{backgroundColor: '#ff4444', color: '#ffffff'}}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-80 rounded-xl shadow-2xl border z-50"
          style={{
            background: 'rgba(30, 30, 30, 0.65)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderColor: 'rgba(255,255,255,0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <span style={{ color: "#fff", fontSize: "0.875rem", fontWeight: 600 }}>
              Notifications
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-white/10"
                  style={{ color: '#b0b0b0' }}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tout marquer lu
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded transition-colors hover:bg-white/10"
                style={{ color: '#b0b0b0' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <ScrollArea className="max-h-80">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Bell className="w-10 h-10 mb-2 opacity-30 text-gray-500" />
                <p className="text-sm" style={{color: '#b0b0b0'}}>Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y" style={{borderColor: 'rgba(255,255,255,0.06)'}}>
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const iconColor = getNotificationColor(notification.type);

                  return (
                    <div
                      key={notification.id}
                      className="px-4 py-3 transition-colors cursor-pointer group"
                      style={{
                        backgroundColor: !notification.lue ? 'rgba(255,255,255,0.04)' : 'transparent'
                      }}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs mb-0.5" style={{color: '#ffffff'}}>
                            {notification.titre}
                          </p>
                          <p className="text-xs mb-1" style={{color: '#d0d0d0'}}>
                            {notification.contenu}
                          </p>
                          <p className="text-xs" style={{color: '#888'}}>
                            {formatDistanceToNow(new Date(notification.created_date), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex items-start gap-1">
                          {!notification.lue && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                              style={{color: '#60a5fa'}}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                            style={{color: '#f87171'}}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <button
                onClick={async () => {
                  await Promise.all(
                    notifications.map(n => dataService.delete('Notification', n.id))
                  );
                  queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-white/10"
                style={{ color: '#e0e0e0' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Effacer tout
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1 rounded text-xs transition-colors hover:bg-white/10"
                style={{ color: '#e0e0e0' }}
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}