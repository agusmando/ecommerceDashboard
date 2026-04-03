import { RouterProvider } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { router } from './routes';
import { SuperTokensProvider } from './contexts/supertokensProvider';

  export default function App() {
  return (
    <SuperTokensProvider>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </SuperTokensProvider>
  );
}
