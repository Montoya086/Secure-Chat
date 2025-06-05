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
    currentUserData,
    messages,
    newMessage,
    sendSuccess,
    isUsersLoading,
    isMessagesLoading,
    isSendingMessage,
    usersError,
    initializeCurrentUser,
    getCurrentUserInfo,
    initializeConversations,
    selectUser,
    sendMessage,
    setNewMessage,
    refreshData
  } = useChat();

  // Inicializar usuario actual cuando se carga el componente
  useEffect(() => {
    const userId = initializeCurrentUser();
    if (!userId) {
      dispatch(setAppState('NOT_LOGGED_IN'));
    }
  }, [initializeCurrentUser, dispatch]);

  // Actualizar usuario actual cuando cambia la lista de usuarios
  useEffect(() => {
    if (users.length > 0) {
      initializeCurrentUser(); // Esto buscará el usuario en la nueva lista
    }
  }, [users, initializeCurrentUser]);

  // Inicializar conversaciones cuando se cargan los usuarios y se tiene el usuario actual
  useEffect(() => {
    if (users.length > 0 && currentUserId) {
      initializeConversations(users);
    }
  }, [users, currentUserId, initializeConversations]);



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