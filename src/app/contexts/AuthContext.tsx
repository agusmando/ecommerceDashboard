import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import Session from "supertokens-auth-react/recipe/session";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";
import ThirdParty from "supertokens-auth-react/recipe/thirdparty";
import type { User } from "../types";
import { signIn } from "supertokens-web-js/recipe/emailpassword";
import BaseService from "../service/baseService";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const userService = new BaseService<User>("user")

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sincronizar el estado del usuario al cargar la app
 const isInitialized = useRef(false); // Importa useRef de 'react'

useEffect(() => {
  if (isInitialized.current) return;
  isInitialized.current = true;

  async function initAuth() {
    try {
      // 1. Verificamos sesión con SuperTokens
      const hasSession = await Session.doesSessionExist();
      
      if (hasSession) {
        const userId = await Session.getUserId();
        // 2. Cargamos tus datos personalizados del backend
        const userInDB = await userService.getOne(userId);
        if (userInDB && userInDB.response) {
          setUser(userInDB.response);
        }
      }
    } catch (err) {
      console.error("Error en inicialización:", err);
    } finally {
      // 3. PASE LO QUE PASE, quitamos el loading para renderizar la app
      setLoading(false); 
    }
  }

  initAuth();
}, []);


  const login = async (email: string, password: string) => {
    // SuperTokens maneja la llamada al backend por ti
    try {
      const response = await signIn({
        formFields: [
          {
            id: "email",
            value: email,
          },
          {
            id: "password",
            value: password,
          },
        ],
      });

      if (response.status === "FIELD_ERROR") {
        // one of the input formFields failed validation
        response.formFields.forEach((formField) => {
          if (formField.id === "email") {
            // Email validation failed (for example incorrect email syntax),
            // or the email is not unique.
            window.alert(formField.error);
          } else if (formField.id === "password") {
            // Password validation failed.
            // Maybe it didn't match the password strength
            window.alert(formField.error);
          }
        });
        return false;
      } else {
        if (response.status === "OK") {
          const userInDB = await userService.getOne(response.user.id);
          if (userInDB && userInDB.response) {
            setUser(userInDB.response);
            return true; // Solo éxito si hay usuario
          }
        }
        return false;
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        window.alert(err.message);
      } else {
        window.alert("Oops! Something went wrong." + err);
      }
      return false;
    }
  }

  const loginWithGoogle = async (): Promise<boolean> => {
    // Mock Google OAuth - in real app, this would use OAuth flow
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(mockUsers[0]);
    return true;
  };
  const logout = async () => {
    await Session.signOut();
    setUser(null);
    window.location.assign("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}