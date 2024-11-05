import prisma from "@/config/prisma";
import { logError } from "@/utils/logger";

export default async function handler(req, res) {
  const { id } = req.query;
  const userHeader = req.headers["x-user"];
  const user = userHeader ? JSON.parse(userHeader) : null;
  const templateId = parseInt(id, 10);

  // Retrieve template with the author's ID for ownership check
  const template = await prisma.codeTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      title: true,
      explanation: true,
      code: true,
      language: true,
      authorId: true, // Include authorId to check ownership
      tags: true,
    },
  });

  if (!template) {
    return res.status(404).json({ error: "Template not found" });
  }

  if (req.method === "GET") {
    // Allow anyone to view the template
    return res.status(200).json(template);
  }

  if (req.method === "PUT" || req.method === "DELETE") {
    // Check if the authenticated user owns the template
    if (template.authorId !== user.id && !user.isAdmin) {
      return res
        .status(403)
        .json({ error: "Forbidden: You do not own this template" });
    }
  }

  if (req.method === "PUT") {
    // Edit the template (only if the user owns it)
    const { title, explanation, tags, code } = req.body;

    try {
      const updatedTemplate = await prisma.codeTemplate.update({
        where: { id: templateId },
        data: {
          title,
          explanation,
          code,
          tags: {
            set: [], // Clear existing tags
            connectOrCreate: tags.map((tag) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
        },
        include: { tags: true },
      });

      return res.status(200).json(updatedTemplate);
    } catch (error) {
      logError(error);
      return res.status(500).json({ error: "Failed to update template" });
    }
  }

  if (req.method === "DELETE") {
    // Delete the template (only if the user owns it)
    try {
      await prisma.codeTemplate.delete({
        where: { id: templateId },
      });

      return res.status(200).json({ message: "Template deleted successfully" });
    } catch (error) {
      logError(error);
      return res.status(500).json({ error: "Failed to delete template" });
    }
  }

  if (req.method === "POST") {
    // Fork the template (only for authenticated users)
    if (!user) {
      return res
        .status(401)
        .json({ error: "Unauthorized: User not authenticated" });
    }

    try {
      // Create the forked template with the original template's details
      const forkedTemplate = await prisma.codeTemplate.create({
        data: {
          title: `${template.title} (Fork)`, // Adding "(Fork)" to distinguish
          explanation: template.explanation,
          code: template.code,
          language: template.language,
          original: { connect: { id: templateId } }, // Link to the original template
          author: { connect: { id: user.id } },
          tags: {
            connectOrCreate: template.tags.map((tag) => ({
              where: { name: tag.name },
              create: { name: tag.name },
            })),
          },
        },
        include: { tags: true, original: true },
      });

      return res.status(201).json(forkedTemplate);
    } catch (error) {
      logError(error);
      return res.status(500).json({ error: "Failed to fork template" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
