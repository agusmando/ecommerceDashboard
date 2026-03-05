import { useState } from 'react';
import { Link } from 'react-router';
import { AuthLayout } from '../layouts/AuthLayout';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock password reset
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <AuthLayout>
      <Card>
        <div className="mb-6">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a iniciar sesión
          </Link>
          <h1 className="text-foreground mb-2">Reiniciar contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá tu email y te enviaremos un link para reiniciar tu contraseña
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="Ingresá tu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar link de reinicio'}
            </Button>
          </form>
        ) : (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900">
            <p className="text-sm text-green-800 dark:text-green-400">
              Si existe una cuenta con ese mail, te enviaremos un link para reiniciar tu contraseña
            </p>
          </div>
        )}
      </Card>
    </AuthLayout>
  );
}
