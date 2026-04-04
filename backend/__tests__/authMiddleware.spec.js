const jwt = require('jsonwebtoken');

// Set JWT_SECRET before requiring the middleware (it reads env at import time)
process.env.JWT_SECRET = 'test-jwt-secret';

const authMiddleware = require('../middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { header: jest.fn() };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('401 → no token provided', () => {
    req.header.mockReturnValue(undefined);
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ msg: 'No token, authorization denied' });
    expect(next).not.toHaveBeenCalled();
  });

  it('401 → invalid/expired token', () => {
    req.header.mockReturnValue('invalid-token-value');
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ msg: 'Token is not valid' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() → valid token sets req.user', () => {
    const payload = { user: { id: 'user-123' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    req.header.mockReturnValue(token);

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'user-123' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('reads token from x-auth-token header', () => {
    req.header.mockReturnValue(undefined);
    authMiddleware(req, res, next);
    expect(req.header).toHaveBeenCalledWith('x-auth-token');
  });
});
