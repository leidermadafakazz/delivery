"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getMe = getMe;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../utils/jwt");
const database_1 = require("../config/database");
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
};
async function register(req, res) {
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
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email: normalizedEmail }
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Este correo ya está registrado"
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await database_1.prisma.user.create({
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
                                where: { name: client_1.RoleName.CLIENT },
                                create: { name: client_1.RoleName.CLIENT }
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
        const token = (0, jwt_1.generateToken)(user.id);
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
    }
    catch (error) {
        console.error("Error registrando usuario:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al registrar usuario"
        });
    }
}
// INICIAR SESIÓN
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password) {
            return res.status(400).json({
                success: false,
                message: "Correo y contraseña son obligatorios"
            });
        }
        const user = await database_1.prisma.user.findUnique({
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
        if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
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
        const token = (0, jwt_1.generateToken)(user.id);
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
    }
    catch (error) {
        console.error("Error iniciando sesión:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al iniciar sesión"
        });
    }
}
// OBTENER PERFIL DEL USUARIO AUTENTICADO
async function getMe(req, res) {
    try {
        const userId = res.locals.userId;
        const user = await database_1.prisma.user.findUnique({
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
    }
    catch (error) {
        console.error("Error obteniendo perfil:", error);
        return res.status(500).json({
            success: false,
            message: "Error al consultar el perfil"
        });
    }
}
