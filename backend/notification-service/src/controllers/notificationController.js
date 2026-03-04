const notificationService = require('../services/notification.service');

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({ success, message, data });
};

class NotificationController {

  // GET /notifications/user/:userId
  async getByUser(req, res) {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const result = await notificationService.getByUserId(userId, { page, limit });
      sendResponse(res, 200, true, 'User notifications', result);
    } catch (error) {
      console.error('[Controller]', error.message);
      sendResponse(res, 500, false, error.message);
    }
  }

  // GET /notifications/:id
  async getById(req, res) {
    try {
      const notification = await notificationService.getById(req.params.id);
      if (!notification) return sendResponse(res, 404, false, 'Notification not found');
      sendResponse(res, 200, true, 'Notification detail', notification);
    } catch (error) {
      console.error('[Controller]', error.message);
      sendResponse(res, 500, false, error.message);
    }
  }

  // GET /notifications?status=SENT
  async getByStatus(req, res) {
    try {
      const { status } = req.query;
      if (!status) return sendResponse(res, 400, false, 'status query param required');
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const result = await notificationService.getByStatus(status, { page, limit });
      sendResponse(res, 200, true, `Notifications with status ${status}`, result);
    } catch (error) {
      console.error('[Controller]', error.message);
      sendResponse(res, 500, false, error.message);
    }
  }
}

module.exports = new NotificationController();