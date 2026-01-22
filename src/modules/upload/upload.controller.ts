import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { v2 as cloudinary } from 'cloudinary';
import { formatSuccessResponse } from '../../common/utils/response.util';
import type { Multer } from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload profile picture to Cloudinary',
    description: 'Upload an image file and return the Cloudinary URL',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image uploaded successfully',
  })
  async uploadProfilePicture(@UploadedFile() file: Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    try {
      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'staff-profiles',
            transformation: [
              { width: 500, height: 500, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );

        uploadStream.end(file.buffer);
      });

      return formatSuccessResponse(
        {
          url: (result as any).secure_url,
          publicId: (result as any).public_id,
        },
        'Image uploaded successfully',
      );
    } catch (error) {
      throw new BadRequestException(`Failed to upload image: ${error.message}`);
    }
  }
}
