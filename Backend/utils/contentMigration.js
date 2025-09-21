// Utils để migrate content cũ sang dynamic content blocks
const crypto = require('crypto');

// Sử dụng crypto.randomUUID() thay vì uuid package
const uuidv4 = () => crypto.randomUUID();

// Convert legacy content (string) thành content blocks
const migrateLegacyContent = (legacyContent) => {
  if (!legacyContent || typeof legacyContent !== 'string') {
    return [{
      id: uuidv4(),
      type: 'text',
      order: 0,
      data: { text: '' }
    }];
  }

  // Tách content thành các đoạn (split by \n\n)
  const paragraphs = legacyContent.split('\n\n').filter(p => p.trim());
  
  const blocks = paragraphs.map((paragraph, index) => {
    const trimmedParagraph = paragraph.trim();
    
    // Detect heading (starts with #)
    if (trimmedParagraph.startsWith('#')) {
      const level = Math.min((trimmedParagraph.match(/^#+/) || [''])[0].length, 3);
      const text = trimmedParagraph.replace(/^#+\s*/, '');
      
      return {
        id: uuidv4(),
        type: 'heading',
        order: index,
        data: {
          text,
          level
        }
      };
    }
    
    // Detect quote (starts with > or wrapped in quotes)
    if (trimmedParagraph.startsWith('>') || 
        (trimmedParagraph.startsWith('"') && trimmedParagraph.endsWith('"'))) {
      const quote = trimmedParagraph.replace(/^>\s*|^"|"$/g, '');
      
      return {
        id: uuidv4(),
        type: 'quote',
        order: index,
        data: {
          quote,
          author: ''
        }
      };
    }
    
    // Default to text block
    return {
      id: uuidv4(),
      type: 'text',
      order: index,
      data: {
        text: trimmedParagraph
      }
    };
  });

  // Nếu không có blocks nào, tạo một text block trống
  if (blocks.length === 0) {
    return [{
      id: uuidv4(),
      type: 'text',
      order: 0,
      data: { text: '' }
    }];
  }

  return blocks;
};

// Convert content blocks thành legacy content (cho backward compatibility)
const convertBlocksToLegacyContent = (contentBlocks) => {
  if (!Array.isArray(contentBlocks) || contentBlocks.length === 0) {
    return '';
  }

  // Sort by order
  const sortedBlocks = [...contentBlocks].sort((a, b) => a.order - b.order);
  
  return sortedBlocks.map(block => {
    switch (block.type) {
      case 'heading':
        const hashes = '#'.repeat(block.data.level || 1);
        return `${hashes} ${block.data.text || ''}`;
        
      case 'text':
        return block.data.text || '';
        
      case 'quote':
        const quote = block.data.quote || '';
        const author = block.data.author ? ` - ${block.data.author}` : '';
        return `> ${quote}${author}`;
        
      case 'image':
        const caption = block.data.caption ? ` (${block.data.caption})` : '';
        return `[Image: ${block.data.imageId}]${caption}`;
        
      case 'divider':
        return '---';
        
      default:
        return '';
    }
  }).join('\n\n');
};

// Validate content block structure
const validateContentBlock = (block) => {
  const errors = [];
  
  if (!block.id) errors.push('Missing block id');
  if (!block.type) errors.push('Missing block type');
  if (block.order === undefined) errors.push('Missing block order');
  
  const validTypes = ['text', 'heading', 'image', 'quote', 'divider'];
  if (!validTypes.includes(block.type)) {
    errors.push(`Invalid block type: ${block.type}`);
  }
  
  // Type-specific validation
  switch (block.type) {
    case 'heading':
      if (block.data.level && ![1, 2, 3].includes(block.data.level)) {
        errors.push('Heading level must be 1, 2, or 3');
      }
      break;
      
    case 'image':
      if (!block.data.imageId) {
        errors.push('Image block missing imageId');
      }
      break;
  }
  
  return errors;
};

// Create default content blocks for new episode
const createDefaultContentBlocks = () => {
  return [{
    id: uuidv4(),
    type: 'text',
    order: 0,
    data: { text: '' }
  }];
};

module.exports = {
  migrateLegacyContent,
  convertBlocksToLegacyContent,
  validateContentBlock,
  createDefaultContentBlocks
};
