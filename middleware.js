import { NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt';
import { ROUTE_ACCESS_LEVELS } from '@/config/routes';

const accessTokenSecret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET);

// Middleware function to verify JWT
async function verifyAccessToken(req) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return null;

    const user = await verifyToken(token, accessTokenSecret);
    return user;
}

export async function middleware(req) {
    const { pathname } = req.nextUrl;
    const method = req.method;

    // Identify if there's a configuration for this path and method
    const pathConfig = Object.entries(ROUTE_ACCESS_LEVELS).find(([path]) => {
        const pathRegex = new RegExp(`^${path.replace(':id', '[^/]+')}$`);
        return pathRegex.test(pathname);
    });

    if (!pathConfig) {
        return NextResponse.next(); // Allow if the route is not listed in the access config
    }

    const [routePath, routePermissions] = pathConfig;
    const requiredAccess = routePermissions[method];

    if (!requiredAccess) {
        return new NextResponse('Method not allowed', { status: 405 });
    }

    // Handle public routes
    const user = await verifyAccessToken(req);
    if (requiredAccess === 'public') {
        const response = NextResponse.next();
        if (user) {
            response.headers.set('x-user', JSON.stringify(user)); // Attach user data for route access
        }
        return response;
    }

    // Verify token for user or admin access
    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Handle user routes (authenticated users)
    if (requiredAccess === 'user' && user) {
        const response = NextResponse.next();
        response.headers.set('x-user', JSON.stringify(user)); // Attach user data for route access
        return response;
    }

    // Handle admin routes
    if (requiredAccess === 'admin' && user.isAdmin) {
        const response = NextResponse.next();
        response.headers.set('x-user', JSON.stringify(user)); // Attach user data for route access
        return response;
    }

    // If access requirements are not met, respond with 403 Forbidden
    return new NextResponse('Forbidden', { status: 403 });
}
