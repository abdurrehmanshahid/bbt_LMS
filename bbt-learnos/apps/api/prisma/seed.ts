import { PrismaClient, UserRole, ContentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

async function main(): Promise<void> {
  console.log('🌱 Seeding BBT LearnOS database...');

  // ─── Tracks ──────────────────────────────────────────────────────────────

  const tracks = await Promise.all([
    prisma.track.upsert({
      where: { slug: 'genai-agentic-ai' },
      update: {},
      create: {
        slug: 'genai-agentic-ai',
        title: 'GenAI + Agentic AI',
        description:
          'Master large language models, prompt engineering, RAG pipelines, and autonomous AI agents. Build production-grade AI systems.',
        icon: '🤖',
        trackNumber: 1,
        isActive: true,
      },
    }),
    prisma.track.upsert({
      where: { slug: 'cloud-mlops' },
      update: {},
      create: {
        slug: 'cloud-mlops',
        title: 'Cloud + MLOps',
        description:
          'AWS/GCP architecture, Kubernetes, CI/CD for ML pipelines, model deployment and monitoring at scale.',
        icon: '☁️',
        trackNumber: 2,
        isActive: true,
      },
    }),
    prisma.track.upsert({
      where: { slug: 'odoo-erp-development' },
      update: {},
      create: {
        slug: 'odoo-erp-development',
        title: 'Odoo ERP Development',
        description:
          'Custom Odoo module development, business process automation, and enterprise integration for Pakistan and MENA markets.',
        icon: '🏢',
        trackNumber: 3,
        isActive: true,
      },
    }),
    prisma.track.upsert({
      where: { slug: 'ai-integrated-fullstack' },
      update: {},
      create: {
        slug: 'ai-integrated-fullstack',
        title: 'AI-Integrated Full Stack',
        description:
          'Next.js, NestJS, PostgreSQL with AI features woven in — build full-stack products that companies actually hire for.',
        icon: '⚡',
        trackNumber: 4,
        isActive: true,
      },
    }),
    prisma.track.upsert({
      where: { slug: 'cybersecurity' },
      update: {},
      create: {
        slug: 'cybersecurity',
        title: 'Cybersecurity',
        description:
          'Network security, ethical hacking, SOC operations, and incident response. Cisco-aligned curriculum with hands-on labs.',
        icon: '🛡️',
        trackNumber: 5,
        isActive: true,
      },
    }),
    prisma.track.upsert({
      where: { slug: 'ui-ux-brand-design' },
      update: {},
      create: {
        slug: 'ui-ux-brand-design',
        title: 'UI/UX + Brand Design',
        description:
          'Product design, Figma, design systems, brand identity, and motion — for designers who want to work on real products.',
        icon: '🎨',
        trackNumber: 6,
        isActive: true,
      },
    }),
    prisma.track.upsert({
      where: { slug: 'ai-marketing-sales' },
      update: {},
      create: {
        slug: 'ai-marketing-sales',
        title: 'AI Marketing + Sales',
        description:
          'Performance marketing, Shopify e-commerce, AI copywriting, SEO, and growth. The track for the next generation of digital marketers.',
        icon: '📈',
        trackNumber: 7,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${tracks.length} tracks`);

  // ─── Cybersecurity Modules (Track 05) ────────────────────────────────────

  const cyberTrack = tracks[4]!;

  const modules = await Promise.all([
    prisma.module.upsert({
      where: { trackId_order: { trackId: cyberTrack.id, order: 1 } },
      update: {},
      create: {
        trackId: cyberTrack.id,
        order: 1,
        title: 'Networking Fundamentals',
        description:
          'OSI model, TCP/IP stack, subnetting, routing protocols, and network topology. The bedrock of all cybersecurity work.',
        estimatedMinutes: 90,
        passingScore: 60,
      },
    }),
    prisma.module.upsert({
      where: { trackId_order: { trackId: cyberTrack.id, order: 2 } },
      update: {},
      create: {
        trackId: cyberTrack.id,
        order: 2,
        title: 'Linux for Security Professionals',
        description:
          'Command line mastery, file permissions, process management, and scripting for security tooling.',
        estimatedMinutes: 120,
        passingScore: 60,
      },
    }),
    prisma.module.upsert({
      where: { trackId_order: { trackId: cyberTrack.id, order: 3 } },
      update: {},
      create: {
        trackId: cyberTrack.id,
        order: 3,
        title: 'Threat Modelling + OWASP',
        description:
          'Identify, classify, and prioritise threats. STRIDE framework, OWASP Top 10, and attack surface analysis.',
        estimatedMinutes: 100,
        passingScore: 60,
      },
    }),
    prisma.module.upsert({
      where: { trackId_order: { trackId: cyberTrack.id, order: 4 } },
      update: {},
      create: {
        trackId: cyberTrack.id,
        order: 4,
        title: 'Ethical Hacking + Penetration Testing',
        description:
          'Reconnaissance, scanning, exploitation, and post-exploitation. Kali Linux toolchain with authorised lab environments.',
        estimatedMinutes: 180,
        passingScore: 60,
      },
    }),
    prisma.module.upsert({
      where: { trackId_order: { trackId: cyberTrack.id, order: 5 } },
      update: {},
      create: {
        trackId: cyberTrack.id,
        order: 5,
        title: 'SOC Operations + Incident Response',
        description:
          'Security monitoring, SIEM, alert triage, incident response playbooks, and forensics fundamentals.',
        estimatedMinutes: 150,
        passingScore: 60,
      },
    }),
  ]);

  console.log(`✅ Created ${modules.length} modules for Cybersecurity track`);

  // ─── Concepts for Module 1 ───────────────────────────────────────────────

  const networkingModule = modules[0]!;

  const concepts = await Promise.all([
    prisma.concept.upsert({
      where: { moduleId_order: { moduleId: networkingModule.id, order: 1 } },
      update: {},
      create: {
        moduleId: networkingModule.id,
        title: 'What is the OSI Model?',
        description: 'The 7-layer framework that defines how data travels across a network.',
        order: 1,
      },
    }),
    prisma.concept.upsert({
      where: { moduleId_order: { moduleId: networkingModule.id, order: 2 } },
      update: {},
      create: {
        moduleId: networkingModule.id,
        title: 'TCP/IP vs OSI',
        description: 'How the real-world TCP/IP stack maps to the OSI model.',
        order: 2,
      },
    }),
    prisma.concept.upsert({
      where: { moduleId_order: { moduleId: networkingModule.id, order: 3 } },
      update: {},
      create: {
        moduleId: networkingModule.id,
        title: 'Subnetting and CIDR',
        description: 'IP address allocation, subnet masks, and CIDR notation.',
        order: 3,
      },
    }),
    prisma.concept.upsert({
      where: { moduleId_order: { moduleId: networkingModule.id, order: 4 } },
      update: {},
      create: {
        moduleId: networkingModule.id,
        title: 'What is a Firewall?',
        description: 'Packet filtering, stateful inspection, and next-gen firewall capabilities.',
        order: 4,
      },
    }),
  ]);

  console.log(`✅ Created ${concepts.length} concepts`);

  // Concept prerequisites: TCP/IP vs OSI requires OSI Model
  // Subnetting requires TCP/IP vs OSI. Firewall requires Subnetting.
  await prisma.conceptPrerequisite.createMany({
    data: [
      { conceptId: concepts[1]!.id, prerequisiteId: concepts[0]!.id },
      { conceptId: concepts[2]!.id, prerequisiteId: concepts[1]!.id },
      { conceptId: concepts[3]!.id, prerequisiteId: concepts[2]!.id },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created concept prerequisites');

  // ─── Test Users ──────────────────────────────────────────────────────────

  const hashedPassword = await bcrypt.hash('Password123!', BCRYPT_COST);

  const learner = await prisma.user.upsert({
    where: { email: 'learner@bbt.edu.pk' },
    update: {},
    create: {
      email: 'learner@bbt.edu.pk',
      passwordHash: hashedPassword,
      name: 'Test Learner',
      role: UserRole.LEARNER,
      emailVerified: true,
      learnerProfile: {
        create: {
          currentTrackId: cyberTrack.id,
          streakDays: 3,
        },
      },
    },
  });

  const creator = await prisma.user.upsert({
    where: { email: 'creator@bbt.edu.pk' },
    update: {},
    create: {
      email: 'creator@bbt.edu.pk',
      passwordHash: hashedPassword,
      name: 'Test Creator',
      role: UserRole.CREATOR,
      emailVerified: true,
      creatorProfile: {
        create: {
          tier: 2,
          displayName: 'bbt_creator',
          bio: 'Cybersecurity professional with 8 years of industry experience.',
          qualityScore: 0.85,
          isVerified: true,
          revenueSharePercent: 70,
        },
      },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bbt.edu.pk' },
    update: {},
    create: {
      email: 'admin@bbt.edu.pk',
      passwordHash: hashedPassword,
      name: 'BBT Admin',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  console.log('✅ Created test users (learner, creator, admin) — password: Password123!');

  // ─── Sample content ───────────────────────────────────────────────────────

  await prisma.content.upsert({
    where: { id: 'seed-content-001' },
    update: {},
    create: {
      id: 'seed-content-001',
      creatorId: creator.id,
      trackId: cyberTrack.id,
      moduleId: networkingModule.id,
      conceptId: concepts[3]!.id,
      type: 'REEL',
      title: 'What is a Firewall? (3-min explainer)',
      description:
        'A fast-paced visual breakdown of how firewalls filter traffic and protect your network perimeter.',
      status: ContentStatus.APPROVED,
      tags: ['firewall', 'network-security', 'beginner'],
      duration: 180,
    },
  });

  console.log('✅ Created sample approved content');

  // ─── Free enrollment for test learner ────────────────────────────────────

  await prisma.enrollment.upsert({
    where: { learnerId_trackId: { learnerId: learner.id, trackId: cyberTrack.id } },
    update: {},
    create: {
      learnerId: learner.id,
      trackId: cyberTrack.id,
      plan: 'FREE',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Enrolled test learner in Cybersecurity (free)');
  console.log('\n🎉 Seed complete.');
  console.log('   learner@bbt.edu.pk  — LEARNER role');
  console.log('   creator@bbt.edu.pk  — CREATOR role (Tier 2)');
  console.log('   admin@bbt.edu.pk    — ADMIN role');
  console.log('   password: Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
