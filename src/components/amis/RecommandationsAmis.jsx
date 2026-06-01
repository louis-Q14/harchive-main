import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, School, BookOpen, Users, Sparkles } from "lucide-react";
import { formatUserName, getInitials } from "@/components/utils/nameUtils";

export default function RecommandationsAmis({ 
  recommendations, 
  onSendRequest,
  currentUser 
}) {
  const getReasonBadge = (reason) => {
    const badges = {
      meme_etablissement: {
        icon: School,
        text: "Même établissement",
        className: "bg-blue-100 text-blue-800",
      },
      meme_classe: {
        icon: BookOpen,
        text: "Même classe",
        className: "bg-green-100 text-green-800",
      },
      amis_communs: {
        icon: Users,
        text: "Amis en commun",
        className: "bg-purple-100 text-purple-800",
      },
    };
    return badges[reason] || badges.meme_etablissement;
  };

  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    const key = rec.reason || 'autres';
    if (!acc[key]) acc[key] = [];
    acc[key].push(rec);
    return acc;
  }, {});

  const reasonOrder = ['meme_classe', 'meme_etablissement', 'amis_communs', 'autres'];
  const sortedGroups = reasonOrder.filter(key => groupedRecommendations[key]);

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Suggestions d'Amis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedGroups.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">Aucune suggestion pour le moment</p>
          </div>
        ) : (
          sortedGroups.map((reasonKey) => {
            const items = groupedRecommendations[reasonKey];
            const badgeInfo = getReasonBadge(reasonKey);
            const Icon = badgeInfo.icon;

            return (
              <div key={reasonKey}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" />
                  <h3 className="font-semibold text-gray-800">{badgeInfo.text}</h3>
                  <Badge className="ml-auto bg-gray-700 text-white">
                    {items.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {items.slice(0, 3).map((rec) => (
                    <Card key={rec.user.id} className="border-gray-200">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 bg-gray-600">
                            {rec.user.photo_url ? (
                              <img src={rec.user.photo_url} alt={formatUserName(rec.user)} className="w-full h-full object-cover" />
                            ) : (
                              <AvatarFallback className="text-white font-semibold">
                                {getInitials(formatUserName(rec.user))}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">
                              {formatUserName(rec.user)}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {rec.user.email}
                            </p>
                            {rec.metadata && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {rec.metadata.etablissement && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    {rec.metadata.etablissement}
                                  </Badge>
                                )}
                                {rec.metadata.classe && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    {rec.metadata.classe}
                                  </Badge>
                                )}
                                {rec.metadata.amis_communs > 0 && (
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    {rec.metadata.amis_communs} ami{rec.metadata.amis_communs > 1 ? 's' : ''} en commun
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => onSendRequest(rec.user.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Ajouter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {items.length > 3 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    +{items.length - 3} autre{items.length - 3 > 1 ? 's' : ''} suggestion{items.length - 3 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}