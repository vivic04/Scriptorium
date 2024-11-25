const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Define default admin credentials
    const adminEmail = 'admin1@scriptorium.com';
    const adminPassword = 'admin123@'; // Replace with a more secure password

    // Check if an admin user already exists
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (!existingAdmin) {
        // Create the admin user if it doesn't exist
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                firstName: 'Admin',
                lastName: 'User1',
                isAdmin: true,
            },
        });
        console.log(`Admin user created with email: ${adminEmail} and password: ${adminPassword}`);
    } else {
        console.log('Admin user already exists.');
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
