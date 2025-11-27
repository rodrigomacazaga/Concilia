/**
 * Observability API - Error Tracking Endpoint
 * POST: Report client-side errors
 * GET: Retrieve error history
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const ERROR_LOG_FILE = path.join(process.cwd(), 'data', 'error-log.json');

interface ErrorReport {
  id: string;
  type: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  componentStack?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
  resolved?: boolean;
  notes?: string;
}

// Ensure error log file exists
async function ensureErrorLog(): Promise<ErrorReport[]> {
  try {
    const content = await fs.readFile(ERROR_LOG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Create empty file
    await fs.mkdir(path.dirname(ERROR_LOG_FILE), { recursive: true });
    await fs.writeFile(ERROR_LOG_FILE, '[]');
    return [];
  }
}

// Save errors
async function saveErrors(errors: ErrorReport[]): Promise<void> {
  await fs.writeFile(ERROR_LOG_FILE, JSON.stringify(errors, null, 2));
}

// POST - Report error
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, error, componentStack, url, userAgent, timestamp } = body;

    if (!type || !error) {
      return NextResponse.json(
        { success: false, error: 'type and error required' },
        { status: 400 }
      );
    }

    const errors = await ensureErrorLog();

    const errorReport: ErrorReport = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      error: {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        stack: error.stack,
      },
      componentStack,
      url,
      userAgent,
      timestamp: timestamp || new Date().toISOString(),
      resolved: false,
    };

    errors.unshift(errorReport);

    // Keep only last 1000 errors
    if (errors.length > 1000) {
      errors.length = 1000;
    }

    await saveErrors(errors);

    // Log to console for immediate visibility
    console.error(`[ERROR REPORTED] [${type}] ${error.name}: ${error.message}`);
    if (error.stack) {
      console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    }

    return NextResponse.json({
      success: true,
      errorId: errorReport.id,
    });
  } catch (err: any) {
    console.error('[Error Reporting Failed]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// GET - Retrieve errors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const resolved = searchParams.get('resolved');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let errors = await ensureErrorLog();

    // Filter by type
    if (type) {
      errors = errors.filter(e => e.type === type);
    }

    // Filter by resolved status
    if (resolved !== null) {
      const isResolved = resolved === 'true';
      errors = errors.filter(e => e.resolved === isResolved);
    }

    // Pagination
    const total = errors.length;
    const paginatedErrors = errors.slice(offset, offset + limit);

    // Stats
    const stats = {
      total: errors.length,
      unresolved: errors.filter(e => !e.resolved).length,
      byType: errors.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      last24h: errors.filter(e => {
        const errorDate = new Date(e.timestamp);
        const now = new Date();
        return (now.getTime() - errorDate.getTime()) < 24 * 60 * 60 * 1000;
      }).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        errors: paginatedErrors,
        stats,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// PATCH - Update error (mark resolved, add notes)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, resolved, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id required' },
        { status: 400 }
      );
    }

    const errors = await ensureErrorLog();
    const errorIndex = errors.findIndex(e => e.id === id);

    if (errorIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Error not found' },
        { status: 404 }
      );
    }

    if (resolved !== undefined) {
      errors[errorIndex].resolved = resolved;
    }
    if (notes !== undefined) {
      errors[errorIndex].notes = notes;
    }

    await saveErrors(errors);

    return NextResponse.json({
      success: true,
      error: errors[errorIndex],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
