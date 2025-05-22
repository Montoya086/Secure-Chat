import React, { useState } from 'react';
import MessageBubble from '../MessageBubble/MessageBubble';
import '../Home/Home.css';

interface Props {
  chat: Chat;
  onSendMessage: (msg: string) => void;
}

interface Chat {
  id: number;
  name: string;
  isGroup: boolean;
  messages: {
    id: number;
    sender: string;
    content: string;
    timestamp: string;
  }[];
}

const ChatPanel: React.FC<Props> = ({ chat, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim());
    setNewMessage('');
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">{chat.name}</div>

      <div className="chat-messages">
        {chat.messages.map(msg => (
          <MessageBubble
            key={msg.id}
            sender={msg.sender}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Escribe un mensaje..."
        />
        <button onClick={handleSend}>Enviar</button>
      </div>
    </div>
  );
};

export default ChatPanel;
