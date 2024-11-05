// pages/api/blog-posts/index.js

import prisma from '@/config/prisma';
import { logError } from '@/utils/logger';

export default async function handler(req, res) {
    const userHeader = req.headers['x-user'];
    const user = userHeader ? JSON.parse(userHeader) : null;

    if (req.method === 'POST') {
        const { title, description, content, tags, templateIds = [] } = req.body;

        try {
            const newPost = await prisma.blogPost.create({
                data: {
                    title,
                    description,
                    content,
                    author: { connect: { id: user.id } },
                    tags: {
                        connectOrCreate: tags.map((tag) => ({
                            where: { name: tag },
                            create: { name: tag },
                        })),
                    },
                    templates: {
                        connect: templateIds.map((id) => ({ id })),
                    },
                },
                include: { tags: true, templates: true },
            });

            return res.status(201).json(newPost);
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to create blog post' });
        }
    }

    if (req.method === 'GET') {
        const { search, tags, page = 1, limit = 10, sort = 'best' } = req.query;

        const filters = {
            AND: [
                search
                    ? {
                          OR: [
                              { title: { contains: search } },
                              { content: { contains: search } },
                              { templates: { some: { title: { contains: search } } } },
                              { tags: { some: { name: { contains: search } } } },
                          ],
                      }
                    : {},
                tags ? { tags: { some: { name: { in: tags.split(',') } } } } : {},
                { isHidden: false },
            ],
        };

        try {
            const totalPosts = await prisma.blogPost.count({ where: filters });

            // Fetch blog posts without computed fields
            const posts = await prisma.blogPost.findMany({
                where: filters,
                include: { tags: true, templates: true, author: true },
                take: parseInt(limit, 10),
                skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            });

            // Add computed fields and sort by them in JavaScript
            const sortedPosts = posts
                .map((post) => ({
                    ...post,
                    netUpvotes: post.upvotes - post.downvotes,
                    absDifference: Math.abs(post.upvotes - post.downvotes),
                }))
                .sort((a, b) => {
                    if (sort === 'controversial') {
                        return a.absDifference - b.absDifference;
                    }
                    // Default to "best" sorting by netUpvotes
                    return b.netUpvotes - a.netUpvotes;
                });

            return res.status(200).json({
                data: sortedPosts,
                pagination: {
                    totalPosts,
                    page,
                    limit,
                },
            });
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to retrieve blog posts' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}