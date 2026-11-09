import jwt from "jsonwebtoken";

export function generateToken(userId: number) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET no está configurado");
    }

    return jwt.sign(
        { userId },
        secret,
        { expiresIn: "7d" }
    );
}