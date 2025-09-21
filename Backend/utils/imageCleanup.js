// // Utils để quản lý và dọn dẹp ảnh
// const ImageBase64 = require('../models/ImageBase64');
// const Series = require('../models/SeriesStories/SeriesModel');
// const Episode = require('../models/SeriesStories/EpisodeModel');

// // Tìm và xóa ảnh mồ côi (orphaned images)
// const cleanupOrphanedImages = async () => {
//   try {
//     // 1. Lấy tất cả ảnh
//     const allImages = await ImageBase64.find();
//     const orphanedImages = [];

//     for (const image of allImages) {
//       let isOrphaned = false;

//       if (image.type === 'series') {
//         // Kiểm tra series có tồn tại không
//         if (image.refId) {
//           const series = await Series.findById(image.refId);
//           if (!series) {
//             isOrphaned = true;
//           }
//         } else {
//           isOrphaned = true; // refId null
//         }
//       } 
//       else if (image.type === 'episode') {
//         // Kiểm tra episode có tồn tại không
//         if (image.refId) {
//           const episode = await Episode.findById(image.refId);
//           if (!episode) {
//             isOrphaned = true;
//           }
//         } else {
//           // Kiểm tra ảnh có được sử dụng trong content blocks không
//           const episodeWithImage = await Episode.findOne({
//             'contentBlocks.data.imageId': image._id.toString()
//           });
//           if (!episodeWithImage) {
//             isOrphaned = true;
//           }
//         }
//       }

//       if (isOrphaned) {
//         orphanedImages.push(image);
//       }
//     }

//     // Xóa ảnh mồ côi
//     const orphanedIds = orphanedImages.map(img => img._id);
//     if (orphanedIds.length > 0) {
//       await ImageBase64.deleteMany({ _id: { $in: orphanedIds } });
//     }

//     return {
//       totalImages: allImages.length,
//       orphanedCount: orphanedImages.length,
//       orphanedImages: orphanedImages.map(img => ({
//         _id: img._id,
//         type: img.type,
//         refId: img.refId,
//         originalName: img.originalName
//       }))
//     };

//   } catch (error) {
//     throw new Error(`Cleanup failed: ${error.message}`);
//   }
// };

// // Kiểm tra tình trạng ảnh
// const getImageStats = async () => {
//   try {
//     const totalImages = await ImageBase64.countDocuments();
//     const seriesImages = await ImageBase64.countDocuments({ type: 'series' });
//     const episodeImages = await ImageBase64.countDocuments({ type: 'episode' });
//     const imagesWithoutRef = await ImageBase64.countDocuments({ refId: null });

//     // Đếm ảnh được sử dụng trong content blocks
//     const episodes = await Episode.find({ 'contentBlocks.type': 'image' });
//     let imagesInBlocks = 0;
//     episodes.forEach(episode => {
//       if (episode.contentBlocks) {
//         episode.contentBlocks.forEach(block => {
//           if (block.type === 'image' && block.data && block.data.imageId) {
//             imagesInBlocks++;
//           }
//         });
//       }
//     });

//     return {
//       total: totalImages,
//       byType: {
//         series: seriesImages,
//         episode: episodeImages
//       },
//       withoutRef: imagesWithoutRef,
//       inContentBlocks: imagesInBlocks
//     };

//   } catch (error) {
//     throw new Error(`Get stats failed: ${error.message}`);
//   }
// };

// // Tìm ảnh theo refId hoặc imageId
// const findImagesByRef = async (type, refId) => {
//   try {
//     let query = { type };
    
//     if (type === 'series' || (type === 'episode' && refId)) {
//       query.refId = refId;
//     }

//     const images = await ImageBase64.find(query);
    
//     // Nếu là episode, cũng tìm ảnh trong content blocks
//     if (type === 'episode' && refId) {
//       const episode = await Episode.findById(refId);
//       const imageIdsInBlocks = [];
      
//       if (episode && episode.contentBlocks) {
//         episode.contentBlocks.forEach(block => {
//           if (block.type === 'image' && block.data && block.data.imageId) {
//             imageIdsInBlocks.push(block.data.imageId);
//           }
//         });
//       }

//       // Tìm ảnh theo imageIds
//       if (imageIdsInBlocks.length > 0) {
//         const imagesInBlocks = await ImageBase64.find({
//           _id: { $in: imageIdsInBlocks }
//         });
        
//         // Merge và loại bỏ duplicate
//         const allImages = [...images];
//         imagesInBlocks.forEach(img => {
//           if (!allImages.find(existing => existing._id.toString() === img._id.toString())) {
//             allImages.push(img);
//           }
//         });
        
//         return allImages;
//       }
//     }

//     return images;
//   } catch (error) {
//     throw new Error(`Find images failed: ${error.message}`);
//   }
// };

// module.exports = {
//   cleanupOrphanedImages,
//   getImageStats,
//   findImagesByRef
// };
