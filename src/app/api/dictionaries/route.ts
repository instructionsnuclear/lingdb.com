import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { dictionaries, words, users } from '@/lib/db/schema';
import { eq, sql, ilike, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { generateUniqueSlug } from '@/lib/utils/slugify';

const createDictionarySchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  language: z.enum(['en', 'fr', 'de', 'es', 'tr']),
  isPublic: z.boolean(),
});

// GET /api/dictionaries — list user's dictionaries (with optional search)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.supabaseId, user.id),
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  const baseCondition = eq(dictionaries.userId, dbUser.id);

  const results = await db
    .select({
      id: dictionaries.id,
      title: dictionaries.title,
      description: dictionaries.description,
      language: dictionaries.language,
      isPublic: dictionaries.isPublic,
      userId: dictionaries.userId,
      createdAt: dictionaries.createdAt,
      updatedAt: dictionaries.updatedAt,
      wordCount: sql<number>`count(${words.id})::int`,
    })
    .from(dictionaries)
    .leftJoin(words, eq(words.dictionaryId, dictionaries.id))
    .where(
      query
        ? and(baseCondition, ilike(dictionaries.title, `%${query}%`))
        : baseCondition
    )
    .groupBy(dictionaries.id)
    .orderBy(desc(dictionaries.updatedAt));

  return NextResponse.json({ dictionaries: results });
}

// POST /api/dictionaries — create dictionary
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.supabaseId, user.id),
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await request.json();
  const result = createDictionarySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: result.error.issues },
      { status: 400 }
    );
  }

  // Check dictionary limit for free users (10 max)
  if (dbUser.tier === 'FREE') {
    const count = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dictionaries)
      .where(eq(dictionaries.userId, dbUser.id));

    if (count[0].count >= 10) {
      return NextResponse.json(
        {
          error:
            'Free users can create up to 10 dictionaries. Upgrade to Premium for unlimited.',
        },
        { status: 403 }
      );
    }
  }

  const slug = await generateUniqueSlug(result.data.title);

  const [newDict] = await db
    .insert(dictionaries)
    .values({
      title: result.data.title,
      description: result.data.description || null,
      language: result.data.language,
      isPublic: result.data.isPublic,
      userId: dbUser.id,
      slug,
    })
    .returning();

  return NextResponse.json({ dictionary: newDict }, { status: 201 });
}
