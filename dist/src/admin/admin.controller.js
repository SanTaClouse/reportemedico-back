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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const articles_service_1 = require("../articles/articles.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let AdminController = class AdminController {
    constructor(articlesService) {
        this.articlesService = articlesService;
    }
    getArticleById(id) {
        return this.articlesService.findByIdAdmin(id);
    }
    getArticles(page, limit, type, status, relevance, tag, search, sort) {
        return this.articlesService.findAllAdmin({
            page: +page || 1,
            limit: +limit || 20,
            type,
            status,
            relevance: relevance ? +relevance : undefined,
            tag,
            search,
            sort,
        });
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('articles/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getArticleById", null);
__decorate([
    (0, common_1.Get)('articles'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('relevance')),
    __param(5, (0, common_1.Query)('tag')),
    __param(6, (0, common_1.Query)('search')),
    __param(7, (0, common_1.Query)('sort')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getArticles", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [articles_service_1.ArticlesService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map