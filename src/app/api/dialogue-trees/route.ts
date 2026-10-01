import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { dialogueTrees, users, type DialogueTreeNode } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const createTreeSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  language: z.string().min(1),
  initialPhrase: z.string().max(500).optional(),
});

// GET /api/dialogue-trees — list user's dialogue trees
export async function GET() {
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

  const trees = await db.query.dialogueTrees.findMany({
    where: eq(dialogueTrees.userId, dbUser.id),
    orderBy: [desc(dialogueTrees.updatedAt)],
  });

  return NextResponse.json({ trees });
}

// POST /api/dialogue-trees — create a new dialogue tree
export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const result = createTreeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", issues: result.error.issues },
      { status: 400 },
    );
  }

  const { title, language, initialPhrase } = result.data;

  // Default phrase in an empty Dialogue tree canvas is "Hello, how are you?"
  const rootText = initialPhrase?.trim() || "Hello, how are you?";
  const rootNode: DialogueTreeNode = {
    id: uuidv4(),
    parentId: null,
    text: rootText,
    childrenIds: [],
    x: 100,
    y: 280,
  };

  const [newTree] = await db
    .insert(dialogueTrees)
    .values({
      userId: dbUser.id,
      title,
      language,
      nodes: [rootNode],
      pan: { x: 0, y: 0 },
      zoom: 1,
    })
    .returning();

  return NextResponse.json({ tree: newTree }, { status: 201 });
}
