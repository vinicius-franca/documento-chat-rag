# Tasks

## 1. Base do projeto e infraestrutura local

- [x] 1.1 Criar o workspace TypeScript com `apps/web` (Angular) e `apps/api` (NestJS), e verificar que ambos iniciam com seus comandos de desenvolvimento documentados
- [x] 1.2 Criar `docker-compose.yml` para PostgreSQL, Redis e Qdrant com volumes locais, e verificar que os três serviços respondem após `docker compose up -d`
- [x] 1.3 Configurar variáveis de ambiente, diretório privado `storage/uploads` e arquivo `.env.example`, e verificar que segredos e PDFs não são rastreados pelo Git
- [x] 1.4 Modelar migrations e repositórios para livros, estado de processamento, erro e metadados de arquivo, e verificar com teste de persistência contra PostgreSQL

## 2. Pipeline de ingestão de PDFs

- [x] 2.1 Implementar upload de PDF com validação de MIME, extensão e limite configurável de tamanho, e verificar respostas de sucesso e rejeição por teste de integração HTTP
- [x] 2.2 Persistir o arquivo e criar o livro em estado `uploaded`, publicando uma tarefa de indexação no Redis, e verificar que o endpoint retorna antes do processamento terminar
- [x] 2.3 Implementar o worker de extração de texto por página para PDFs com camada textual, e verificar com fixture autorizada que páginas e texto são preservados
- [x] 2.4 Implementar detecção de PDF sem texto extraível e transições para `processing`, `ready` e `failed`, e verificar os estados e a mensagem de falha por testes do worker
- [x] 2.5 Implementar segmentação com overlap e metadados `bookId`, `pageStart` e `pageEnd`, e verificar que chunks que atravessam páginas preservam a faixa correta

## 3. Indexação vetorial e catálogo de livros

- [x] 3.1 Criar coleção Qdrant, cliente TypeScript e operações de inserção/remoção filtradas por `bookId`, e verificar o ciclo com teste de integração local
- [x] 3.2 Implementar a porta de embeddings e um adaptador inicial configurado por `OPENAI_API_KEY`, usando dublês nos testes para verificar que o worker grava vetores e payloads esperados
- [x] 3.3 Criar endpoint de listagem de livros com título, páginas, data, estado e erro de processamento, e verificar contrato HTTP e ordenação por teste de integração
- [x] 3.4 Documentar no README os limites do MVP para PDFs escaneados e o uso apenas de conteúdo autorizado, e verificar que o fluxo de execução local está completo

## 4. Consulta RAG fundamentada

- [x] 4.1 Implementar consulta vetorial com `topK` configurável e filtro por livros em estado `ready`, e verificar que livros fora do filtro não aparecem nos resultados
- [x] 4.2 Criar a porta de geração e um adaptador inicial configurado por `OPENAI_API_KEY`, exigindo saída JSON com resposta, fontes e `insufficientContext`, e verificar a validação com respostas simuladas válidas e inválidas
- [x] 4.3 Implementar o endpoint de pergunta que monta contexto somente com chunks recuperados e resolve fontes no catálogo, e verificar que o retorno inclui título, páginas e excerto
- [x] 4.4 Implementar regra de contexto insuficiente para respostas sem evidência recuperada ou fontes válidas, e verificar que o endpoint não devolve afirmações sem fonte
- [x] 4.5 Documentar o prompt de grounding e os parâmetros de recuperação usados no MVP, e verificar que o exemplo de resposta reproduz o contrato da API

## 5. Interface Angular do MVP

- [x] 5.1 Criar tela de biblioteca com upload e lista de livros, e verificar no navegador os estados `uploaded`, `processing`, `ready` e `failed`
- [x] 5.2 Criar seleção de escopo por um ou mais livros prontos, e verificar que livros em processamento não podem ser selecionados
- [x] 5.3 Criar tela de conversa que envia pergunta e mostra resposta, estado de contexto insuficiente e carregamento, e verificar o fluxo com um endpoint simulado
- [x] 5.4 Exibir as fontes da resposta com título, páginas e excerto, e verificar por teste de componente que cada fonte retornada pela API é apresentada

## 6. Avaliação e verificação integrada

- [x] 6.1 Adicionar corpus de teste autorizado e arquivo versionado com pelo menos dez perguntas, fontes e páginas esperadas, e verificar que não há conteúdo protegido não autorizado no repositório
- [x] 6.2 Criar script de avaliação que registra Recall@5 e presença de fontes para o corpus, e verificar que ele executa contra a infraestrutura local
- [x] 6.3 Executar o fluxo ponta a ponta de upload, indexação, filtro, pergunta e citações, e registrar o resultado e limitações conhecidas no README
- [x] 6.4 Executar lint, testes unitários e de integração, e verificar que todos os comandos obrigatórios estão documentados antes da revisão da mudança

## Workflow follow-up

- Revisar os artefatos e iniciar a aplicação da mudança somente após configurar a chave de API e escolher um PDF autorizado para o corpus inicial.
- Arquivar a mudança após implementação, testes e revisão dos resultados da avaliação.
