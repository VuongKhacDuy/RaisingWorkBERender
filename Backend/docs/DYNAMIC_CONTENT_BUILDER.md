# Dynamic Content Builder API Documentation

## Overview
Dynamic Content Builder cho phép tạo nội dung linh hoạt với các loại block khác nhau: Text, Heading, Image, Quote, và Divider.

## Data Structure

### Content Block Structure
```javascript
{
  id: "unique-block-id",      // String: UUID v4
  type: "text|heading|image|quote|divider",
  order: 0,                   // Number: thứ tự hiển thị
  data: {
    // Tùy thuộc vào type của block
  }
}
```

### Block Types

#### 1. Text Block
```javascript
{
  id: "text-block-1",
  type: "text",
  order: 0,
  data: {
    text: "Nội dung văn bản..."
  }
}
```

#### 2. Heading Block
```javascript
{
  id: "heading-block-1", 
  type: "heading",
  order: 1,
  data: {
    text: "Tiêu đề",
    level: 1  // 1=H1, 2=H2, 3=H3
  }
}
```

#### 3. Image Block
```javascript
{
  id: "image-block-1",
  type: "image", 
  order: 2,
  data: {
    imageId: "64f...",  // ID của ảnh trong ImageBase64 collection
    caption: "Mô tả ảnh"
  }
}
```

#### 4. Quote Block
```javascript
{
  id: "quote-block-1",
  type: "quote",
  order: 3, 
  data: {
    quote: "Trích dẫn hoặc hội thoại",
    author: "Tác giả (optional)"
  }
}
```

#### 5. Divider Block
```javascript
{
  id: "divider-block-1",
  type: "divider",
  order: 4,
  data: {}  // Không cần data
}
```

## API Endpoints

### 1. Cập nhật toàn bộ Content Blocks
```
PUT  /api/episodes/update_content_blocks/:id
POST /api/episodes/update_content_blocks/:id  (backup)
```

**Body:**
```json
{
  "contentBlocks": [
    {
      "id": "block-1",
      "type": "heading", 
      "order": 0,
      "data": { "text": "Chapter 1", "level": 1 }
    },
    {
      "id": "block-2", 
      "type": "text",
      "order": 1,
      "data": { "text": "Nội dung chương..." }
    }
  ]
}
```

### 2. Thêm Block mới
```
POST /api/episodes/add_content_block/:id
```

**Body:**
```json
{
  "block": {
    "id": "new-block-3",
    "type": "image",
    "order": 2, 
    "data": {
      "imageId": "64f2a1b8c9d0e1f2a3b4c5d6",
      "caption": "Hình minh họa"
    }
  }
}
```

### 3. Xóa Block
```
DELETE /api/episodes/delete_content_block/:id/:blockId
POST   /api/episodes/delete_content_block/:id/:blockId  (backup)
```

**Params:**
- `:id` - Episode ID
- `:blockId` - Block ID cần xóa

### 4. Sắp xếp lại Blocks
```
PUT  /api/episodes/reorder_content_blocks/:id
POST /api/episodes/reorder_content_blocks/:id  (backup)
```

**Body:**
```json
{
  "blockOrders": [
    { "blockId": "block-1", "newOrder": 2 },
    { "blockId": "block-2", "newOrder": 0 },
    { "blockId": "block-3", "newOrder": 1 }
  ]
}
```

### 5. Migration từ Legacy Content
```
POST /api/episodes/migrate_legacy_content/:id
```

Chuyển đổi nội dung cũ (string) thành content blocks.

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "_id": "episode-id",
    "title": "Episode Title",
    "contentBlocks": [...],
    // other episode fields
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Frontend Integration Guide

### 1. Fetch Episode with Content Blocks
```javascript
const response = await fetch('/api/episodes/get_episode_by/EPISODE_ID');
const episode = await response.json();
const contentBlocks = episode.data.contentBlocks;
```

### 2. Add New Block
```javascript
const newBlock = {
  id: generateUUID(), // Use uuid library
  type: 'text',
  order: contentBlocks.length,
  data: { text: '' }
};

await fetch('/api/episodes/add_content_block/EPISODE_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ block: newBlock })
});
```

### 3. Update All Blocks
```javascript
await fetch('/api/episodes/update_content_blocks/EPISODE_ID', {
  method: 'POST', // hoặc PUT
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contentBlocks: updatedBlocks })
});
```

### 4. Delete Block
```javascript
await fetch(`/api/episodes/delete_content_block/EPISODE_ID/${blockId}`, {
  method: 'POST' // hoặc DELETE
});
```

### 5. Reorder Blocks
```javascript
const blockOrders = contentBlocks.map((block, index) => ({
  blockId: block.id,
  newOrder: index
}));

await fetch('/api/episodes/reorder_content_blocks/EPISODE_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ blockOrders })
});
```

## Image Upload Workflow

1. **Upload ảnh trước:**
   ```javascript
   const formData = new FormData();
   formData.append('image', file);
   formData.append('type', 'episode');
   formData.append('id', episodeId);
   
   const response = await fetch('/api/upload-image-series/', {
     method: 'POST',
     body: formData
   });
   
   const { image } = await response.json();
   const imageId = image._id;
   ```

2. **Tạo Image Block:**
   ```javascript
   const imageBlock = {
     id: generateUUID(),
     type: 'image',
     order: blocks.length,
     data: {
       imageId: imageId,
       caption: 'Mô tả ảnh'
     }
   };
   ```

## Validation Rules

1. **Block phải có:** `id`, `type`, `order`
2. **Block types hợp lệ:** `text`, `heading`, `image`, `quote`, `divider`
3. **Heading level:** 1, 2, hoặc 3
4. **Image block phải có:** `imageId`
5. **Không thể xóa block cuối cùng**
6. **Order phải là số**

## Migration Notes

- Episodes cũ sẽ tự động được migrate khi tạo mới
- Sử dụng `/migrate_legacy_content/:id` để migrate episodes có sẵn
- Legacy content được lưu trong field `legacyContent` để backup
