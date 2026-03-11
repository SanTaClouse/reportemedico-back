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
exports.PodcastEpisodesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PodcastEpisodesService = class PodcastEpisodesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll() {
        return this.prisma.podcastEpisode.findMany({
            where: { isVisible: true },
            orderBy: { order: 'asc' },
        });
    }
    findAllAdmin() {
        return this.prisma.podcastEpisode.findMany({
            orderBy: { order: 'asc' },
        });
    }
    create(dto) {
        return this.prisma.podcastEpisode.create({
            data: {
                title: dto.title,
                description: dto.description,
                youtubeId: dto.youtubeId,
                thumbnailUrl: dto.thumbnailUrl,
                isVisible: dto.isVisible ?? true,
                order: dto.order ?? 0,
            },
        });
    }
    update(id, dto) {
        return this.prisma.podcastEpisode.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                youtubeId: dto.youtubeId,
                thumbnailUrl: dto.thumbnailUrl,
                isVisible: dto.isVisible,
                order: dto.order,
            },
        });
    }
    remove(id) {
        return this.prisma.podcastEpisode.delete({ where: { id } });
    }
};
exports.PodcastEpisodesService = PodcastEpisodesService;
exports.PodcastEpisodesService = PodcastEpisodesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PodcastEpisodesService);
//# sourceMappingURL=podcast-episodes.service.js.map