import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FileDropzone, fileSize, type DroppedFile } from './FileDropzone';

function Harness(props: Partial<React.ComponentProps<typeof FileDropzone>> = {}) {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  return <FileDropzone files={files} onChange={setFiles} {...props} />;
}

function png(name: string, bytes = 1024): File {
  const file = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}

/** Drops files onto the zone. The picker path cannot carry a wrong-type file —
 *  userEvent honours the input's accept filter, exactly as a browser does — so the
 *  type check is only reachable, and only worth testing, through a drop. */
function drop(files: File[]): void {
  const zone = screen.getByText(/drop images here/i).closest('div');
  if (!zone) throw new Error('FileDropzone rendered without a drop target');
  fireEvent.drop(zone, { dataTransfer: { files } });
}

function input(): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!el) throw new Error('FileDropzone rendered without a file input');
  return el;
}

describe('fileSize', () => {
  it('scales the unit to the number', () => {
    expect(fileSize(512)).toBe('512 B');
    expect(fileSize(2048)).toBe('2 KB');
    expect(fileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('accepting files', () => {
  it('lists what was attached, with its size', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.upload(input(), png('cloudshell-error.png', 842 * 1024));

    expect(screen.getByText('cloudshell-error.png')).toBeInTheDocument();
    expect(screen.getByText('842 KB')).toBeInTheDocument();
  });

  it('removes one without disturbing the others', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.upload(input(), [png('one.png'), png('two.png')]);
    await user.click(screen.getByRole('button', { name: /remove one\.png/i }));

    expect(screen.queryByText('one.png')).not.toBeInTheDocument();
    expect(screen.getByText('two.png')).toBeInTheDocument();
  });
});

describe('refusing files', () => {
  it('says which file was the wrong type, and why', async () => {
    render(<Harness />);
    drop([new File(['x'], 'notes.txt', { type: 'text/plain' })]);

    expect(screen.getByText(/notes\.txt — not a supported image type/i)).toBeInTheDocument();
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
  });

  it('names the size limit it exceeded', async () => {
    const user = userEvent.setup();
    render(<Harness maxBytes={1024} />);
    await user.upload(input(), png('huge.png', 5000));

    expect(screen.getByText(/huge\.png — larger than 1 KB/i)).toBeInTheDocument();
  });

  it('stops at the file limit instead of silently dropping the extras', async () => {
    const user = userEvent.setup();
    render(<Harness maxFiles={2} />);
    await user.upload(input(), [png('a.png'), png('b.png'), png('c.png')]);

    expect(screen.getByText('a.png')).toBeInTheDocument();
    expect(screen.getByText('b.png')).toBeInTheDocument();
    expect(screen.getByText(/c\.png — over the 2-file limit/i)).toBeInTheDocument();
  });

  it('keeps the good files from a mixed drop', async () => {
    render(<Harness />);
    drop([png('good.png'), new File(['x'], 'bad.txt', { type: 'text/plain' })]);

    expect(screen.getByText('good.png')).toBeInTheDocument();
    expect(screen.getByText(/bad\.txt — not a supported image type/i)).toBeInTheDocument();
  });

  it('announces the attached count for screen readers', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.upload(input(), png('one.png'));

    expect(screen.getByRole('status')).toHaveTextContent('1 file attached.');
  });
});
