# Spec Delta

## Purpose

Permitir que PDFs de livros com texto selecionável sejam transformados em conteúdo pesquisável, preservando referências confiáveis para cada página e trecho indexado.

## ADDED Requirements

### Requirement: Upload de livro em PDF
O sistema SHALL aceitar o envio de um arquivo PDF e criar um registro de livro com título derivado do nome do arquivo, estado de processamento e identificação única.

#### Scenario: Upload de PDF válido
- **WHEN** uma pessoa envia um arquivo PDF válido
- **THEN** o sistema cria o livro com estado `uploaded` e inicia seu processamento assíncrono

#### Scenario: Arquivo não suportado
- **WHEN** uma pessoa tenta enviar um arquivo que não é PDF
- **THEN** o sistema rejeita o envio e informa que apenas PDF é aceito no MVP

### Requirement: Extração de conteúdo paginado
O sistema SHALL extrair o texto de cada página do PDF e preservar o número da página associado ao conteúdo extraído.

#### Scenario: PDF com texto extraível
- **WHEN** o processamento recebe um PDF cujo texto pode ser extraído
- **THEN** o sistema registra o total de páginas e armazena o texto extraído associado a cada página

#### Scenario: PDF sem texto extraível
- **WHEN** o processamento não encontra texto utilizável no PDF
- **THEN** o sistema marca o livro como `failed` e informa que PDFs escaneados não são suportados no MVP

### Requirement: Indexação de trechos com origem
O sistema SHALL dividir o conteúdo extraído em trechos pesquisáveis e manter, em cada trecho, a referência ao livro e à faixa de páginas de origem.

#### Scenario: Indexação concluída
- **WHEN** todas as páginas de um livro são extraídas com sucesso
- **THEN** o sistema cria trechos indexáveis com `bookId`, texto, página inicial e página final, e marca o livro como `ready`

#### Scenario: Falha durante indexação
- **WHEN** a criação dos trechos ou dos vetores falha
- **THEN** o sistema marca o livro como `failed` sem disponibilizá-lo para perguntas
