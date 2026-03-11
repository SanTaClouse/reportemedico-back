import { CouncilMembersService } from './council-members.service';
import { CreateCouncilMemberDto } from './dto/create-council-member.dto';
import { UpdateCouncilMemberDto } from './dto/update-council-member.dto';
export declare class CouncilMembersController {
    private service;
    constructor(service: CouncilMembersService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        createdAt: Date;
        role: string;
        updatedAt: Date;
        order: number;
        isVisible: boolean;
        photo: string | null;
        linkedinUrl: string | null;
        isFeatured: boolean;
    }[]>;
    findAllAdmin(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        createdAt: Date;
        role: string;
        updatedAt: Date;
        order: number;
        isVisible: boolean;
        photo: string | null;
        linkedinUrl: string | null;
        isFeatured: boolean;
    }[]>;
    create(dto: CreateCouncilMemberDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        role: string;
        updatedAt: Date;
        order: number;
        isVisible: boolean;
        photo: string | null;
        linkedinUrl: string | null;
        isFeatured: boolean;
    }>;
    update(id: string, dto: UpdateCouncilMemberDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        role: string;
        updatedAt: Date;
        order: number;
        isVisible: boolean;
        photo: string | null;
        linkedinUrl: string | null;
        isFeatured: boolean;
    }>;
    remove(id: string): import(".prisma/client").Prisma.Prisma__CouncilMemberClient<{
        id: string;
        name: string;
        createdAt: Date;
        role: string;
        updatedAt: Date;
        order: number;
        isVisible: boolean;
        photo: string | null;
        linkedinUrl: string | null;
        isFeatured: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
