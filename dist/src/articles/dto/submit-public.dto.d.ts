export declare class SourceDto {
    title: string;
    url?: string;
    order?: number;
}
export declare class SubmitPublicDto {
    title: string;
    excerpt?: string;
    content: string;
    authorName: string;
    tagIds?: string[];
    suggestedSpecialties?: string[];
    sources?: SourceDto[];
}
