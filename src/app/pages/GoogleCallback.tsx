import React, { useEffect } from "react";
import { signInAndUp } from "supertokens-auth-react/recipe/thirdparty";
import { useNavigate } from "react-router";

export default function GoogleCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      try {
        const response = await signInAndUp();

        console.log(response)

        if (response.status === "OK") {
          // El SDK ya guardó la sesión automáticamente
          navigate("/dashboard");
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