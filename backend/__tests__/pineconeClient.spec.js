const mockPost = jest.fn();

jest.mock('axios', () => ({
  create: jest.fn(() => ({ post: mockPost })),
}));

describe('pineconeClient', () => {
  let pineconeClient;

  beforeAll(() => {
    process.env.PINECONE_API_KEY = 'test-api-key';
    process.env.PINECONE_HOST = 'https://test-pinecone.svc.environment.pinecone.io';
    pineconeClient = require('../pineconeClient');
  });

  afterEach(() => {
    mockPost.mockReset();
  });

  describe('upsertVectors', () => {
    it('posts vectors to /vectors/upsert', async () => {
      mockPost.mockResolvedValue({ data: {} });
      const vectors = [{ id: 'v1', values: [0.1, 0.2] }];
      await pineconeClient.upsertVectors(vectors, 'ns');
      expect(mockPost).toHaveBeenCalledWith('/vectors/upsert', {
        vectors,
        namespace: 'ns',
      });
    });

    it('skips upsert when vectors array is empty', async () => {
      await pineconeClient.upsertVectors([], 'ns');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('skips upsert when vectors is not an array', async () => {
      await pineconeClient.upsertVectors(null, 'ns');
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('deleteVectors', () => {
    it('posts ids to /vectors/delete', async () => {
      mockPost.mockResolvedValue({ data: {} });
      await pineconeClient.deleteVectors(['id1', 'id2'], 'ns');
      expect(mockPost).toHaveBeenCalledWith('/vectors/delete', {
        ids: ['id1', 'id2'],
        namespace: 'ns',
      });
    });

    it('skips delete when ids array is empty', async () => {
      await pineconeClient.deleteVectors([], 'ns');
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('fetchVectors', () => {
    it('posts ids to /vectors/fetch and returns vectors', async () => {
      const vectors = { v1: { id: 'v1', values: [0.1] } };
      mockPost.mockResolvedValue({ data: { vectors } });
      const result = await pineconeClient.fetchVectors(['v1'], 'ns');
      expect(result).toEqual(vectors);
    });

    it('returns empty object when ids is empty', async () => {
      const result = await pineconeClient.fetchVectors([], 'ns');
      expect(result).toEqual({});
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('queryById', () => {
    it('queries by id with topK and namespace', async () => {
      const responseData = { matches: [{ id: 'v1', score: 0.95 }] };
      mockPost.mockResolvedValue({ data: responseData });
      const result = await pineconeClient.queryById('v1', 3, 'ns');
      expect(mockPost).toHaveBeenCalledWith('/query', {
        id: 'v1',
        topK: 3,
        includeMetadata: true,
        namespace: 'ns',
      });
      expect(result).toEqual(responseData);
    });
  });

  describe('queryByVector', () => {
    it('queries by vector', async () => {
      const responseData = { matches: [] };
      mockPost.mockResolvedValue({ data: responseData });
      const result = await pineconeClient.queryByVector([0.1, 0.2], 5, 'ns');
      expect(mockPost).toHaveBeenCalledWith('/query', {
        vector: [0.1, 0.2],
        topK: 5,
        includeMetadata: true,
        namespace: 'ns',
      });
      expect(result).toEqual(responseData);
    });
  });

  describe('purgeNamespace', () => {
    it('deletes all vectors in namespace', async () => {
      mockPost.mockResolvedValue({ data: {} });
      await pineconeClient.purgeNamespace('ns');
      expect(mockPost).toHaveBeenCalledWith('/vectors/delete', {
        deleteAll: true,
        namespace: 'ns',
      });
    });
  });

  describe('getNamespaceVectorCount', () => {
    it('returns vector count from stats', async () => {
      mockPost.mockResolvedValue({
        data: { namespaces: { ns: { vectorCount: 42 } } },
      });
      const count = await pineconeClient.getNamespaceVectorCount('ns');
      expect(count).toBe(42);
    });

    it('returns 0 when namespace does not exist', async () => {
      mockPost.mockResolvedValue({
        data: { namespaces: {} },
      });
      const count = await pineconeClient.getNamespaceVectorCount('missing');
      expect(count).toBe(0);
    });

    it('returns 0 on 404 error', async () => {
      mockPost.mockRejectedValue({ response: { status: 404 } });
      const count = await pineconeClient.getNamespaceVectorCount('ns');
      expect(count).toBe(0);
    });

    it('returns 0 on generic error', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockPost.mockRejectedValue(new Error('network error'));
      const count = await pineconeClient.getNamespaceVectorCount('ns');
      expect(count).toBe(0);
      console.warn.mockRestore();
    });
  });
});
