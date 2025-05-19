import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Clear existing data
  console.log("Deleting existing categories...");
  await prisma.category.deleteMany({});

  console.log("Deleting existing vwTypes...");
  await prisma.vWType.deleteMany({});

  console.log("Existing data cleared.");

  // Create Categories
  const category1 = await prisma.category.upsert({
    where: { name: "Body" },
    update: {},
    create: {
      name: "Body",
      slug: "body",
      description:
        "Guides and tips on sheet metal, rust repair, doors, fenders, and paintwork for classic VWs.",
      sortOrder: 0,
    },
  });

  const category2 = await prisma.category.upsert({
    where: { name: "Brakes" },
    update: {},
    create: {
      name: "Brakes",
      slug: "brakes",
      description:
        "How-tos and troubleshooting for brakes, master cylinders, and brake lines.",
      sortOrder: 1,
    },
  });

  const category3 = await prisma.category.upsert({
    where: { name: "Chassis" },
    update: {},
    create: {
      name: "Chassis",
      slug: "chassis",
      description:
        "Information on frame, floor pans, and underbody structure specific to air-cooled VWs.",
      sortOrder: 2,
    },
  });

  const category4 = await prisma.category.upsert({
    where: { name: "Electrical" },
    update: {},
    create: {
      name: "Electrical",
      slug: "electrical",
      description:
        "Wiring, lighting, charging systems, and fixes for 6V and 12V VW electrical issues.",
      sortOrder: 3,
    },
  });

  const category5 = await prisma.category.upsert({
    where: { name: "Engine" },
    update: {},
    create: {
      name: "Engine",
      slug: "engine",
      description:
        "Maintenance, tuning, rebuilding, and upgrades for classic air-cooled VW engines.",
      sortOrder: 4,
    },
  });

  const category6 = await prisma.category.upsert({
    where: { name: "Interior" },
    update: {},
    create: {
      name: "Interior",
      slug: "interior",
      description:
        "Restoration and customization of seats, dashboards, carpets, and headliners.",
      sortOrder: 5,
    },
  });

  const category7 = await prisma.category.upsert({
    where: { name: "Suspension" },
    update: {},
    create: {
      name: "Suspension",
      slug: "suspension",
      description:
        "Repair and modification of beams, shocks, torsion bars, and ride height on VWs.",
      sortOrder: 6,
    },
  });

  const category8 = await prisma.category.upsert({
    where: { name: "Tools & Procedures" },
    update: {},
    create: {
      name: "Tools & Procedures",
      slug: "tools-procedures",
      description:
        "Essential tools, workshop methods, and best practices for DIY VW repair, maintenance and restoration.",
      sortOrder: 7,
    },
  });

  const category9 = await prisma.category.upsert({
    where: { name: "Transaxle" },
    update: {},
    create: {
      name: "Transaxle",
      slug: "transaxle",
      description:
        "Work on gearboxes, clutches, shift linkage, and axle setups in vintage VWs.",
      sortOrder: 8,
    },
  });

  const category10 = await prisma.category.upsert({
    where: { name: "Racing" },
    update: {},
    create: {
      name: "Racing",
      slug: "racing",
      description:
        "Performance tuning, race builds, and event coverage focused on classic VW motorsports.",
      sortOrder: 9,
    },
  });

  const category11 = await prisma.category.upsert({
    where: { name: "Restorations" },
    update: {},
    create: {
      name: "Restorations",
      slug: "restorations",
      description:
        "Step-by-step restorations, project overviews, and before-and-after builds of vintage VWs.",
      sortOrder: 10,
    },
  });

  const category12 = await prisma.category.upsert({
    where: { name: "Wheels & Tires" },
    update: {},
    create: {
      name: "Wheels & Tires",
      slug: "wheels-tires",
      description:
        "Wheel alignment, tire selection, and performance upgrades for classic VWs.",
      sortOrder: 11,
    },
  });

  console.log(
    `Created categories:`,
    category1.name,
    category2.name,
    category3.name,
    category4.name,
    category5.name,
    category6.name,
    category7.name,
    category8.name,
    category9.name,
    category10.name,
    category11.name,
    category12.name,
  );

  // Create VW Types
  const vwType1 = await prisma.vWType.upsert({
    where: { slug: "beetle" },
    update: {},
    create: {
      name: "Beetle",
      slug: "beetle",
      description:
        "The iconic air-cooled Volkswagen Beetle, from classic split-windows to late models.",
      sortOrder: 0,
    },
  });

  const vwType2 = await prisma.vWType.upsert({
    where: { slug: "ghia" },
    update: {},
    create: {
      name: "Ghia",
      slug: "ghia",
      description:
        "The elegant Karmann Ghia, combining Italian styling with VW reliability.",
      sortOrder: 1,
    },
  });

  const vwType3 = await prisma.vWType.upsert({
    where: { slug: "thing" },
    update: {},
    create: {
      name: "Thing",
      slug: "thing",
      description:
        "The rugged Type 181, known as the Thing in the US, designed for military and civilian use.",
      sortOrder: 2,
    },
  });

  const vwType4 = await prisma.vWType.upsert({
    where: { slug: "bus" },
    update: {},
    create: {
      name: "Bus",
      slug: "bus",
      description:
        "The versatile Type 2 Transporter, from early splits to late bays, serving as vans, campers, and more.",
      sortOrder: 3,
    },
  });

  const vwType5 = await prisma.vWType.upsert({
    where: { slug: "off-road" },
    update: {},
    create: {
      name: "Off-Road",
      slug: "off-road",
      description:
        "VW's off-road vehicles including the Iltis, Syncro, and lifted variants of standard models.",
      sortOrder: 4,
    },
  });

  const vwType6 = await prisma.vWType.upsert({
    where: { slug: "type-3" },
    update: {},
    create: {
      name: "Type 3",
      slug: "type-3",
      description:
        "The Notchback, Fastback, and Squareback models, featuring the pancake engine.",
      sortOrder: 5,
    },
  });

  const vwType7 = await prisma.vWType.upsert({
    where: { slug: "type-4" },
    update: {},
    create: {
      name: "Type 4",
      slug: "type-4",
      description:
        "The larger 411/412 models and Porsche 914, sharing the Type 4 engine platform.",
      sortOrder: 6,
    },
  });

  const vwType8 = await prisma.vWType.upsert({
    where: { slug: "all" },
    update: {},
    create: {
      name: "All",
      slug: "all",
      description:
        "Content applicable to all air-cooled Volkswagen models and platforms.",
      sortOrder: 7,
    },
  });

  console.log(
    `Created VW Types:`,
    vwType1.name,
    vwType2.name,
    vwType3.name,
    vwType4.name,
    vwType5.name,
    vwType6.name,
    vwType7.name,
    vwType8.name,
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
