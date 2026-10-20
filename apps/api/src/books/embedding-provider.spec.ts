import { OpenAiEmbeddingProvider } from './embedding-provider.js';

const embeddingsCreate = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
  default: class {
    embeddings = { create: embeddingsCreate };
  },
}));

describe('OpenAiEmbeddingProvider', () => {
  beforeEach(() => {
    embeddingsCreate.mockReset();
  });

  it('returns no vectors for empty input without calling the API', async () => {
    const provider = new OpenAiEmbeddingProvider('', 'test-model', 1);

    await expect(provider.embed([])).resolves.toEqual([]);
    expect(embeddingsCreate).not.toHaveBeenCalled();
  });

  it('splits 65 texts into two requests and preserves input order', async () => {
    const texts = Array.from({ length: 65 }, (_, index) => String(index));
    embeddingsCreate.mockImplementation(
      async ({ input }: { input: string[] }) => ({
        data: input
          .map((text, index) => ({ index, embedding: [Number(text)] }))
          .reverse(),
      }),
    );

    const vectors = await provider().embed(texts);

    expect(embeddingsCreate).toHaveBeenCalledTimes(2);
    expect(embeddingsCreate.mock.calls[0][0].input).toEqual(texts.slice(0, 64));
    expect(embeddingsCreate.mock.calls[1][0].input).toEqual(texts.slice(64));
    expect(vectors).toEqual(texts.map((text) => [Number(text)]));
  });

  it('starts a new request when adding a text would exceed 100000 UTF-8 bytes', async () => {
    const texts = ['é'.repeat(49_999), 'é', 'x'];
    embeddingsCreate.mockImplementation(
      async ({ input }: { input: string[] }) => ({
        data: input.map((_, index) => ({ index, embedding: [index] })),
      }),
    );

    const vectors = await provider().embed(texts);

    expect(embeddingsCreate).toHaveBeenCalledTimes(2);
    expect(embeddingsCreate.mock.calls[0][0].input).toEqual(texts.slice(0, 2));
    expect(embeddingsCreate.mock.calls[1][0].input).toEqual(['x']);
    expect(vectors).toEqual([[0], [1], [0]]);
  });

  it('accepts one text of exactly 100000 UTF-8 bytes', async () => {
    const text = 'x'.repeat(100_000);
    embeddingsCreate.mockResolvedValue({
      data: [{ index: 0, embedding: [7] }],
    });

    await expect(provider().embed([text])).resolves.toEqual([[7]]);
    expect(embeddingsCreate.mock.calls[0][0].input).toEqual([text]);
  });

  it('rejects one oversized text before calling the API', async () => {
    await expect(provider().embed(['ok', 'x'.repeat(100_001)])).rejects.toThrow(
      /1/,
    );
    expect(embeddingsCreate).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'duplicate',
      data: [
        { index: 0, embedding: [1] },
        { index: 0, embedding: [2] },
      ],
    },
    { name: 'missing', data: [{ index: 0, embedding: [1] }] },
  ])('rejects a response with $name indices', async ({ data }) => {
    embeddingsCreate.mockResolvedValue({ data });

    await expect(provider().embed(['a', 'b'])).rejects.toThrow(
      /índices|índice/i,
    );
  });

  it('rejects when a later batch fails', async () => {
    const providerError = new Error('request limit');
    embeddingsCreate
      .mockResolvedValueOnce({ data: [{ index: 0, embedding: [1] }] })
      .mockRejectedValueOnce(providerError);

    await expect(provider().embed(['x'.repeat(100_000), 'y'])).rejects.toBe(
      providerError,
    );
    expect(embeddingsCreate).toHaveBeenCalledTimes(2);
  });
});

function provider(): OpenAiEmbeddingProvider {
  return new OpenAiEmbeddingProvider('test-key', 'test-model', 1);
}
