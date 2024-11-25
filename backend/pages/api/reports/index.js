import prisma from '@/config/prisma';
import { logError } from '@/utils/logger';

export default async function handler(req, res) {
    const userHeader = req.headers['x-user'];
    const user = userHeader ? JSON.parse(userHeader) : null;
    const { include = ['posts', 'comments'], page = 1, limit = 10 } = req.query; // Default to include both

    if (req.method === 'GET') {
        if (!user || !user.isAdmin) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        try {
            const includePosts = include.includes('posts');
            const includeComments = include.includes('comments');

            // Parse pagination values
            const pageNum = parseInt(page, 10) || 1;
            const limitNum = parseInt(limit, 10) || 10;
            const skip = (pageNum - 1) * limitNum;

            let reportedContent = [];

            if (includePosts) {
                // Fetch blog posts with report counts and apply pagination
                const posts = await prisma.blogPost.findMany({
                    where: { reports: { some: {} } }, // Only posts with reports
                    include: {
                        author: true,
                        _count: { select: { reports: true } },
                    },
                    skip,
                    take: limitNum,
                });

                // Map blog posts with report count and type identifier
                reportedContent = reportedContent.concat(
                    posts.map((post) => ({
                        ...post,
                        reportCount: post._count.reports,
                        type: 'post',
                    })),
                );
            }

            if (includeComments) {
                // Fetch comments with report counts and apply pagination
                const comments = await prisma.comment.findMany({
                    where: { reports: { some: {} } }, // Only comments with reports
                    include: {
                        author: true,
                        _count: { select: { reports: true } },
                    },
                    skip,
                    take: limitNum,
                });

                // Map comments with report count and type identifier
                reportedContent = reportedContent.concat(
                    comments.map((comment) => ({
                        ...comment,
                        reportCount: comment._count.reports,
                        type: 'comment',
                    })),
                );
            }

            // Sort the combined array by report count in descending order (if needed after merging)
            reportedContent.sort((a, b) => b.reportCount - a.reportCount);

            return res.status(200).json({
                data: reportedContent,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    totalItems: reportedContent.length,
                },
            });
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to fetch reported content' });
        }
    }

    if (req.method === 'POST') {
        const { targetType, targetId, reason } = req.body;

        if (!reason || !targetType || !targetId) {
            return res.status(400).json({ error: 'targetType, targetId, and reason are required.' });
        }

        if (!['post', 'comment'].includes(targetType)) {
            return res.status(400).json({ error: 'Invalid targetType. Must be "post" or "comment".' });
        }

        const resource = await prisma[targetType === 'post' ? 'blogPost' : 'comment'].findUnique({
            where: { id: parseInt(targetId, 10) },
        });

        if (!resource) {
            return res.status(404).json({ error: 'Report target not found' });
        }

        try {
            const reportData = {
                reason,
                reporterId: user.id,
                [targetType === 'post' ? 'blogPostId' : 'commentId']: parseInt(targetId, 10),
            };

            const report = await prisma.report.create({
                data: reportData,
            });

            return res.status(201).json(report);
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Failed to create report' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}