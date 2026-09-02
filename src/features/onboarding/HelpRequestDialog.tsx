import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { FileDropzone, type DroppedFile } from '@/components/ui/FileDropzone';
import { announce } from '@/lib/a11y';
import { useAuthStore } from '@/stores/auth';
import { getDataset } from '@/mocks/dataset';

const DESCRIPTION_MAX = 2000;

/** Deliberately loose: real addresses defeat clever patterns, and a false reject
 *  on the one screen where someone is already stuck is the worst outcome. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface HelpRequestValues {
  email: string;
  mobile: string;
  subject: string;
  description: string;
  files: DroppedFile[];
}

export interface HelpRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefills the subject when opened from a specific failure. */
  defaultSubject?: string;
}

/** The signed-in user's address, so nobody retypes their own email into a support
 *  form — a typo here means the reply never arrives. */
function useSignedInEmail(): string {
  const userId = useAuthStore((s) => s.userId);
  return useMemo(() => getDataset().users.find((u) => u.id === userId)?.email ?? '', [userId]);
}

export function HelpRequestDialog({ open, onOpenChange, defaultSubject }: HelpRequestDialogProps) {
  const signedInEmail = useSignedInEmail();
  const formId = useId();

  const [email, setEmail] = useState(signedInEmail);
  const [mobile, setMobile] = useState('');
  const [subject, setSubject] = useState(defaultSubject ?? '');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(signedInEmail);
    setMobile('');
    setSubject(defaultSubject ?? '');
    setDescription('');
    setFiles([]);
    setErrors({});
    setReference(null);
  }, [open, signedInEmail, defaultSubject]);

  const clearError = useCallback((name: string) => {
    setErrors((e) => {
      if (!(name in e)) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
  }, []);

  const submit = useCallback(() => {
    const found: Record<string, string> = {};
    if (!email.trim()) found.email = 'We need an address to reply to.';
    else if (!EMAIL.test(email.trim())) found.email = 'That does not look like an email address.';
    if (!subject.trim()) found.subject = 'A few words about the problem.';
    if (!description.trim()) found.description = 'Describe what went wrong, even briefly.';

    setErrors(found);
    if (Object.keys(found).length > 0) {
      announce('Check the highlighted fields');
      return;
    }

    // ASSUMPTION (Architect-owned): there is no support backend. Where attachments
    // are stored, who can read them and how long they are kept is a compliance
    // decision, not a UI one — nothing here leaves the browser.
    setReference(`AV-${4000 + (subject.length * 37 + description.length) % 900}`);
    announce('Help request sent');
  }, [email, subject, description]);

  if (reference) {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Request sent"
        footer={
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3.5 py-1">
          <p className="flex items-center gap-2 text-[length:var(--fs-body)] text-text">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-ok-fg" aria-hidden="true" />
            We have your request, and a copy is in your inbox.
          </p>
          <KeyValueList
            layout="stacked"
            boxed
            items={[
              { label: 'Reference', value: reference, mono: true },
              { label: 'Sent to', value: email, mono: true },
              {
                label: 'Attached',
                value: files.length
                  ? `${files.length} ${files.length === 1 ? 'screenshot' : 'screenshots'}`
                  : 'Nothing',
              },
            ]}
          />
          {/* Says the thing people would otherwise write in a second time to ask. */}
          <p className="text-[length:var(--fs-small)] text-text-secondary">
            You can keep connecting while you wait — nothing is blocked.
          </p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Need help connecting?"
      description="Tell us what happened. We reply by email, usually within one business day."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form={formId}>
            Send request
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="space-y-3 py-1"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={email}
            hint="Where we send the reply."
            error={errors.email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError('email');
            }}
          />
          {/* Optional, and it says why it is asked — a required phone number on a
              help form is a barrier and an unexplained ask for personal data. */}
          <Input
            label="Mobile (optional)"
            type="tel"
            value={mobile}
            placeholder="+1 555 0100"
            hint="Only if you would rather we call."
            onChange={(e) => setMobile(e.target.value)}
          />
        </div>

        <Input
          label="Subject"
          value={subject}
          placeholder="Azure setup script fails in Cloud Shell"
          error={errors.subject}
          onChange={(e) => {
            setSubject(e.target.value);
            clearError('subject');
          }}
        />

        <Textarea
          label="Description"
          rows={3}
          value={description}
          maxLength={DESCRIPTION_MAX}
          showCount
          placeholder="What you tried, what happened, and any error text you saw."
          hint="Paste error messages as text where you can — it is easier to search than a screenshot."
          error={errors.description}
          onChange={(e) => {
            setDescription(e.target.value);
            clearError('description');
          }}
        />

        <FileDropzone
          label="Screenshots (optional)"
          files={files}
          onChange={setFiles}
          hint="PNG or JPG · up to 5 files · 10 MB each"
          compact
        />
      </form>
    </Dialog>
  );
}
