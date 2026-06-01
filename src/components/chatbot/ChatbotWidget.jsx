import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Send, X, MessageCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 88, y: window.innerHeight - 160 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef(null);

  const onMouseDown = useCallback((e) => {
    if (e.target.closest('button') && !e.target.closest('.drag-handle')) return;
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 56, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 56, e.clientY - dragOffset.current.y));
      setPosition({ x: newX, y: newY });
    };
    const onMouseUp = () => setDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Bonjour! Je suis HARCHIVE. Comment puis-je vous aider?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      const faqData = await base44.entities.FAQ.list();
      setFaqs(faqData);
    } catch (error) {
      console.error("Erreur chargement FAQs:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findFAQ = (userMessage) => {
    const messageLower = userMessage.toLowerCase();
    return faqs.find(faq => {
      const questionMatch = faq.question.toLowerCase().includes(messageLower) || messageLower.includes(faq.question.toLowerCase());
      const keywordsMatch = faq.mots_cles?.some(key => messageLower.includes(key.toLowerCase()));
      return questionMatch || keywordsMatch;
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const faqMatch = findFAQ(userMessage);
      let response;

      if (faqMatch) {
        response = faqMatch.reponse;
      } else {
        response = await base44.integrations.Core.InvokeLLM({
          prompt: userMessage
        });
      }
      
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Erreur:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `❌ Erreur: ${error.message}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      { role: "assistant", content: "Bonjour! Je suis HARCHIVE. Comment puis-je vous aider?" }
    ]);
  };

  return (
    <div
      ref={widgetRef}
      className="fixed z-40"
      style={{ left: position.x, top: position.y, cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
    >
      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'absolute', bottom: 64, right: 0, left: 'auto', top: 'auto',
            width: 384, maxWidth: 'calc(100vw - 2rem)',
            display: 'flex', flexDirection: 'column', height: 420,
            background: 'rgba(20, 20, 30, 0.55)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)',
            fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: '16px 16px 0 0',
            background: 'rgba(255,255,255,0.05)',
            fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif",
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle style={{ width: 18, height: 18, color: '#60a5fa' }} />
              <span style={{ fontWeight: 700, color: '#fff', fontSize: 14, fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif" }}>HARCHIVE</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={clearChat} title="Effacer" style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#fff' }}>
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
              <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#fff' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? 'rgba(37, 99, 235, 0.85)' : 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px 14px 14px 4px', padding: '8px 14px' }}>
                  <Loader2 style={{ width: 14, height: 14, color: '#fff', animation: 'spin 1s linear infinite' }} className="animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', gap: 8,
            borderRadius: '0 0 16px 16px',
            background: 'rgba(255,255,255,0.04)',
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Votre message..."
              disabled={loading}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 13, outline: 'none',
                fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif",
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: 'rgba(37, 99, 235, 0.85)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '7px 12px', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (loading || !input.trim()) ? 0.5 : 1,
              }}
            >
              <Send style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}