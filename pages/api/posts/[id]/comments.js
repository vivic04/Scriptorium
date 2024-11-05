// pages/api/posts/[id]/comments.js

import prisma from '@/config/prisma';
import { logError } from '@/utils/logger';

export default async function handler(req, res) {
    const { id, page = 1, limit = 10 } = req.query; // The blog post ID
    const userHeader = req.headers['x-user'];
    const user = userHeader ? JSON.parse(userHeader) : null;

    const blogPost = await prisma.blogPost.findUnique({ where: { id: parseInt(id, 10) } });

    if (!blogPost) {
        return res.status(404).json({ error: 'Blog post not found' });
    }

    if (req.method === 'POST') {
        // Create a comment or reply (authenticated users only)
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        }

        const { content, parentId } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required for a comment' });
        }

        if (parentId) {
            const parentComment = await prisma.comment.findUnique({ where: { id: parseInt(parentId, 10) } });
            if (!parentComment) {
                return res.status(404).json({ error: 'Parent comment not found' });
            }
        }

        try {
            const newComment = await prisma.comment.create({
                data: {
                    content,
                    author: { connect: { id: user.id } },
                    blogPost: { connect: { id: parseInt(id, 10) } },
                    parent: parentId ? { connect: { id: parentId } } : undefined,
                },
            });

            return res.status(201).json(newComment);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to create comment' });
        }
    }

    if (req.method === 'GET') {
        // Retrieve all comments for the specified blog post, sorted by upvotes (accessible to all)
        const { sort = 'best' } = req.query;
        try {
            const totalComments = await prisma.comment.count({
                where: { blogPostId: parseInt(id, 10), parentId: null },
            });

            // Fetch comments without computed fields
            const comments = await prisma.comment.findMany({
                where: { blogPostId: parseInt(id, 10), parentId: null, isHidden: false },
                include: {
                    replies: {
                        include: { author: true },
                    },
                    author: true,
                },
                take: parseInt(limit, 10),
                skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            });

            // Add computed fields and sort by them in JavaScript
            const sortedComments = comments
                .map((comment) => ({
                    ...comment,
                    netUpvotes: comment.upvotes - comment.downvotes,
                    absDifference: Math.abs(comment.upvotes - comment.downvotes),
                }))
                .sort((a, b) => {
                    if (sort === 'controversial') {
                        return a.absDifference - b.absDifference;
                    }
                    // Default to "best" sorting by netUpvotes
                    return b.netUpvotes - a.netUpvotes;
                });

            return res.status(200).json({
                data: sortedComments,
                pagination: {
                    totalComments,
                    page,
                    limit,
                },
            });
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to retrieve comments' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}