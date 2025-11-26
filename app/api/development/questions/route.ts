// ============================================================================
// Critical Questions API
// ============================================================================

import { NextResponse } from "next/server";
import { logger } from "@/lib/observability/logger";
import {
  addCriticalQuestion,
  getPendingQuestions,
  answerQuestion,
  shouldPauseForQuestion,
} from "@/lib/validation/validator";

// ============================================================================
// GET - Get pending questions
// ============================================================================

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: "sessionId required" },
      { status: 400 }
    );
  }

  try {
    const questions = getPendingQuestions(sessionId);
    const shouldPause = shouldPauseForQuestion(sessionId);

    return NextResponse.json({
      success: true,
      data: questions.map((q) => ({
        ...q,
        timestamp: q.timestamp.toISOString(),
      })),
      shouldPause,
    });
  } catch (error) {
    logger.error("Questions API GET error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Add or answer questions
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, action = "answer", ...data } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "add": {
        const question = addCriticalQuestion(sessionId, {
          context: data.context || "",
          question: data.question,
          reason: data.reason || "Required for correct implementation",
          priority: data.priority || "high",
          options: data.options,
          defaultOption: data.defaultOption,
        });

        return NextResponse.json({
          success: true,
          data: {
            ...question,
            timestamp: question.timestamp.toISOString(),
          },
        });
      }

      case "answer": {
        const { questionId, answer } = data;

        if (!questionId || !answer) {
          return NextResponse.json(
            { success: false, error: "questionId and answer required" },
            { status: 400 }
          );
        }

        const answered = answerQuestion(sessionId, questionId, answer);

        if (!answered) {
          return NextResponse.json(
            { success: false, error: "Question not found" },
            { status: 404 }
          );
        }

        logger.info("Critical question answered", {
          sessionId,
          questionId,
          answer,
        });

        return NextResponse.json({
          success: true,
          data: {
            ...answered,
            timestamp: answered.timestamp.toISOString(),
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error("Questions API POST error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
