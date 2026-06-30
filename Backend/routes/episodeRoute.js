const router = require('express').Router();
const episodeController = require('../controllers/SeriesStories/episodeController');

// === EPISODES ROUTES ===
// Lấy tất cả episodes (Sync entry point cho app)
router.get('/', episodeController.getAllEpisodes);

// Tạo episode mới
router.post('/create_episode', episodeController.createEpisode);

// Lấy tất cả episodes
router.get('/get_all_episodes', episodeController.getAllEpisodes);

// Lấy episodes theo series ID
router.get('/get_episodes_by_series/:seriesId', episodeController.getEpisodesBySeries);

// Lấy episode theo ID
router.get('/get_episode_by/:id', episodeController.getEpisodeById);

// Cập nhật episode
router.put('/update_episode/:id', episodeController.updateEpisode);
router.post('/update_episode/:id', episodeController.updateEpisode); // Backup route

// Xóa episode
router.delete('/delete_episode/:id', episodeController.deleteEpisode);

// Toggle publish status
router.patch('/toggle_publish_episode/:id', episodeController.togglePublishEpisode);

// Like episode
router.post('/like_episode/:id', episodeController.likeEpisode);

// ===== DYNAMIC CONTENT BUILDER ROUTES =====
// Cập nhật toàn bộ content blocks
router.put('/update_content_blocks/:id', episodeController.updateContentBlocks);
router.post('/update_content_blocks/:id', episodeController.updateContentBlocks); // Backup route

// Thêm content block mới
router.post('/add_content_block/:id', episodeController.addContentBlock);

// Xóa content block
router.delete('/delete_content_block/:id/:blockId', episodeController.deleteContentBlock);
router.post('/delete_content_block/:id/:blockId', episodeController.deleteContentBlock); // Backup route

// Sắp xếp lại content blocks
router.put('/reorder_content_blocks/:id', episodeController.reorderContentBlocks);
router.post('/reorder_content_blocks/:id', episodeController.reorderContentBlocks); // Backup route

// Migration: Convert legacy content to blocks
router.post('/migrate_legacy_content/:id', episodeController.migrateLegacyContentToBlocks);

module.exports = router;