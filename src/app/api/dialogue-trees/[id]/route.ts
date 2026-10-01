import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { dialogueTrees, users, type DialogueTreeNode } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateTreeSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  language: z.string().optional(),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        parentId: z.string().nullable(),
        text: z.string(),
        translation: z.string().optional(),
        childrenIds: z.array(z.string()),
        x: z.number(),
        y: z.number(),
        aiSuggestions: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  pan: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  zoom: z.number().optional(),
});

// GET /api/dialogue-trees/[id]
export async function GET(
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

  const tree = await db.query.dialogueTrees.findFirst({
    where: and(
      eq(dialogueTrees.id, id),
      eq(dialogueTrees.userId, dbUser.id),
    ),
  });

  if (!tree) {
    return NextResponse.json({ error: "Dialogue tree not found" }, { status: 404 });
  }

  return NextResponse.json({ tree });
}

// PATCH /api/dialogue-trees/[id] — update tree nodes, pan/zoom, or metadata
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

  const existing = await db.query.dialogueTrees.findFirst({
    where: and(
      eq(dialogueTrees.id, id),
      eq(dialogueTrees.userId, dbUser.id),
    ),
  });

  if (!existing) {
    return NextResponse.json({ error: "Dialogue tree not found" }, { status: 404 });
  }

  const body = await request.json();
  const result = updateTreeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", issues: result.error.issues },
      { status: 400 },
    );
  }

  const updateData: Partial<typeof dialogueTrees.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (result.data.title !== undefined) updateData.title = result.data.title;
  if (result.data.language !== undefined) updateData.language = result.data.language;
  if (result.data.nodes !== undefined)
    updateData.nodes = result.data.nodes as DialogueTreeNode[];
  if (result.data.pan !== undefined) updateData.pan = result.data.pan;
  if (result.data.zoom !== undefined) updateData.zoom = result.data.zoom;

  const [updated] = await db
    .update(dialogueTrees)
    .set(updateData)
    .where(eq(dialogueTrees.id, id))
    .returning();

  return NextResponse.json({ tree: updated });
}

// DELETE /api/dialogue-trees/[id]
export async function DELETE(
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

  const existing = await db.query.dialogueTrees.findFirst({
    where: and(
      eq(dialogueTrees.id, id),
      eq(dialogueTrees.userId, dbUser.id),
    ),
  });

  if (!existing) {
    return NextResponse.json({ error: "Dialogue tree not found" }, { status: 404 });
  }

  await db.delete(dialogueTrees).where(eq(dialogueTrees.id, id));

  return NextResponse.json({ success: true });
}
