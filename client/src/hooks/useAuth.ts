import { useLoginMutation, useRegisterMutation, useOauthLoginMutation } from "../store/api/baseApi-slice";
import { useState } from "react";
import { OAuthProvider } from "../store/api/types";
import { useDispatch } from "react-redux";
import { setAppState } from "../store/slices/appState-slice";
import Cookies from 'js-cookie';
import { TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '../utils/constants';

const useAuth = () => {
    const [handleLoginMutation, { isLoading: isLoginLoading }] = useLoginMutation();
    const [handleRegisterMutation, { isLoading: isRegisterLoading }] = useRegisterMutation();
    const [handleOauthLoginMutation, { isLoading: isOauthLoginLoading }] = useOauthLoginMutation();
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
        Cookies.remove(TOKEN_COOKIE_NAME);
        Cookies.remove(REFRESH_TOKEN_COOKIE_NAME);
    };

    return { 
        handleLogin,
        handleRegister, 
        handleOauthLogin,
        handleLogout,
        isLoginLoading,
        isRegisterLoading,
        isOauthLoginLoading,
        error
    };
}

export default useAuth;