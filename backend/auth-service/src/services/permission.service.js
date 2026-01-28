class PermissionService {
  static getPermissionsByRole(role) {
    const permissions = {
      // Admin permissions
      ADMIN: {
        users: ['read', 'create', 'update', 'delete', 'activate', 'deactivate'],
        drivers: ['read', 'create', 'update', 'delete', 'verify', 'block'],
        rides: ['read_all', 'cancel_any', 'refund'],
        payments: ['read_all', 'refund', 'export'],
        pricing: ['read', 'update', 'set_surge'],
        analytics: ['read', 'export'],
        settings: ['read', 'update']
      },
      
      // Driver permissions
      DRIVER: {
        profile: ['read', 'update'],
        rides: ['read_own', 'accept', 'reject', 'start', 'complete', 'cancel_own'],
        earnings: ['read_own', 'withdraw'],
        location: ['update'],
        availability: ['toggle']
      },
      
      // Customer permissions
      CUSTOMER: {
        profile: ['read', 'update'],
        rides: ['create', 'read_own', 'cancel_own', 'rate'],
        payments: ['read_own', 'pay', 'refund_request'],
        favorites: ['read', 'create', 'delete']
      }
    };

    return permissions[role] || {};
  }

  static hasPermission(role, resource, action) {
    const rolePermissions = this.getPermissionsByRole(role);
    return rolePermissions[resource]?.includes(action) || false;
  }

  static canAccessRide(user, ride) {
    if (user.role === 'ADMIN') return true;
    if (user.role === 'DRIVER' && ride.driverId === user.userId) return true;
    if (user.role === 'CUSTOMER' && ride.customerId === user.userId) return true;
    return false;
  }

  static canModifyUser(currentUser, targetUserId) {
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.userId === targetUserId) return true;
    return false;
  }
}

module.exports = PermissionService;