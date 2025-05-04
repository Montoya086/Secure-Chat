import { useLoginMutation, useRegisterMutation } from "../store/api/baseApi-slice";
import { useState } from "react";

const useAuth = () => {
    const [handleLoginMutation, { isLoading: isLoginLoading }] = useLoginMutation();
    const [handleRegisterMutation, { isLoading: isRegisterLoading }] = useRegisterMutation();
    const [error, setError] = useState<string | null>(null);

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

    return { 
        handleLogin,
        handleRegister, 
        isLoginLoading,
        isRegisterLoading,
        error
    };
}

export default useAuth;