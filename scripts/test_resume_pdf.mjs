import fs from 'fs';
import { buildResumePdfFromStructured } from '../server/services/pdfGenerator.js';
import { PDFParse } from 'pdf-parse';

const sampleResume = {
  header: {
    name: 'Aarav Sharma',
    title: 'Senior Fullstack & AI Solutions Architect',
    email: 'aarav.sharma@example.gov.in',
    phone: '+91 98765 43210',
    location: 'New Delhi, India',
    links: ['linkedin.com/in/aaravsharma', 'github.com/aaravsharma'],
  },
  summary:
    'Results-driven engineering lead with 7+ years of experience architecting large-scale citizen services, enterprise APIs, and AI workflow automation. Demonstrated expertise in distributed systems, high-concurrency microservices, and secure public digital platforms.',
  experience: [
    {
      title: 'Lead Platform Architect',
      company: 'Digital India Core Services',
      location: 'New Delhi',
      start: '2023',
      end: 'Present',
      bullets: [
        'Spearheaded the technical overhaul of core identity verification APIs, reducing P99 latency by 42% across 12M monthly active sessions.',
        'Engineered high-throughput event processing pipelines handling over 50,000 requests per second with 99.99% uptime utilizing Kafka and Redis.',
        'Designed and implemented strict DPDP Act compliance protocols, zero-trust cryptographic audit trails, and biometric data tokenization architectures.',
        'Mentored an engineering squad of 14 developers in modern TypeScript, automated CI/CD canary deployments, and resilient multi-region infrastructure.',
      ],
    },
    {
      title: 'Senior Fullstack Engineer',
      company: 'Skill India Tech Ecosystem',
      location: 'Bengaluru',
      start: '2020',
      end: '2023',
      bullets: [
        'Architected trainee onboarding, resume tailoring, and skill gap discovery services connecting vocational centers with nationwide employment portals.',
        'Constructed reactive analytics dashboards delivering real-time placement tracking, attendance validation, and provider performance scorecards across 28 states.',
        'Optimized PostgreSQL database query planning, connection pooling, and multi-tenant partitioning, reducing analytical aggregation timeouts by 65%.',
        'Partnered closely with national certification agencies to establish interoperable Open Credential standards across state vocational training systems.',
      ],
    },
    {
      title: 'Software Engineer',
      company: 'National Informatics Labs',
      location: 'Hyderabad',
      start: '2018',
      end: '2020',
      bullets: [
        'Developed fault-tolerant microservices in Node.js and Go for automated document digitization and Optical Character Recognition processing.',
        'Built accessible bilingual citizen application interfaces adhering strictly to Web Content Accessibility Guidelines (WCAG 2.1 AA).',
        'Authored comprehensive unit, integration, and load testing suites achieving 94% code coverage across mission-critical authentication endpoints.',
      ],
    },
  ],
  skills: {
    core: ['Fullstack Architecture', 'Distributed Systems', 'TypeScript', 'Node.js', 'React', 'Python', 'Go'],
    tools: ['Docker', 'Kubernetes', 'Kafka', 'PostgreSQL', 'Redis', 'Prisma ORM', 'Git'],
    cloud: ['AWS', 'Google Cloud Platform', 'Linux Systems', 'CI/CD Pipelines'],
  },
  education: [
    {
      degree: 'B.Tech in Computer Science & Engineering',
      school: 'Indian Institute of Technology (IIT)',
      year: '2018',
    },
  ],
  projects: [
    {
      name: 'NEXIS Citizen Career Orchestration Platform',
      bullets: [
        'Engineered an AI-assisted job matching and recursive interview simulator with verifiable telemetry and decentralized credential corroboration.',
      ],
    },
  ],
  certifications: [
    'AWS Certified Solutions Architect – Professional',
    'Certified Kubernetes Administrator (CKA)',
  ],
};

async function run() {
  console.log('Generating server-side PDFKit resume...');
  const pdfBuffer = await buildResumePdfFromStructured(sampleResume);
  fs.writeFileSync('test_sample_resume.pdf', pdfBuffer);
  console.log(`Saved test_sample_resume.pdf (${pdfBuffer.length} bytes)`);

  const parser = new PDFParse({ data: pdfBuffer });
  const textResult = await parser.getText();
  await parser.destroy();

  console.log(`Total Pages in generated PDF: ${textResult.total}`);
  if (textResult.total === 1) {
    console.log('SUCCESS: Resume fits perfectly on 1 A4 page!');
  } else {
    console.warn(`NOTICE: Page count is ${textResult.total}`);
  }
}

run().catch(console.error);
