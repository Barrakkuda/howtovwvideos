import { PrismaClient, VideoStatus, VideoPlatform } from "../generated/prisma"; // Adjust path if your client is elsewhere
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
  const videoId1 = Math.random().toString(36).substring(2, 12);
  const video1 = await prisma.video.upsert({
    where: { videoId: videoId1 },
    update: {},
    create: {
      platform: VideoPlatform.YOUTUBE,
      videoId: videoId1,
      title: "Next.js 101: The Basics",
      description: "A beginner-friendly introduction to Next.js.",
      url: `https://www.youtube.com/watch?v=${videoId1}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId1}/hqdefault.jpg`,
      status: VideoStatus.PUBLISHED,
      categoryId: category1.id,
    },
  });

  const videoId2 = Math.random().toString(36).substring(2, 12);
  const video2 = await prisma.video.upsert({
    where: { videoId: videoId2 },
    update: {},
    create: {
      platform: VideoPlatform.YOUTUBE,
      videoId: videoId2,
      title: "Setting up Prisma with PostgreSQL",
      description:
        "Learn how to quickly set up Prisma ORM with a PostgreSQL database.",
      url: `https://www.youtube.com/watch?v=${videoId2}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId2}/hqdefault.jpg`,
      status: VideoStatus.PUBLISHED,
      categoryId: category1.id,
    },
  });

  const videoId3 = Math.random().toString(36).substring(2, 12);
  const video3 = await prisma.video.upsert({
    where: { videoId: videoId3 },
    update: {},
    create: {
      platform: VideoPlatform.YOUTUBE,
      videoId: videoId3,
      title: "Introducing Feature X!",
      description: "Check out our latest and greatest Feature X in action.",
      url: `https://www.youtube.com/watch?v=${videoId3}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId3}/hqdefault.jpg`,
      status: VideoStatus.DRAFT,
      categoryId: category2.id,
    },
  });

  const videoId4 = Math.random().toString(36).substring(2, 12);
  const video4 = await prisma.video.upsert({
    where: { videoId: videoId4 },
    update: {},
    create: {
      platform: VideoPlatform.YOUTUBE,
      videoId: videoId4,
      title: "Team Day Out: Building Together",
      description: "A glimpse into our recent team-building event.",
      url: `https://www.youtube.com/watch?v=${videoId4}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId4}/hqdefault.jpg`,
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
