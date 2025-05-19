import { jwtDecode } from "jwt-decode";

export const validateMfaStatus = (token: string) => {
    const decodedToken = jwtDecode(token) as { mfa_enabled: boolean };
    return decodedToken.mfa_enabled;
}