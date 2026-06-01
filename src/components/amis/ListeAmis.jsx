import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserX, MessageCircle, User } from "lucide-react";
import { formatUserName, getInitials as getInitialsUtil } from "@/components/utils/nameUtils";

export default function ListeAmis({
  friends,
  onRemove,
  onMessage
}) {
  const navigate = useNavigate();

  const handleMessage = (friendId) => {
    if (onMessage) {
      onMessage(friendId);
    } else {
      navigate(createPageUrl("Messagerie"));
    }
  };
  return (
    <div className="space-y-3">
      {friends.map((friend) =>
      <Card key={friend.id} className="border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="bg-[#6e6e6e] pt-4 p-6 rounded">
            <div className="flex items-center gap-3">
              <Avatar className="w-14 h-14 bg-gray-600 cursor-pointer" onClick={() => {

              // TODO: Aller au profil
            }}>
                {friend.photo_url ? (
                  <img src={friend.photo_url} alt={formatUserName(friend)} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="text-white font-semibold">
                    {getInitialsUtil(formatUserName(friend))}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{formatUserName(friend)}</p>
                <p className="text-sm text-gray-600">{friend.email}</p>
                {friend.role_archive && <Badge className="mt-1 bg-gray-100 text-gray-700 text-xs">
                    {friend.role_archive === 'etudiant' && 'Étudiant'}
                    {friend.role_archive === 'professeur' && 'Professeur'}
                    {friend.role_archive === 'parent' && 'Parent'}
                  </Badge>
              }
              </div>
              <div className="flex gap-2">
                <Button
                size="sm"
                variant="outline"
                onClick={() => handleMessage(friend.id)}
                className="border-blue-300 text-blue-600 hover:bg-blue-50">

                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button
                size="sm"
                variant="outline"
                onClick={() => onRemove(friend.id)}
                className="border-red-300 text-red-600 hover:bg-red-50">

                  <UserX className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>);

}