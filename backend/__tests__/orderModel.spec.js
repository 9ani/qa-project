const mongoose = require('mongoose');

// Need to require the model which registers the mongoose model
const Order = require('../models/order');
const { STATUS_FLOW } = require('../models/order');

describe('Order Model', () => {
  describe('STATUS_FLOW', () => {
    it('has 11 order statuses', () => {
      expect(STATUS_FLOW).toHaveLength(11);
    });

    it('starts with ORDER_PLACED and ends with DELIVERY_CONFIRMED', () => {
      expect(STATUS_FLOW[0].code).toBe('ORDER_PLACED');
      expect(STATUS_FLOW[STATUS_FLOW.length - 1].code).toBe('DELIVERY_CONFIRMED');
    });

    it('each status has code, label, and description', () => {
      STATUS_FLOW.forEach(status => {
        expect(status).toHaveProperty('code');
        expect(status).toHaveProperty('label');
        expect(status).toHaveProperty('description');
        expect(typeof status.code).toBe('string');
        expect(typeof status.label).toBe('string');
        expect(typeof status.description).toBe('string');
      });
    });
  });

  describe('ensureInitialStatus()', () => {
    it('adds initial ORDER_PLACED status when history is empty', () => {
      const order = new Order({
        orderNumber: 'FE-000001',
        email: 'test@test.com',
        name: 'Test User',
        shippingAddress: '123 Main St',
        total: 100,
      });
      expect(order.statusHistory).toHaveLength(0);
      order.ensureInitialStatus();
      expect(order.statusHistory).toHaveLength(1);
      expect(order.statusHistory[0].code).toBe('ORDER_PLACED');
      expect(order.statusIndex).toBe(0);
    });

    it('does not duplicate initial status when already set', () => {
      const order = new Order({
        orderNumber: 'FE-000002',
        email: 'test@test.com',
        name: 'Test',
        shippingAddress: 'Addr',
        total: 50,
      });
      order.ensureInitialStatus();
      order.ensureInitialStatus();
      expect(order.statusHistory).toHaveLength(1);
    });
  });

  describe('advanceStatus()', () => {
    it('returns false when already at last status', () => {
      const order = new Order({
        orderNumber: 'FE-000003',
        email: 'test@test.com',
        name: 'Test',
        shippingAddress: 'Addr',
        total: 50,
        statusIndex: STATUS_FLOW.length - 1,
      });
      expect(order.advanceStatus()).toBe(false);
    });

    it('advances status and adds to history', () => {
      const order = new Order({
        orderNumber: 'FE-000004',
        email: 'test@test.com',
        name: 'Test',
        shippingAddress: 'Addr',
        total: 50,
        statusIndex: 0,
        statusHistory: [{
          code: 'ORDER_PLACED',
          label: 'Order placed',
          description: 'Received',
          enteredAt: new Date(),
        }],
      });
      // advanceStatus uses Math.random, so it will always advance at least 1
      const result = order.advanceStatus();
      expect(result).toBe(true);
      expect(order.statusIndex).toBeGreaterThan(0);
      expect(order.statusHistory.length).toBeGreaterThan(1);
    });

    it('does not advance beyond the last status', () => {
      const order = new Order({
        orderNumber: 'FE-000005',
        email: 'test@test.com',
        name: 'Test',
        shippingAddress: 'Addr',
        total: 50,
        statusIndex: STATUS_FLOW.length - 2,
        statusHistory: [],
      });
      order.advanceStatus();
      expect(order.statusIndex).toBeLessThanOrEqual(STATUS_FLOW.length - 1);
    });
  });
});
