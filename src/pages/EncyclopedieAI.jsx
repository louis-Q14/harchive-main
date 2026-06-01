// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { authService } from "@/api";
import { apiClient } from "@/api/httpClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Send,
  Loader2,
  Search,
  Globe,
  Sparkles,
  RefreshCw,
  Copy,
  CheckCircle,
  Brain,
  GraduationCap,
  Scale,
  Stethoscope,
  Building2,
  Cpu,
  Palette,
  Calculator,
  Leaf,
  History,
  Star,
  StarOff,
  Trash2,
  Clock,
  X,
  MessageSquare,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const CG = { fontFamily: "'Century Gothic', 'AppleGothic', sans-serif" };

const DOMAINS = [
  { name: "Sciences", icon: Calculator, color: "from-blue-600 to-blue-800", emoji: "\u{1F52C}" },
  { name: "Architecture", icon: Building2, color: "from-amber-600 to-amber-800", emoji: "\u{1F3DB}\uFE0F" },
  { name: "M\u00E9decine", icon: Stethoscope, color: "from-red-600 to-red-800", emoji: "\u2695\uFE0F" },
  { name: "Droit", icon: Scale, color: "from-purple-600 to-purple-800", emoji: "\u2696\uFE0F" },
  { name: "Arts", icon: Palette, color: "from-pink-600 to-pink-800", emoji: "\u{1F3A8}" },
  { name: "Technologie", icon: Cpu, color: "from-green-600 to-green-800", emoji: "\u{1F4BB}" },
  { name: "\u00C9ducation", icon: GraduationCap, color: "from-orange-600 to-orange-800", emoji: "\u{1F4DA}" },
  { name: "\u00C9conomie", icon: Globe, color: "from-cyan-600 to-cyan-800", emoji: "\u{1F4CA}" },
  { name: "Histoire", icon: BookOpen, color: "from-yellow-700 to-yellow-900", emoji: "\u{1F4DC}" },
  { name: "Environnement", icon: Leaf, color: "from-emerald-600 to-emerald-800", emoji: "\u{1F30D}" },
];

const WELCOME_MESSAGE = [
  "## \u{1F4DA} Encyclop\u00E9die Universelle AI",
  "",
  "Bienvenue ! Je suis votre **Encyclop\u00E9die Universelle AI**, propuls\u00E9e par l'intelligence artificielle.",
  "",
  "Mon objectif est de vous fournir une synth\u00E8se **pr\u00E9cise**, **compl\u00E8te** et **contextualis\u00E9e** de tout sujet que vous souhaitez explorer.",
  "",
  "### \u{1F4A1} Comment m'utiliser ?",
  "",
  "- **Cliquez sur un domaine** ci-dessus pour d\u00E9marrer",
  "- **Posez une question** directement dans la zone de texte",
  "- **Sauvegardez vos favoris** avec l'\u00E9toile \u2B50",
  "- **Retrouvez votre historique** dans le panneau lat\u00E9ral",
  "",
  "### \u{1F3AF} Exemples de requ\u00EAtes :",
  "",
  '- *"Explique-moi la th\u00E9orie de la relativit\u00E9 d\'Einstein"*',
  '- *"Quelles sont les causes et traitements de la maladie de Parkinson ?"*',
  '- *"Les principes fondamentaux du Bauhaus en architecture"*',
  '- *"Le Deep Learning et ses applications concr\u00E8tes"*',
].join("\n");

const STORAGE_KEYS = { HISTORY: "eua_history", FAVORITES: "eua_favorites" };

function loadFromStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export default function EncyclopedieAI() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activeDomain, setActiveDomain] = useState(null);
  const [sidePanel, setSidePanel] = useState(null);
  const [history, setHistory] = useState(function () {
    return loadFromStorage(STORAGE_KEYS.HISTORY);
  });
  const [favorites, setFavorites] = useState(function () {
    return loadFromStorage(STORAGE_KEYS.FAVORITES);
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(function () {
    loadUser();
  }, []);

  useEffect(
    function () {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
    [messages]
  );

  useEffect(
    function () {
      saveToStorage(STORAGE_KEYS.HISTORY, history);
    },
    [history]
  );

  useEffect(
    function () {
      saveToStorage(STORAGE_KEYS.FAVORITES, favorites);
    },
    [favorites]
  );

  async function loadUser() {
    try {
      setUser(await authService.getCurrentUser());
    } catch (e) {
      console.error("Erreur:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadSuggestions(domain) {
    setLoadingSuggestions(true);
    try {
      var res = await apiClient.post("/api/ai/suggestions", { domain: domain });
      setSuggestions((res && res.data) || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function handleDomainClick(domain) {
    setActiveDomain(domain.name);
    loadSuggestions(domain.name);
  }

  async function handleSubmit(overrideInput) {
    var text = (overrideInput || input).trim();
    if (!text || isGenerating) return;

    setInput("");
    var userMsg = { role: "user", content: text };

    if (messages.length === 1 && messages[0].content === WELCOME_MESSAGE) {
      setMessages([userMsg]);
    } else {
      setMessages(function (prev) {
        return prev.concat([userMsg]);
      });
    }
    setIsGenerating(true);
    setSuggestions([]);

    try {
      var base =
        messages[0] && messages[0].content === WELCOME_MESSAGE
          ? []
          : messages;
      var conversationMsgs = base
        .concat([userMsg])
        .filter(function (m) {
          return m.content !== WELCOME_MESSAGE;
        })
        .map(function (m) {
          return { role: m.role, content: m.content };
        });

      var res = await apiClient.post("/api/ai/chat", {
        messages: conversationMsgs,
        domain: activeDomain,
      });

      var aiContent =
        (res && res.data && res.data.content) ||
        "\u274C R\u00E9ponse vide de l'AI.";
      setMessages(function (prev) {
        return prev.concat([{ role: "assistant", content: aiContent }]);
      });

      var entry = {
        id: Date.now().toString(),
        question: text,
        answer: aiContent,
        domain: activeDomain,
        timestamp: new Date().toISOString(),
      };
      setHistory(function (prev) {
        return [entry].concat(prev).slice(0, 50);
      });
    } catch (error) {
      console.error("Erreur AI:", error);
      var errMsg =
        (error &&
          error.response &&
          error.response.data &&
          error.response.data.message) ||
        "Erreur lors de la g\u00E9n\u00E9ration";
      toast.error(errMsg);
      setMessages(function (prev) {
        return prev.concat([
          {
            role: "assistant",
            content: "\u274C " + errMsg + ". Veuillez r\u00E9essayer.",
          },
        ]);
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopy(content, index) {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(function () {
      setCopiedIndex(null);
    }, 2000);
    toast.success("Copi\u00E9 !");
  }

  function handleNewConversation() {
    setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
    setActiveDomain(null);
    setSuggestions([]);
  }

  function toggleFavorite(entry) {
    var exists = favorites.find(function (f) {
      return f.id === entry.id;
    });
    if (exists) {
      setFavorites(function (prev) {
        return prev.filter(function (f) {
          return f.id !== entry.id;
        });
      });
      toast("Retir\u00E9 des favoris");
    } else {
      setFavorites(function (prev) {
        return [entry].concat(prev);
      });
      toast.success("Ajout\u00E9 aux favoris \u2B50");
    }
  }

  function isFavorite(id) {
    return favorites.some(function (f) {
      return f.id === id;
    });
  }

  function loadHistoryEntry(entry) {
    setMessages([
      { role: "user", content: entry.question },
      { role: "assistant", content: entry.answer },
    ]);
    setActiveDomain(entry.domain);
    setSidePanel(null);
  }

  function deleteHistoryEntry(id) {
    setHistory(function (prev) {
      return prev.filter(function (h) {
        return h.id !== id;
      });
    });
    setFavorites(function (prev) {
      return prev.filter(function (f) {
        return f.id !== id;
      });
    });
  }

  function clearHistory() {
    setHistory([]);
    toast("Historique effac\u00E9");
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#4d4d4d" }}
      >
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  var sidePanelItems =
    sidePanel === "history" ? history : sidePanel === "favorites" ? favorites : [];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#4d4d4d" }}
    >
      {/* Header */}
      <div
        className="p-4 border-b"
        style={{ backgroundColor: "#2d2d2d", borderColor: "#3d3d3d" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
              <img
                src="/assets/icons/cc402b8da_ai-innovation.png"
                alt="AI"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h1
                className="text-xl font-bold text-white flex items-center gap-2"
                style={CG}
              >
                Encyclop&eacute;die Universelle AI
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </h1>
              <p className="text-gray-400 text-xs" style={CG}>
                De la particule &agrave; la m&eacute;tropole, du sympt&ocirc;me au verdict
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={function () {
                setSidePanel(sidePanel === "favorites" ? null : "favorites");
              }}
              className={
                sidePanel === "favorites"
                  ? "bg-yellow-600/20 border-yellow-500 text-yellow-400"
                  : "bg-[#3d3d3d] border-[#4d4d4d] text-gray-300"
              }
            >
              <Star className="w-4 h-4 mr-1" /> Favoris
              {favorites.length > 0 && (
                <Badge className="ml-1 bg-yellow-600 text-white text-xs px-1">
                  {favorites.length}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={function () {
                setSidePanel(sidePanel === "history" ? null : "history");
              }}
              className={
                sidePanel === "history"
                  ? "bg-blue-600/20 border-blue-500 text-blue-400"
                  : "bg-[#3d3d3d] border-[#4d4d4d] text-gray-300"
              }
            >
              <History className="w-4 h-4 mr-1" /> Historique
              {history.length > 0 && (
                <Badge className="ml-1 bg-blue-600 text-white text-xs px-1">
                  {history.length}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
              className="bg-[#3d3d3d] border-[#4d4d4d] text-gray-300"
            >
              <RefreshCw className="w-4 h-4 mr-1" /> Nouveau
            </Button>
          </div>
        </div>
      </div>

      {/* Domains bar */}
      <div
        className="p-3 border-b"
        style={{ backgroundColor: "#353535", borderColor: "#2d2d2d" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {DOMAINS.map(function (domain) {
              return (
                <button
                  key={domain.name}
                  onClick={function () {
                    handleDomainClick(domain);
                  }}
                  className={
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all " +
                    (activeDomain === domain.name
                      ? "bg-gradient-to-r " +
                        domain.color +
                        " text-white shadow-lg scale-105"
                      : "bg-[#4d4d4d] text-gray-300 hover:bg-[#555] hover:text-white")
                  }
                  style={CG}
                >
                  <span className="text-sm">{domain.emoji}</span>
                  {domain.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Side panel */}
        {sidePanel && (
          <div
            className="w-80 border-r flex-shrink-0 flex flex-col"
            style={{ backgroundColor: "#2d2d2d", borderColor: "#3d3d3d" }}
          >
            <div
              className="p-3 border-b flex items-center justify-between"
              style={{ borderColor: "#3d3d3d" }}
            >
              <h3
                className="text-white font-semibold text-sm flex items-center gap-2"
                style={CG}
              >
                {sidePanel === "history" ? (
                  <>
                    <Clock className="w-4 h-4 text-blue-400" /> Historique
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 text-yellow-400" /> Favoris
                  </>
                )}
              </h3>
              <div className="flex items-center gap-1">
                {sidePanel === "history" && history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="h-7 px-2 text-red-400 hover:text-red-300 text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Effacer
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={function () {
                    setSidePanel(null);
                  }}
                  className="h-7 w-7 p-0 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sidePanelItems.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm" style={CG}>
                    {sidePanel === "history"
                      ? "Aucun historique"
                      : "Aucun favori"}
                  </p>
                </div>
              ) : (
                sidePanelItems.map(function (entry) {
                  return (
                    <div
                      key={entry.id}
                      className="group rounded-lg p-2.5 cursor-pointer hover:bg-[#3d3d3d] transition-colors"
                      onClick={function () {
                        loadHistoryEntry(entry);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-white text-xs font-medium line-clamp-2 flex-1"
                          style={CG}
                        >
                          {entry.question}
                        </p>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={function (e) {
                              e.stopPropagation();
                              toggleFavorite(entry);
                            }}
                            className="p-1 rounded hover:bg-[#4d4d4d]"
                          >
                            {isFavorite(entry.id) ? (
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            ) : (
                              <StarOff className="w-3 h-3 text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={function (e) {
                              e.stopPropagation();
                              deleteHistoryEntry(entry.id);
                            }}
                            className="p-1 rounded hover:bg-[#4d4d4d]"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {entry.domain && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-[#4d4d4d] text-gray-300">
                            {entry.domain}
                          </Badge>
                        )}
                        <span className="text-gray-500 text-[10px]">
                          {new Date(entry.timestamp).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Suggestions */}
            {suggestions.length > 0 &&
              !isGenerating &&
              messages.length <= 1 && (
                <div className="mb-4">
                  <p
                    className="text-gray-400 text-xs mb-2 uppercase tracking-wide"
                    style={CG}
                  >
                    Questions sugg&eacute;r&eacute;es &mdash; {activeDomain}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {suggestions.map(function (s, i) {
                      return (
                        <button
                          key={i}
                          onClick={function () {
                            handleSubmit(s);
                          }}
                          className="text-left p-3 rounded-lg border text-sm text-gray-200 hover:bg-[#3d3d3d] hover:border-blue-500 transition-all"
                          style={{
                            backgroundColor: "#353535",
                            borderColor: "#4d4d4d",
                            fontFamily:
                              "'Century Gothic', 'AppleGothic', sans-serif",
                          }}
                        >
                          <Search className="w-3 h-3 inline mr-2 text-blue-400" />
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            {loadingSuggestions && (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-gray-400 text-sm" style={CG}>
                  Chargement des suggestions...
                </span>
              </div>
            )}

            {/* Messages */}
            {messages.map(function (message, index) {
              return (
                <div
                  key={index}
                  className={
                    "flex " +
                    (message.role === "user" ? "justify-end" : "justify-start")
                  }
                >
                  <div
                    className={
                      "max-w-[90%] rounded-2xl p-4 " +
                      (message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "")
                    }
                    style={
                      message.role === "assistant"
                        ? { backgroundColor: "#3d3d3d" }
                        : {}
                    }
                  >
                    {message.role === "assistant" && (
                      <div
                        className="flex items-center gap-2 mb-3 pb-2 border-b"
                        style={{ borderColor: "#4d4d4d" }}
                      >
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span
                          className="text-purple-400 font-semibold text-xs"
                          style={CG}
                        >
                          Encyclop&eacute;die Universelle
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          {message.content !== WELCOME_MESSAGE &&
                            index > 0 &&
                            messages[index - 1] &&
                            messages[index - 1].role === "user" && (
                              <button
                                onClick={function () {
                                  var favEntry = {
                                    id: Date.now().toString(),
                                    question: messages[index - 1].content,
                                    answer: message.content,
                                    domain: activeDomain,
                                    timestamp: new Date().toISOString(),
                                  };
                                  toggleFavorite(favEntry);
                                }}
                                className="p-1 rounded hover:bg-[#4d4d4d]"
                              >
                                <Star className="w-3.5 h-3.5 text-yellow-400" />
                              </button>
                            )}
                          <button
                            onClick={function () {
                              handleCopy(message.content, index);
                            }}
                            className="p-1 rounded hover:bg-[#4d4d4d]"
                          >
                            {copiedIndex === index ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    <div
                      className={
                        message.role === "user"
                          ? ""
                          : "prose prose-invert prose-sm max-w-none"
                      }
                    >
                      {message.role === "user" ? (
                        <p style={CG}>{message.content}</p>
                      ) : (
                        <ReactMarkdown
                          components={{
                            h1: function (props) {
                              return (
                                <h1
                                  className="text-xl font-bold text-white mt-4 mb-2"
                                  style={CG}
                                >
                                  {props.children}
                                </h1>
                              );
                            },
                            h2: function (props) {
                              return (
                                <h2
                                  className="text-lg font-bold text-white mt-4 mb-2"
                                  style={CG}
                                >
                                  {props.children}
                                </h2>
                              );
                            },
                            h3: function (props) {
                              return (
                                <h3
                                  className="text-base font-semibold text-white mt-3 mb-2"
                                  style={CG}
                                >
                                  {props.children}
                                </h3>
                              );
                            },
                            p: function (props) {
                              return (
                                <p
                                  className="text-gray-200 mb-3 leading-relaxed"
                                  style={CG}
                                >
                                  {props.children}
                                </p>
                              );
                            },
                            ul: function (props) {
                              return (
                                <ul className="list-disc list-inside text-gray-200 mb-3 space-y-1">
                                  {props.children}
                                </ul>
                              );
                            },
                            ol: function (props) {
                              return (
                                <ol className="list-decimal list-inside text-gray-200 mb-3 space-y-1">
                                  {props.children}
                                </ol>
                              );
                            },
                            li: function (props) {
                              return (
                                <li className="text-gray-200" style={CG}>
                                  {props.children}
                                </li>
                              );
                            },
                            strong: function (props) {
                              return (
                                <strong className="text-white font-semibold">
                                  {props.children}
                                </strong>
                              );
                            },
                            em: function (props) {
                              return (
                                <em className="text-gray-300 italic">
                                  {props.children}
                                </em>
                              );
                            },
                            blockquote: function (props) {
                              return (
                                <blockquote className="border-l-4 border-purple-500 pl-4 py-1 my-3 bg-purple-900/20 rounded-r">
                                  {props.children}
                                </blockquote>
                              );
                            },
                            code: function (props) {
                              return (
                                <code className="bg-[#2d2d2d] px-2 py-1 rounded text-sm text-purple-300">
                                  {props.children}
                                </code>
                              );
                            },
                            hr: function () {
                              return (
                                <hr className="my-4 border-[#4d4d4d]" />
                              );
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isGenerating && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: "#3d3d3d" }}
                >
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <span className="text-gray-300 text-sm" style={CG}>
                      Recherche et synth&egrave;se en cours...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div
        className="p-4 border-t"
        style={{ backgroundColor: "#2d2d2d", borderColor: "#3d3d3d" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={function (e) {
                setInput(e.target.value);
              }}
              placeholder={
                activeDomain
                  ? "Posez votre question en " + activeDomain + "..."
                  : "Posez votre question encyclop\u00E9dique..."
              }
              className="flex-1 min-h-[56px] max-h-[200px] resize-none text-white"
              style={{
                backgroundColor: "#3d3d3d",
                borderColor: "#4d4d4d",
                fontFamily: "'Century Gothic', 'AppleGothic', sans-serif",
              }}
              onKeyDown={function (e) {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              onClick={function () {
                handleSubmit();
              }}
              disabled={!input.trim() || isGenerating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 self-end"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-gray-500 text-xs mt-2 text-center" style={CG}>
            Entr&eacute;e pour envoyer &middot; Shift+Entr&eacute;e pour
            nouvelle ligne
            {activeDomain && (
              <>
                {" "}
                &middot; Domaine :{" "}
                <span className="text-blue-400">{activeDomain}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
