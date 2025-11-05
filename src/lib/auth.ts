// Enhanced Authentication and Authorization Middleware
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: Role;
    permissions: string[];
  };
  ip?: string;
}

// Permission definitions
export const PERMISSIONS = {
  // User Management
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Data Source Management
  DATASOURCE_VIEW: 'datasource:view',
  DATASOURCE_CREATE: 'datasource:create',
  DATASOURCE_UPDATE: 'datasource:update',
  DATASOURCE_DELETE: 'datasource:delete',
  DATASOURCE_SYNC: 'datasource:sync',
  
  // ETL Job Management
  JOB_VIEW: 'job:view',
  JOB_CREATE: 'job:create',
  JOB_UPDATE: 'job:update',
  JOB_DELETE: 'job:delete',
  JOB_EXECUTE: 'job:execute',
  JOB_SCHEDULE: 'job:schedule',
  
  // System Administration
  SYSTEM_VIEW: 'system:view',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_MONITOR: 'system:monitor',
  SYSTEM_BACKUP: 'system:backup',
  
  // Notification Management
  NOTIFICATION_VIEW: 'notification:view',
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_MANAGE: 'notification:manage',
  
  // Analytics and Reporting
  ANALYTICS_VIEW: 'analytics:view',
  REPORTS_VIEW: 'reports:view',
  REPORTS_CREATE: 'reports:create',
  REPORTS_EXPORT: 'reports:export',
} as const;

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    // All permissions
    ...Object.values(PERMISSIONS),
  ],
  USER: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.DATASOURCE_VIEW,
    PERMISSIONS.DATASOURCE_SYNC,
    PERMISSIONS.JOB_VIEW,
    PERMISSIONS.JOB_CREATE,
    PERMISSIONS.JOB_UPDATE,
    PERMISSIONS.JOB_EXECUTE,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  VIEWER: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.DATASOURCE_VIEW,
    PERMISSIONS.JOB_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
};

/**
 * Get client IP address from request
 */
function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Middleware to check authentication
 */
export async function authenticate(req: NextRequest): Promise<AuthenticatedRequest> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token) {
    throw new Error('Unauthorized');
  }
  
  const authenticatedReq = req as AuthenticatedRequest;
  authenticatedReq.user = {
    id: token.sub!,
    email: token.email!,
    role: token.role as Role,
    permissions: ROLE_PERMISSIONS[token.role as Role] || [],
  };
  authenticatedReq.ip = getClientIP(req);
  
  return authenticatedReq;
}

/**
 * Middleware to check permissions
 */
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest) => {
    if (!req.user) {
      throw new Error('Authentication required');
    }
    
    if (!req.user.permissions.includes(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
    
    return req;
  };
}

/**
 * Higher-order function to wrap API routes with authentication and permission checks
 */
export function withAuth(permission?: string) {
  return async (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest) => {
      try {
        const authenticatedReq = await authenticate(req);
        
        if (permission) {
          requirePermission(permission)(authenticatedReq);
        }
        
        return await handler(authenticatedReq);
      } catch (error) {
        console.error('Authentication error:', error);
        
        if (error instanceof Error && error.message === 'Unauthorized') {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Authentication required' },
            { status: 401 }
          );
        }
        
        if (error instanceof Error && error.message.startsWith('Permission denied')) {
          return NextResponse.json(
            { error: 'Forbidden', message: error.message },
            { status: 403 }
          );
        }
        
        return NextResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Rate limiting middleware
 */
const rateLimits = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(windowMs: number = 900000, max: number = 100) {
  return (req: AuthenticatedRequest) => {
    const identifier = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();
    
    const userLimit = rateLimits.get(identifier);
    
    if (!userLimit || now > userLimit.resetTime) {
      rateLimits.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return req;
    }
    
    if (userLimit.count >= max) {
      throw new Error('Rate limit exceeded');
    }
    
    userLimit.count++;
    return req;
  };
}

/**
 * Input validation middleware
 */
export function validateInput(schema: any) {
  return async (req: AuthenticatedRequest) => {
    const body = await req.json();
    const { error } = schema.validate(body);
    
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }
    
    return req;
  };
}

/**
 * CORS middleware
 */
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'https://your-domain.com',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}