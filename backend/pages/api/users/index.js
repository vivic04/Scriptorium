// pages/api/users

import prisma from "@/config/prisma";
import { hashPassword } from "@/utils/jwt";
import { validate } from "@/utils/requests";
import multer from "@/config/multer";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    const upload = multer.single("avatar");

    try {
      await runMiddleware(req, res, upload);

      await runMiddleware(
        req,
        res,
        validate(["firstName", "lastName", "email", "password"])
      );

      const { firstName, lastName, email, password } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "Email is already registered" });
      }

      const hashedPassword = await hashPassword(password);

      let profilePicturePath = null;

      if (req.file) {
        profilePicturePath = `/avatars/${req.file.filename}`;
      }

      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          profilePicture: profilePicturePath,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePicture: true,
          phoneNumber: true,
          isAdmin: true,
        },
      });

      if (req.file) {
        const oldPath = req.file.path;
        const newFilename = `user-${user.id}-${Date.now()}${path.extname(
          req.file.originalname
        )}`;
        const newPath = path.join(
          process.cwd(),
          "public",
          "avatars",
          newFilename
        );

        await fs.promises.rename(oldPath, newPath);

        await prisma.user.update({
          where: { id: user.id },
          data: { profilePicture: `/avatars/${newFilename}` },
        });

        user.profilePicture = `/avatars/${newFilename}`;
      }

      return res.status(201).json(user);
    } catch (error) {
      console.error("Signup error:", error.message);

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File size too large (max 2MB)" });
      } else if (error.message === "Only images are allowed") {
        return res.status(400).json({ error: "Only image files are allowed" });
      }

      if (error.status === 400 && error.error) {
        return res.status(400).json({ error: error.error });
      }

      return res.status(500).json({ error: "Something went wrong" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
