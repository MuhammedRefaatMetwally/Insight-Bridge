import { Handler } from '@netlify/functions';
import serverless from 'serverless-http';
import express from 'express';

import app from '../src/index'; 

const handler: Handler = serverless(app);

export { handler };