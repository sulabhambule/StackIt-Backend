import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath, options = {}) =>{
    try{
        if(!localFilePath) return null;

        // Detect file extension
        const fileExtension = path.extname(localFilePath).toLowerCase();
        const resourceType = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(fileExtension)
        ? "image"
        : "raw";

        const uploadOptions = {
            resource_type: resourceType,
            ...options
        };

        const response = await cloudinary.uploader.upload(localFilePath, uploadOptions);

        // Delete the local file after successful upload
        fs.unlinkSync(localFilePath);

        return response;
    }
    catch (error) {
        console.error("Cloudinary Upload Error Details:", error);
        // Delete the local file even if upload fails
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
}

const uploadAvatarToCloudinary = async (localFilePath) => {
    const avatarOptions = {
        folder: "avatars",
        transformation: [
            { width: 300, height: 300, crop: "fill" },
            { quality: "auto" },
            { format: "auto" }
        ]
    };
    
    return await uploadOnCloudinary(localFilePath, avatarOptions);
}

export {uploadOnCloudinary, uploadAvatarToCloudinary}