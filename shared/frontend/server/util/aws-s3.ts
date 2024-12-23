const AWS_S3_ORIGIN = process.env.AWS_S3_ORIGIN;

export const getUrlByS3Key = (key: string) => {
    if (!AWS_S3_ORIGIN) {
        throw new Error('AWS_S3_ORIGIN is missing!');
    }

    return `${AWS_S3_ORIGIN}/${key}`;
};
