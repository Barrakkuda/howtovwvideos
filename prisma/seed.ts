import { PrismaClient, VideoStatus } from "../generated/prisma"; // Adjust path if your client is elsewhere
// If your Prisma client is in node_modules/.prisma/client, the import would be:
// import { PrismaClient, VideoStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Clear existing data
  // Delete videos first due to foreign key constraint with categories
  console.log("Deleting existing videos...");
  await prisma.video.deleteMany({});

  console.log("Deleting existing categories...");
  await prisma.category.deleteMany({});

  console.log("Existing data cleared.");

  // Create Categories
  const category1 = await prisma.category.upsert({
    where: { name: "Tutorials" },
    update: {},
    create: {
      name: "Tutorials",
      description: "Step-by-step guides and educational content.",
    },
  });

  const category2 = await prisma.category.upsert({
    where: { name: "Product Demos" },
    update: {},
    create: {
      name: "Product Demos",
      description: "Showcasing product features and capabilities.",
    },
  });

  const category3 = await prisma.category.upsert({
    where: { name: "Behind the Scenes" },
    update: {},
    create: {
      name: "Behind the Scenes",
      description: "A look into the making of our videos and company culture.",
    },
  });

  console.log(
    `Created categories:`,
    category1.name,
    category2.name,
    category3.name,
  );

  // Create Videos
  const video1 = await prisma.video.upsert({
    where: { url: "https://example.com/video/nextjs-basics" },
    update: {},
    create: {
      videoId: Math.random().toString(36).substring(2, 12),
      title: "Next.js 101: The Basics",
      description: "A beginner-friendly introduction to Next.js.",
      url: "https://example.com/video/nextjs-basics",
      thumbnailUrl: "https://example.com/thumb/nextjs-basics.jpg",
      status: VideoStatus.PUBLISHED,
      categoryId: category1.id,
    },
  });

  const video2 = await prisma.video.upsert({
    where: { url: "https://example.com/video/prisma-setup" },
    update: {},
    create: {
      videoId: Math.random().toString(36).substring(2, 12),
      title: "Setting up Prisma with PostgreSQL",
      description:
        "Learn how to quickly set up Prisma ORM with a PostgreSQL database.",
      url: "https://example.com/video/prisma-setup",
      thumbnailUrl: "https://example.com/thumb/prisma-setup.jpg",
      status: VideoStatus.PUBLISHED,
      categoryId: category1.id,
    },
  });

  const video3 = await prisma.video.upsert({
    where: { url: "https://example.com/video/our-new-feature-X" },
    update: {},
    create: {
      videoId: Math.random().toString(36).substring(2, 12),
      title: "Introducing Feature X!",
      description: "Check out our latest and greatest Feature X in action.",
      url: "https://example.com/video/our-new-feature-X",
      thumbnailUrl: "https://example.com/thumb/feature-x.jpg",
      status: VideoStatus.DRAFT,
      categoryId: category2.id,
    },
  });

  const video4 = await prisma.video.upsert({
    where: { url: "https://example.com/video/team-day-out" },
    update: {},
    create: {
      videoId: Math.random().toString(36).substring(2, 12),
      title: "Team Day Out: Building Together",
      description: "A glimpse into our recent team-building event.",
      url: "https://example.com/video/team-day-out",
      thumbnailUrl: "https://example.com/thumb/team-day.jpg",
      status: VideoStatus.PUBLISHED,
      categoryId: category3.id,
    },
  });

  console.log(
    `Created videos:`,
    video1.title,
    video2.title,
    video3.title,
    video4.title,
  );

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
