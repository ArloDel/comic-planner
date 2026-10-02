'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi' };
  }

  // Single-user email restriction check (if configured in env)
  const allowedEmail = process.env.ALLOWED_USER_EMAIL;
  if (allowedEmail && email.trim().toLowerCase() !== allowedEmail.trim().toLowerCase()) {
    return { error: 'Akses ditolak: Aplikasi ini dibatasi untuk satu pengguna pemilik.' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { error: `Gagal masuk: ${error.message}` };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
