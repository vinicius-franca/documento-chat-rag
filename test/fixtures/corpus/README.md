# Corpus de teste autorizado

`caderno-rag-experimental.pdf` e um PDF original, com camada textual, criado exclusivamente para este repositório. Seu conteudo esta dedicado ao dominio publico sob [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.pt-br).

O arquivo e gerado por `scripts/generate-corpus-fixture.mjs` sem dependencias externas. Ele contem 12 paginas curtas e deliberadamente previsiveis para testar:

- extracao de texto por pagina;
- preservacao de `pageStart` e `pageEnd`;
- recuperacao com fontes;
- retorno de contexto insuficiente.

Para recriar o PDF, execute:

```bash
node scripts/generate-corpus-fixture.mjs
```

Nao use este corpus como demonstracao de qualidade semantica em producao; ele existe apenas como fixture automatizada.
