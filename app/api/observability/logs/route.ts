/**
 * Observability API - Logs Endpoint
 * GET: Retrieve logs with filtering
 * POST: Add new log entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLogBuffer, LogEntry, LogLevel } from '@/lib/observability/logger';

// In-memory error store (would be a database in production)
const errorStore: Array<{
  id: string;
  type: string;
  error: { name: string; message: string; stack?: string };
  componentStack?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
}> = [];

const MAX_ERROR_STORE = 500;

// GET - Retrieve logs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const level = searchParams.get('level') as LogLevel | null;
  const context = searchParams.get('context');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');
  const since = searchParams.get('since'); // ISO timestamp

  let logs = getLogBuffer();

  // Filter by level
  if (level) {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const minLevelIndex = levels.indexOf(level);
    logs = logs.filter(log => levels.indexOf(log.level) >= minLevelIndex);
  }

  // Filter by context
  if (context) {
    logs = logs.filter(log => log.context?.includes(context));
  }

  // Filter by timestamp
  if (since) {
    const sinceDate = new Date(since);
    logs = logs.filter(log => new Date(log.timestamp) >= sinceDate);
  }

  // Pagination
  const total = logs.length;
  logs = logs.slice(offset, offset + limit);

  return NextResponse.json({
    success: true,
    data: {
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    },
  });
}

// POST - Add client-side log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, message, context, data, error } = body;

    // Validate
    if (!level || !message) {
      return NextResponse.json(
        { success: false, error: 'level and message required' },
        { status: 400 }
      );
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || 'client',
      data,
      error,
    };

    // Log to server console (would go to log aggregator in production)
    console.log(`[CLIENT] [${level.toUpperCase()}] [${context || 'client'}]`, message, data || '');

    return NextResponse.json({ success: true, logged: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
