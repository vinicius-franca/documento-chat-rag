# Proposal

## Why

O projeto LivroChat RAG será um ambiente pessoal e privado para estudar Retrieval-Augmented Generation (RAG) com um caso de uso concreto: consultar o conteúdo de livros em PDF. Ele permitirá experimentar ingestão, segmentação, embeddings, recuperação semântica e geração fundamentada, sem a complexidade de fontes externas ou automações por agentes.

## What Changes

- Criar uma aplicação web que aceite o envio de PDFs com texto selecionável.
- Extrair e indexar o conteúdo por página, preservando livro, versão e referência de página em cada trecho recuperável.
- Disponibilizar busca semântica e perguntas em linguagem natural sobre os livros indexados.
- Gerar respostas estritamente fundamentadas nos trechos recuperados, com fontes clicáveis e tratamento explícito de contexto insuficiente.
- Incluir uma interface inicial para biblioteca, upload e conversa com filtros por livro.
- Registrar uma base de avaliação com perguntas conhecidas para medir recuperação e fidelidade das respostas.

## Capabilities

### New Capabilities
- `book-ingestion`: recebe PDFs com texto selecionável, extrai seu conteúdo por página e os transforma em trechos indexáveis com metadados de origem.
- `grounded-book-qa`: recupera trechos relevantes de livros indexados e entrega respostas fundamentadas, com referências de fonte e indicação de contexto insuficiente.
- `book-library`: apresenta os livros processados, seu estado de indexação e permite restringir perguntas a um ou mais livros.

### Modified Capabilities

- Nenhuma.

## Impact

- Novo monorepo TypeScript com front-end Angular e API NestJS.
- Novo serviço de busca vetorial local com Qdrant em Docker e armazenamento local de PDFs no MVP.
- Integração com um provedor de embeddings e geração por variáveis de ambiente, preservando uma interface que permita troca futura por modelos locais.
- Novas rotas de upload, consulta de biblioteca, indexação e perguntas RAG.
- Sem suporte inicial a OCR, autenticação, compartilhamento de livros, documentos escaneados ou distribuição de conteúdo.
