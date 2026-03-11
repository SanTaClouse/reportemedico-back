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
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
const prisma_service_1 = require("../prisma/prisma.service");
let MediaService = class MediaService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        cloudinary_1.v2.config({
            cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
            api_key: config.get('CLOUDINARY_API_KEY'),
            api_secret: config.get('CLOUDINARY_API_SECRET'),
        });
    }
    buildPublicId(originalName) {
        const date = new Date();
        const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        const baseName = originalName
            .replace(/\.[^/.]+$/, '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60);
        return `${dateStr}_${baseName}`;
    }
    uploadToCloudinary(file, folder) {
        return new Promise((resolve, reject) => {
            cloudinary_1.v2.uploader
                .upload_stream({ folder, public_id: this.buildPublicId(file.originalname) }, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            })
                .end(file.buffer);
        });
    }
    async upload(file, altText) {
        const result = await this.uploadToCloudinary(file, 'Reporte-Medico/Media');
        return this.prisma.media.create({
            data: {
                url: result.secure_url,
                publicId: result.public_id,
                altText,
                width: result.width,
                height: result.height,
            },
        });
    }
    async uploadNoticias(file) {
        const result = await this.uploadToCloudinary(file, 'Reporte-Medico/Noticias');
        return { url: result.secure_url };
    }
    async uploadArticulos(file) {
        const result = await this.uploadToCloudinary(file, 'Reporte-Medico/Articulos');
        return { url: result.secure_url };
    }
    async uploadConsejo(file) {
        const result = await this.uploadToCloudinary(file, 'Reporte-Medico/Consejo');
        return { url: result.secure_url };
    }
    findAll() {
        return this.prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async remove(id) {
        const media = await this.prisma.media.findUnique({ where: { id } });
        if (media) {
            await cloudinary_1.v2.uploader.destroy(media.publicId);
            await this.prisma.media.delete({ where: { id } });
        }
        return { success: true };
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], MediaService);
//# sourceMappingURL=media.service.js.map