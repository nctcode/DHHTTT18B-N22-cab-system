const Notification = require('../models/Notification');

class NotificationController {
  // Gửi thông báo
  async sendNotification(req, res) {
    try {
      const { userId, type, title, message, metadata } = req.body;

      if (!userId || !type || !title || !message) {
        return res.status(400).json({
          error: 'Thiếu thông tin bắt buộc: userId, type, title, message'
        });
      }

      const notification = new Notification({
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
        isRead: false
      });

      await notification.save();

      console.log(`Đã gửi thông báo cho user ${userId}: ${title}`);

      res.status(201).json({
        success: true,
        message: 'Thông báo đã được gửi',
        data: notification
      });
    } catch (error) {
      console.error('Lỗi khi gửi thông báo:', error);
      res.status(500).json({ error: 'Lỗi server khi gửi thông báo' });
    }
  }

  // Lấy thông báo theo userId
  async getUserNotifications(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query = { userId };
      if (unreadOnly === 'true') {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({ 
        userId, 
        isRead: false 
      });

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          unreadCount
        }
      });
    } catch (error) {
      console.error('Lỗi khi lấy thông báo:', error);
      res.status(500).json({ error: 'Lỗi server khi lấy thông báo' });
    }
  }

  // Đánh dấu đã đọc
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;

      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return res.status(404).json({ error: 'Không tìm thấy thông báo' });
      }

      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();

      res.json({
        success: true,
        message: 'Đã đánh dấu thông báo là đã đọc',
        data: notification
      });
    } catch (error) {
      console.error('Lỗi khi đánh dấu đã đọc:', error);
      res.status(500).json({ error: 'Lỗi server khi đánh dấu đã đọc' });
    }
  }

  // Đánh dấu tất cả đã đọc
  async markAllAsRead(req, res) {
    try {
      const { userId } = req.params;

      const result = await Notification.updateMany(
        { userId, isRead: false },
        { 
          $set: { 
            isRead: true, 
            readAt: new Date() 
          } 
        }
      );

      res.json({
        success: true,
        message: `Đã đánh dấu ${result.modifiedCount} thông báo là đã đọc`,
        modifiedCount: result.modifiedCount
      });
    } catch (error) {
      console.error('Lỗi khi đánh dấu tất cả đã đọc:', error);
      res.status(500).json({ error: 'Lỗi server khi đánh dấu tất cả đã đọc' });
    }
  }

  // Xóa thông báo
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;

      const result = await Notification.findByIdAndDelete(notificationId);

      if (!result) {
        return res.status(404).json({ error: 'Không tìm thấy thông báo' });
      }

      res.json({
        success: true,
        message: 'Đã xóa thông báo'
      });
    } catch (error) {
      console.error('Lỗi khi xóa thông báo:', error);
      res.status(500).json({ error: 'Lỗi server khi xóa thông báo' });
    }
  }

  // Thống kê thông báo
  async getNotificationStats(req, res) {
    try {
      const { userId } = req.params;

      const stats = await Notification.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            unreadCount: {
              $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            type: '$_id',
            count: 1,
            unreadCount: 1,
            _id: 0
          }
        }
      ]);

      const total = await Notification.countDocuments({ userId });
      const unreadTotal = await Notification.countDocuments({ 
        userId, 
        isRead: false 
      });

      res.json({
        success: true,
        data: {
          stats,
          summary: {
            total,
            unreadTotal,
            readTotal: total - unreadTotal
          }
        }
      });
    } catch (error) {
      console.error('Lỗi khi lấy thống kê:', error);
      res.status(500).json({ error: 'Lỗi server khi lấy thống kê' });
    }
  }
}

module.exports = new NotificationController();