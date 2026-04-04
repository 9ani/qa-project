jest.mock('../pineconeClient');
jest.mock('./embeddingServiceHelper', () => {}, { virtual: true });

const mockEmbedText = jest.fn();
jest.mock('../services/embeddingService', () => ({
  embedText: mockEmbedText,
  EMBEDDING_TASK_TYPES: { RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT' },
}));

const { upsertVectors, deleteVectors } = require('../pineconeClient');

describe('pineconeSync', () => {
  let ensureProductSyncedWithPinecone, removeProductFromPinecone;

  beforeAll(() => {
    process.env.PINECONE_API_KEY = 'test-key';
    process.env.PINECONE_HOST = 'https://test.pinecone.io';
    process.env.PINECONE_NAMESPACE = 'test-ns';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require to pick up fresh env
    jest.isolateModules(() => {
      const sync = require('../services/pineconeSync');
      ensureProductSyncedWithPinecone = sync.ensureProductSyncedWithPinecone;
      removeProductFromPinecone = sync.removeProductFromPinecone;
    });
  });

  describe('ensureProductSyncedWithPinecone', () => {
    it('returns false when Pinecone is not configured', async () => {
      const origKey = process.env.PINECONE_API_KEY;
      delete process.env.PINECONE_API_KEY;

      let fn;
      jest.isolateModules(() => {
        fn = require('../services/pineconeSync').ensureProductSyncedWithPinecone;
      });

      const result = await fn({ _id: '123', name: 'Test' });
      expect(result).toBe(false);
      process.env.PINECONE_API_KEY = origKey;
    });

    it('returns false when product doc is null', async () => {
      const result = await ensureProductSyncedWithPinecone(null);
      expect(result).toBe(false);
    });

    it('returns false when product has no _id', async () => {
      const result = await ensureProductSyncedWithPinecone({ name: 'No ID' });
      expect(result).toBe(false);
    });

    it('upserts product vector and returns true', async () => {
      const embedding = new Array(768).fill(0.1);
      mockEmbedText.mockResolvedValue(embedding);
      upsertVectors.mockResolvedValue();

      const product = {
        _id: 'prod-123',
        name: 'Laptop',
        description: 'A fast laptop',
        category: 'Electronics',
        brand: 'TestBrand',
        price: 999,
        image: 'img.png',
        createdAt: new Date(),
        toObject() {
          return { ...this };
        },
      };

      const result = await ensureProductSyncedWithPinecone(product);
      expect(result).toBe(true);
      expect(upsertVectors).toHaveBeenCalledWith(
        [expect.objectContaining({
          id: 'prod-123',
          values: embedding,
          metadata: expect.objectContaining({ name: 'Laptop' }),
        })],
        'test-ns',
      );
    });

    it('returns false when embedding returns empty', async () => {
      mockEmbedText.mockResolvedValue([]);
      const product = {
        _id: 'prod-456',
        name: 'Widget',
        description: 'A widget',
        toObject() { return { ...this }; },
      };
      const result = await ensureProductSyncedWithPinecone(product);
      expect(result).toBe(false);
    });
  });

  describe('removeProductFromPinecone', () => {
    it('returns false when Pinecone is not configured', async () => {
      const origKey = process.env.PINECONE_API_KEY;
      delete process.env.PINECONE_API_KEY;

      let fn;
      jest.isolateModules(() => {
        fn = require('../services/pineconeSync').removeProductFromPinecone;
      });

      const result = await fn('prod-123');
      expect(result).toBe(false);
      process.env.PINECONE_API_KEY = origKey;
    });

    it('returns false when no productId', async () => {
      const result = await removeProductFromPinecone(null);
      expect(result).toBe(false);
    });

    it('deletes vector and returns true', async () => {
      deleteVectors.mockResolvedValue();
      const result = await removeProductFromPinecone('prod-789');
      expect(result).toBe(true);
      expect(deleteVectors).toHaveBeenCalledWith(['prod-789'], 'test-ns');
    });
  });
});
