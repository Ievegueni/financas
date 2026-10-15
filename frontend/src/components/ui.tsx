import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-slate-900 focus:outline-none disabled:bg-slate-100';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  value: T;
  onChange: (v: T) => void;
  options: Record<T, string> | [T, string][];
}) {
  const entries = Array.isArray(options) ? options : (Object.entries(options) as [T, string][]);
  return (
    <select {...rest} value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
      {entries.map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );
}

type Variant = 'primary' | 'secondary' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-slate-900 text-white',
  secondary: 'border border-slate-300 bg-white text-slate-800',
  danger: 'border border-red-300 bg-white text-red-700',
};

export function Button({ variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60 ${variants[variant]} ${props.className ?? ''}`}
    />
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm text-red-600">
      {children}
    </p>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">{children}</span>;
}
