const UserModel = require('../models/User');
const prisma = require('../../prisma/client');

class AdminController {
  static async getAllUsers(req, res) {
    try {
      const { role, page = 1, limit = 20, search } = req.query;
      const skip = (page - 1) * limit;

      const where = {};
      if (role) where.role = role;
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: parseInt(limit),
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
            isVerified: true,
            isActive: true,
            createdAt: true,
            // Driver fields
            licenseNumber: true,
            vehicleType: true,
            vehicleNumber: true,
            rating: true,
            totalTrips: true,
            isAvailable: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  }

  static async getUserById(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Driver fields
          licenseNumber: true,
          vehicleType: true,
          vehicleNumber: true,
          rating: true,
          totalTrips: true,
          isAvailable: true,
          profile: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user'
      });
    }
  }

  static async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      // Prevent changing email and role
      delete updateData.email;
      delete updateData.role;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          isActive: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async toggleUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          email: true,
          isActive: true,
          role: true
        }
      });

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: updatedUser
      });
    } catch (error) {
      console.error('Toggle user status error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getDashboardStats(req, res) {
    try {
      const [
        totalUsers,
        totalCustomers,
        totalDrivers,
        activeDrivers,
        totalRides,
        totalRevenue
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.user.count({ where: { role: 'DRIVER' } }),
        prisma.user.count({ where: { role: 'DRIVER', isAvailable: true } }),
        // These would come from ride-service
        Promise.resolve(0), // totalRides
        Promise.resolve(0)  // totalRevenue
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          totalCustomers,
          totalDrivers,
          activeDrivers,
          totalRides,
          totalRevenue,
          usersByRole: {
            CUSTOMER: totalCustomers,
            DRIVER: totalDrivers,
            ADMIN: totalUsers - totalCustomers - totalDrivers
          }
        }
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard stats'
      });
    }
  }
}

module.exports = AdminController;