/**
 * Trust X-User-Id and X-User-Role set by API Gateway (after JWT verification).
 * Used for service-to-gateway flow; do not trust client-sent headers from public.
 */
function gatewayAuth(req, res, next) {
  const userId = req.headers['x-user-id'];
  const role = (req.headers['x-user-role'] || 'PASSENGER').toUpperCase();
  if (userId) {
    req.user = { id: userId, role };
  }
  next();
}

module.exports = { gatewayAuth };
