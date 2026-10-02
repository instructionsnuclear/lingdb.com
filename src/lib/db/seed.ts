import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';
import { generateRandomUsername } from '../utils/random-username';

const connectionString = process.env.DATABASE_URL!;

async function seed() {
  console.log('🌱 Starting database seed...');

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    // Create a demo user
    const [demoUser] = await db
      .insert(schema.users)
      .values({
        supabaseId: 'demo-supabase-id',
        email: 'demo@lingdb.com',
        username: generateRandomUsername(),
        locale: 'en',
        tier: 'FREE',
        aiCredits: 30,
      })
      .onConflictDoNothing({ target: schema.users.email })
      .returning();

    if (!demoUser) {
      console.log('Demo user already exists, skipping...');
      await client.end();
      return;
    }

    console.log(`✅ Created demo user: ${demoUser.username} (${demoUser.email})`);

    // Create a demo dictionary
    const [demoDictionary] = await db
      .insert(schema.dictionaries)
      .values({
        title: 'Basic French',
        description: 'Common French words for beginners',
        language: 'fr',
        isPublic: true,
        userId: demoUser.id,
      })
      .returning();

    console.log(`✅ Created demo dictionary: ${demoDictionary.title}`);

    // Add some demo words
    const demoWords = [
      { title: 'bonjour', translation: 'hello', order: 0 },
      { title: 'merci', translation: 'thank you', order: 1 },
      { title: 'au revoir', translation: 'goodbye', order: 2 },
      { title: "s'il vous plaît", translation: 'please', order: 3 },
      { title: 'oui', translation: 'yes', order: 4 },
      { title: 'non', translation: 'no', order: 5 },
      { title: 'chat', translation: 'cat', order: 6 },
      { title: 'chien', translation: 'dog', order: 7 },
      { title: 'maison', translation: 'house', order: 8 },
      { title: 'livre', translation: 'book', order: 9 },
    ];

    const insertedWords = await db
      .insert(schema.words)
      .values(demoWords.map((w) => ({ ...w, dictionaryId: demoDictionary.id })))
      .returning();

    console.log(`✅ Added ${insertedWords.length} demo words`);

    // Update user totalWords counter
    await db
      .update(schema.users)
      .set({ totalWords: insertedWords.length })
      .where(eq(schema.users.id, demoUser.id));

    // Add example phrases for the first word
    const [bonjourWord] = insertedWords;
    await db.insert(schema.examplePhrases).values([
      {
        phrase: 'Bonjour, comment allez-vous ?',
        translation: 'Hello, how are you?',
        wordId: bonjourWord.id,
        isAiGenerated: false,
      },
      {
        phrase: 'Bonjour tout le monde !',
        translation: 'Hello everyone!',
        wordId: bonjourWord.id,
        isAiGenerated: true,
      },
    ]);

    console.log(`✅ Added example phrases for "bonjour"`);

    // Seed default site globals
    await db
      .insert(schema.siteGlobals)
      .values({
        id: 'default',
        navLinks: [
          {
            id: 'nav-dashboard',
            href: '/dashboard',
            labelKey: 'dashboard',
            icon: 'LayoutDashboard',
            authRequired: true,
            enabled: true,
            order: 1,
          },
          {
            id: 'nav-tools',
            href: '/tools',
            labelKey: 'tools',
            icon: 'Languages',
            authRequired: false,
            enabled: true,
            order: 2,
          },
          {
            id: 'nav-games',
            href: '/games',
            labelKey: 'games',
            icon: 'Gamepad2',
            authRequired: false,
            enabled: true,
            order: 3,
          },
          {
            id: 'nav-library',
            href: '/library',
            labelKey: 'library',
            icon: 'Library',
            authRequired: false,
            enabled: false,
            order: 4,
          },
          {
            id: 'nav-leaderboards',
            href: '/leaderboards',
            labelKey: 'leaderboards',
            icon: 'Trophy',
            authRequired: false,
            enabled: false,
            order: 5,
          },
          {
            id: 'nav-blogs',
            href: '/blogs',
            labelKey: 'blogs',
            icon: 'FileText',
            authRequired: false,
            enabled: false,
            order: 6,
          },
        ],
        footerLinks: [
          {
            id: 'foot-privacy',
            href: '/privacy',
            labelKey: 'privacy.title',
            category: 'legal',
            enabled: true,
            order: 1,
          },
          {
            id: 'foot-terms',
            href: '/terms',
            labelKey: 'terms.title',
            category: 'legal',
            enabled: true,
            order: 2,
          },
          {
            id: 'foot-cookies',
            href: '/cookies',
            labelKey: 'cookies.title',
            category: 'legal',
            enabled: true,
            order: 3,
          },
        ],
      })
      .onConflictDoNothing();

    console.log(`✅ Seeded default site globals`);

    console.log('\n🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
