import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAppState } from '../store/slices/appState-slice';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import useAuth from '../hooks/useAuth';

//Definición de colores de la paleta
const colors = {
  primary: '#226946',    //Dartmouth green
  secondary: '#91b4a3',  //Cambridge Blue
  white: '#ffffff',      //White
  dark: '#0d0b0c',       //Night
  accent: '#48284a'      //Violet (JTC)
};

const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { handleRegister, isRegisterLoading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Función para manejar el registro
  const onRegister = (email: string, password: string, givenName: string, familyName: string) => {
    handleRegister(
      email, 
      password, 
      givenName,
      familyName,
      () => {
        dispatch(setAppState('LOGGED_IN'));
        navigate('/', { replace: true });
      }
    );
  };

  // Formik para el form
  const formik = useFormik({
    initialValues: {
      givenName: '',
      familyName: '',
      email: '',
      password: ''
    },
    validationSchema: Yup.object({
      givenName: Yup.string()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(50, 'El nombre no puede exceder los 50 caracteres')
        .required('Campo requerido'),
      familyName: Yup.string()
        .min(2, 'El apellido debe tener al menos 2 caracteres')
        .max(50, 'El apellido no puede exceder los 50 caracteres')
        .required('Campo requerido'),
      email: Yup.string()
        .email('Correo electrónico inválido')
        .required('Campo requerido'),
      password: Yup.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .required('Campo requerido')
        .matches(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
        .matches(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
        .matches(/[0-9]/, 'La contraseña debe contener al menos un número')
        .matches(/[^A-Za-z0-9]/, 'La contraseña debe contener al menos un carácter especial'),
    }),
    onSubmit: (values) => {
      onRegister(values.email, values.password, values.givenName, values.familyName);
    },
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div style={{
      backgroundColor: colors.white,
      borderRadius: '8px',
      padding: '30px',
      width: '350px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      border: `1px solid ${colors.secondary}`,
      margin: '20px auto'
    }}>
      <h1 style={{ 
        color: colors.primary, 
        textAlign: 'center',
        marginBottom: '24px',
        fontSize: '28px'
      }}>Crear Cuenta</h1>
      
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
      
      <form 
        onSubmit={formik.handleSubmit} 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px' 
        }}
      >
        <div>
          <label htmlFor="givenName" style={{
            display: 'block',
            marginBottom: '6px',
            color: colors.dark,
            fontWeight: 'bold'
          }}>Nombre</label>
          <input 
            id="givenName"
            type="text" 
            name="givenName" 
            placeholder="Tu nombre"
            onChange={formik.handleChange} 
            onBlur={formik.handleBlur}
            value={formik.values.givenName}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '4px',
              border: `1px solid ${colors.secondary}`,
              boxSizing: 'border-box',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
          />
          {formik.touched.givenName && formik.errors.givenName && 
            <div style={{ color: 'crimson', fontSize: '12px', marginTop: '4px' }}>{formik.errors.givenName}</div>
          }
        </div>

        <div>
          <label htmlFor="familyName" style={{
            display: 'block',
            marginBottom: '6px',
            color: colors.dark,
            fontWeight: 'bold'
          }}>Apellido</label>
          <input 
            id="familyName"
            type="text" 
            name="familyName" 
            placeholder="Tu apellido"
            onChange={formik.handleChange} 
            onBlur={formik.handleBlur}
            value={formik.values.familyName}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '4px',
              border: `1px solid ${colors.secondary}`,
              boxSizing: 'border-box',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
          />
          {formik.touched.familyName && formik.errors.familyName && 
            <div style={{ color: 'crimson', fontSize: '12px', marginTop: '4px' }}>{formik.errors.familyName}</div>
          }
        </div>
        
        <div>
          <label htmlFor="email" style={{
            display: 'block',
            marginBottom: '6px',
            color: colors.dark,
            fontWeight: 'bold'
          }}>Correo electrónico</label>
          <input 
            id="email"
            type="email" 
            name="email" 
            placeholder="ejemplo@correo.com"
            onChange={formik.handleChange} 
            onBlur={formik.handleBlur}
            value={formik.values.email}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '4px',
              border: `1px solid ${colors.secondary}`,
              boxSizing: 'border-box',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
          />
          {formik.touched.email && formik.errors.email && 
            <div style={{ color: 'crimson', fontSize: '12px', marginTop: '4px' }}>{formik.errors.email}</div>
          }
        </div>
        
        <div>
          <label htmlFor="password" style={{
            display: 'block',
            marginBottom: '6px',
            color: colors.dark,
            fontWeight: 'bold'
          }}>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input 
              id="password"
              type={showPassword ? "text" : "password"} 
              name="password" 
              placeholder="••••••••"
              onChange={formik.handleChange} 
              onBlur={formik.handleBlur}
              value={formik.values.password}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '4px',
                border: `1px solid ${colors.secondary}`,
                boxSizing: 'border-box',
                fontSize: '16px',
                paddingRight: '40px',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
            />
            <button 
              type="button"
              onClick={togglePasswordVisibility}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: colors.accent,
                fontSize: '14px',
                padding: 0,
                outline: 'none',
                boxShadow: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {formik.touched.password && formik.errors.password && 
            <div style={{ color: 'crimson', fontSize: '12px', marginTop: '4px' }}>{formik.errors.password}</div>
          }
        </div>
        
        <button 
          type="submit" 
          disabled={isRegisterLoading}
          style={{
            backgroundColor: colors.primary,
            color: colors.white,
            padding: '14px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          {isRegisterLoading ? 'Cargando...' : 'Registrarse'}
        </button>
        
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <a 
            href="/login" 
            style={{ 
              color: colors.accent,
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            ¿Ya tienes cuenta? Inicia sesión
          </a>
        </div>
      </form>
    </div>
  );
};

export default Signup;