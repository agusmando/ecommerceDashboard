import axios from "axios";
import Session from "supertokens-auth-react/recipe/session";

const api = axios.create({ baseURL: "https://canelaenramaback.onrender.com/api/" });

api.interceptors.response.use(
    response => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            // Intenta refrescar la sesión manualmente si falla
            const success = await Session.attemptRefreshingSession();
            if (success) {
                // Reintenta la petición original con el nuevo token
                return api(error.config);
            }
        }
        return Promise.reject(error);
    }
);
