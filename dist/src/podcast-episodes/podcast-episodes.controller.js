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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodcastEpisodesController = void 0;
const common_1 = require("@nestjs/common");
const podcast_episodes_service_1 = require("./podcast-episodes.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_podcast_episode_dto_1 = require("./dto/create-podcast-episode.dto");
const update_podcast_episode_dto_1 = require("./dto/update-podcast-episode.dto");
let PodcastEpisodesController = class PodcastEpisodesController {
    constructor(service) {
        this.service = service;
    }
    findAll() {
        return this.service.findAll();
    }
    findAllAdmin() {
        return this.service.findAllAdmin();
    }
    create(dto) {
        return this.service.create(dto);
    }
    update(id, dto) {
        return this.service.update(id, dto);
    }
    remove(id) {
        return this.service.remove(id);
    }
};
exports.PodcastEpisodesController = PodcastEpisodesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PodcastEpisodesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PodcastEpisodesController.prototype, "findAllAdmin", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_podcast_episode_dto_1.CreatePodcastEpisodeDto]),
    __metadata("design:returntype", void 0)
], PodcastEpisodesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_podcast_episode_dto_1.UpdatePodcastEpisodeDto]),
    __metadata("design:returntype", void 0)
], PodcastEpisodesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PodcastEpisodesController.prototype, "remove", null);
exports.PodcastEpisodesController = PodcastEpisodesController = __decorate([
    (0, common_1.Controller)('podcast-episodes'),
    __metadata("design:paramtypes", [podcast_episodes_service_1.PodcastEpisodesService])
], PodcastEpisodesController);
//# sourceMappingURL=podcast-episodes.controller.js.map