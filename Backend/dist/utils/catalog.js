"use strict";
/**
 * Utilidades del catálogo: precios, disponibilidad y serialización.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeProduct = serializeProduct;
exports.serializeProducts = serializeProducts;
exports.parsePrice = parsePrice;
exports.priceToDatabase = priceToDatabase;
exports.parsePriceFilter = parsePriceFilter;
exports.parseBoolean = parseBoolean;
exports.parseStock = parseStock;
exports.parseCategoryId = parseCategoryId;
exports.parseSortOrder = parseSortOrder;
const MAX_PRICE = 99999999.99;
function serializeProduct(product) {
    return {
        ...product,
        price: Number(product.price)
    };
}
function serializeProducts(products) {
    return products.map(serializeProduct);
}
/**
 * Devuelve el precio redondeado a dos decimales o null si no es válido.
 * Se acepta un número o un texto numérico.
 */
function parsePrice(value) {
    const numeric = typeof value === "number"
        ? value
        : typeof value === "string" && value.trim() !== ""
            ? Number(value)
            : NaN;
    if (!Number.isFinite(numeric) || numeric <= 0 || numeric > MAX_PRICE) {
        return null;
    }
    return Math.round(numeric * 100) / 100;
}
function priceToDatabase(value) {
    return value.toFixed(2);
}
/**
 * Para filtros de precio se permite 0 como mínimo.
 * null = filtro omitido; undefined = valor inválido.
 */
function parsePriceFilter(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return undefined;
    }
    return numeric;
}
function parseBoolean(value) {
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
function parseStock(value) {
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
function parseCategoryId(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric <= 0) {
        return undefined;
    }
    return numeric;
}
function parseSortOrder(value) {
    if (value === undefined || value === null || value === "") {
        return 0;
    }
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < 0) {
        return undefined;
    }
    return numeric;
}
