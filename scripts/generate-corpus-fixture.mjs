import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outputPath = resolve('test/fixtures/corpus/caderno-rag-experimental.pdf');

const pages = [
  ['Caderno RAG Experimental', 'Corpus de teste original e autorizado.', 'Licenca: CC0 1.0.'],
  ['Objetivo', 'Este caderno descreve um MVP local para estudar RAG.', 'O sistema responde perguntas sobre livros enviados pela pessoa usuaria.'],
  ['Entrada aceita', 'O MVP aceita somente arquivos PDF com texto selecionavel.', 'Documentos digitalizados sem camada textual nao sao suportados.'],
  ['Origem paginada', 'Cada trecho preserva o livro e as paginas de origem.', 'Uma citacao pode indicar uma pagina ou uma faixa de paginas.'],
  ['Segmentacao', 'O texto e dividido em chunks de aproximadamente 600 tokens.', 'Chunks vizinhos usam sobreposicao moderada para preservar o contexto.'],
  ['Infraestrutura', 'PostgreSQL guarda o catalogo e o estado dos livros.', 'Redis executa as filas e Qdrant armazena os vetores.'],
  ['Estados do livro', 'Um livro pode estar uploaded, processing, ready ou failed.', 'Somente livros ready podem responder perguntas.'],
  ['Recuperacao', 'A consulta busca os seis chunks mais proximos por padrao.', 'Um filtro por livro restringe a busca aos livros selecionados e prontos.'],
  ['Resposta fundamentada', 'A resposta usa somente os chunks recuperados.', 'Cada fonte mostra titulo, paginas e um excerto de apoio.'],
  ['Contexto insuficiente', 'Sem evidencia recuperada ou fonte valida, insufficientContext e verdadeiro.', 'Nessa situacao o sistema nao inventa uma resposta.'],
  ['Privacidade', 'PDFs enviados ficam em armazenamento local privado.', 'O diretorio de uploads nao deve ser servido publicamente.'],
  ['Limite do MVP', 'OCR, EPUB, DOCX e memoria conversacional estao fora do escopo inicial.', 'O corpus e destinado apenas a testes automatizados.'],
];

function escapePdf(value) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pageStream(lines) {
  const [title, ...body] = lines;
  const commands = [
    'BT',
    '/F1 18 Tf',
    '72 760 Td',
    `(${escapePdf(title)}) Tj`,
    '/F1 12 Tf',
    '0 -36 Td',
    ...body.flatMap((line) => [`(${escapePdf(line)}) Tj`, '0 -22 Td']),
    'ET',
  ];
  return commands.join('\n');
}

const objects = [];
objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
objects[2] = `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`;
objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

pages.forEach((page, index) => {
  const contentObject = 4 + index * 2;
  const pageObject = contentObject + 1;
  const stream = pageStream(page);
  objects[contentObject] = `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`;
  objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`;
});

let pdf = '%PDF-1.4\n%PDF fixture\n';
const offsets = [0];
for (let index = 1; index < objects.length; index += 1) {
  offsets[index] = Buffer.byteLength(pdf, 'ascii');
  pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
}

const xrefOffset = Buffer.byteLength(pdf, 'ascii');
pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
for (let index = 1; index < objects.length; index += 1) {
  pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, pdf, 'ascii');

const blankOutputPath = resolve('test/fixtures/corpus/caderno-sem-texto.pdf');
const blankObjects = [];
blankObjects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
blankObjects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
blankObjects[3] =
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>';
blankObjects[4] = '<< /Length 0 >>\nstream\n\nendstream';

let blankPdf = '%PDF-1.4\n%PDF fixture\n';
const blankOffsets = [0];
for (let index = 1; index < blankObjects.length; index += 1) {
  blankOffsets[index] = Buffer.byteLength(blankPdf, 'ascii');
  blankPdf += `${index} 0 obj\n${blankObjects[index]}\nendobj\n`;
}

const blankXrefOffset = Buffer.byteLength(blankPdf, 'ascii');
blankPdf += `xref\n0 ${blankObjects.length}\n0000000000 65535 f \n`;
for (let index = 1; index < blankObjects.length; index += 1) {
  blankPdf += `${String(blankOffsets[index]).padStart(10, '0')} 00000 n \n`;
}
blankPdf += `trailer\n<< /Size ${blankObjects.length} /Root 1 0 R >>\nstartxref\n${blankXrefOffset}\n%%EOF\n`;
await writeFile(blankOutputPath, blankPdf, 'ascii');
