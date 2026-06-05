import React, { useState, useRef, useEffect } from 'react';
import { authService, dataService, functionService } from "@/api";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import ChatMessages from '@/components/chatbot/ChatMessages.jsx';

export default function ChatbotIA() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    setError(null);
    const userMessage = inputValue;
    setInputValue('');
    
    // Ajouter le message utilisateur
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // TODO: Implement deepseekChat
      const response = null;
      // const response = await functionService.deepseekChat({
      //   message: userMessage,
      // });

      if (response.data?.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.message }]);
      } else {
        setError('Erreur: pas de réponse de l\'IA');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la communication avec l\'IA');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--ha-bg)' }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ backgroundColor: 'var(--ha-surface2)', borderColor: '#3d3d3d' }}>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--ha-text)' }}>ChatBot IA (DeepSeek)</h1>
        <p style={{ color: 'var(--ha-text-muted)' }}>Posez vos questions et recevez des réponses intelligentes</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--ha-text)' }}>Bienvenue!</h2>
              <p style={{ color: 'var(--ha-text-muted)' }}>Commencez une conversation avec l'IA</p>
            </div>
          </div>
        )}

        <ChatMessages messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 flex items-center gap-3 rounded-lg mb-4" style={{ backgroundColor: 'var(--ha-surface)', borderColor: '#ff4444', border: '1px solid' }}>
          <AlertCircle className="w-5 h-5" style={{ color: '#ff4444' }} />
          <p style={{ color: '#ff4444' }}>{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto underline text-sm"
            style={{ color: '#ff4444' }}
          >
            Fermer
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 border-t" style={{ backgroundColor: 'var(--ha-surface2)', borderColor: '#3d3d3d' }}>
        <div className="flex gap-3">
          <Input
            placeholder="Écrivez votre message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            style={{
              backgroundColor: 'var(--ha-surface)',
              borderColor: 'var(--ha-border)',
              color: 'var(--ha-text)'
            }}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={loading || !inputValue.trim()}
            style={{
              backgroundColor: loading ? '#4d4d4d' : '#2d2d2d',
              color: 'var(--ha-text)',
              borderColor: 'var(--ha-border)'
            }}
            className="border"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
