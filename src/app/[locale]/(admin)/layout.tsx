import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/${locale}/admin/overview`);
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.supabaseId, user.id),
  });

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[var(--bg)]">
      <AdminSidebar locale={locale} />
      <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-12">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
