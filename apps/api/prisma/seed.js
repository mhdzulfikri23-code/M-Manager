require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL || 'admin@uanghariini.local').trim().toLowerCase();
  const plainPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin12345!';
  const password = await bcrypt.hash(plainPassword, 12);

  const existing =
    (await prisma.user.findUnique({ where: { email } })) ||
    (await prisma.user.findUnique({ where: { email: 'admin' } }));
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: 'Super Admin', username: 'admin', email, password, role: 'SUPER_ADMIN' },
    });
    console.log(`Super admin diperbarui: ${email} / ${plainPassword}`);
  } else {
    await prisma.user.create({
      data: { name: 'Super Admin', username: 'admin', email, password, role: 'SUPER_ADMIN' },
    });
    console.log(`Super admin dibuat: ${email} / ${plainPassword}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
