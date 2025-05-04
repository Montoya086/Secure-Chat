import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { handleLogin, isLoginLoading } = useAuth();
  const from = location.state?.from?.pathname || '/';
  const [showPassword, setShowPassword] = useState(false);

  const onLogin = (email: string, password: string) => {
    handleLogin(
      email, 
      password, 
      () => {
        dispatch(setAppState('LOGGED_IN'));
        navigate(from, { replace: true });
      }
    );
  };

  // Formik
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Correo electrónico inválido').required('Campo requerido'),
      password: Yup.string()
        .required('Campo requerido')
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .matches(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
        .matches(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
        .matches(/[0-9]/, 'La contraseña debe contener al menos un número')
        .matches(/[^A-Za-z0-9]/, 'La contraseña debe contener al menos un carácter especial'),
    }),
    onSubmit: (values) => {
      onLogin(values.email, values.password);
    },
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh'
    }}>
      <div style={{
        backgroundColor: colors.white,
        borderRadius: '8px',
        padding: '30px',
        width: '350px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        border: `1px solid ${colors.secondary}`
      }}>
        <h1 style={{ 
          color: colors.primary, 
          textAlign: 'center',
          marginBottom: '24px',
          fontSize: '28px'
        }}>Iniciar Sesión</h1>
        
        <form 
          onSubmit={formik.handleSubmit} 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}
        >
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
              value={formik.values.email}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '4px',
                border: `1px solid ${colors.secondary}`,
                boxSizing: 'border-box',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s',
                ':focus': {
                  borderColor: colors.primary
                }
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
                  transition: 'border-color 0.3s',
                  ':focus': {
                    borderColor: colors.primary
                  }
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
                  WebkitTapHighlightColor: 'transparent',
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
            disabled={isLoginLoading}
            style={{
              backgroundColor: colors.primary,
              color: colors.white,
              padding: '14px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '10px',
              transition: 'background-color 0.3s',
              ':hover': {
                backgroundColor: '#1a5437' // Una versión más oscura del color primario
              }
            }}
          >
            {isLoginLoading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <a 
              href="/signup"
              style={{ 
                color: colors.accent,
                textDecoration: 'none',
                fontSize: '14px'
              }}
            >
              ¿No tienes cuenta? Regístrate.
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;