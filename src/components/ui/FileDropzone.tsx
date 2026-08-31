import { useCallback, useId, useRef, useState, type DragEvent } from 'react';
import { ImageUp, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

export interface DroppedFile {
  /** Stable key for list rendering and removal. */
  id: string;
  name: string;
  size: number;
}

/** Bytes → a short human size. Kept local; `format.ts` deals in counts and dates. */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface FileDropzoneProps {
  files: DroppedFile[];
  onChange: (files: DroppedFile[]) => void;
  label?: string;
  /** Accepted MIME prefixes/types, e.g. ['image/png', 'image/jpeg']. */
  accept?: string[];
  maxFiles?: number;
  maxBytes?: number;
  /** Human description of the limits, shown before anyone picks a file. */
  hint?: string;
  /** Shorter drop target, for dialogs where vertical space is tight. */
  compact?: boolean;
  className?: string;
}

/**
 * A drag-and-drop file picker with a real, keyboard-reachable browse button.
 *
 * The drop target is a plain div: making it focusable would put a control in the
 * tab order that keyboard users cannot actually drop onto. The button next to it
 * does the same job and is operable by everyone. Rejections are explained inline
 * and announced, rather than files silently vanishing.
 */
export function FileDropzone({
  files,
  onChange,
  label = 'Attachments',
  accept = ['image/png', 'image/jpeg'],
  maxFiles = 5,
  maxBytes = 10 * 1024 * 1024,
  hint,
  compact = false,
  className,
}: FileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const seq = useRef(0);

  const add = useCallback(
    (incoming: File[]) => {
      const problems: string[] = [];
      const accepted: DroppedFile[] = [];

      for (const file of incoming) {
        if (accept.length && !accept.includes(file.type)) {
          problems.push(`${file.name} — not a supported image type`);
          continue;
        }
        if (file.size > maxBytes) {
          problems.push(`${file.name} — larger than ${fileSize(maxBytes)}`);
          continue;
        }
        if (files.length + accepted.length >= maxFiles) {
          problems.push(`${file.name} — over the ${maxFiles}-file limit`);
          continue;
        }
        seq.current += 1;
        accepted.push({ id: `f${seq.current}`, name: file.name, size: file.size });
      }

      setRejected(problems);
      if (accepted.length) onChange([...files, ...accepted]);
    },
    [accept, files, maxBytes, maxFiles, onChange],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setOver(false);
      add(Array.from(e.dataTransfer.files));
    },
    [add],
  );

  const full = files.length >= maxFiles;

  return (
    <div className={cn('w-full', className)}>
      <span className="mb-1 block text-[length:var(--fs-small)] font-medium text-text-secondary">{label}</span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'rounded-[var(--r-md)] border border-dashed px-4 text-center transition-colors',
          compact ? 'py-3' : 'py-5',
          over ? 'border-accent bg-accent-tint' : 'border-border-strong bg-surface-2',
        )}
      >
        <ImageUp className={cn('mx-auto text-text-tertiary', compact ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden="true" />
        <p className={cn('text-[length:var(--fs-small)] text-text', compact ? 'mt-1' : 'mt-1.5')}>
          Drop images here, or{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={full}
            className="text-accent-text underline underline-offset-2 hover:text-text disabled:cursor-not-allowed disabled:text-text-tertiary disabled:no-underline"
          >
            browse
          </button>
        </p>
        {hint && <p className="mt-0.5 text-[length:var(--fs-small)] text-text-tertiary">{hint}</p>}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={accept.join(',')}
          className="sr-only"
          onChange={(e) => {
            add(Array.from(e.target.files ?? []));
            // Allow re-picking the same file after removing it.
            e.target.value = '';
          }}
        />
      </div>

      {/* Both the additions and the refusals are announced; a file that silently
          fails to attach is worse than one that explains itself. */}
      <div role="status" aria-live="polite" className="sr-only">
        {files.length} {files.length === 1 ? 'file' : 'files'} attached.
        {rejected.length ? ` ${rejected.length} rejected.` : ''}
      </div>

      {rejected.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {rejected.map((problem) => (
            <li key={problem} className="text-[length:var(--fs-small)] text-[var(--crit-fg)]">
              {problem}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="inline-flex items-center gap-2 rounded-[var(--r-sm)] border border-border bg-surface-2 py-1 pl-2 pr-1"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
              <span className="max-w-[12rem] truncate text-[length:var(--fs-small)] text-text">{file.name}</span>
              <span className="tnum text-[length:var(--fs-micro)] text-text-tertiary">{fileSize(file.size)}</span>
              <IconButton
                label={`Remove ${file.name}`}
                size="sm"
                onClick={() => {
                  setRejected([]);
                  onChange(files.filter((f) => f.id !== file.id));
                }}
              >
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
