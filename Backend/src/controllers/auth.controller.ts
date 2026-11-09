
import { Request, Response } from "express";
import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt";
import { prisma } from "../config/database";

const profileSelect = {
    businessProfile: {
        select: {
            id: true,
            businessName: true,
            status: true
        }
    },
    deliveryProfile: {
        select: {
            id: true,
            documentNumber: true,
            status: true
        }
    }
} as const;




export async function register(req: Request, res: Response) {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Nombre, correo y contraseña son obligatorios"
            });
        }

        if (typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string") {
            return res.status(400).json({
                success: false,
                message: "Los datos enviados no son válidos"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "El correo electrónico no es válido"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "La contraseña debe tener mínimo 8 caracteres"
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Este correo ya está registrado"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                phone: typeof phone === "string" ? phone.trim() || null : null,

                // El registro público siempre crea clientes.
                // Los demás roles se asignarán mediante procesos autorizados.
                roles: {
                    create: {
                        role: {
                            connectOrCreate: {
                                where: { name: RoleName.CLIENT },
                                create: { name: RoleName.CLIENT }
                            }
                        }
                    }
                }
            },
            include: {
                roles: {
                    include: { role: true }
                },
                ...profileSelect
            }
        });

        const token = generateToken(user.id);

        return res.status(201).json({
            success: true,
            message: "Usuario registrado correctamente",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                roles: user.roles.map(item => item.role.name),
                businessProfile: user.businessProfile,
                deliveryProfile: user.deliveryProfile
            }
        });

    } catch (error) {
        console.error("Error registrando usuario:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al registrar usuario"
        });
    }
}

// INICIAR SESIÓN
export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Correo y contraseña son obligatorios"
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                email: email.trim().toLowerCase()
            },
            include: {
                roles: {
                    include: { role: true }
                },
                ...profileSelect
            }
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: "Credenciales incorrectas"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Esta cuenta está desactivada"
            });
        }

        const token = generateToken(user.id);

        return res.json({
            success: true,
            message: "Inicio de sesión exitoso",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                roles: user.roles.map(item => item.role.name),
                businessProfile: user.businessProfile,
                deliveryProfile: user.deliveryProfile
            }
        });

    } catch (error) {
        console.error("Error iniciando sesión:", error);

        return res.status(500).json({
            success: false,
            message: "Error interno al iniciar sesión"
        });
    }
}

// OBTENER PERFIL DEL USUARIO AUTENTICADO
export async function getMe(req: Request, res: Response) {
    try {
        const userId = res.locals.userId as number;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: { role: true }
                },
                businessProfile: {
                    select: {
                        id: true,
                        businessName: true,
                        status: true
                    }
                },
                deliveryProfile: {
                    select: {
                        id: true,
                        documentNumber: true,
                        status: true
                    }
                }
            }
        });

        if (!user || !user.isActive) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado o cuenta desactivada"
            });
        }

        return res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                roles: user.roles.map(item => item.role.name),
                businessProfile: user.businessProfile,
                deliveryProfile: user.deliveryProfile
            }
        });

    } catch (error) {
        console.error("Error obteniendo perfil:", error);

        return res.status(500).json({
            success: false,
            message: "Error al consultar el perfil"
        });
    }
}
