import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class MediaService {
    private prisma;
    private config;
    constructor(prisma: PrismaService, config: ConfigService);
    private buildPublicId;
    private uploadToCloudinary;
    upload(file: Express.Multer.File, altText?: string): Promise<{
        id: string;
        createdAt: Date;
        url: string;
        publicId: string;
        altText: string | null;
        width: number | null;
        height: number | null;
    }>;
    uploadNoticias(file: Express.Multer.File): Promise<{
        url: string;
    }>;
    uploadArticulos(file: Express.Multer.File): Promise<{
        url: string;
    }>;
    uploadConsejo(file: Express.Multer.File): Promise<{
        url: string;
    }>;
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        url: string;
        publicId: string;
        altText: string | null;
        width: number | null;
        height: number | null;
    }[]>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
