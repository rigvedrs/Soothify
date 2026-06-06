'use client';

import { ChatMessage as ChatMessageType } from '@/lib/hooks/useChat';

interface ChatMessageProps {
  message: ChatMessageType;
  isLast?: boolean;
}

export function ChatMessage({ message, isLast = false }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`
          inline-block max-w-[80%] px-4 py-3 rounded-2xl text-sm
          ${isUser
            ? 'bg-[#3B82F6] text-white font-medium'
            : 'bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A]'
          }
          ${isLast && !isUser ? 'animate-pulse' : ''}
        `}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content || (isLast && !isUser ? '…' : '')}
        </div>
      </div>
    </div>
  );
}
