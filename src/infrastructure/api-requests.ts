import 'server-only'
import {NextResponse} from "next/server";
import * as zod from "zod";
import {logError} from "@/infrastructure/logging";

export function createZodErrorResponse(error: zod.ZodError) {
    return NextResponse.json({
        error: 'Invalid request data',
        details: error.message
    }, {status: 400});
}

export function createErrorResponse(error: any, name: string = 'generic_error', props:  Record<string, unknown> = {}) {
    if (error instanceof zod.ZodError) {
        return createZodErrorResponse(error);
    }

    logError(error, name, props);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
}

export function createSuccessJsonResponse(json: unknown, status: number = 200) {
    return NextResponse.json(json, {status: status});
}

export function createErrorJsonResponse(json: unknown, status: number = 401) {
    return NextResponse.json(json, {status: status});
}

export function createNotFound() {
    return NextResponse.json({ error: 'Not found' }, {status: 404});
}

export function createOkResponse() {
    return NextResponse.json({ ok: true }, {status: 200});
}
