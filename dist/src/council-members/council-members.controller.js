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
exports.CouncilMembersController = void 0;
const common_1 = require("@nestjs/common");
const council_members_service_1 = require("./council-members.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_council_member_dto_1 = require("./dto/create-council-member.dto");
const update_council_member_dto_1 = require("./dto/update-council-member.dto");
let CouncilMembersController = class CouncilMembersController {
    constructor(service) {
        this.service = service;
    }
    findAll() {
        return this.service.findAll(true);
    }
    findAllAdmin() {
        return this.service.findAll(false);
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
exports.CouncilMembersController = CouncilMembersController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CouncilMembersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CouncilMembersController.prototype, "findAllAdmin", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_council_member_dto_1.CreateCouncilMemberDto]),
    __metadata("design:returntype", void 0)
], CouncilMembersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_council_member_dto_1.UpdateCouncilMemberDto]),
    __metadata("design:returntype", void 0)
], CouncilMembersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CouncilMembersController.prototype, "remove", null);
exports.CouncilMembersController = CouncilMembersController = __decorate([
    (0, common_1.Controller)('council-members'),
    __metadata("design:paramtypes", [council_members_service_1.CouncilMembersService])
], CouncilMembersController);
//# sourceMappingURL=council-members.controller.js.map