# Spec Delta

## Purpose

Permitir que pessoas façam perguntas sobre livros indexados e recebam respostas limitadas ao conteúdo recuperado, sempre acompanhadas de referências verificáveis.

## ADDED Requirements

### Requirement: Pergunta sobre livros indexados
O sistema SHALL aceitar uma pergunta em linguagem natural e recuperar trechos relevantes exclusivamente entre os livros com estado `ready` autorizados pelo filtro da consulta.

#### Scenario: Pergunta sem filtro de livro
- **WHEN** uma pessoa envia uma pergunta sem selecionar livros
- **THEN** o sistema pesquisa todos os livros com estado `ready`

#### Scenario: Pergunta com filtro de livro
- **WHEN** uma pessoa seleciona um ou mais livros antes de perguntar
- **THEN** o sistema recupera trechos somente dos livros selecionados que estejam com estado `ready`

### Requirement: Resposta fundamentada em fontes
O sistema SHALL apresentar a resposta usando somente o contexto recuperado e SHALL associar cada resposta a pelo menos uma fonte com título do livro, página ou faixa de páginas e trecho de apoio.

#### Scenario: Contexto suficiente
- **WHEN** a recuperação encontra trechos que sustentam a pergunta
- **THEN** o sistema retorna uma resposta e uma lista de fontes com livro, páginas e excerto correspondente

#### Scenario: Fonte consultável
- **WHEN** uma resposta apresenta uma fonte
- **THEN** a pessoa pode identificar qual livro e quais páginas sustentam a informação

### Requirement: Sinalização de contexto insuficiente
O sistema SHALL declarar explicitamente que não encontrou evidência suficiente quando os trechos recuperados não sustentarem uma resposta confiável.

#### Scenario: Pergunta sem evidência recuperada
- **WHEN** não existem trechos relevantes para a pergunta
- **THEN** o sistema não inventa uma resposta e retorna `insufficientContext` como verdadeiro

#### Scenario: Pergunta fora do acervo
- **WHEN** a pergunta trata de assunto ausente dos livros selecionados
- **THEN** o sistema informa a ausência de evidência e sugere selecionar ou enviar outro livro
