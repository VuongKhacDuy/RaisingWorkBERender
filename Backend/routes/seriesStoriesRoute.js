const router = require('express').Router();
const seriesController = require('../controllers/SeriesStories/seriesController');
const episodeController = require('../controllers/SeriesStories/episodeController');

// === SERIES ROUTES ===
// Tạo series mới
router.post('/create_series', seriesController.createSeries);

// Lấy tất cả series (có pagination)
router.get('/get_all_series', seriesController.getAllSeries);

// Lấy series theo ID (kèm danh sách episodes)
router.get('/get_series_by/:id', seriesController.getSeriesById);

// Cập nhật series
router.put('/update_series/:id', seriesController.updateSeries);

// Xóa series
router.delete('/delete_series/:id', seriesController.deleteSeries);

// Tìm kiếm series
router.get('/search_series/:keyword', seriesController.searchSeries);

// === EPISODES ROUTES ===
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

// Xóa episode
router.delete('/delete_episode/:id', episodeController.deleteEpisode);

// Toggle publish status
router.patch('/toggle_publish_episode/:id', episodeController.togglePublishEpisode);

// Like episode
router.post('/like_episode/:id', episodeController.likeEpisode);

router.get('/test', (req, res) => res.send('ok'));

module.exports = router;