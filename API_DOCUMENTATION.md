# Grand Telecom API Documentation

## Getting Started

- İlk dəfə işə salırsınızsa paketləri quraşdırın:
  
  npm install

- Serveri işə salın:
  
  node server.js

Server standart olaraq http://localhost:3001 ünvanında işləyir. Məlumat bazası üçün MongoDB tələb olunur (MONGODB_URI dəyişəni ilə konfiqurasiya oluna bilər).

## Overview
This API provides endpoints for managing content sections of the Grand Telecom website through the admin panel.

## Base URL
```
http://localhost:3001
```

## Authentication
The API uses token-based authentication.

- POST /api/login returns a bearer token upon successful login.
- Include the token in the Authorization header as: `Authorization: Bearer <token>`
- Some endpoints (e.g., content updates and file uploads) require authentication.

Environment variables:
- SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD can be used for initial superadmin login.
- Tokens are stored in-memory by the server and invalidated when the server restarts.

## Endpoints

### GET /api/content/:section
Retrieve content for a specific section.

**Parameters:**
- `section` (string): Section name. Allowed values: `about`, `contact`, `services`, `posts`

**Response:**
```json
{
  "title": "Section Title",
  "content": "Section content...",
  "image": "image_url",
  "address": "Contact address",
  "phone": "+994123456789",
  "email": "contact@grandtelecom.az",
  "hours": "Monday - Saturday, 09:00 - 18:00"
}
```

**Status Codes:**
- `200`: Success
- `404`: Section not found
- `500`: Internal server error

### POST /api/content/:section
Update content for a specific section.

**Parameters:**
- `section` (string): Section name. Allowed values: `about`, `contact`, `services`, `posts`

**Request Body:**
```json
{
  "title": "New Title",
  "content": "New content...",
  "image": "base64_image_data",
  "address": "New address",
  "phone": "+994123456789",
  "email": "new@email.com",
  "hours": "New hours"
}
```

**Validation Rules:**
- `title`: Maximum 200 characters
- `content`: Maximum 5000 characters
- `email`: Must be valid email format
- `phone`: Must be valid phone number format

**Response:**
```json
{
  "message": "Content updated successfully",
  "data": {
    "title": "Updated Title",
    "content": "Updated content..."
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Validation error or invalid section
- `500`: Internal server error

### POST /api/upload
Upload image files.

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `image`
- Supported formats: JPG, PNG, GIF
- Maximum size: 5MB

**Response:**
```json
{
  "message": "File uploaded successfully",
  "filename": "uploaded_filename.jpg",
  "path": "/uploads/uploaded_filename.jpg"
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid file or validation error
- `500`: Internal server error

## Error Handling

All endpoints return errors in the following format:
```json
{
  "error": "Error message",
  "details": ["Detailed error messages"]
}
```

## Security Features

### Input Sanitization
- All string inputs are sanitized using `validator.escape()`
- HTML entities are properly encoded
- XSS protection implemented

### Validation
- Section names are validated against allowed list
- Email format validation using `validator.isEmail()`
- Phone number validation using `validator.isMobilePhone()`
- Content length limits enforced

### File Upload Security
- File type validation
- File size limits (5MB maximum)
- Unique filename generation to prevent conflicts

## Usage Examples

### JavaScript (Frontend)
```javascript
// Load section data
const response = await fetch('http://localhost:3001/api/content/about');
const data = await response.json();

// Update section data
const updateResponse = await fetch('http://localhost:3001/api/content/about', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        title: 'New About Title',
        content: 'New about content...'
    })
});
```

### cURL Examples
```bash
# Get about section
curl -X GET http://localhost:3001/api/content/about

# Update contact section
curl -X POST http://localhost:3001/api/content/contact \
  -H "Content-Type: application/json" \
  -d '{"address":"New Address","phone":"+994123456789"}'

# Upload image
curl -X POST http://localhost:3001/api/upload \
  -F "image=@/path/to/image.jpg"
```

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Run tests:
```bash
npm test
```

## Environment Variables

Set the following variables as needed:

- NODE_ENV: development | production
- PORT: Server port (default: 3001)
- MONGODB_URI: MongoDB connection string
- ALLOWED_ORIGINS: Comma-separated list of allowed origins for CORS (only enforced in production). Example: `https://admin.example.com,https://www.example.com`
- SUPERADMIN_USERNAME: Initial superadmin username
- SUPERADMIN_PASSWORD: Initial superadmin password
- BCRYPT_ROUNDS: Bcrypt salt rounds (default: 12)

## Production Considerations

- Implement authentication and authorization
- Add rate limiting
- Use HTTPS in production
- Configure proper CORS settings
- Add request logging
- Implement database instead of JSON file storage
- Add backup and recovery mechanisms
