import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { dictionaryLists, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateListSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  dictionaryIds: z.array(z.string().uuid()).min(1).optional(),
  positions: z
    .record(
      z.string(),
      z.object({
        x: z.number(),
        y: z.number(),
      }),
    )
    .optional(),
  savedPhrases: z
    .array(
      z.object({
        id: z.string(),
        phrase: z.string(),
        translation: z.string(),
        matchedWords: z.array(z.string()).optional(),
        context: z.string().optional(),
        createdAt: z.string().optional(),
      }),
    )
    .optional(),
});

// PATCH /api/dictionary-lists/[id] — update pack positions or metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.supabaseId, user.id),
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await db.query.dictionaryLists.findFirst({
    where: and(
      eq(dictionaryLists.id, id),
      eq(dictionaryLists.userId, dbUser.id),
    ),
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Dictionary list not found" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const result = updateListSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", issues: result.error.issues },
      { status: 400 },
    );
  }

  const updateData: Partial<typeof dictionaryLists.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (result.data.positions !== undefined) {
    updateData.positions = result.data.positions;
  }
  if (result.data.title !== undefined) {
    updateData.title = result.data.title;
  }
  if (result.data.dictionaryIds !== undefined) {
    updateData.dictionaryIds = result.data.dictionaryIds;
  }
  if (result.data.savedPhrases !== undefined) {
    updateData.savedPhrases = result.data.savedPhrases;
  }

  const [updated] = await db
    .update(dictionaryLists)
    .set(updateData)
    .where(
      and(
        eq(dictionaryLists.id, id),
        eq(dictionaryLists.userId, dbUser.id),
      ),
    )
    .returning();

  return NextResponse.json({ list: updated });
}

// DELETE /api/dictionary-lists/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.supabaseId, user.id),
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await db.query.dictionaryLists.findFirst({
    where: and(
      eq(dictionaryLists.id, id),
      eq(dictionaryLists.userId, dbUser.id),
    ),
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Dictionary list not found" },
      { status: 404 },
    );
  }

  await db
    .delete(dictionaryLists)
    .where(
      and(
        eq(dictionaryLists.id, id),
        eq(dictionaryLists.userId, dbUser.id),
      ),
    );

  return NextResponse.json({ success: true });
}

