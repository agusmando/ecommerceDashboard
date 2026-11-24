import { useEffect, useState } from 'react';
import { Check, Copy, MailCheck, MailWarning, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useInviteUserMutation, useRoleCatalogQuery } from '../../api/resources';
import type { InviteUserResult } from '../../api/types';
import { getErrorMessage } from '../../api/client';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Field, inputClass } from '../Form';
import { FormError, Skeleton } from '../States';
import { RolePicker, type RoleChoice } from './RolePicker';
import { ROLE_LABEL } from '../../lib/permissions';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invitar a alguien al equipo: crea la cuenta (si no existe) y le manda el mail para elegir contraseña. */
export function InviteUserModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: roles, isLoading: loadingRoles } = useRoleCatalogQuery(undefined, { skip: !isOpen });
  const [invite, { isLoading }] = useInviteUserMutation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<RoleChoice>('EMPLOYEE');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [result, setResult] = useState<InviteUserResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedVerification, setCopiedVerification] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail('');
    setName('');
    setRole('EMPLOYEE');
    setError(null);
    setEmailError(undefined);
    setResult(null);
    setCopied(false);
    setCopiedVerification(false);
  }, [isOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Ingresá un email válido');
      return;
    }
    if (!role) return;
    try {
      const r = await invite({ email: email.trim(), name: name.trim() || undefined, role }).unwrap();
      setResult(r);
      if (!r.created) toast.success(`${r.user.email} ahora es ${ROLE_LABEL[role]}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const copy = async () => {
    if (!result?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(result.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar: seleccioná el enlace y copialo a mano');
    }
  };

  const copyVerification = async () => {
    if (!result?.verificationLink) return;
    try {
      await navigator.clipboard.writeText(result.verificationLink);
      setCopiedVerification(true);
      setTimeout(() => setCopiedVerification(false), 2000);
    } catch {
      toast.error('No se pudo copiar: seleccioná el enlace y copialo a mano');
    }
  };

  if (result) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Invitación lista" size="md" footer={<Button onClick={onClose}>Listo</Button>}>
        <div className="space-y-4 text-sm">
          {!result.created ? (
            <p>
              <strong>{result.user.email}</strong> ya tenía cuenta: le asignamos el rol{' '}
              <strong>{result.user.role ? ROLE_LABEL[result.user.role] : ''}</strong>. Puede entrar al panel con{' '}
              {result.user.loginMethods.includes('google') ? 'Google' : 'su email y contraseña de siempre'}.
            </p>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                {result.emailSent ? (
                  <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                )}
                <p>
                  {result.emailSent ? (
                    <>
                      Le mandamos un mail a <strong>{result.user.email}</strong> para que elija su contraseña.
                    </>
                  ) : (
                    <>
                      Creamos la cuenta de <strong>{result.user.email}</strong>, pero no se pudo mandar el mail. Pasale el
                      enlace de abajo.
                    </>
                  )}
                </p>
              </div>
              {result.inviteLink && (
                <Field label="Enlace para elegir contraseña" hint="Vence en 1 hora. Si vence, puede pedir otro con “¿Olvidaste tu contraseña?”.">
                  <div className="flex gap-2">
                    <input readOnly value={result.inviteLink} onFocus={(e) => e.target.select()} className={inputClass} aria-label="Enlace de invitación" />
                    <Button variant="outline" onClick={copy} aria-label="Copiar enlace">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </Field>
              )}
            </>
          )}
          {result.verificationEmailSent && (
            <p className="rounded-lg border border-border bg-muted/40 p-3">
              También le enviamos un enlace para confirmar su email. Debe confirmarlo antes de ingresar con Google.
            </p>
          )}
          {result.verificationLink && (
            <Field label="Enlace para confirmar el email">
              <div className="flex gap-2">
                <input readOnly value={result.verificationLink} onFocus={(e) => e.target.select()} className={inputClass} aria-label="Enlace de verificación" />
                <Button variant="outline" onClick={copyVerification} aria-label="Copiar enlace de verificación">
                  {copiedVerification ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </Field>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invitar al equipo"
      description="Crea la cuenta y le manda un mail para elegir su contraseña."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="invite-user-form" loading={isLoading} disabled={!role}>
            {!isLoading && <UserPlus className="h-4 w-4" />}
            Invitar
          </Button>
        </>
      }
    >
      <form id="invite-user-form" onSubmit={submit} noValidate className="space-y-4">
        <FormError>{error}</FormError>
        <Field label="Email" htmlFor="invite-email" required error={emailError}>
          <input
            id="invite-email"
            type="email"
            autoComplete="off"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(undefined);
            }}
            placeholder="nombre@ejemplo.com"
            className={inputClass}
            aria-invalid={!!emailError || undefined}
          />
        </Field>
        <Field label="Nombre" htmlFor="invite-name" hint="Opcional: así aparece en el panel.">
          <input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputClass} />
        </Field>
        <div>
          <div className="mb-1.5 text-sm font-medium text-foreground">Rol</div>
          {loadingRoles || !roles ? (
            <div className="space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <RolePicker roles={roles} value={role} onChange={setRole} allowCustomer={false} name="invite-role" />
          )}
        </div>
      </form>
    </Modal>
  );
}
