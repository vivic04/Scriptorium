export const ROUTE_ACCESS_LEVELS = {
    '/api/health': {
        GET: 'public',
    },
    '/api/users': {
        POST: 'public',
    },
    '/api/sessions': {
        POST: 'public',
        PUT: 'public',
        DELETE: 'public',
    },
    '/api/users/:id': {
        GET: 'user', // User or admin access for viewing user profiles
        PUT: 'user', // User or admin access for editing profiles
        DELETE: 'user', // Admin access only for deleting users
    },
    '/api/templates': {
        GET: 'public', // Public access for viewing/searching templates
        POST: 'user', // Authenticated users only for creating templates
    },
    '/api/templates/:id': {
        GET: 'public', // Public access for viewing a specific template
        PUT: 'user', // Authenticated users only for editing templates
        DELETE: 'user', // Authenticated users only for deleting templates
        POST: 'user', // Authenticated users only for forking a template
    },
    '/api/posts': {
        GET: 'public',
        POST: 'user',
    },
    '/api/posts/:id': {
        GET: 'public',
        PUT: 'user',
        DELETE: 'user',
        PATCH: 'admin',
    },
    '/api/posts/:id/comments': {
        POST: 'user',
        GET: 'public',
    },
    '/api/comments/:id': {
        GET: 'public',
        PATCH: 'admin',
    },
    '/api/ratings/posts/:id': {
        POST: 'user',
    },
    '/api/ratings/comments/:id': {
        POST: 'user',
    },
    '/api/reports': {
        GET: 'admin',
        POST: 'user',
    },
    '/api/runners': {
        POST: 'public',
    },
};
