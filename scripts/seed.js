const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/interlude';

async function seed() {
  console.log('🌱 Seeding INTERLUDE database...');
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;

  // 1. Genres
  const genres = [
    { name: 'Action', slug: 'action' },
    { name: 'Adventure', slug: 'adventure' },
    { name: 'Animation', slug: 'animation' },
    { name: 'Biography', slug: 'biography' },
    { name: 'Comedy', slug: 'comedy' },
    { name: 'Crime', slug: 'crime' },
    { name: 'Documentary', slug: 'documentary' },
    { name: 'Drama', slug: 'drama' },
    { name: 'Fantasy', slug: 'fantasy' },
    { name: 'Film Noir', slug: 'film-noir' },
    { name: 'Horror', slug: 'horror font-semibold' },
    { name: 'Mystery', slug: 'mystery' },
    { name: 'Romance', slug: 'romance' },
    { name: 'Sci-Fi', slug: 'sci-fi' },
    { name: 'Thriller', slug: 'thriller' },
  ];

  for (const genre of genres) {
    await db.collection('genres').updateOne(
      { slug: genre.slug },
      { $set: genre },
      { upsert: true }
    );
  }
  console.log('✅ Genres seeded');

  // 2. Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@interlude.app';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const adminUser = {
    username: 'admin',
    email: adminEmail,
    password: hashedPassword,
    isAdmin: true,
    isVerified: true,
    isBlocked: false,
    onlineStatus: 'offline',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('users').updateOne(
    { email: adminEmail },
    { $set: adminUser },
    { upsert: true }
  );

  console.log(`✅ Admin user seeded: ${adminEmail}`);

  await mongoose.disconnect();
  console.log('🚀 Seeding complete!');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
