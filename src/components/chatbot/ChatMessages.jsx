import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Cpu, User } from 'lucide-react';

export default function ChatMessages({ messages }) {
  return (
    <div className="space-y-4">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role === 'assistant' && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3d3d3d' }}>
              <Cpu className="w-5 h-5" style={{ color: '#60a5fa' }} />
            </div>
          )}

          <div
            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
              msg.role === 'user'
                ? 'rounded-br-none'
                : 'rounded-bl-none'
            }`}
            style={{
              backgroundColor: msg.role === 'user' ? '#2d2d2d' : '#3d3d3d',
              color: '#ffffff',
              borderColor: msg.role === 'user' ? '#4d4d4d' : '#5a5a5a',
              border: '1px solid'
            }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>

          {msg.role === 'user' && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3d3d3d' }}>
              <User className="w-5 h-5" style={{ color: '#a0a0a0' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}