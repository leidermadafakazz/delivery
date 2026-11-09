"use strict";
/**
 * Utilidades compartidas por los controladores del Módulo 2.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanString = cleanString;
exports.parseId = parseId;
exports.parseEnumValue = parseEnumValue;
exports.isValidEmail = isValidEmail;
exports.parseOptionalDate = parseOptionalDate;
exports.getPagination = getPagination;
function cleanString(value) {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}
function parseEnumValue(value, allowedValues) {
    if (typeof value !== "string" ||
        !allowedValues.includes(value)) {
        return null;
    }
    return value;
}
function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function parseOptionalDate(value) {
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
function getPagination(query) {
    const rawPage = Number(query.page);
    const rawLimit = Number(query.limit);
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isInteger(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, 100)
        : 20;
    return {
        page,
        limit,
        skip: (page - 1) * limit
    };
}
