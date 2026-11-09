import "dotenv/config";
import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const roles = Object.values(RoleName);

    for (const name of roles) {
        await prisma.role.upsert({
            where: { name },
            update: {},
            create: { name }
        });
    }

    const adminEmail = (
        process.env.ADMIN_EMAIL || "admin@fastdelivery.com"
    )
        .trim()
        .toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin1234!";
    const adminName = process.env.ADMIN_NAME || "Administrador";

    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail }
    });

    const admin = existingAdmin
        ? existingAdmin
        : await prisma.user.create({
              data: {
                  name: adminName,
                  email: adminEmail,
                  password: await bcrypt.hash(adminPassword, 12),
                  phone: null
              }
          });

    const adminRole = await prisma.role.findUniqueOrThrow({
        where: { name: RoleName.ADMIN }
    });

    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: admin.id,
                roleId: adminRole.id
            }
        },
        update: {},
        create: {
            userId: admin.id,
            roleId: adminRole.id
        }
    });

    console.log("Roles creados/verificados:", roles.join(", "));
    console.log(`Administrador listo: ${adminEmail}`);

    if (!existingAdmin) {
        console.log(
            "Contraseña inicial: la definida en ADMIN_PASSWORD o Admin1234!"
        );
        console.log("Cambia esta contraseña antes de producción.");
    }
}

main()
    .catch(error => {
        console.error("Error ejecutando el seed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
