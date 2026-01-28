const prisma = require('../../prisma/client');

class ProfileModel {
  // Create user profile (linked to user)
  static async createProfile(userId, profileData) {
    return await prisma.profile.create({
      data: {
        userId,
        bio: profileData.bio || null,
        dateOfBirth: profileData.dateOfBirth || null,
        gender: profileData.gender || null,
        address: profileData.address || null,
        city: profileData.city || null,
        state: profileData.state || null,
        zipCode: profileData.zipCode || null,
        country: profileData.country || null,
        emergencyContact: profileData.emergencyContact || null,
        emergencyContactPhone: profileData.emergencyContactPhone || null,
        homeAddress: profileData.homeAddress || null,
        workAddress: profileData.workAddress || null,
        preferences: profileData.preferences || {},
        notificationSettings: profileData.notificationSettings || {
          email: true,
          sms: true,
          push: true
        },
        isPhoneVerified: false,
        isEmailVerified: false,
        isVerified: false,
        isActive: true
      },
      include: { user: true }
    });
  }

  // Find profile by user ID
  static async findProfileByUserId(userId) {
    return await prisma.profile.findUnique({
      where: { userId },
      include: { user: true }
    });
  }

  // Find profile by profile ID
  static async findProfileById(profileId) {
    return await prisma.profile.findUnique({
      where: { id: profileId },
      include: { user: true }
    });
  }

  // Find all profiles (with pagination)
  static async findAllProfiles(skip = 0, take = 10) {
    return await prisma.profile.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    });
  }

  // Update profile
  static async updateProfile(userId, updateData) {
    const data = {};
    if (updateData.bio !== undefined) data.bio = updateData.bio;
    if (updateData.dateOfBirth !== undefined) data.dateOfBirth = updateData.dateOfBirth;
    if (updateData.gender !== undefined) data.gender = updateData.gender;
    if (updateData.address !== undefined) data.address = updateData.address;
    if (updateData.city !== undefined) data.city = updateData.city;
    if (updateData.state !== undefined) data.state = updateData.state;
    if (updateData.zipCode !== undefined) data.zipCode = updateData.zipCode;
    if (updateData.country !== undefined) data.country = updateData.country;
    if (updateData.emergencyContact !== undefined) data.emergencyContact = updateData.emergencyContact;
    if (updateData.emergencyContactPhone !== undefined) data.emergencyContactPhone = updateData.emergencyContactPhone;
    if (updateData.homeAddress !== undefined) data.homeAddress = updateData.homeAddress;
    if (updateData.workAddress !== undefined) data.workAddress = updateData.workAddress;
    if (updateData.preferences !== undefined) data.preferences = updateData.preferences;
    if (updateData.notificationSettings !== undefined) data.notificationSettings = updateData.notificationSettings;

    return await prisma.profile.update({
      where: { userId },
      data,
      include: { user: true }
    });
  }

  // Update phone verification status
  static async updatePhoneVerification(userId, isVerified) {
    return await prisma.profile.update({
      where: { userId },
      data: { isPhoneVerified: isVerified }
    });
  }

  // Update email verification status
  static async updateEmailVerification(userId, isVerified) {
    return await prisma.profile.update({
      where: { userId },
      data: { isEmailVerified: isVerified }
    });
  }

  // Update verification status
  static async updateVerificationStatus(userId, status) {
    return await prisma.profile.update({
      where: { userId },
      data: { isVerified: status }
    });
  }

  // Update ride statistics
  static async updateRideStats(userId, fare, rating = null) {
    const profile = await this.findProfileByUserId(userId);
    if (!profile) throw new Error('Profile not found');

    const newRideCount = profile.rideCount + 1;
    const newTotalSpent = profile.totalSpent + fare;
    let newAverageRating = profile.averageRating;
    let newNumberOfRatings = profile.numberOfRatings;

    if (rating !== null) {
      newNumberOfRatings = profile.numberOfRatings + 1;
      newAverageRating = (profile.averageRating * profile.numberOfRatings + rating) / newNumberOfRatings;
    }

    return await prisma.profile.update({
      where: { userId },
      data: {
        rideCount: newRideCount,
        totalSpent: newTotalSpent,
        averageRating: newAverageRating,
        numberOfRatings: newNumberOfRatings,
        lastActiveAt: new Date()
      }
    });
  }

  // Update last active
  static async updateLastActive(userId) {
    return await prisma.profile.update({
      where: { userId },
      data: { lastActiveAt: new Date() }
    });
  }

  // Update notification settings
  static async updateNotificationSettings(userId, settings) {
    return await prisma.profile.update({
      where: { userId },
      data: { notificationSettings: settings }
    });
  }

  // Delete profile (cascades with user)
  static async deleteProfile(userId) {
    return await prisma.profile.delete({
      where: { userId }
    });
  }
}

module.exports = ProfileModel;
