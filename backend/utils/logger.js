export const logError = (error) => {
    if (process.env.NODE_ENV === 'development') {
        console.error(error.toString());
    }
};
