# Design

## Context

O repositório está no estado inicial e não possui código de aplicação. Esta mudança cria o primeiro fluxo completo do LivroChat RAG; a motivação e os comportamentos esperados estão em `proposal.md` e nas specs da mudança.

O MVP precisa ser executável localmente, manter o conteúdo privado e expor o percurso completo de RAG para estudo: PDF → texto paginado → chunks → embeddings → recuperação → resposta com fontes.

## Goals / Non-Goals

**Goals:**

- Entregar uma arquitetura TypeScript com front-end e API separados.
- Preservar a relação entre cada trecho e sua página de origem.
- Tornar observáveis os resultados da recuperação, não apenas a resposta do modelo.
- Permitir trocar o provedor de IA sem alterar as regras de negócio.
- Manter os serviços de infraestrutura reproduzíveis por Docker Compose.

**Non-Goals:**

- OCR, autenticação, colaboração, sincronização em nuvem e histórico conversacional.
- Suporte a EPUB, DOCX ou PDFs sem camada textual.
- Avaliação jurídica, distribuição de obras ou acesso público aos PDFs enviados.
- Agentes, reranking, busca híbrida e memória conversacional no primeiro incremento.

## Decisions

### Monorepo TypeScript com Angular e NestJS

O repositório será organizado em `apps/web` para a interface Angular e `apps/api` para a API NestJS. O front-end consome uma API HTTP e não acessa diretamente provedores de IA, arquivos ou banco vetorial.

**Rationale:** separa as credenciais e o pipeline RAG da interface, ao mesmo tempo em que mantém o aprendizado em tecnologias já familiares.

**Alternatives considered:** uma aplicação Angular com chamadas diretas ao provedor reduziria arquivos, mas exporia credenciais e não permite ingestão segura. Uma única aplicação server-rendered reduziria a separação didática entre front-end e BFF.

### Serviços locais via Docker Compose

O MVP utilizará PostgreSQL para catálogo e estado dos livros, Redis para filas e Qdrant para vetores. Os PDFs ficarão em `storage/uploads` montado localmente pelo ambiente de desenvolvimento.

**Rationale:** cada responsabilidade fica explícita: dados transacionais, processamento assíncrono, vetores e arquivos. A infraestrutura pode ser iniciada e removida localmente.

**Alternatives considered:** SQLite e processamento síncrono teriam menos serviços, mas ocultariam a separação entre status do livro e trabalho de indexação. Um banco vetorial hospedado aumenta dependência externa antes de validar o fluxo local.

### Ingestão assíncrona baseada em fila

O endpoint de upload validará o arquivo, o salvará localmente, criará o registro do livro e publicará uma tarefa de indexação. Um worker da API processará a tarefa: extração por página, validação de texto, chunking, embeddings, persistência no Qdrant e atualização do estado.

**Rationale:** PDFs grandes não bloqueiam a requisição HTTP e o estado `uploaded`/`processing`/`ready`/`failed` fica visível para a biblioteca.

**Alternatives considered:** processar durante o upload simplifica o fluxo inicial, mas torna a interface lenta e dificulta reprocessamentos e falhas parciais.

### Chunks orientados a página

O extrator produzirá texto por página. A segmentação criará chunks em torno de 600 tokens, com sobreposição moderada, sem perder `pageStart` e `pageEnd`. Se um chunk atravessar páginas, manterá a faixa completa.

**Rationale:** o tamanho limita o contexto enviado ao modelo e a referência paginada permite verificar a resposta no PDF original.

**Alternatives considered:** indexar uma página inteira reduz trabalho de segmentação, mas diminui precisão de recuperação. Chunks sem metadados de página inviabilizam citações confiáveis.

### Interface de IA com contrato estável

A API definirá portas para `EmbeddingProvider` e `GenerationProvider`. A primeira implementação usará um provedor hospedado configurado por variáveis de ambiente; implementações locais poderão ser adicionadas sem mudar o pipeline de domínio.

**Rationale:** a escolha de modelo é um detalhe substituível e não deve contaminar as rotas, o worker ou o front-end.

**Alternatives considered:** acoplar a SDK de um único provedor acelera a primeira chamada, mas torna custo, privacidade e testes dependentes de uma implementação concreta.

### Resposta RAG estruturada e grounded

Para cada pergunta, a API busca os seis chunks mais próximos no Qdrant, já filtrados pelos `bookIds` prontos quando houver filtro. O modelo recebe instruções para usar somente o contexto e retorna JSON com `answer`, `sourceChunkIds` e `insufficientContext`. A API valida a saída, resolve as fontes no catálogo e devolve título, páginas e excerto.

**Rationale:** o modelo não é a fonte de verdade; as fontes são derivadas dos chunks realmente recuperados e persistidos.

**Alternatives considered:** devolver texto livre é mais simples, porém torna difícil validar fontes. Permitir que o modelo invente páginas e títulos quebra a confiabilidade do projeto.

### Avaliação manual versionada

O repositório incluirá uma pequena coleção de perguntas, respostas esperadas e páginas esperadas para pelo menos um livro de teste autorizado. Um script executará as perguntas e registrará recuperação e fontes retornadas.

**Rationale:** permite perceber se mudanças de chunking ou modelo melhoram ou pioram a recuperação antes de evoluir o produto.

**Alternatives considered:** avaliar apenas pela impressão da conversa não revela falhas de recuperação recorrentes.

## Risks / Trade-offs

- **PDFs com layout complexo extraem texto em ordem incorreta** → limitar o MVP a PDFs com texto selecionável e registrar falha ou aviso quando a extração for inutilizável.
- **A resposta cita contexto irrelevante** → exibir os chunks recuperados, manter uma avaliação de referência e ajustar tamanho, overlap e `topK` antes de adicionar recursos avançados.
- **Custo e indisponibilidade do provedor de IA** → encapsular provedores, medir chamadas e permitir troca posterior por embeddings/modelo local.
- **Arquivos protegidos expostos acidentalmente** → manter upload e consulta locais, não servir diretórios de armazenamento publicamente e não registrar o texto integral em logs.
- **Infraestrutura excessiva para estudo** → fornecer Compose de um comando e documentação de execução; serviços foram escolhidos para tornar o pipeline explícito, não para produção.
- **Reinício durante indexação** → manter estado, erro e identificador de tarefa no catálogo para permitir reprocessamento futuro.

## Migration Plan

1. Criar o workspace e os serviços locais sem dados de produção.
2. Configurar variáveis de ambiente e subir PostgreSQL, Redis e Qdrant.
3. Validar com um PDF de domínio público ou autorizado.
4. Executar o conjunto inicial de avaliação após a indexação.
5. Caso seja necessário reverter, interromper os serviços e remover apenas os volumes e arquivos de desenvolvimento; nenhum sistema externo é alterado.

## Open Questions

- Qual provedor hospedado será usado na primeira implementação de embeddings e geração? O contrato de provedores mantém essa decisão reversível sem alterar as specs.
- Qual livro de domínio público ou com autorização será usado como corpus e conjunto de avaliação inicial?
