import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seedeo completo de la base de datos...');

  // ─── 1. Limpiar en orden (respetando FK) ─────────────────────────────
  console.log('🧹 Limpiando registros antiguos...');
  await prisma.answer.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.session.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  // ─── 2. Contraseña compartida ─────────────────────────────────────────
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // ─── 3. Usuarios ──────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@sicba.edu',
      password: hashedPassword,
      role: 'ADMIN',
      profile: { create: { firstName: 'Admin', lastName: 'SICBA' } },
    },
  });
  console.log(`✅ Admin: ${admin.email} | ID: ${admin.id}`);

  const alumno1 = await prisma.user.create({
    data: {
      email: 'alumno1@sicba.edu',
      password: hashedPassword,
      role: 'ALUMNO',
      profile: { create: { firstName: 'Juan', lastName: 'Pérez' } },
    },
  });
  console.log(`✅ Alumno: ${alumno1.email} | ID: ${alumno1.id}`);

  const alumno2 = await prisma.user.create({
    data: {
      email: 'alumno2@sicba.edu',
      password: hashedPassword,
      role: 'ALUMNO',
      profile: { create: { firstName: 'María', lastName: 'Gómez' } },
    },
  });
  console.log(`✅ Alumno: ${alumno2.email} | ID: ${alumno2.id}`);

  // ─── 4. Materias ──────────────────────────────────────────────────────
  const calculus = await prisma.subject.create({
    data: { name: 'Cálculo Diferencial', description: 'Límites, derivadas y aplicaciones.' },
  });
  const algebra = await prisma.subject.create({
    data: { name: 'Álgebra Lineal', description: 'Vectores, matrices y transformaciones lineales.' },
  });
  const fisica = await prisma.subject.create({
    data: { name: 'Física I', description: 'Cinemática, dinámica y termodinámica.' },
  });

  console.log('\n📚 MATERIAS CREADAS:');
  console.log(`  Cálculo Diferencial → ID: ${calculus.id}`);
  console.log(`  Álgebra Lineal      → ID: ${algebra.id}`);
  console.log(`  Física I            → ID: ${fisica.id}`);

  // ─── 5. Reactivos de Cálculo Diferencial ─────────────────────────────
  const q1 = await prisma.question.create({
    data: {
      subjectId: calculus.id,
      content: 'Calcula el siguiente límite: $\\lim_{x \\to 0} \\dfrac{\\sin x}{x}$',
      difficulty: 1,
      explanation: 'Por el límite notable de Euler, $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$.',
      options: {
        create: [
          { content: '$0$',       isCorrect: false },
          { content: '$1$',       isCorrect: true  },
          { content: '$\\infty$', isCorrect: false },
          { content: '$-1$',      isCorrect: false },
        ],
      },
    },
  });

  const q2 = await prisma.question.create({
    data: {
      subjectId: calculus.id,
      content: 'Calcula la derivada de $f(x) = x^3 - 4x^2 + 7$.',
      difficulty: 2,
      explanation: 'Aplicando la regla de la potencia: $f\'(x) = 3x^2 - 8x$.',
      options: {
        create: [
          { content: '$f\'(x) = 3x^2 - 8x$',     isCorrect: true  },
          { content: '$f\'(x) = 3x^2 - 4x$',     isCorrect: false },
          { content: '$f\'(x) = x^2 - 8x + 7$',  isCorrect: false },
          { content: '$f\'(x) = 3x^3 - 8x^2$',   isCorrect: false },
        ],
      },
    },
  });

  const q3 = await prisma.question.create({
    data: {
      subjectId: calculus.id,
      content: '¿Cuál es la derivada de $g(x) = e^{2x} \\cdot \\sin(x)$?',
      difficulty: 3,
      explanation: 'Regla del producto: $g\'(x) = 2e^{2x}\\sin(x) + e^{2x}\\cos(x)$.',
      options: {
        create: [
          { content: '$2e^{2x}\\sin(x) + e^{2x}\\cos(x)$', isCorrect: true  },
          { content: '$2e^{2x}\\cos(x)$',                   isCorrect: false },
          { content: '$e^{2x}\\sin(x) + \\cos(x)$',         isCorrect: false },
          { content: '$2e^{2x}\\sin(x)$',                   isCorrect: false },
        ],
      },
    },
  });

  const q4 = await prisma.question.create({
    data: {
      subjectId: calculus.id,
      content: 'Evalúa la integral $\\int_0^1 (2x + 3)\\,dx$.',
      difficulty: 2,
      explanation: '$\\int_0^1 (2x+3)dx = [x^2+3x]_0^1 = 1+3 = 4$.',
      options: {
        create: [
          { content: '$3$', isCorrect: false },
          { content: '$4$', isCorrect: true  },
          { content: '$5$', isCorrect: false },
          { content: '$2$', isCorrect: false },
        ],
      },
    },
  });

  const q5 = await prisma.question.create({
    data: {
      subjectId: calculus.id,
      content: '¿En qué punto la función $f(x) = x^2 - 6x + 5$ tiene un mínimo local?',
      difficulty: 2,
      explanation: '$f\'(x) = 2x - 6 = 0 \\Rightarrow x = 3$. Como $f\'\'(3) = 2 > 0$, es mínimo.',
      options: {
        create: [
          { content: '$x = 3$', isCorrect: true  },
          { content: '$x = 5$', isCorrect: false },
          { content: '$x = 6$', isCorrect: false },
          { content: '$x = 1$', isCorrect: false },
        ],
      },
    },
  });

  // ─── 6. Reactivos de Física I ─────────────────────────────────────────
  const q6 = await prisma.question.create({
    data: {
      subjectId: fisica.id,
      content: 'Un objeto cae libremente desde el reposo. ¿Cuánto tarda en recorrer $h = 20\\,\\text{m}$? ($g = 10\\,\\text{m/s}^2$)',
      difficulty: 2,
      explanation: '$h = \\frac{1}{2}gt^2 \\Rightarrow t = \\sqrt{\\frac{2h}{g}} = \\sqrt{4} = 2\\,\\text{s}$',
      options: {
        create: [
          { content: '$t = 1\\,\\text{s}$',  isCorrect: false },
          { content: '$t = 2\\,\\text{s}$',  isCorrect: true  },
          { content: '$t = 4\\,\\text{s}$',  isCorrect: false },
          { content: '$t = 20\\,\\text{s}$', isCorrect: false },
        ],
      },
    },
  });

  const q7 = await prisma.question.create({
    data: {
      subjectId: fisica.id,
      content: '¿Cuánto trabajo realiza una fuerza $F = 50\\,\\text{N}$ sobre un objeto que se desplaza $d = 8\\,\\text{m}$ en la dirección de la fuerza?',
      difficulty: 1,
      explanation: '$W = F \\cdot d = 50 \\times 8 = 400\\,\\text{J}$',
      options: {
        create: [
          { content: '$W = 200\\,\\text{J}$', isCorrect: false },
          { content: '$W = 400\\,\\text{J}$', isCorrect: true  },
          { content: '$W = 58\\,\\text{J}$',  isCorrect: false },
          { content: '$W = 6.25\\,\\text{J}$',isCorrect: false },
        ],
      },
    },
  });

  console.log('\n📝 REACTIVOS CREADOS (Cálculo):');
  console.log(`  Q1 (Límite sin/x)     → ID: ${q1.id}`);
  console.log(`  Q2 (Derivada x³)      → ID: ${q2.id}`);
  console.log(`  Q3 (Regla producto)   → ID: ${q3.id}`);
  console.log(`  Q4 (Integral 0-1)     → ID: ${q4.id}`);
  console.log(`  Q5 (Mínimo local)     → ID: ${q5.id}`);

  console.log('\n📝 REACTIVOS CREADOS (Física):');
  console.log(`  Q6 (Caída libre)      → ID: ${q6.id}`);
  console.log(`  Q7 (Trabajo)          → ID: ${q7.id}`);

  // ─── 7. Resumen final ─────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('🎉 ¡Seedeo completado! IDs para el examen de demo:');
  console.log('══════════════════════════════════════════════════════');
  console.log(`\n📌 subjectId (Cálculo): ${calculus.id}`);
  console.log(`📌 questionIds (pégalos separados por coma):`);
  console.log(`   ${q1.id}, ${q2.id}, ${q3.id}, ${q4.id}, ${q5.id}`);
  console.log('\n📌 subjectId (Física): ', fisica.id);
  console.log(`📌 questionIds (Física):`);
  console.log(`   ${q6.id}, ${q7.id}`);
  console.log('\n🔑 Credenciales:');
  console.log('   admin@sicba.edu  / password123');
  console.log('   alumno1@sicba.edu / password123');
  console.log('   alumno2@sicba.edu / password123');
  console.log('══════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seedeo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
