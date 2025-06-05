import React from 'react';
import { User } from '../../store/api/types';
import Cookies from 'js-cookie';
import { TOKEN_COOKIE_NAME } from '../../utils/constants';

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
  user: User;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedUser: User | null;
  currentUserInfo: {
    id: string;
    email: string;
    name?: string;
  } | null;
  isLoading: boolean;
  onSelectUser: (user: User) => void;
  onCreateGroup: () => void;
  onLogout: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  selectedUser,
  currentUserInfo,
  isLoading,
  onSelectUser,
  onCreateGroup,
  onLogout
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const getCurrentUserInfo = () => {
    if (currentUserInfo) return currentUserInfo;
    
    // Fallback: extraer info del token si no se pasa currentUserInfo
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

  const userInfo = getCurrentUserInfo();

  if (isLoading) {
    return (
      <div style={{
        width: '350px',
        backgroundColor: colors.white,
        borderRight: `1px solid ${colors.secondary}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: colors.primary, fontSize: '16px' }}>
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '350px',
      backgroundColor: colors.white,
      borderRight: `1px solid ${colors.secondary}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Header del sidebar con info del usuario actual */}
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${colors.secondary}`,
        backgroundColor: colors.primary
      }}>
        {/* Información del usuario actual */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            backgroundColor: colors.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.primary,
            fontWeight: 'bold',
            marginRight: '12px',
            fontSize: '16px'
          }}>
            {userInfo ? getInitials(userInfo.name || userInfo.email) : 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              color: colors.white,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {userInfo?.name || 'Usuario'}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: colors.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {userInfo?.email || ''}
            </p>
          </div>
          <button
            onClick={onLogout}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.white,
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Cerrar sesión"
          >
            <img 
              src="/logout.svg" 
              alt="Logout" 
              style={{ 
                width: '20px', 
                height: '20px',
                filter: 'brightness(0) invert(1)' // Hace el SVG blanco
              }} 
            />
          </button>
        </div>

        {/* Botones de acción */}
        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
          <button
            style={{
              backgroundColor: colors.accent,
              color: colors.white,
              border: 'none',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              flex: 1
            }}
            onClick={onCreateGroup}
          >
            Crear Grupo
          </button>
        </div>
      </div>

      {/* Título de conversaciones */}
      <div style={{
        padding: '15px 20px 10px 20px',
        borderBottom: `1px solid #f0f0f0`
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '14px',
          color: colors.dark,
          fontWeight: 'bold'
        }}>
          Conversaciones ({conversations.length})
        </h4>
      </div>

      {/* Lista de conversaciones */}
      <div style={{
        flex: 1,
        overflowY: 'auto'
      }}>
        {conversations.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.3 }}>
              👥
            </div>
            <p style={{ margin: 0, fontSize: '14px' }}>
              No hay usuarios disponibles
            </p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.user.id}
              onClick={() => onSelectUser(conversation.user)}
              style={{
                padding: '15px 20px',
                borderBottom: `1px solid #f0f0f0`,
                cursor: 'pointer',
                backgroundColor: selectedUser?.id === conversation.user.id ? colors.secondary : 'transparent',
                display: 'flex',
                alignItems: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedUser?.id !== conversation.user.id) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedUser?.id !== conversation.user.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: colors.purple,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.white,
                fontWeight: 'bold',
                marginRight: '12px',
                fontSize: '18px'
              }}>
                {getInitials(conversation.user.name || conversation.user.email)}
              </div>

              {/* Información del usuario */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: colors.dark,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}>
                    {conversation.user.name || conversation.user.email}
                  </h4>
                </div>
                
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {conversation.lastMessage || 'Inicia una conversación...'}
                </p>
              </div>

              {/* Indicador de mensajes no leídos */}
              {conversation.unreadCount && conversation.unreadCount > 0 && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: colors.accent,
                  color: colors.white,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '8px'
                }}>
                  {conversation.unreadCount}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;