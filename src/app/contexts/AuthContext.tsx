import { createContext, useContext, useState, ReactNode } from "react";
import type { User } from "../types";
import { mockUsers } from "../data/mockData";
import axios from "axios";
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication - in real app, this would call an API
    const foundUser = await axios.post(
      "https://canelaenramaback.onrender.com/api/auth/signin",
      {
        formFields: [
          { id: "email", value: email },
          { id: "password", value: password },
        ],
      },
    );
    // = mockUsers.find(u => u.email === email);
    if (foundUser && foundUser.data.status == "OK") {
      const userData = foundUser.data.user;
      setUser({
        id: userData.id,
        name: userData.name,
        email: userData.emails[0],
        role: userData.role,
        // avatarUrl: userData.avatarUrl,
        // createdAt: userData.createdAt,
        // updatedAt: userData.updatedAt,
      });
      return true;
    }
    return false;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    // Mock Google OAuth - in real app, this would use OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 500));
    setUser(mockUsers[0]);
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
