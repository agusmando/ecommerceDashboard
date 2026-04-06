import axios from "axios";
import Session from "supertokens-auth-react/recipe/session";

const api = axios.create({ 
    baseURL: "https://canelaenramaback.onrender.com/api/",
    withCredentials: true,
});

api.interceptors.request.use(async (config) => {
    if (await Session.doesSessionExist()) {
        const token = await Session.getAccessToken();
        config.headers = Object.assign({}, config.headers as Record<string, any> | undefined, { Authorization: `Bearer ${token}` }) as any;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalConfig = error.config;
        if (error.response && error.response.status === 401 && originalConfig) {
            const refreshed = await Session.attemptRefreshingSession();
            if (refreshed) {
                const token = await Session.getAccessToken();
                originalConfig.headers = { ...(originalConfig.headers || {}), Authorization: `Bearer ${token}` };
                return api(originalConfig);
            } else {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api; 