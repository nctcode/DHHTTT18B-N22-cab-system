const prisma = require('../../prisma/client');

class UserProfileModel {
  // Create user profile (linked to customer)
  static async createProfile(customerId, profileData) {
    return await prisma.userProfile.create({
      data: {
        customerId,
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
      },
      include: { customer: true }
    });
  }

  // Find profile by customer ID
  static async findProfileByCustomerId(customerId) {
    return await prisma.userProfile.findUnique({
      where: { customerId },
      include: { customer: true }
    });
  }

  // Find profile by user ID (through customer relationship)
  static async findProfileByUserId(userId) {
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });
    if (!customer) return null;
    
    return await prisma.userProfile.findUnique({
      where: { customerId: customer.id },
      include: { customer: true }
    });
  }

  // Update user profile
  static async updateProfile(customerId, updateData) {
    const data = {};
    if (updateData.bio !== undefined) data.bio = updateData.bio;
    if (updateData.profilePicture !== undefined) data.profilePicture = updateData.profilePicture;
    if (updateData.dateOfBirth !== undefined) data.dateOfBirth = updateData.dateOfBirth;
    if (updateData.gender !== undefined) data.gender = updateData.gender;
    if (updateData.address !== undefined) data.address = updateData.address;
    if (updateData.city !== undefined) data.city = updateData.city;
    if (updateData.state !== undefined) data.state = updateData.state;
    if (updateData.zipCode !== undefined) data.zipCode = updateData.zipCode;
    if (updateData.country !== undefined) data.country = updateData.country;
    if (updateData.emergencyContact !== undefined) data.emergencyContact = updateData.emergencyContact;
    if (updateData.emergencyContactPhone !== undefined) data.emergencyContactPhone = updateData.emergencyContactPhone;
    if (updateData.preferences !== undefined) data.preferences = updateData.preferences;
    if (updateData.socialLinks !== undefined) data.socialLinks = updateData.socialLinks;

    return await prisma.userProfile.update({
      where: { customerId },
      data,
      include: { customer: true }
    });
  }

  // Update verification status
  static async updateVerificationStatus(customerId, status) {
    return await prisma.userProfile.update({
      where: { customerId },
      data: { verificationStatus: status }
    });
  }

  // Update phone verification status
  static async updatePhoneVerification(customerId, isVerified) {
    return await prisma.userProfile.update({
      where: { customerId },
      data: { isPhoneVerified: isVerified }
    });
  }

  // Update email verification status
  static async updateEmailVerification(customerId, isVerified) {
    return await prisma.userProfile.update({
      where: { customerId },
      data: { isEmailVerified: isVerified }
    });
  }

  // Update last active timestamp
  static async updateLastActive(customerId) {
    return await prisma.userProfile.update({
      where: { customerId },
      data: { lastActiveAt: new Date() }
    });
  }

  // Update notification preferences
  static async updateNotificationPreferences(customerId, preferences) {
    return await prisma.userProfile.update({
      where: { customerId },
      data: { notificationPreferences: preferences }
    });
  }

  // Get user profile with customer data
  static async getFullProfile(customerId) {
    return await prisma.userProfile.findUnique({
      where: { customerId },
      include: {
        customer: {
          select: {
            id: true,
            userId: true,
            phoneNumber: true,
            rideCount: true,
            totalSpent: true,
            averageRating: true,
            isVerified: true,
            isActive: true
          }
        }
      }
    });
  }

  // Delete profile
  static async deleteProfile(customerId) {
    return await prisma.userProfile.delete({
      where: { customerId }
    });
  }
}

module.exports = UserProfileModel;
