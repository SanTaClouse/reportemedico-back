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
exports.ArticlesController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const articles_service_1 = require("./articles.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_article_dto_1 = require("./dto/create-article.dto");
const update_article_dto_1 = require("./dto/update-article.dto");
const submit_public_dto_1 = require("./dto/submit-public.dto");
const set_status_dto_1 = require("./dto/set-status.dto");
const set_relevance_dto_1 = require("./dto/set-relevance.dto");
const specialty_action_dto_1 = require("./dto/specialty-action.dto");
let ArticlesController = class ArticlesController {
    constructor(articlesService) {
        this.articlesService = articlesService;
    }
    getHome() {
        return this.articlesService.getHome();
    }
    getNews(page, limit) {
        return this.articlesService.findPublished(+page || 1, +limit || 10, 'NEWS');
    }
    getMedical(page, limit) {
        return this.articlesService.findPublished(+page || 1, +limit || 10, 'MEDICAL_ARTICLE');
    }
    getByTag(slug, page) {
        return this.articlesService.findPublished(+page || 1, 10, undefined, slug);
    }
    findAll(page, limit) {
        return this.articlesService.findPublished(+page || 1, +limit || 10);
    }
    findOne(slug) {
        return this.articlesService.findBySlug(slug);
    }
    incrementView(slug) {
        return this.articlesService.incrementViews(slug);
    }
    submitPublic(dto) {
        return this.articlesService.submitPublic(dto);
    }
    create(dto) {
        return this.articlesService.create(dto);
    }
    setStatus(id, dto) {
        return this.articlesService.setStatus(id, dto.status);
    }
    setRelevance(id, dto) {
        return this.articlesService.setRelevance(id, dto.relevance);
    }
    approveSpecialty(id, dto) {
        return this.articlesService.approveSpecialty(id, dto.name);
    }
    rejectSpecialty(id, dto) {
        return this.articlesService.rejectSpecialty(id, dto.name);
    }
    update(id, dto) {
        return this.articlesService.update(id, dto);
    }
    remove(id) {
        return this.articlesService.remove(id);
    }
};
exports.ArticlesController = ArticlesController;
__decorate([
    (0, common_1.Get)('home'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "getHome", null);
__decorate([
    (0, common_1.Get)('type/news'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "getNews", null);
__decorate([
    (0, common_1.Get)('type/medical'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "getMedical", null);
__decorate([
    (0, common_1.Get)('tag/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "getByTag", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':slug/view'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "incrementView", null);
__decorate([
    (0, common_1.Post)('submit'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 3600000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [submit_public_dto_1.SubmitPublicDto]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "submitPublic", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_article_dto_1.CreateArticleDto]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, set_status_dto_1.SetStatusDto]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "setStatus", null);
__decorate([
    (0, common_1.Patch)(':id/relevance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, set_relevance_dto_1.SetRelevanceDto]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "setRelevance", null);
__decorate([
    (0, common_1.Patch)(':id/approve-specialty'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, specialty_action_dto_1.SpecialtyActionDto]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "approveSpecialty", null);
__decorate([
    (0, common_1.Patch)(':id/reject-specialty'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, specialty_action_dto_1.SpecialtyActionDto]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "rejectSpecialty", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_article_dto_1.UpdateArticleDto]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArticlesController.prototype, "remove", null);
exports.ArticlesController = ArticlesController = __decorate([
    (0, common_1.Controller)('articles'),
    __metadata("design:paramtypes", [articles_service_1.ArticlesService])
], ArticlesController);
//# sourceMappingURL=articles.controller.js.map