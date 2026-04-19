import stream from 'stream';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { env } from '@/config/env/env.js';

// ==========================================
// CLOUDINARY UPLOAD
// ==========================================

// TODO: Uncomment khi cài `cloudinary` package
// import { v2 as cloudinary } from 'cloudinary';
//
// cloudinary.config({
//   cloud_name: env.cloudinary.cloudName,
//   api_key: env.cloudinary.apiKey,
//   api_secret: env.cloudinary.apiSecret,
// });
//
// export const uploadToCloudinary = async (
//   file: Express.Multer.File,
//   folder: string,
//   resourceType: 'image' | 'video' | 'raw' | 'auto',
// ): Promise<string> => {
//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         folder,
//         resource_type: resourceType,
//         delivery_type: 'upload',
//         access_mode: 'public',
//         transformation: [{ quality: 'auto:good' }],
//       },
//       (error: any, result: any) => {
//         if (error) {
//           console.error('Cloudinary upload error:', error);
//           return reject(
//             new Error(`Cloudinary upload failed: ${error.message}`),
//           );
//         }
//         if (!result?.secure_url) {
//           return reject(new Error('No secure URL returned from Cloudinary'));
//         }
//         resolve(result.secure_url);
//       },
//     );
//
//     const bufferStream = new stream.PassThrough();
//     bufferStream.end(file.buffer);
//     bufferStream.pipe(uploadStream);
//   });
// };

// ==========================================
// AWS S3 UPLOAD
// ==========================================

// TODO: Uncomment khi cài `@aws-sdk/client-s3` và `sharp` packages
//       và thêm AWS env vars (awsRegion, awsAccessKeyId, awsSecretAccessKey, awsS3Bucket)
//
// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
// import sharp from 'sharp';
//
// const s3Client = new S3Client({
//   region: env.awsRegion,
//   credentials: {
//     accessKeyId: env.awsAccessKeyId,
//     secretAccessKey: env.awsSecretAccessKey,
//   },
// });
//
// export const uploadToS3 = async (
//   file: Express.Multer.File,
//   folder: string,
//   fileType: 'image' | 'video' | 'raw' | 'auto',
// ): Promise<string> => { ... };

// ==========================================
// IMAGE OPTIMIZATION (requires sharp)
// ==========================================

// TODO: Uncomment khi cài `sharp` package
// export const optimizeImage = async (
//   buffer: Buffer,
//   mimeType: string,
// ): Promise<Buffer> => { ... };

// ==========================================
// UNIFIED UPLOAD INTERFACE
// ==========================================

// TODO: Uncomment khi đã cài đầy đủ dependencies
// export async function uploadFile({ ... }): Promise<string> { ... }
// export async function uploadMultipleFiles({ ... }): Promise<string[]> { ... }
