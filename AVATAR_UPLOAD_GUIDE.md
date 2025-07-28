# Avatar Upload with Cloudinary - Implementation Guide

## Overview
This guide explains how to use the Cloudinary integration for avatar uploads in your QnA forum application.

## Setup Requirements

### 1. Environment Variables
Make sure you have these environment variables set in your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Directory Structure
Ensure the temporary upload directory exists:
```
server/
  public/
    temp/     # This directory should exist for temporary file storage
```

## API Endpoints

### 1. User Registration with Avatar
**Endpoint:** `POST /api/auth/register`
**Content-Type:** `multipart/form-data`

**Fields:**
- `name` (required): User's full name
- `email` (required): User's email address
- `password` (required): User's password
- `confirmPassword` (required): Password confirmation
- `avatar` (optional): Image file for user avatar

**Example using curl:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "password=securepassword" \
  -F "confirmPassword=securepassword" \
  -F "avatar=@/path/to/avatar.jpg"
```

### 2. Update User Avatar
**Endpoint:** `PATCH /api/auth/update-avatar`
**Content-Type:** `multipart/form-data`
**Authentication:** Required (Bearer token)

**Fields:**
- `avatar` (required): New image file for user avatar

**Example using curl:**
```bash
curl -X PATCH http://localhost:3000/api/auth/update-avatar \
  -H "Authorization: Bearer your_access_token" \
  -F "avatar=@/path/to/new-avatar.jpg"
```

## Frontend Implementation

### React.js Example with Axios

#### Registration with Avatar
```javascript
import axios from 'axios';

const registerWithAvatar = async (userData, avatarFile) => {
  const formData = new FormData();
  formData.append('name', userData.name);
  formData.append('email', userData.email);
  formData.append('password', userData.password);
  formData.append('confirmPassword', userData.confirmPassword);
  
  if (avatarFile) {
    formData.append('avatar', avatarFile);
  }

  try {
    const response = await axios.post('/api/auth/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Registration error:', error.response.data);
    throw error;
  }
};
```

#### Update Avatar
```javascript
const updateAvatar = async (avatarFile, token) => {
  const formData = new FormData();
  formData.append('avatar', avatarFile);

  try {
    const response = await axios.patch('/api/auth/update-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Avatar update error:', error.response.data);
    throw error;
  }
};
```

#### React Component Example
```jsx
import React, { useState } from 'react';

const AvatarUploadComponent = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      await updateAvatar(selectedFile, token);
      alert('Avatar updated successfully!');
    } catch (error) {
      alert('Failed to update avatar');
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
      />
      {preview && (
        <img 
          src={preview} 
          alt="Preview" 
          style={{ width: '100px', height: '100px', objectFit: 'cover' }}
        />
      )}
      <button onClick={handleUpload}>Upload Avatar</button>
    </div>
  );
};
```

## File Validation

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### File Size Limit
- Maximum: 5MB per file

### Cloudinary Transformations
Avatars are automatically optimized with:
- Resized to 300x300 pixels
- Auto quality optimization
- Auto format selection for best performance
- Stored in the "avatars" folder

## Error Handling

### Common Error Responses

1. **Missing file:**
```json
{
  "success": false,
  "message": "Avatar file is required",
  "statusCode": 400
}
```

2. **Invalid file format:**
```json
{
  "success": false,
  "message": "Only image files (jpeg, jpg, png, gif, webp) are allowed!",
  "statusCode": 400
}
```

3. **Upload failure:**
```json
{
  "success": false,
  "message": "Error while uploading avatar to cloudinary",
  "statusCode": 400
}
```

## Best Practices

1. **Client-side validation:** Validate file type and size before uploading
2. **Progress indicators:** Show upload progress for better UX
3. **Error handling:** Provide clear error messages to users
4. **Fallback avatars:** Always have a default avatar system
5. **Image optimization:** Compress images on the client side before uploading

## Security Considerations

1. **File type validation:** Only allow image files
2. **File size limits:** Prevent large file uploads
3. **Authentication:** Require user authentication for avatar updates
4. **Sanitization:** File names are automatically sanitized
5. **Temporary cleanup:** Local files are automatically deleted after upload

## Testing

### Test Cases to Implement

1. **Registration without avatar** - should use default avatar
2. **Registration with valid avatar** - should upload and store URL
3. **Avatar update with valid file** - should replace existing avatar
4. **Upload with invalid file type** - should reject with error
5. **Upload with oversized file** - should reject with error
6. **Unauthorized avatar update** - should require authentication

## Monitoring and Maintenance

1. **Cloudinary usage:** Monitor your Cloudinary quota and usage
2. **Storage cleanup:** Regularly clean up orphaned images
3. **Performance:** Monitor upload times and optimize as needed
4. **Backup:** Consider backup strategies for user avatars
