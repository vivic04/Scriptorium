// pages/api/ratings/comments/[id].js

import prisma from '@/config/prisma';
import { logError } from '@/utils/logger';

export default async function handler(req, res) {
    const { id } = req.query;
    const userHeader = req.headers['x-user'];
    const user = userHeader ? JSON.parse(userHeader) : null;

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    const comment = await prisma.comment.findUnique({
        where: { id: parseInt(id, 10) },
    });

    if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
    }

    if (req.method === 'POST') {
        const { action } = req.body;

        if (!['upvote', 'downvote'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action. Use "upvote" or "downvote"' });
        }

        try {
            // Check if the user has already voted on this comment
            const existingVote = await prisma.userVote.findUnique({
                where: {
                    userId_targetId_targetType: {
                        userId: user.id,
                        targetId: parseInt(id, 10),
                        targetType: 'comment',
                    },
                },
            });

            if (existingVote) {
                // If the user already voted the same action, return an error
                if (existingVote.voteType === action) {
                    return res.status(400).json({ error: `You have already ${action}d this comment` });
                }

                // If the user wants to switch vote, update the vote type and adjust counts
                await prisma.userVote.update({
                    where: { id: existingVote.id },
                    data: { voteType: action },
                });

                const incrementField = action === 'upvote' ? 'upvotes' : 'downvotes';
                const decrementField = action === 'upvote' ? 'downvotes' : 'upvotes';

                const updatedComment = await prisma.comment.update({
                    where: { id: parseInt(id, 10) },
                    data: {
                        [incrementField]: { increment: 1 },
                        [decrementField]: { decrement: 1 },
                    },
                });

                return res.status(200).json(updatedComment);
            } else {
                // If no existing vote, create a new vote and increment the relevant count
                await prisma.userVote.create({
                    data: {
                        userId: user.id,
                        targetId: parseInt(id, 10),
                        targetType: 'comment',
                        voteType: action,
                    },
                });

                const incrementField = action === 'upvote' ? 'upvotes' : 'downvotes';

                const updatedComment = await prisma.comment.update({
                    where: { id: parseInt(id, 10) },
                    data: {
                        [incrementField]: { increment: 1 },
                    },
                });

                return res.status(200).json(updatedComment);
            }
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to update comment rating' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
