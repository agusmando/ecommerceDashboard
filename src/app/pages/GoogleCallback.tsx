import React, { useEffect } from "react";
import { signInAndUp } from "supertokens-auth-react/recipe/thirdparty";
import { useNavigate } from "react-router";
import BaseService from "../service/baseService";
import { User } from "../types";
import { useAuth } from "../contexts/AuthContext";

const userService = new BaseService<User>("user")
export default function GoogleCallback() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      try {
        const response = await signInAndUp();


        if (response.status === "OK") {

          const userInDB = await userService.getOne(response.user.id);
          if (userInDB && userInDB.response) {
            setUser(userInDB.response);
            navigate("/dashboard");
          }
          // El SDK ya guardó la sesión automáticamente
        } else {
          window.alert("Error en el login social.");
          navigate("/login");
        }
      } catch (err: any) {
        console.error(err);
        navigate("/login");
      }
    }
    handleCallback();
  }, [navigate]);

  return <div>Cargando...</div>;
}