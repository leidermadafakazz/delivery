/**
 * Utilidades del catálogo: precios, disponibilidad y serialización.
 */

const MAX_PRICE = 99_999_999.99;

export function serializeProduct<T extends { price: unknown }>(product: T) {
    return {
        ...product,
        price: Number(product.price)
    };
}

export function serializeProducts<T extends { price: unknown }>(products: T[]) {
    return products.map(serializeProduct);
}

/**
 * Devuelve el precio redondeado a dos decimales o null si no es válido.
 * Se acepta un número o un texto numérico.
 */
export function parsePrice(value: unknown): number | null {
    const numeric =
        typeof value === "number"
            ? value
            : typeof value === "string" && value.trim() !== ""
              ? Number(value)
              : NaN;

    if (!Number.isFinite(numeric) || numeric <= 0 || numeric > MAX_PRICE) {
        return null;
    }

    return Math.round(numeric * 100) / 100;
}

export function priceToDatabase(value: number): string {
    return value.toFixed(2);
}

/**
 * Para filtros de precio se permite 0 como mínimo.
 * null = filtro omitido; undefined = valor inválido.
 */
export function parsePriceFilter(
    value: unknown
): number | null | undefined {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 0) {
        return undefined;
    }

    return numeric;
}

export function parseBoolean(value: unknown): boolean | undefined {
    if (typeof value === "boolean") {
        return value;
    }

    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    return undefined;
}

/**
 * null = campo vacío/omitido; undefined = valor inválido.
 */
export function parseStock(value: unknown): number | null | undefined {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const numeric = Number(value);

    if (!Number.isInteger(numeric) || numeric < 0) {
        return undefined;
    }

    return numeric;
}

/**
 * null = categoría sin asignar; undefined = identificador inválido.
 */
export function parseCategoryId(value: unknown): number | null | undefined {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const numeric = Number(value);

    if (!Number.isInteger(numeric) || numeric <= 0) {
        return undefined;
    }

    return numeric;
}

export function parseSortOrder(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") {
        return 0;
    }

    const numeric = Number(value);

    if (!Number.isInteger(numeric) || numeric < 0) {
        return undefined;
    }

    return numeric;
}
