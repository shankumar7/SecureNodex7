"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Principal } from "../lib/types";

interface AuthContextType {
  user: Principal | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  demoLogin: (roleName: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Matrix permissions matching docs/05_RBAC.md
const ROLE_MASKS = {
  ADMIN: 1,
  MANAGER: 2,
  AUDITOR: 4,
  USER: 8,
  DEVICE: 16,
  STORAGE_NODE: 32,
};

const PERMISSIONS: Record<string, number> = {
  "principal:create": 1,
  "principal:set-roles": 1 | 2,
  "principal:read": 1 | 2 | 4 | 8,
  "device:enroll": 1 | 2,
  "device:revoke": 1 | 2,
  "device:rotate": 1 | 2,
  "device:read": 1 | 2 | 4 | 8,
  "object:create": 1 | 2 | 8,
  "object:read_content": 1 | 2 | 8,
  "object:read_metadata": 1 | 2 | 4 | 8,
  "object:share": 1 | 2 | 8,
  "object:delete": 1 | 2 | 8,
  "asset:mint": 1 | 2,
  "asset:transfer": 1 | 2 | 8,
  "asset:read": 1 | 2 | 4 | 8,
  "audit:read": 1 | 2 | 4 | 8,
  "audit:verify": 1 | 2 | 4,
  "storage:nodes_manage": 1,
  "storage:health_read": 1 | 2 | 4,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Principal | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = api.getToken();
    if (savedToken && !savedToken.startsWith("demo-token-")) {
      setToken(savedToken);
      api
        .getMe()
        .then((userData) => setUser(userData))
        .catch(() => {
          demoLogin("ADMIN").catch(() => {});
        })
        .finally(() => setIsLoading(false));
    } else {
      demoLogin("ADMIN").catch(() => {
        setIsLoading(false);
      });
    }
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(username, password);
      setToken(res.access_token);
      api.setToken(res.access_token);
      const me = await api.getMe();
      setUser(me);
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (roleName: string) => {
    const roleUpper = roleName.toUpperCase();
    let uname = "admin";
    let pword = "Admin123!";
    if (roleUpper === "MANAGER") {
      uname = "manager";
      pword = "Manager123!";
    } else if (roleUpper === "AUDITOR") {
      uname = "auditor";
      pword = "Auditor123!";
    } else if (roleUpper === "OPERATOR") {
      uname = "operator";
      pword = "Operator123!";
    } else if (roleUpper === "USER") {
      uname = "user1";
      pword = "User123!";
    }

    await login(uname, pword);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setToken(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const allowedMask = PERMISSIONS[permission];
    if (allowedMask === undefined) return false;
    return (user.role_mask & allowedMask) !== 0;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        demoLogin,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
