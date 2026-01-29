const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Gửi thông báo
router.post('/send', notificationController.sendNotification);

// Lấy thông báo theo user
router.get('/user/:userId', notificationController.getUserNotifications);

// Thống kê thông báo
router.get('/user/:userId/stats', notificationController.getNotificationStats);

// Đánh dấu đã đọc
router.put('/:notificationId/read', notificationController.markAsRead);

// Đánh dấu tất cả đã đọc
router.put('/user/:userId/read-all', notificationController.markAllAsRead);

// Xóa thông báo
router.delete('/:notificationId', notificationController.deleteNotification);

module.exports = router;