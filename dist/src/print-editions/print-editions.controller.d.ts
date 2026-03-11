import { PrintEditionsService } from './print-editions.service';
import { CreatePrintEditionDto } from './dto/create-print-edition.dto';
import { UpdatePrintEditionDto } from './dto/update-print-edition.dto';
export declare class PrintEditionsController {
    private service;
    constructor(service: PrintEditionsService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        title: string;
        publishedAt: Date;
        editionNumber: number;
        coverImage: string;
        issuuUrl: string;
        isVisible: boolean;
    }[]>;
    findAllAdmin(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        title: string;
        publishedAt: Date;
        editionNumber: number;
        coverImage: string;
        issuuUrl: string;
        isVisible: boolean;
    }[]>;
    create(dto: CreatePrintEditionDto): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        publishedAt: Date;
        editionNumber: number;
        coverImage: string;
        issuuUrl: string;
        isVisible: boolean;
    }>;
    update(id: string, dto: UpdatePrintEditionDto): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        publishedAt: Date;
        editionNumber: number;
        coverImage: string;
        issuuUrl: string;
        isVisible: boolean;
    }>;
    remove(id: string): import(".prisma/client").Prisma.Prisma__PrintEditionClient<{
        id: string;
        createdAt: Date;
        title: string;
        publishedAt: Date;
        editionNumber: number;
        coverImage: string;
        issuuUrl: string;
        isVisible: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
