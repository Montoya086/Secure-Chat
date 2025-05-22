import React from 'react';
import '../Home/Home.css';

interface Props {
  chats: Chat[];
  selectedChatId: number;
  onSelectChat: (id: number) => void;
  onLogout: () => void;
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

const ChatSidebar: React.FC<Props> = ({ chats, selectedChatId, onSelectChat, onLogout }) => {
  return (
    <div className="sidebar">
      <button onClick={onLogout} className="logout-btn">Logout</button>
      <h1>Chats</h1>
      {chats.map(chat => (
        <div
          key={chat.id}
          className={`chat-item ${chat.id === selectedChatId ? 'active' : ''}`}
          onClick={() => onSelectChat(chat.id)}
        >
          <div>{chat.name}</div>
          <div className="last-message">
            {chat.messages[chat.messages.length - 1]?.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatSidebar;
