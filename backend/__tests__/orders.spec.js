const express = require('express');
const bodyParser = require('body-parser');
const request = require('supertest');

jest.mock('../models/order');
const Order = require('../models/order');
const ordersRouter = require('../routes/orders');

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Orders API — POST /api/orders/track', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api/orders', ordersRouter);
    jest.clearAllMocks();
  });

  it('400 → missing orderNumber and email', async () => {
    const res = await request(app)
      .post('/api/orders/track')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Order number and email are required.' });
  });

  it('400 → missing email', async () => {
    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: 'FE-123456' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Order number and email are required.' });
  });

  it('400 → invalid order number format (no FE- prefix)', async () => {
    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: 'XX-123456', email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid order number format.' });
  });

  it('400 → invalid email format', async () => {
    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: 'FE-123456', email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid email format.' });
  });

  it('404 → order not found', async () => {
    Order.findOne.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: 'FE-123456', email: 'test@example.com' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'Order not found. Double-check your email and order number.',
    });
  });

  it('200 → returns order status when found (no advance)', async () => {
    const mockOrder = {
      orderNumber: 'FE-123456',
      email: 'test@example.com',
      statusIndex: 10, // last status, cannot advance
      statusHistory: [
        { code: 'DELIVERED', label: 'Delivered', description: 'Done', enteredAt: new Date() },
      ],
      ensureInitialStatus: jest.fn(),
      advanceStatus: jest.fn().mockReturnValue(false),
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(),
      total: 99.99,
      items: [],
      estimatedDelivery: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    Order.findOne.mockResolvedValue(mockOrder);

    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: 'FE-123456', email: 'test@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.orderNumber).toBe('FE-123456');
    expect(mockOrder.ensureInitialStatus).toHaveBeenCalled();
    expect(mockOrder.save).toHaveBeenCalled();
  });

  it('200 → normalizes order number to uppercase', async () => {
    const mockOrder = {
      orderNumber: 'FE-999999',
      email: 'user@test.com',
      statusIndex: 10,
      statusHistory: [
        { code: 'ORDER_PLACED', label: 'Order placed', description: 'Received', enteredAt: new Date() },
      ],
      ensureInitialStatus: jest.fn(),
      advanceStatus: jest.fn().mockReturnValue(false),
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(),
      total: 50,
      items: [],
      estimatedDelivery: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    Order.findOne.mockResolvedValue(mockOrder);

    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: 'fe-999999', email: 'User@Test.com' });
    expect(res.status).toBe(200);
    expect(Order.findOne).toHaveBeenCalledWith({
      orderNumber: 'FE-999999',
      email: 'user@test.com',
    });
  });

  it('500 → internal server error', async () => {
    Order.findOne.mockRejectedValue(new Error('DB connection failed'));
    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: 'FE-123456', email: 'test@example.com' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Unable to fetch order status right now.' });
  });
});
