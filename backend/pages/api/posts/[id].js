// pages/api/blog-posts/[id].js

import prisma from '@/config/prisma';
import { logError } from '@/utils/logger';

export default async function handler(req, res) {
    const { id } = req.query;
    const userHeader = req.headers['x-user'];
    const user = userHeader ? JSON.parse(userHeader) : null;

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    // Fetch the blog post to check ownership
    const blogPost = await prisma.blogPost.findUnique({
        where: { id: parseInt(id, 10) },
        select: { authorId: true },
    });

    if (!blogPost) {
        return res.status(404).json({ error: 'Blog post not found' });
    }

    if (req.method === 'GET') {
        // Get a specific blog post
        try {
            const post = await prisma.blogPost.findUnique({
                where: { id: parseInt(id, 10) },
                include: { tags: true, templates: true, author: true, comments: { orderBy: { upvotes: 'desc' } } },
            });

            return res.status(200).json(post);
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to retrieve blog post' });
        }
    }

    // Check if the user is the author of the blog post or an admin
    const isOwnerOrAdmin = user.id === blogPost.authorId || user.isAdmin;
    if (!isOwnerOrAdmin) {
        return res.status(403).json({ error: 'Forbidden: You are not allowed to update or delete this blog post' });
    }

    if (req.method === 'PUT') {
        // Edit a blog post (only if the user is the author or an admin)
        const { title, description, content, tags, templateIds = [], upvotes, downvotes } = req.body;

        try {
            const post = await prisma.blogPost.update({
                where: { id: parseInt(id, 10) },
                data: {
                    title,
                    description,
                    content,
                    tags: {
                        set: [],
                        connectOrCreate: tags.map((tag) => ({
                            where: { name: tag },
                            create: { name: tag },
                        })),
                    },
                    templates: {
                        set: [],
                        connect: templateIds.map((id) => ({ id })),
                    },
                    upvotes,
                    downvotes,
                },
                include: { tags: true, templates: true },
            });

            return res.status(200).json(post);
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to update blog post' });
        }
    }

    if (req.method === 'PATCH') {
        try {
            // Update the post's isHidden status to true
            const updatedPost = await prisma.blogPost.update({
                where: { id: parseInt(id, 10) },
                data: { isHidden: true },
            });

            return res.status(200).json(updatedPost);
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to hide the blog post' });
        }
    }

    if (req.method === 'DELETE') {
        // Delete a blog post (only if the user is the author or an admin)
        try {
            await prisma.blogPost.delete({ where: { id: parseInt(id, 10) } });
            return res.status(200).json({ message: 'Blog post deleted successfully' });
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to delete blog post' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}