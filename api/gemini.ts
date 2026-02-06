/**
 * Vercel Serverless Function: Gemini AI Proxy
 * 
 * This proxy securely handles Gemini API calls server-side,
 * protecting the API key from client-side exposure.
 * 
 * Endpoints:
 * POST /api/gemini/generate-task1
 * POST /api/gemini/generate-task2
 * POST /api/gemini/check-grammar
 * POST /api/gemini/evaluate
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Enable CORS for the API
 */
const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // In production, set to your domain
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
};

/**
 * Verify Firebase authentication token
 * Returns userId if valid, throws error if invalid
 */
const verifyAuthToken = async (authHeader: string | undefined): Promise<string> => {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.split('Bearer ')[1];
  
  // TODO: Implement Firebase Admin SDK token verification
  // For now, we'll do basic validation
  // In production, you MUST verify the token with Firebase Admin SDK:
  //
  // import * as admin from 'firebase-admin';
  // if (!admin.apps.length) {
  //   admin.initializeApp({
  //     credential: admin.credential.cert({
  //       projectId: process.env.FIREBASE_PROJECT_ID,
  //       clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  //       privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  //     }),
  //   });
  // }
  // const decodedToken = await admin.auth().verifyIdToken(token);
  // return decodedToken.uid;
  
  // Temporary: decode JWT without verification (INSECURE - for development only)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.user_id && !payload.sub) {
      throw new Error('Invalid token structure');
    }
    return payload.user_id || payload.sub;
  } catch (error) {
    throw new Error('Invalid token format');
  }
};

/**
 * Rate limiting using in-memory store (simple implementation)
 * In production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (userId: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
};

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const userId = await verifyAuthToken(req.headers.authorization);

    // Check rate limit
    if (!checkRateLimit(userId, 10, 60000)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please wait a moment before trying again.'
      });
    }

    // Get request body
    const { model, contents, config } = req.body;

    if (!model || !contents) {
      return res.status(400).json({ error: 'Missing required fields: model, contents' });
    }

    // Get server-side API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return res.status(500).json({ error: 'API key not configured on server' });
    }

    // Make request to Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: typeof contents === 'string' ? [{ parts: [{ text: contents }] }] : contents,
        generationConfig: config || {},
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', errorData);
      
      return res.status(response.status).json({
        error: 'API request failed',
        message: errorData.error?.message || 'Failed to generate content',
      });
    }

    const data = await response.json();

    // Extract text from response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.status(200).json({ text, raw: data });

  } catch (error: any) {
    console.error('Proxy error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
}
