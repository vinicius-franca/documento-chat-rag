import { validateGroundedGeneration } from './generation-provider.js';

describe('validateGroundedGeneration', () => {
  it('aceita uma resposta estruturada válida', () => {
    expect(
      validateGroundedGeneration(
        JSON.stringify({
          answer: 'O corpus define RAG como recuperação antes da resposta.',
          sourceChunkIds: ['chunk-1'],
          insufficientContext: false,
        }),
      ),
    ).toEqual({
      answer: 'O corpus define RAG como recuperação antes da resposta.',
      sourceChunkIds: ['chunk-1'],
      insufficientContext: false,
    });
  });

  it.each([
    '{",',
    JSON.stringify({ answer: 'Resposta', sourceChunkIds: ['chunk-1'] }),
    JSON.stringify({ answer: 'Resposta', sourceChunkIds: [42], insufficientContext: false }),
  ])('rejeita uma resposta simulada inválida: %s', (response) => {
    expect(() => validateGroundedGeneration(response)).toThrow();
  });
});
