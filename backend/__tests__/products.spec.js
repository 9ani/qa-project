const express    = require('express');
const bodyParser = require('body-parser');
const request    = require('supertest');
const jwt        = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-jwt-secret';

jest.mock('../models/product');
const Product = require('../models/product');

jest.mock('../pineconeClient', () => ({
  queryById: jest.fn(),
  queryByVector: jest.fn(),
  fetchVectors: jest.fn(),
}));

jest.mock('../services/pineconeSync', () => ({
  ensureProductSyncedWithPinecone: jest.fn(),
}));

jest.mock('weaviate-ts-client', () => {
  const chain = {
    withClassName: () => chain,
    withFields:    () => chain,
    withWhere:     () => chain,
    withNearVector:() => chain,
    withNearObject:() => chain,
    withLimit:     () => chain,
    do: async () => ({ data: { Get: { Product: [] } } }),
  };

  // client factory returns an object with .graphql.get()
  function client() {
    return { graphql: { get: () => chain } };
  }

  return {
    client,
    ApiKey: class MockApiKey {},
    default: { client }
  };
});

const { queryById } = require('../pineconeClient');
const { ensureProductSyncedWithPinecone } = require('../services/pineconeSync');
const productsRouter = require('../routes/products');

const buildLeanQuery = data => ({
  limit: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(data),
  }),
  sort: jest.fn().mockReturnValue({
    limit: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(data),
    }),
  }),
  lean: jest.fn().mockResolvedValue(data),
});

describe('Products API', () => {
  let app;

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use('/api/products', productsRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/products', () => {
    it('200 → returns all products formatted with id', async () => {
      const fakeDocs = [
        { _id: '1', name: 'A', toObject: () => ({ name: 'A', price: 10 }) },
        { _id: '2', name: 'B', toObject: () => ({ name: 'B', price: 20 }) },
      ];
      Product.find.mockResolvedValue(fakeDocs);

      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { name: 'A', price: 10, id: '1' },
        { name: 'B', price: 20, id: '2' },
      ]);
    });

    it('500 → server error', async () => {
      Product.find.mockRejectedValue(new Error('db fail'));
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(500);
      expect(res.text).toBe('Server error');
    });
  });

  describe('GET /api/products/:id', () => {
    it('200 → returns product when found', async () => {
      const fakeProduct = { _id: '123', name: 'X', price: 5 };
      Product.findById.mockResolvedValue(fakeProduct);

      const res = await request(app).get('/api/products/123');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(fakeProduct);
    });

    it('404 → product not found', async () => {
      Product.findById.mockResolvedValue(null);
      const res = await request(app).get('/api/products/doesnotexist');
      expect(res.status).toBe(404);
      expect(res.text).toBe('Product not found');
    });

    it('500 → server error', async () => {
      Product.findById.mockRejectedValue(new Error('oops'));
      const res = await request(app).get('/api/products/123');
      expect(res.status).toBe(500);
      expect(res.text).toBe('Server error');
    });
  });

  describe('POST /api/products', () => {
    it('401 → rejects create without token', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Secure Product' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ msg: 'No token, authorization denied' });
      expect(Product.create).not.toHaveBeenCalled();
    });

    it('401 → rejects expired token on protected mutation', async () => {
      const expiredToken = jwt.sign({ user: { id: 'user-1' } }, process.env.JWT_SECRET, { expiresIn: -1 });

      const res = await request(app)
        .post('/api/products')
        .set('x-auth-token', expiredToken)
        .send({ name: 'Secure Product' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ msg: 'Token is not valid' });
      expect(Product.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/products/:id/similar', () => {
    it('200 → falls back to heuristic recommendations when Pinecone is unavailable', async () => {
      const baseProduct = {
        _id: 'base-1',
        name: 'Noise Cancelling Headphones',
        description: 'Wireless over-ear headphones',
        price: 199,
        category: 'audio',
        image: '/img/base.png',
        brand: 'Fusion',
        stock: 12,
        rating: 4.7,
        numReviews: 18,
        createdAt: '2026-04-09T00:00:00.000Z',
      };
      const fallbackProducts = [
        {
          _id: 'cand-1',
          name: 'Studio Headphones',
          description: 'Detailed audio for creators',
          price: 189,
          category: 'audio',
          image: '/img/c1.png',
          brand: 'Fusion',
          stock: 8,
          rating: 4.8,
          numReviews: 22,
          createdAt: '2026-04-09T00:00:00.000Z',
        },
        {
          _id: 'cand-2',
          name: 'Travel Headphones',
          description: 'Compact ANC headset',
          price: 179,
          category: 'audio',
          image: '/img/c2.png',
          brand: 'Fusion',
          stock: 9,
          rating: 4.6,
          numReviews: 14,
          createdAt: '2026-04-09T00:00:00.000Z',
        },
        {
          _id: 'cand-3',
          name: 'Wireless Earbuds',
          description: 'Portable earbuds with charging case',
          price: 149,
          category: 'audio',
          image: '/img/c3.png',
          brand: 'Fusion',
          stock: 15,
          rating: 4.5,
          numReviews: 30,
          createdAt: '2026-04-09T00:00:00.000Z',
        },
        {
          _id: 'cand-4',
          name: 'Gaming Headset',
          description: 'Low-latency headset with mic',
          price: 159,
          category: 'audio',
          image: '/img/c4.png',
          brand: 'Fusion',
          stock: 6,
          rating: 4.4,
          numReviews: 12,
          createdAt: '2026-04-09T00:00:00.000Z',
        },
        {
          _id: 'cand-5',
          name: 'Portable Speaker',
          description: 'Rich bass Bluetooth speaker',
          price: 129,
          category: 'audio',
          image: '/img/c5.png',
          brand: 'Fusion',
          stock: 11,
          rating: 4.3,
          numReviews: 19,
          createdAt: '2026-04-09T00:00:00.000Z',
        },
      ];

      Product.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(baseProduct),
      });
      Product.find.mockReturnValue(buildLeanQuery(fallbackProducts));
      queryById.mockRejectedValue(new Error('Pinecone unavailable'));
      ensureProductSyncedWithPinecone.mockResolvedValue();

      const res = await request(app).get('/api/products/base-1/similar');

      expect(res.status).toBe(200);
      expect(ensureProductSyncedWithPinecone).toHaveBeenCalledWith(baseProduct);
      expect(res.body).toHaveLength(5);
      expect(res.body[0]).toMatchObject({ id: 'cand-1', name: 'Studio Headphones' });
    });
  });

  describe('GET /api/products/category/:category', () => {
    it('200 → returns products in category', async () => {
      const catProds = [{ _id: 'a', name: 'Foo' }, { _id: 'b', name: 'Bar' }];
      Product.find.mockResolvedValue(catProds);

      const res = await request(app).get('/api/products/category/testcat');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(catProds);
      expect(Product.find).toHaveBeenCalledWith({ category: 'testcat' });
    });

    it('500 → server error', async () => {
      Product.find.mockRejectedValue(new Error('db error'));
      const res = await request(app).get('/api/products/category/anything');
      expect(res.status).toBe(500);
      expect(res.text).toBe('Server error');
    });
  });

  describe('PUT /api/products/:id/rating', () => {
    it('200 → updates rating when product exists', async () => {
      const original = {
        _id: 'z1',
        rating: 4,
        numReviews: 2,
        save: jest.fn().mockResolvedValue(),
      };
      Product.findById.mockResolvedValue(original);

      const res = await request(app)
        .put('/api/products/z1/rating')
        .send({ rating: 5 });

      // newAverage = (4*2 + 5) / 3 = 13/3 ≈ 4.333...
      expect(res.status).toBe(200);
      expect(original.save).toHaveBeenCalled();
      expect(res.body).toEqual({
        _id: 'z1',
        rating: expect.closeTo(13 / 3, 5),
        numReviews: 3,
      });
    });

    it('404 → product not found', async () => {
      Product.findById.mockResolvedValue(null);
      const res = await request(app)
        .put('/api/products/nope/rating')
        .send({ rating: 1 });
      expect(res.status).toBe(404);
      expect(res.text).toBe('Product not found');
    });

    it('500 → server error', async () => {
      Product.findById.mockRejectedValue(new Error('fail'));
      const res = await request(app)
        .put('/api/products/err/rating')
        .send({ rating: 2 });
      expect(res.status).toBe(500);
      expect(res.text).toBe('Server error');
    });
  });
});
