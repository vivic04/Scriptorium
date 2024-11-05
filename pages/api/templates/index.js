import prisma from "@/config/prisma";
import { logError } from "@/utils/logger";

export default async function handler(req, res) {
  const userHeader = req.headers["x-user"];
  const user = userHeader ? JSON.parse(userHeader) : null;

  if (req.method === "POST") {
    // Create a new template (only for authenticated users)
    if (!user) {
      return res
        .status(401)
        .json({ error: "Unauthorized: User not authenticated" });
    }

    const {
      title,
      explanation,
      code,
      language = "JavaScript",
      tags,
    } = req.body;

    try {
      const newTemplate = await prisma.codeTemplate.create({
        data: {
          title,
          explanation,
          code,
          language,
          author: { connect: { id: user.id } },
          tags: {
            connectOrCreate: tags.map((tag) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
        },
        include: { tags: true },
      });

      return res.status(201).json(newTemplate);
    } catch (error) {
      logError(error);
      return res.status(500).json({ error: "Failed to create code template" });
    }
  }

  if (req.method === "GET") {
    // Retrieve search query parameters
    const { title, tags, content, page = 1, limit = 10, userOnly } = req.query;

    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 10;

    // Initialize an empty `filters` object
    const filters = {
      AND: [
        title ? { title: { contains: title } } : {},
        content
          ? {
              OR: [
                { explanation: { contains: content } },
                { code: { contains: content } },
              ],
            }
          : {},
        tags
          ? {
              tags: {
                some: {
                  name: { in: tags.split(",") },
                },
              },
            }
          : {},
        user && userOnly ? { authorId: user.id } : {},
      ],
    };

    try {
      // Count total templates for pagination metadata
      const totalTemplates = await prisma.codeTemplate.count({
        where: filters,
      });

      // Fetch templates with filters and pagination

      const templates = await prisma.codeTemplate.findMany({
        where: filters,
        include: { tags: true, author: true },
        skip: (parsedPage - 1) * parsedLimit,
        take: parsedLimit,
      });

      const totalPages = Math.ceil(totalTemplates / parsedLimit);

      return res.status(200).json({
        data: templates,
        pagination: {
          totalTemplates,
          totalPages,
          currentPage: parsedPage,
          limit: parsedLimit,
        },
      });
    } catch (error) {
      logError(error);
      return res.status(500).json({ error: "Failed to retrieve templates" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
