import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seedeo de la base de datos...');

  // 1. Limpiar base de datos (Opcional, pero recomendado para tener un estado limpio)
  // Nota: En un entorno de producción, nunca haríamos esto.
  console.log('🧹 Limpiando registros antiguos...');
  await prisma.user.deleteMany();

  // 2. Crear contraseña encriptada
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // 3. Crear Administrador Maestro
  const admin = await prisma.user.create({
    data: {
      email: 'admin@sicba.edu',
      password: hashedPassword,
      role: 'ADMIN',
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'SICBA',
        }
      }
    },
  });
  console.log(`✅ Administrador creado: ${admin.email}`);

  // 4. Crear Alumnos de prueba
  const alumno1 = await prisma.user.create({
    data: {
      email: 'alumno1@sicba.edu',
      password: hashedPassword,
      role: 'ALUMNO',
      profile: {
        create: {
          firstName: 'Juan',
          lastName: 'Pérez',
        }
      }
    },
  });
  console.log(`✅ Alumno creado: ${alumno1.email}`);

  const alumno2 = await prisma.user.create({
    data: {
      email: 'alumno2@sicba.edu',
      password: hashedPassword,
      role: 'ALUMNO',
      profile: {
        create: {
          firstName: 'María',
          lastName: 'Gómez',
        }
      }
    },
  });
  console.log(`✅ Alumno creado: ${alumno2.email}`);

  console.log('🎉 ¡Seedeo completado con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seedeo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
