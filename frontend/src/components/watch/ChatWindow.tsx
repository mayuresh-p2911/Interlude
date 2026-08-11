'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { getSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';
import { chatApi, usersApi } from '@/lib/api';
import Image from 'next/image';

interface Message {
  _id: string;
  sender: { _id: string; username: string; avatar?: string };
  content: string;
  createdAt: string;
}

interface ChatWindowProps {
  sessionId?: string;
  groupId?: string;
  recipientId?: string;
  onBack?: () => void;
}

export default function ChatWindow({ sessionId, groupId, recipientId, onBack }: ChatWindowProps) {
  const { user } = useAuthStore();
  const socket = getSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [recipientUser, setRecipientUser] = useState<{ username?: string; avatar?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (groupId) {
      chatApi.getGroupMessages(groupId).then((res) => {
        setMessages((res.data as { data: Message[] }).data ?? []);
      });
    } else if (recipientId) {
      chatApi.getDMs(recipientId).then((res) => {
        setMessages((res.data as { data: Message[] }).data ?? []);
      });
      usersApi.getProfile(recipientId).then((res) => {
        setRecipientUser(res.data as { username?: string; avatar?: string });
      }).catch(() => {});
    }
  }, [groupId, recipientId]);

  useEffect(() => {
    if (!socket) return;

    if (groupId) {
      socket.emit('group:join', { groupId });
      socket.on('group:message:receive', (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
      });
    } else if (recipientId) {
      socket.on('dm:receive', (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
      });
    }

    return () => {
      socket.off('group:message:receive');
      socket.off('dm:receive');
    };
  }, [socket, groupId, recipientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const text = content.trim();
    setContent('');

    if (groupId) {
      socket?.emit('group:message:send', { groupId, content: text });
    } else if (recipientId) {
      socket?.emit('dm:send', { recipientId, content: text });
    } else if (sessionId) {
      // Session local chat
      const localMsg: Message = {
        _id: String(Date.now()),
        sender: { _id: user?._id ?? '', username: user?.username ?? 'Me' },
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, localMsg]);
    }
  };

  const headerTitle = recipientUser?.username ?? (groupId ? 'Group Chat' : 'Live Chat');

  return (
    <div className="flex flex-col h-full glass-navy rounded-3xl overflow-hidden border border-white/5">
      <div className="p-3.5 border-b border-white/5 flex items-center justify-between bg-surface-1/40">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
              title="Back"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          )}
          {recipientUser?.avatar ? (
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10">
              <Image src={recipientUser.avatar} alt={headerTitle} fill className="object-cover" unoptimized />
            </div>
          ) : recipientId ? (
            <div className="w-8 h-8 rounded-full bg-blue-royal/30 border border-blue-electric/20 flex items-center justify-center font-bold text-xs text-white">
              {headerTitle[0]?.toUpperCase()}
            </div>
          ) : null}
          <div>
            <h3 className="font-bold text-white text-sm">{headerTitle}</h3>
            <span className="text-[10px] text-text-muted">{messages.length} messages</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender._id === user?._id;
          return (
            <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-text-muted mb-0.5 px-1">{msg.sender.username}</span>
              <div
                className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                  isMe
                    ? 'bg-blue-royal text-white rounded-br-none'
                    : 'bg-surface-2 text-text-primary rounded-bl-none border border-white/5'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input-field py-2 text-xs flex-1"
        />
        <button type="submit" className="btn-primary p-2.5 rounded-xl flex items-center justify-center">
          <PaperAirplaneIcon className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
