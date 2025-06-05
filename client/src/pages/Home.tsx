import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setAppState } from '../store/slices/appState-slice';
import { TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '../utils/constants';
import Cookies from 'js-cookie';
import useChat from '../hooks/useChat';
import ChatSidebar from '../components/ChatSidebar/ChatSidebar';
import ChatArea from '../components/ChatArea/ChatArea';
import CreateGroupModal from '../components/CreateGroupModal/CreateGroupModal';

// Paleta de colores
const colors = {
  primary: '#226946',
  secondary: '#91B4A3',
  white: '#FFFFFF',
  dark: '#0D0B0C',
  accent: '#007EA7',
  purple: '#67597A'
};

const Home = () => {
  const dispatch = useDispatch();
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  
  const {
    users,
    groups,
    conversations,
    selectedUser,
    selectedGroup,
    currentUserId,
    currentUserData,
    messages,
    groupMessages,
    newMessage,
    sendSuccess,
    isUsersLoading,
    isGroupsLoading,
    isMessagesLoading,
    isGroupMessagesLoading,
    isSendingMessage,
    isSendingGroupMessage,
    isCreatingGroup,
    usersError,
    groupsError,
    initializeCurrentUser,
    getCurrentUserInfo,
    initializeConversations,
    selectUser,
    selectGroup,
    sendMessage,
    sendGroupMessage,
    createGroup,
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
    setIsCreateGroupModalOpen(true);
  };

  const handleCloseCreateGroupModal = () => {
    setIsCreateGroupModalOpen(false);
  };

  const handleCreateGroupSubmit = async (groupName: string, selectedUsers: string[]) => {
    try {
      await createGroup(groupName, selectedUsers);
      console.log('✅ Group created successfully');
    } catch (error) {
      console.error('❌ Error creating group:', error);
      throw error; // Re-throw para que el modal pueda manejar el error
    }
  };

  // 🔥 SIMPLIFICADO: Una sola función para enviar mensajes
  const handleSendMessage = async (): Promise<boolean> => {
    if (!newMessage.trim() || (!selectedUser && !selectedGroup)) {
      return false;
    }
    
    if (selectedGroup) {
      return await sendGroupMessage();
    } else if (selectedUser) {
      return await sendMessage();
    }
    
    return false;
  };

  // 🔥 ELIMINADO: handleSendGroupMessage duplicado - ya no es necesario

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
          <h3>Error al cargar los datos</h3>
          <p>No se pudieron cargar las conversaciones.</p>
          {groupsError && <p>Error al cargar grupos.</p>}
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
      {/* Header fijo */}
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
          groups={groups}
          selectedUser={selectedUser}
          selectedGroup={selectedGroup}
          currentUserInfo={getCurrentUserInfo()}
          isLoading={isUsersLoading}
          isGroupsLoading={isGroupsLoading}
          onSelectUser={selectUser}
          onSelectGroup={selectGroup}
          onCreateGroup={handleCreateGroup}
          onLogout={handleLogout}
        />

        {/* Área principal del chat */}
        <ChatArea
          selectedUser={selectedUser}
          selectedGroup={selectedGroup}
          currentUserId={currentUserId}
          messages={messages}
          groupMessages={groupMessages}
          newMessage={newMessage}
          isMessagesLoading={isMessagesLoading}
          isGroupMessagesLoading={isGroupMessagesLoading}
          isSendingMessage={isSendingMessage}
          isSendingGroupMessage={isSendingGroupMessage}
          onMessageChange={setNewMessage}
          onSendMessage={handleSendMessage}
          onSendGroupMessage={handleSendMessage} // 🔥 Misma función para ambos
        />
      </div>

      {/* Modal para crear grupo */}
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        users={users}
        currentUserId={currentUserId}
        onClose={handleCloseCreateGroupModal}
        onCreateGroup={handleCreateGroupSubmit}
        isCreating={isCreatingGroup}
      />
    </div>
  );
};

export default Home;