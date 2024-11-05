export const setCookie = (res, name, value, options = {}) => {
    const isProd = process.env.NODE_ENV === 'production';

    const defaultOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'None' : 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
    };

    const cookieOptions = { ...defaultOptions, ...options };

    const cookieString = `${name}=${value}; Path=${cookieOptions.path}; Max-Age=${cookieOptions.maxAge}; HttpOnly=${
        cookieOptions.httpOnly ? '; HttpOnly' : ''
    }${cookieOptions.secure ? '; Secure' : ''}; SameSite=${cookieOptions.sameSite}`;

    res.setHeader('Set-Cookie', cookieString);
};
