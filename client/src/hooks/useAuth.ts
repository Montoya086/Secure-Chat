import { useLoginMutation, useRegisterMutation, useOauthLoginMutation, useConfigureMfaMutation } from "../store/api/baseApi-slice";
import { useState } from "react";
import { OAuthProvider } from "../store/api/types";
import { useDispatch } from "react-redux";
import { setAppState, setMfaCompleted, setMfaEnabled } from "../store/slices/appState-slice";
import Cookies from 'js-cookie';
import { TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '../utils/constants';

const useAuth = () => {
    const [handleLoginMutation, { isLoading: isLoginLoading }] = useLoginMutation();
    const [handleRegisterMutation, { isLoading: isRegisterLoading }] = useRegisterMutation();
    const [handleOauthLoginMutation, { isLoading: isOauthLoginLoading }] = useOauthLoginMutation();
    const [handleConfigureMfaMutation, { isLoading: isConfigureMfaLoading }] = useConfigureMfaMutation();
    const [error, setError] = useState<string | null>(null);
    const dispatch = useDispatch();
    const handleLogin = async (email: string, password: string, callback: () => void) => {
        setError(null);
        try {
            const response = await handleLoginMutation({ email, password }).unwrap();
            if (response.access_token && response.refresh_token) {
                callback();
            }
        } catch (err: any) {
            setError(err.data?.message || 'Error al iniciar sesión');
            console.error(err);
        }
    }

    const handleConfigureMfa = async (callback: (qrcode: string) => void) => {
        setError(null);
        try {
            const response = await handleConfigureMfaMutation().unwrap();
            callback(response.qrcode);
        } catch (err: any) {
            setError(err.data?.message || 'Error al configurar MFA');
            console.error(err);
        }
    }

    const handleOauthLogin = async (code: string, provider: OAuthProvider, callback: () => void) => {
        setError(null);
        try {
            const response = await handleOauthLoginMutation({ code, provider }).unwrap();
            if (response.access_token && response.refresh_token) {
                callback();
            }
        } catch (err: any) {
            setError(err.data?.message || 'Error al iniciar sesión con Google');
            console.error(err);
        }
    }

    const handleRegister = async (email: string, password: string, callback: () => void) => {
        setError(null);
        try {
            const response = await handleRegisterMutation({ email, password }).unwrap();
            if (response.access_token && response.refresh_token) {
                callback();
            }
        } catch (err: any) {
            setError(err.data?.message || 'Error al registrarse');
            console.error(err);
        }
    }

    const handleLogout = () => {
        dispatch(setAppState('NOT_LOGGED_IN'));
        dispatch(setMfaCompleted(false));
        dispatch(setMfaEnabled(false));
        Cookies.remove(TOKEN_COOKIE_NAME);
        Cookies.remove(REFRESH_TOKEN_COOKIE_NAME);
    };

    return { 
        handleLogin,
        handleRegister, 
        handleOauthLogin,
        handleLogout,
        handleConfigureMfa,
        isLoginLoading,
        isRegisterLoading,
        isOauthLoginLoading,
        isConfigureMfaLoading,
        error
    };
}

export default useAuth;