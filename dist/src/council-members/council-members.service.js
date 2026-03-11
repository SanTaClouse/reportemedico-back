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
exports.CouncilMembersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CouncilMembersService = class CouncilMembersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(onlyVisible = true) {
        return this.prisma.councilMember.findMany({
            where: onlyVisible ? { isVisible: true } : undefined,
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });
    }
    async create(dto) {
        if (dto.isFeatured) {
            await this.prisma.councilMember.updateMany({
                where: { isFeatured: true },
                data: { isFeatured: false },
            });
        }
        return this.prisma.councilMember.create({
            data: {
                name: dto.name,
                role: dto.role,
                photo: dto.photo,
                linkedinUrl: dto.linkedinUrl,
                isFeatured: dto.isFeatured ?? false,
                isVisible: dto.isVisible ?? true,
                order: dto.order ?? 0,
            },
        });
    }
    async update(id, dto) {
        if (dto.isFeatured) {
            await this.prisma.councilMember.updateMany({
                where: { isFeatured: true, id: { not: id } },
                data: { isFeatured: false },
            });
        }
        return this.prisma.councilMember.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.role !== undefined && { role: dto.role }),
                ...(dto.photo !== undefined && { photo: dto.photo }),
                ...(dto.linkedinUrl !== undefined && { linkedinUrl: dto.linkedinUrl }),
                ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
                ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
                ...(dto.order !== undefined && { order: dto.order }),
            },
        });
    }
    remove(id) {
        return this.prisma.councilMember.delete({ where: { id } });
    }
};
exports.CouncilMembersService = CouncilMembersService;
exports.CouncilMembersService = CouncilMembersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CouncilMembersService);
//# sourceMappingURL=council-members.service.js.map