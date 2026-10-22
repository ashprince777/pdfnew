import Groq from 'groq-sdk';
import { NextResponse, type NextRequest } from 'next/server';
import { buildMessages, buildSystem, maxTokensFor, parseAiRequest } from '@/lib/ai/prompts';
import { AI_MODEL, consumeAiCredit, getAiUsage, getGroq, isAiEnabled, maxCharsFor, refundAiCredit } from '@/lib/ai/server';
import { rateLimitResponse } from '@/lib/rateLimit';
import { getCurrentUser, getSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Runs one AI task on the document text the browser extracted, streaming the answer back as plain
 * text. Costs one AI credit; the credit is returned if the request fails before any output.
 */
export async function POST(request: NextRequest) {
    if (!isAiEnabled()) return NextResponse.json({ error: 'AI features are not available yet.' }, { status: 503 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Please log in to use AI features.' }, { status: 401 });
    const limited = rateLimitResponse(request, 'ai', user.id);
    if (limited) return limited;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (body?.consent !== true) return NextResponse.json({ error: 'Please confirm the AI privacy notice first.' }, { status: 400 });
    const parsed = parseAiRequest(body, maxCharsFor(String(body.task)));
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { plan, limit } = await getAiUsage(admin, user.id);
    let used: number | null;
    try {
        used = await consumeAiCredit(admin, user.id, limit);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'AI features are not available yet.' }, { status: 503 });
    }
    if (used === null) {
        return NextResponse.json(
            {
                error:
                    plan === 'free'
                        ? `You have used all ${limit} free AI credits this month. Upgrade to Premium for more, or wait until next month.`
                        : `You have used all ${limit} AI credits this month. They reset on the 1st.`,
                code: 'NO_CREDITS',
            },
            { status: 402 }
        );
    }

    // Opening the stream fails fast (bad key, rate limit, request too large) before any output.
    let stream: AsyncIterable<Groq.Chat.ChatCompletionChunk>;
    try {
        stream = await getGroq().chat.completions.create({
            model: AI_MODEL,
            stream: true,
            max_completion_tokens: maxTokensFor(parsed.task),
            // Low reasoning keeps answers fast and within Groq's per-minute token allowance.
            reasoning_effort: 'low',
            include_reasoning: false,
            messages: [{ role: 'system', content: buildSystem(parsed.task, parsed.text, parsed.language) }, ...buildMessages(parsed)],
        });
    } catch (error) {
        await refundAiCredit(admin, user.id);
        console.error('Groq request failed', error);
        const status = error instanceof Groq.APIError ? error.status : undefined;
        const message =
            status === 429
                ? 'The AI service is busy right now. Please try again in a minute; your credit was not used.'
                : status === 413
                  ? 'This document is too large for the AI right now. Choose fewer pages and try again; your credit was not used.'
                  : 'The AI request failed. Your credit was not used; please try again.';
        return NextResponse.json({ error: message }, { status: status === 429 ? 503 : status === 413 ? 413 : 502 });
    }

    const encoder = new TextEncoder();
    const output = new ReadableStream<Uint8Array>({
        async start(controller) {
            const send = (text: string) => controller.enqueue(encoder.encode(text));
            let wroteText = false;
            let finish: string | null = null;
            try {
                for await (const chunk of stream) {
                    const choice = chunk.choices[0];
                    const text = choice?.delta?.content;
                    if (text) {
                        send(text);
                        wroteText = true;
                    }
                    if (choice?.finish_reason) finish = choice.finish_reason;
                }
                if (finish === 'length') {
                    send('\n\n[The answer reached the maximum length. For long documents, choose fewer pages at a time.]');
                } else if (!wroteText) {
                    await refundAiCredit(admin, user.id);
                    send('[The AI returned an empty answer. Your credit was not used; please try again.]');
                }
            } catch (error) {
                console.error('Groq stream failed', error);
                if (!wroteText) await refundAiCredit(admin, user.id);
                send(`${wroteText ? '\n\n' : ''}[The AI response was interrupted. ${wroteText ? '' : 'Your credit was not used. '}Please try again.]`);
            } finally {
                controller.close();
            }
        },
    });

    return new Response(output, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-AI-Credits-Used': String(used),
            'X-AI-Credits-Limit': String(limit),
        },
    });
}
