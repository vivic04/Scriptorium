import prisma from '@/config/prisma';
import { logError } from '@/utils/logger';

export default async function handler(req, res) {
    const { id } = req.query;
    const userHeader = req.headers['x-user'];
    const user = userHeader ? JSON.parse(userHeader) : null;

    if (req.method === 'GET') {
        try {
            // Fetch the comment by ID, including author information
            const comment = await prisma.comment.findUnique({
                where: { id: parseInt(id, 10) },
                include: {
                    author: true,
                },
            });

            // Check if the comment exists
            if (!comment) {
                return res.status(404).json({ error: 'Comment not found' });
            }

            // Check visibility: Allow access if the comment is not hidden,
            // or if the requester is the author or an admin
            if (comment.isHidden && (!user || (user.id !== comment.authorId && !user.isAdmin))) {
                return res.status(403).json({ error: 'Access forbidden: This comment is hidden' });
            }

            // Return the comment data
            return res.status(200).json(comment);
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to retrieve comment' });
        }
    }

    if (req.method === 'PATCH') {
        try {
            // Update the comment's isHidden status to true
            const updatedComment = await prisma.comment.update({
                where: { id: parseInt(id, 10) },
                data: { isHidden: true },
            });

            return res.status(200).json(updatedComment);
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to hide the comment' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}