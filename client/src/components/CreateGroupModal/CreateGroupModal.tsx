import React, { useState } from 'react';
import { User } from '../../store/api/types';

// Paleta de colores
const colors = {
  primary: '#226946',
  secondary: '#91B4A3',
  white: '#FFFFFF',
  dark: '#0D0B0C',
  accent: '#007EA7',
  purple: '#67597A'
};

interface CreateGroupModalProps {
  isOpen: boolean;
  users: User[];
  currentUserId: string;
  onClose: () => void;
  onCreateGroup: (groupName: string, selectedUsers: string[]) => Promise<void>;
  isCreating: boolean;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  users,
  currentUserId,
  onClose,
  onCreateGroup,
  isCreating
}) => {
  const [step, setStep] = useState<'select-users' | 'enter-name'>('select-users');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  // Filtrar usuarios para no incluir al usuario actual
  const availableUsers = users.filter(user => user.id !== currentUserId);

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleNext = () => {
    if (selectedUsers.length === 0) {
      alert('Selecciona al menos un usuario para el grupo');
      return;
    }
    setStep('enter-name');
  };

  const handleBack = () => {
    setStep('select-users');
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Ingresa un nombre para el grupo');
      return;
    }

    try {
      await onCreateGroup(groupName.trim(), selectedUsers);
      // Reset state
      setSelectedUsers([]);
      setGroupName('');
      setStep('select-users');
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setSelectedUsers([]);
      setGroupName('');
      setStep('select-users');
      onClose();
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: colors.white,
        borderRadius: '12px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${colors.secondary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            margin: 0,
            color: colors.primary,
            fontSize: '20px'
          }}>
            {step === 'select-users' ? 'Seleccionar Miembros' : 'Nombre del Grupo'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              color: colors.dark,
              opacity: isCreating ? 0.5 : 1
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {step === 'select-users' ? (
            <>
              {/* Step 1: Select Users */}
              <div style={{
                padding: '20px',
                borderBottom: `1px solid #f0f0f0`
              }}>
                <p style={{
                  margin: 0,
                  color: '#666',
                  fontSize: '14px'
                }}>
                  Selecciona los usuarios que quieres agregar al grupo ({selectedUsers.length} seleccionados)
                </p>
              </div>

              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 20px'
              }}>
                {availableUsers.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    <p>No hay otros usuarios disponibles</p>
                  </div>
                ) : (
                  availableUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleUserToggle(user.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer',
                        backgroundColor: selectedUsers.includes(user.id) ? '#e8f5e8' : 'transparent',
                        borderRadius: '8px',
                        margin: '4px 0'
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `2px solid ${selectedUsers.includes(user.id) ? colors.primary : '#ccc'}`,
                        backgroundColor: selectedUsers.includes(user.id) ? colors.primary : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px'
                      }}>
                        {selectedUsers.includes(user.id) && (
                          <span style={{ color: colors.white, fontSize: '12px' }}>✓</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: colors.purple,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.white,
                        fontWeight: 'bold',
                        marginRight: '12px'
                      }}>
                        {getInitials(user.name || user.email)}
                      </div>

                      {/* User Info */}
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '16px',
                          color: colors.dark
                        }}>
                          {user.name || user.email}
                        </h4>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#666'
                        }}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Enter Group Name */}
              <div style={{
                padding: '20px',
                borderBottom: `1px solid #f0f0f0`
              }}>
                <p style={{
                  margin: 0,
                  color: '#666',
                  fontSize: '14px'
                }}>
                  Grupo con {selectedUsers.length} miembro{selectedUsers.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div style={{
                padding: '20px',
                flex: 1
              }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: colors.dark,
                  fontWeight: 'bold'
                }}>
                  Nombre del grupo
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej: Equipo de desarrollo"
                  disabled={isCreating}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${colors.secondary}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    opacity: isCreating ? 0.5 : 1
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isCreating) {
                      handleCreateGroup();
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: `1px solid ${colors.secondary}`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          {step === 'select-users' ? (
            <>
              <button
                onClick={handleClose}
                disabled={isCreating}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${colors.secondary}`,
                  borderRadius: '8px',
                  backgroundColor: colors.white,
                  color: colors.dark,
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isCreating ? 0.5 : 1
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleNext}
                disabled={selectedUsers.length === 0 || isCreating}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: selectedUsers.length > 0 && !isCreating ? colors.primary : '#ccc',
                  color: colors.white,
                  cursor: selectedUsers.length > 0 && !isCreating ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Siguiente
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleBack}
                disabled={isCreating}
                style={{
                  padding: '10px 20px',
                  border: `1px solid ${colors.secondary}`,
                  borderRadius: '8px',
                  backgroundColor: colors.white,
                  color: colors.dark,
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isCreating ? 0.5 : 1
                }}
              >
                Atrás
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || isCreating}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: groupName.trim() && !isCreating ? colors.primary : '#ccc',
                  color: colors.white,
                  cursor: groupName.trim() && !isCreating ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isCreating && (
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                )}
                {isCreating ? 'Creando...' : 'Crear Grupo'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default CreateGroupModal;