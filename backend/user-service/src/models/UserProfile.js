const prisma = require('../../prisma/client');

class UserProfileModel {
  // Create user profile
  static async createProfile(userId, profileData) {
    return await prisma.userProfile.create({
      data: {
        userId,
        bio: profileData.bio || null,
        profilePicture: profileData.profilePicture || null,
        dateOfBirth: profileData.dateOfBirth || null,
        gender: profileData.gender || null,
        address: profileData.address || null,
        city: profileData.city || null,
        state: profileData.state || null,
        zipCode: profileData.zipCode || null,
        country: profileData.country || null,
        emergencyContact: profileData.emergencyContact || null,
        emergencyContactPhone: profileData.emergencyContactPhone || null,
        preferences: profileData.preferences || {},
        socialLinks: profileData.socialLinks || {},
        verificationStatus: 'PENDING',
        isPhoneVerified: false,
        isEmailVerified: false,
        lastActiveAt: new Date(),
        notificationPreferences: {
          email: true,
          sms: true,
          push: true
        }
      }
    });
  }

  // Find profile by user ID
  static async findProfileByUserId(userId) {
    return await prisma.userProfile.findUnique({
      where: { userId }
    });
  }

  // Update user profile
  static async updateProfile(userId, updateData) {
    return await prisma.userProfile.update({
      where: { userId },
      data: {
        bio: updateData.bio,
        profilePicture: updateData.profilePicture,
        dateOfBirth: updateData.dateOfBirth,
        gender: updateData.gender,
        address: updateData.address,
        city: updateData.city,
        state: updateData.state,
        zipCode: updateData.zipCode,
        country: updateData.country,
        emergencyContact: updateData.emergencyContact,
        emergencyContactPhone: updateData.emergencyContactPhone,
        preferences: updateData.preferences,
        socialLinks: updateData.socialLinks
      }
    });
  }

  // Update verification status
  static async updateVerificationStatus(userId, status) {
    return await prisma.userProfile.update({
      where: { userId },
      data: { verificationStatus: status }
    });
  }

  // Update phone verification status
  static async updatePhoneVerification(userId, isVerified) {
    return await prisma.userProfile.update({
      where: { userId },
      data: { isPhoneVerified: isVerified }
    });
  }

  // Update email verification status
  static async updateEmailVerification(userId, isVerified) {
    return await prisma.userProfile.update({
      where: { userId },
      data: { isEmailVerified: isVerified }
    });
  }

  // Update last active timestamp
  static async updateLastActive(userId) {
    return await prisma.userProfile.update({
      where: { userId },
      data: { lastActiveAt: new Date() }
    });
  }

  // Update notification preferences
  static async updateNotificationPreferences(userId, preferences) {
    return await prisma.userProfile.update({
      where: { userId },
      data: { notificationPreferences: preferences }
    });
  }

  // Get user profile with user data
  static async getFullProfile(userId) {
    return await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
            isVerified: true,
            isActive: true
          }
        }
      }
    });
  }

  // Delete profile
  static async deleteProfile(userId) {
    return await prisma.userProfile.delete({
      where: { userId }
    });
  }
}

module.exports = UserProfileModel;
