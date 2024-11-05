import prisma from '@/config/prisma';
import { logError } from '@/utils/logger';

export default async function handler(req, res) {
    const { id } = req.query;
    const user = JSON.parse(req.headers['x-user']); // User payload from middleware

    // Convert id to an integer for comparison
    const requestedUserId = parseInt(id, 10);

    // Check if the requesting user is the user in question or an admin
    if (user.id !== requestedUserId && !user.isAdmin) {
        return res.status(403).json({
            error: 'Forbidden: Access is restricted to the user or an admin',
        });
    }

    const userId = requestedUserId;

    if (req.method === 'PUT') {
        // Update user profile
        const { firstName, lastName, profilePicture, phoneNumber } = req.body;

        try {
            const existingUser = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!existingUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    firstName,
                    lastName,
                    profilePicture,
                    phoneNumber,
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    profilePicture: true,
                    phoneNumber: true,
                    isAdmin: true,
                    templates: true,
                    blogPosts: true,
                    comments: true,
                    reports: true,
                },
            });

            return res.status(200).json(updatedUser);
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to update user profile' });
        }
    }

    if (req.method === 'GET') {
        // Get user profile
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    profilePicture: true,
                    phoneNumber: true,
                    isAdmin: true,
                    templates: true,
                    blogPosts: true,
                    comments: true,
                    reports: true,
                },
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            return res.status(200).json(user);
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to retrieve user information' });
        }
    }

    if (req.method === 'DELETE') {
        // Delete user profile
        try {
            const existingUser = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!existingUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            await prisma.user.delete({
                where: { id: userId },
            });

            return res.status(200).json({ message: 'User deleted successfully' });
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to delete user' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
