# LivroChat RAG

Projeto de estudo de *Retrieval-Augmented Generation* (RAG) para enviar livros em PDF e fazer perguntas fundamentadas no conteúdo deles.

## Estrutura

- `apps/web`: interface Angular.
- `apps/api`: API NestJS e pipeline de ingestão.
- `openspec`: especificações e plano de implementação.
- `docker-compose.yml`: PostgreSQL, Redis e Qdrant para desenvolvimento.

## Executar localmente

### 1. Configurar o ambiente

Copie `.env.example` para `.env`. A chave `OPENAI_API_KEY` fica somente em `.env`, que é ignorado pelo Git. Não compartilhe esse arquivo nem envie PDFs privados ao repositório.

```bash
cp .env.example .env
```

No Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

O padrão é OpenRouter com `OPENROUTER_API_KEY`, `openai/text-embedding-3-small` e `openai/gpt-4.1-mini`. Caso uma chave já esteja em `OPENAI_API_KEY`, ela também será usada temporariamente pelo OpenRouter para facilitar a migração. O embedding é configurado com 1.536 dimensões; `QDRANT_COLLECTION` define a coleção local.

Para usar a API OpenAI diretamente, configure `AI_PROVIDER=openai` e preencha `OPENAI_API_KEY`.

### 2. Instalar dependências

Instale as dependências uma vez em cada aplicação. Para a interface Angular, use Node.js 24.15 ou superior:

```bash
npm ci --prefix apps/api
npm ci --prefix apps/web
```

### 3. Iniciar a infraestrutura e as aplicações

Com o Docker Desktop em execução, inicie a infraestrutura e, em outros dois terminais, a API e a interface:

```bash
docker compose up -d
npm run start:dev --prefix apps/api
npm start --prefix apps/web -- --host 0.0.0.0
```

A web fica disponível em `http://localhost:4200` e a API em `http://localhost:3000`.

### 4. Verificar as aplicações

Os testes de integração usam PostgreSQL, Redis e Qdrant locais; deixe o Compose ativo ao executá-los.

```bash
npm test --prefix apps/api
npm run build --prefix apps/api
npm run lint --prefix apps/api
npm test --prefix apps/web -- --watch=false
npm run build --prefix apps/web
```

No Windows PowerShell, caso a política local bloqueie `npm.ps1`, substitua `npm` por `npm.cmd` nos mesmos comandos.

O endpoint `GET /books` retorna o catálogo com título, total de páginas, data, estado e eventual erro de processamento. O upload é feito em `POST /books/upload` usando `multipart/form-data` com o campo `file`.

## Limites e conteúdo autorizado

- O MVP aceita exclusivamente PDFs com camada de texto selecionável. PDFs escaneados, imagens e documentos que exijam OCR são marcados como `failed` com uma mensagem explícita.
- Não há OCR, autenticação, acesso público aos uploads nem suporte a EPUB ou DOCX neste incremento.
- Os arquivos enviados são armazenados em `storage/uploads`, fora do controle de versão e sem rota HTTP pública.
- Use somente livros em domínio público, com licença compatível ou para os quais você tenha autorização. O fixture versionado em `test/fixtures/corpus` é um caderno original sob CC0, criado apenas para os testes.

## Grounding e recuperação

`POST /questions` recebe uma pergunta e, opcionalmente, `bookIds`. A API gera o embedding da pergunta, consulta no máximo `RAG_TOP_K` trechos (padrão: 6) e aplica o filtro no Qdrant somente aos livros do escopo que estejam em estado `ready`.

O gerador recebe exclusivamente os trechos recuperados. A instrução do sistema exige uma resposta JSON com `answer`, `sourceChunkIds` e `insufficientContext`, e determina que, quando o contexto não bastar, não sejam declaradas fontes. A API ignora IDs de chunk que não foram recuperados e resolve as fontes restantes no catálogo, nunca a partir de título ou página sugeridos pelo modelo.

Exemplo de resposta com evidência:

```json
{
  "answer": "RAG recupera trechos antes de gerar a resposta.",
  "insufficientContext": false,
  "sources": [
    {
      "chunkId": "chunk-1",
      "bookId": "book-ready",
      "title": "Caderno RAG",
      "pageStart": 2,
      "pageEnd": 3,
      "excerpt": "RAG recupera trechos antes de gerar a resposta."
    }
  ]
}
```

Quando não houver evidência recuperada ou fonte válida, o contrato retorna `insufficientContext: true` e `sources: []`.

## Avaliação local

Após indexar o PDF CC0 em `test/fixtures/corpus`, execute o avaliador com o identificador retornado pelo upload:

```bash
node scripts/evaluate-rag.mjs --book-id <UUID_DO_LIVRO>
```

O script chama a API local para as dez perguntas versionadas e imprime `recallAt5` (página esperada entre as cinco primeiras citações), a proporção de respostas com fontes e o resultado de cada pergunta.

### Resultado da verificação integrada

Em 19/10/2026, com OpenRouter usando `openai/text-embedding-3-small` e `openai/gpt-4.1-mini`, o fixture CC0 foi enviado, indexado e marcado como `ready` com 12 páginas. Uma pergunta com filtro explícito para esse livro retornou resposta e citação; em seguida, as dez perguntas do avaliador foram executadas contra a API local com `recallAt5: 1.0` e `answersWithSources: 1.0`.

O fixture é propositalmente curto em relação ao tamanho inicial de chunk (600 tokens), por isso cada resposta dessa execução citou uma faixa ampla, das páginas 1 a 12. O resultado confirma recuperação e fonte, mas não é uma medição de precisão por página fina; um corpus maior ou chunks menores deve ser usado antes de comparar qualidade de recuperação entre modelos.

## GitHub Codespaces

O repositório inclui um Dev Container. Depois de criar um Codespace, execute os mesmos três comandos acima no terminal integrado. As dependências JavaScript são instaladas automaticamente na criação do ambiente; o Docker já vem habilitado.

## Estado atual

O pipeline local já valida e armazena uploads, extrai texto por página, segmenta com sobreposição, prepara embeddings e persiste vetores no Qdrant. A evolução da consulta RAG e da interface segue o plano em `openspec/changes/add-book-rag-mvp/tasks.md`.
