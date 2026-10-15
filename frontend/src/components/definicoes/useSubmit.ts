import { useState, type FormEvent } from 'react';

export function useSubmit(fn: () => Promise<void> | void) {
  const [submitting, setSubmitting] = useState(false);
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fn();
    } finally {
      setSubmitting(false);
    }
  }
  return { submitting, onSubmit };
}
