"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintEditionsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let PrintEditionsService = class PrintEditionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(onlyVisible = true) {
        return this.prisma.printEdition.findMany({
            where: onlyVisible ? { isVisible: true } : undefined,
            orderBy: { editionNumber: 'desc' },
        });
    }
    async create(dto) {
        try {
            return await this.prisma.printEdition.create({
                data: {
                    editionNumber: dto.editionNumber,
                    title: dto.title,
                    coverImage: dto.coverImage,
                    issuuUrl: dto.issuuUrl,
                    publishedAt: new Date(dto.publishedAt),
                    isVisible: dto.isVisible ?? true,
                },
            });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new common_1.ConflictException(`El número de edición ${dto.editionNumber} ya existe`);
            }
            throw e;
        }
    }
    async update(id, dto) {
        try {
            return await this.prisma.printEdition.update({
                where: { id },
                data: {
                    ...(dto.editionNumber !== undefined && { editionNumber: dto.editionNumber }),
                    ...(dto.title !== undefined && { title: dto.title }),
                    ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
                    ...(dto.issuuUrl !== undefined && { issuuUrl: dto.issuuUrl }),
                    ...(dto.publishedAt !== undefined && { publishedAt: new Date(dto.publishedAt) }),
                    ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
                },
            });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new common_1.ConflictException(`El número de edición ${dto.editionNumber} ya existe`);
            }
            throw e;
        }
    }
    remove(id) {
        return this.prisma.printEdition.delete({ where: { id } });
    }
};
exports.PrintEditionsService = PrintEditionsService;
exports.PrintEditionsService = PrintEditionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrintEditionsService);
//# sourceMappingURL=print-editions.service.js.map