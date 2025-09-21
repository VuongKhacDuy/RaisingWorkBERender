const router = require('express').Router();
const seriesController = require('../controllers/SeriesStories/seriesController');

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

router.get('/test', (req, res) => res.send('ok'));

module.exports = router;