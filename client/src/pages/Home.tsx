import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAppState } from '../store/slices/appState-slice';
import { TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '../utils/constants';
import Cookies from 'js-cookie';
import useChat from '../hooks/useChat';
import ChatSidebar from '../components/ChatSidebar/ChatSidebar';
import ChatArea from '../components/ChatArea/ChatArea';

// Paleta de colores
const colors = {
  primary: '#226946',
  secondary: '#91B4A3',
  white: '#FFFFFF',
  dark: '#0D0B0C',
  accent: '#007EA7',
  purple: '#67597A'
};

interface Conversation {
  user: any;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
}

const Home = () => {
  const dispatch = useDispatch();
  
  const {
    users,
    conversations,
    selectedUser,
    currentUserId,
    messages,
    newMessage,
    sendSuccess,
    isUsersLoading,
    isMessagesLoading,
    isSendingMessage,
    usersError,
    initializeCurrentUser,
    initializeConversations,
    selectUser,
    sendMessage,
    setNewMessage,
    refreshData
  } = useChat();

  // Inicializar usuario actual y datos
  useEffect(() => {
    const userId = initializeCurrentUser();
    if (!userId) {
      dispatch(setAppState('NOT_LOGGED_IN'));
    }
  }, [initializeCurrentUser, dispatch]);

  // Inicializar conversaciones cuando se cargan los usuarios
  useEffect(() => {
    if (users.length > 0 && currentUserId) {
      // Filtrar usuarios para no incluir al usuario actual
      const otherUsers = users.filter(user => user.id !== currentUserId);
      initializeConversations(otherUsers);
    }
  }, [users, currentUserId, initializeConversations]);

  // Obtener información del usuario actual
  const getCurrentUserInfo = () => {
    const token = Cookies.get(TOKEN_COOKIE_NAME);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const firstName = payload.given_name || '';
        const lastName = payload.family_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        return {
          id: payload.sub || payload.user_id || payload.id,
          email: payload.email || 'usuario@email.com',
          name: fullName || payload.name || ''
        };
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
    return null;
  };

  const handleLogout = () => {
    dispatch(setAppState('NOT_LOGGED_IN'));
    Cookies.remove(TOKEN_COOKIE_NAME);
    Cookies.remove(REFRESH_TOKEN_COOKIE_NAME);
  };

  const handleCreateGroup = () => {
    alert('Función de crear grupo próximamente');
    // Aquí puedes implementar la lógica para crear grupos
    // O navegar a una página específica para crear grupos
  };

  const handleSendMessage = async (): Promise<boolean> => {
    if (!newMessage.trim() || !selectedUser || isSendingMessage) {
      return false;
    }
    
    const success = await sendMessage();
    return success;
  };

  // Mostrar error si hay problemas cargando usuarios
  if (usersError) {
    return (
      <div style={{ 
        backgroundColor: colors.white,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ 
          color: '#ff4444', 
          fontSize: '18px',
          textAlign: 'center'
        }}>
          <h3>Error al cargar los usuarios</h3>
          <p>No se pudieron cargar las conversaciones.</p>
        </div>
        <button
          onClick={refreshData}
          style={{
            backgroundColor: colors.primary,
            color: colors.white,
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: colors.white,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header fijo (opcional) */}
      <div style={{
        height: '60px',
        backgroundColor: colors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.white,
        fontSize: '20px',
        fontWeight: 'bold',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        Secure Chat
      </div>
      
      {/* Contenedor principal del chat */}
      <div style={{
        flex: 1,
        display: 'flex',
        marginTop: '60px', // Espacio para el header fijo
        height: 'calc(100vh - 60px)'
      }}>
        {/* Sidebar izquierdo */}
        <ChatSidebar
          conversations={conversations}
          selectedUser={selectedUser}
          currentUserInfo={getCurrentUserInfo()}
          isLoading={isUsersLoading}
          onSelectUser={selectUser}
          onCreateGroup={handleCreateGroup}
          onLogout={handleLogout}
        />

        {/* Área principal del chat */}
        <ChatArea
          selectedUser={selectedUser}
          currentUserId={currentUserId}
          messages={messages}
          newMessage={newMessage}
          isMessagesLoading={isMessagesLoading}
          isSendingMessage={isSendingMessage}
          onMessageChange={setNewMessage}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
};

export default Home;