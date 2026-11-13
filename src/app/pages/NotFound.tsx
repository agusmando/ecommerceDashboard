import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/States';
import { Card } from '../components/Card';

export default function NotFound() {
  return (
    <Card>
      <EmptyState
        icon={<Compass className="w-6 h-6" />}
        title="Página no encontrada"
        description="La dirección no existe o fue movida."
        action={
          <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">
            Ir al inicio
          </Link>
        }
      />
    </Card>
  );
}
