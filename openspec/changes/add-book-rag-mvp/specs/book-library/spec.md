# Spec Delta

## Purpose

Disponibilizar uma biblioteca pessoal que permita acompanhar os livros enviados, seu estado de indexação e o escopo usado em cada consulta.

## ADDED Requirements

### Requirement: Listagem de livros
O sistema SHALL exibir todos os livros enviados com título, quantidade de páginas quando disponível, data de envio e estado atual de processamento.

#### Scenario: Biblioteca com livros prontos
- **WHEN** existem livros indexados com sucesso
- **THEN** a biblioteca os apresenta com estado `ready` e permite selecioná-los para uma pergunta

#### Scenario: Biblioteca com processamento em andamento
- **WHEN** um livro está sendo processado
- **THEN** a biblioteca apresenta seu estado atual sem oferecê-lo como filtro de pergunta

### Requirement: Visibilidade de falhas de processamento
O sistema SHALL apresentar um motivo compreensível quando um livro não puder ser indexado.

#### Scenario: PDF escaneado sem OCR
- **WHEN** um livro falha por não possuir texto extraível
- **THEN** a biblioteca apresenta que PDFs escaneados não são suportados no MVP

### Requirement: Seleção de escopo para perguntas
O sistema SHALL permitir selecionar nenhum, um ou mais livros prontos como escopo de uma nova pergunta.

#### Scenario: Seleção de múltiplos livros
- **WHEN** uma pessoa seleciona dois ou mais livros com estado `ready`
- **THEN** a próxima pergunta considera somente os livros selecionados

#### Scenario: Remoção de seleção
- **WHEN** uma pessoa remove todos os filtros de livro
- **THEN** a próxima pergunta considera todos os livros com estado `ready`
