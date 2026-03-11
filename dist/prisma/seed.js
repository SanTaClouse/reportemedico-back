"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    const tags = [
        { name: 'Cardiología', slug: 'cardiologia' },
        { name: 'Oncología', slug: 'oncologia' },
        { name: 'Neurología', slug: 'neurologia' },
        { name: 'Pediatría', slug: 'pediatria' },
        { name: 'Dermatología', slug: 'dermatologia' },
        { name: 'Ginecología', slug: 'ginecologia' },
        { name: 'Nutrición', slug: 'nutricion' },
        { name: 'Salud Pública', slug: 'salud-publica' },
        { name: 'Investigación Clínica', slug: 'investigacion-clinica' },
        { name: 'Tecnología Médica', slug: 'tecnologia-medica' },
        { name: 'Cirugía', slug: 'cirugia' },
        { name: 'Diabetes', slug: 'diabetes' },
        { name: 'Gastroenterología', slug: 'gastroenterologia' },
        { name: 'Psiquiatría', slug: 'psiquiatria' },
        { name: 'Traumatología', slug: 'traumatologia' },
    ];
    for (const tag of tags) {
        await prisma.tag.upsert({
            where: { slug: tag.slug },
            update: {},
            create: tag,
        });
    }
    console.log(`✓ ${tags.length} tags creados`);
    const hashedPassword = await bcrypt.hash('CAMBIAR_EN_PRODUCCION', 12);
    await prisma.user.upsert({
        where: { email: 'admin@reportemedico.com' },
        update: {},
        create: {
            email: 'admin@reportemedico.com',
            password: hashedPassword,
            role: 'ADMIN',
            name: 'Administrador',
        },
    });
    console.log('✓ Usuario admin creado');
    console.log('Seed completado.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map