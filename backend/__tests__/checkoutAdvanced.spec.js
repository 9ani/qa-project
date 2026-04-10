const express = require('express');
const bodyParser = require('body-parser');
const request = require('supertest');

jest.mock('../models/product');
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomInt: jest.fn(),
  };
});
jest.mock('../models/order', () => {
  const STATUS_FLOW = [
    {
      code: 'ORDER_PLACED',
      label: 'Order placed',
      description: 'Initial order state',
    },
    {
      code: 'PAYMENT_VERIFIED',
      label: 'Payment verified',
      description: 'Payment cleared',
    },
  ];

  class MockOrder {
    constructor(payload) {
      Object.assign(this, payload);
      this.statusIndex = 0;
      this.statusHistory = [];
    }

    ensureInitialStatus() {
      if (!this.statusHistory.length) {
        const initial = STATUS_FLOW[0];
        this.statusHistory.push({
          ...initial,
          enteredAt: new Date('2026-04-09T00:00:00.000Z'),
        });
      }
    }

    async save() {
      MockOrder.savedOrders.push(this);
    }
  }

  MockOrder.STATUS_FLOW = STATUS_FLOW;
  MockOrder.savedOrders = [];
  MockOrder.exists = jest.fn();

  return MockOrder;
});

const Product = require('../models/product');
const Order = require('../models/order');
const { randomInt } = require('crypto');
const checkoutRouter = require('../routes/checkout');

const buildLeanQuery = data => ({
  lean: jest.fn().mockResolvedValue(data),
});

describe('Checkout API advanced scenarios', () => {
  let app;
  let productId;

  const buildPayload = overrides => ({
    items: [{ productId, quantity: 1 }],
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    shippingAddress: '123 Binary Blvd',
    cardNumber: '4111111111111111',
    cardName: 'Ada Lovelace',
    expiry: '12/2030',
    cvc: '123',
    ...overrides,
  });

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api/checkout', checkoutRouter);

    productId = '507f1f77bcf86cd799439011';
    Order.savedOrders.length = 0;
    Order.exists.mockReset();
    Product.find.mockReset();
    randomInt.mockReset();

    Product.find.mockReturnValue(
      buildLeanQuery([
        {
          _id: productId,
          name: 'Fusion Laptop',
          price: 1499,
          image: '/img/laptop.png',
        },
      ])
    );
    Order.exists.mockResolvedValue(false);

    const orderNumbers = [111111, 222222, 333333];
    randomInt.mockImplementation((min, max) => {
      if (min === 100000 && max === 999999) {
        return orderNumbers.shift();
      }
      return 2;
    });
  });

  it('201 → accepts a valid 15-digit Amex with 4-digit CVC', async () => {
    const res = await request(app)
      .post('/api/checkout/create-order')
      .send(
        buildPayload({
          cardNumber: '378282246310005',
          cvc: '1234',
        })
      );

    expect(res.status).toBe(201);
    expect(res.body.orderNumber).toBe('FE-111111');
    expect(Order.savedOrders).toHaveLength(1);
    expect(Order.savedOrders[0].items[0]).toMatchObject({
      name: 'Fusion Laptop',
      quantity: 1,
    });
  });

  it('400 → rejects invalid product references before persistence', async () => {
    const res = await request(app)
      .post('/api/checkout/create-order')
      .send(
        buildPayload({
          items: [{ productId: 'not-a-valid-object-id', quantity: 1 }],
        })
      );

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid product reference in order payload.' });
    expect(Order.savedOrders).toHaveLength(0);
  });

  it('201 → handles parallel order submissions with unique order numbers', async () => {
    const [first, second] = await Promise.all([
      request(app).post('/api/checkout/create-order').send(buildPayload()),
      request(app)
        .post('/api/checkout/create-order')
        .send(buildPayload({ email: 'grace@example.com' })),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(new Set([first.body.orderNumber, second.body.orderNumber]).size).toBe(2);
    expect(Order.savedOrders).toHaveLength(2);
  });
});
