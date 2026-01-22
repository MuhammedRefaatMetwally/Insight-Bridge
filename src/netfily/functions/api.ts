import serverless from 'serverless-http';
import app from '../../index'; // Adjust path to your main index.ts

// Netlify uses this exported 'handler' to run your Express app
export const handler = serverless(app);