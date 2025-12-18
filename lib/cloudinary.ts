import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Upload image to Cloudinary
export async function uploadImage(file: File, folder: string) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `certistage/${folder}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      ).end(buffer)
    })
  } catch (error) {
    throw new Error('Image upload failed')
  }
}

// Delete image from Cloudinary
export async function deleteImage(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    throw new Error('Image deletion failed')
  }
}

// Delete multiple images
export async function deleteMultipleImages(publicIds: string[]) {
  try {
    const result = await cloudinary.api.delete_resources(publicIds)
    return result
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error)
    throw new Error('Bulk image deletion failed')
  }
}

export default cloudinary