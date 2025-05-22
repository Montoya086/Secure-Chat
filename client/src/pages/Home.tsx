import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import ChatSidebar from '../components/ChatSidebar/ChatSidebar';
import ChatPanel from '../components/ChatPanel/ChatPanel';
import '../components/Home/Home.css';

interface Message {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
}

interface Chat {
  id: number;
  name: string;
  isGroup: boolean;
  messages: Message[];
}

const mockChats: Chat[] = [
  {
    id: 1,
    name: 'Juan Pérez',
    isGroup: false,
    messages: [
      { id: 1, sender: 'Juan Pérez', content: 'Hola, ¿cómo estás?', timestamp: '10:00 AM' },
      { id: 2, sender: 'Tú', content: 'Todo bien, ¿y tú?', timestamp: '10:01 AM' },
    ],
  },
  {
    id: 2,
    name: 'Grupo de Proyecto',
    isGroup: true,
    messages: [
      { id: 1, sender: 'Ana', content: '¿Ya subieron el avance?', timestamp: '09:00 AM' },
      { id: 2, sender: 'Carlos', content: 'Yo ya lo subí al drive.', timestamp: '09:05 AM' },
    ],
  },
];

const Home: React.FC = () => {
  const { handleLogout } = useAuth();
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [selectedChatId, setSelectedChatId] = useState<number>(chats[0].id);

  const selectedChat = chats.find(c => c.id === selectedChatId)!;

  const handleSendMessage = (messageText: string) => {
    const newMessage = {
      id: selectedChat.messages.length + 1,
      sender: 'Tú',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedChat = {
      ...selectedChat,
      messages: [...selectedChat.messages, newMessage],
    };

    setChats(prev => prev.map(chat => chat.id === updatedChat.id ? updatedChat : chat));
  };

  return (
    <div className="container">
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onLogout={handleLogout}
      />
      <ChatPanel
        chat={selectedChat}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default Home;
