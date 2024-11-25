import prisma from '@/config/prisma';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '@/utils/jwt';
import { setCookie } from '@/utils/cookies';
import { verifyToken } from '@/utils/jwt';
import { logError } from '@/utils/logger';

const refreshTokenSecret = new TextEncoder().encode(process.env.REFRESH_TOKEN_SECRET);

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { email, password } = req.body;

        try {
            // Find the user by email
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return res.status(400).json({ error: 'Invalid email or password' });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ error: 'Invalid email or password' });
            }

            // Generate tokens
            const accessToken = await generateAccessToken(user);
            const refreshToken = await generateRefreshToken(user);

            // Set the refresh token as an HTTP-only cookie
            setCookie(res, 'refreshToken', refreshToken);

            // Return the access token
            return res.status(200).json({ accessToken });
        } catch (error) {
            logError(error);
            return res.status(500).json({ error: 'Something went wrong' });
        }
    } else if (req.method === 'PUT') {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }

        // Verify the refresh token
        const user = await verifyToken(refreshToken, refreshTokenSecret);
        if (!user) {
            return res.status(403).json({ error: 'Invalid refresh token' });
        }

        // Generate a new access token
        const newAccessToken = await generateAccessToken(user);

        // Optionally, issue a new refresh token and update the cookie
        const newRefreshToken = await generateRefreshToken(user);
        setCookie(res, 'refreshToken', newRefreshToken);

        return res.status(200).json({ accessToken: newAccessToken });
    } else if (req.method === 'DELETE') {
        // Clear the refresh token cookie
        setCookie(res, 'refreshToken', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            path: '/',
            maxAge: 0, // Expire the cookie immediately
        });

        return res.status(204).json({ message: 'Session ended successfully' });
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
}
