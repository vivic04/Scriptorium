import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const isProd = process.env.NODE_ENV === 'production';
const accessTokenSecret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret');
const refreshTokenSecret = new TextEncoder().encode(process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret');
const accessTokenExpiresIn = isProd ? '15m' : '7d';
const refreshTokenExpiresIn = '7d';

// Generate an access token with jose
export const generateAccessToken = async (user) => {
    return await new SignJWT({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(accessTokenExpiresIn)
        .sign(accessTokenSecret);
};

// Generate a refresh token with jose
export const generateRefreshToken = async (user) => {
    return await new SignJWT({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(refreshTokenExpiresIn)
        .sign(refreshTokenSecret);
};

// Verify a token using jose
export const verifyToken = async (token, secret) => {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload;
    } catch (error) {
        return null; // Return null if verification fails
    }
};

export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

export const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};
