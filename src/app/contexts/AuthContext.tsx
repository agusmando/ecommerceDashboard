import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import Session from "supertokens-auth-react/recipe/session";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";
import ThirdParty from "supertokens-auth-react/recipe/thirdparty";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sincronizar el estado del usuario al cargar la app
  useEffect(() => {
    async function getUserInfo() {
      if (await Session.doesSessionExist()) {
        // Aquí podrías llamar a tu backend para obtener el perfil completo usando el userId
        // const userId = await Session.getUserId();
        // const data = await fetchUserData(userId); 
        // setUser(data);
      }
      setLoading(false);
    }
    getUserInfo();
  }, []);

  const login = async (email: string, password: string) => {
    // SuperTokens maneja la llamada al backend por ti
    const response = await EmailPassword.signIn({
      formFields: [
        { id: "email", value: email },
        { id: "password", value: password }
      ]
    });
    if (response.status === "OK") {
      setUser(response.user as any); // O los datos que devuelva tu receta
    }
    return response;
  };

  const logout = async () => {
    await Session.signOut();
    setUser(null);
    window.location.assign("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}