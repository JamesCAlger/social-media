import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { logger } from '../core/logger';

export class R2Uploader {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
      throw new Error('Missing R2 credentials. Please check your .env file.');
    }

    // R2 uses S3-compatible API
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    this.bucketName = bucketName;
    this.publicUrl = publicUrl;

    logger.info('R2 Uploader initialized', { bucketName, publicUrl });
  }

  /**
   * Upload a video file to R2 and return a public direct download URL
   */
  async uploadVideo(videoPath: string, contentId: string): Promise<string> {
    try {
      const fileName = `videos/${contentId}.mp4`;
      const fileStream = fs.createReadStream(videoPath);
      const fileStats = fs.statSync(videoPath);

      logger.info('Uploading video to R2', {
        fileName,
        contentId,
        fileSizeMB: (fileStats.size / 1024 / 1024).toFixed(2)
      });

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: fileStream,
          ContentType: 'video/mp4',
          ContentLength: fileStats.size,
        })
      );

      // Generate public URL
      const publicVideoUrl = `${this.publicUrl}/${fileName}`;

      logger.info('Video uploaded to R2 successfully', {
        contentId,
        publicUrl: publicVideoUrl
      });

      return publicVideoUrl;
    } catch (error) {
      logger.error('Failed to upload video to R2', { error, videoPath, contentId });
      throw error;
    }
  }

  /**
   * Delete a video from R2
   */
  async deleteVideo(contentId: string): Promise<void> {
    try {
      const fileName = `videos/${contentId}.mp4`;

      logger.info('Deleting video from R2', { fileName, contentId });

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
        })
      );

      logger.info('Video deleted from R2 successfully', { contentId });
    } catch (error) {
      logger.error('Failed to delete video from R2', { error, contentId });
      throw error;
    }
  }

  /**
   * List all videos in the R2 bucket
   */
  async listVideos(): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    try {
      logger.info('Listing videos from R2', { bucketName: this.bucketName });

      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: 'videos/',
        })
      );

      const videos = (response.Contents || []).map((item) => ({
        key: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
      }));

      logger.info('Videos listed from R2', { count: videos.length });

      return videos;
    } catch (error) {
      logger.error('Failed to list videos from R2', { error });
      throw error;
    }
  }

  /**
   * Clean up old videos (optional - saves storage space)
   * Deletes videos older than specified days
   */
  async cleanupOldVideos(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      logger.info('Starting cleanup of old videos', { daysOld, cutoffDate });

      const videos = await this.listVideos();
      const oldVideos = videos.filter((video) => video.lastModified < cutoffDate);

      logger.info(`Found ${oldVideos.length} old videos to delete`);

      for (const video of oldVideos) {
        const contentId = path.basename(video.key, '.mp4');
        await this.deleteVideo(contentId);
        logger.info('Deleted old video', {
          key: video.key,
          lastModified: video.lastModified.toISOString()
        });
      }

      logger.info('Cleanup completed', { deletedCount: oldVideos.length });
    } catch (error) {
      logger.error('Failed to cleanup old videos', { error });
      throw error;
    }
  }
}
