/**
 * Utilidades compartidas por los controladores del Módulo 2.
 */

export function cleanString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
}

export function parseId(value: unknown): number | null {
    const id = Number(value);

    return Number.isInteger(id) && id > 0 ? id : null;
}

export function parseEnumValue<T extends string>(
    value: unknown,
    allowedValues: readonly T[]
): T | null {
    if (
        typeof value !== "string" ||
        !(allowedValues as readonly string[]).includes(value)
    ) {
        return null;
    }

    return value as T;
}

export function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseOptionalDate(value: unknown): Date | null | undefined {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value !== "string") {
        return undefined;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return undefined;
    }

    return parsed;
}

export function getPagination(query: {
    page?: unknown;
    limit?: unknown;
}): { page: number; limit: number; skip: number } {
    const rawPage = Number(query.page);
    const rawLimit = Number(query.limit);

    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit =
        Number.isInteger(rawLimit) && rawLimit > 0
            ? Math.min(rawLimit, 100)
            : 20;

    return {
        page,
        limit,
        skip: (page - 1) * limit
    };
}
