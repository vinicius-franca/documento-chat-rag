import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { BookApi } from './book-api';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: BookApi,
          useValue: {
            listBooks: () =>
              of([
                { id: 'uploaded', title: 'Enviado', pageCount: null, createdAt: '2026-01-01', status: 'uploaded', processingError: null },
                { id: 'processing', title: 'Processando', pageCount: null, createdAt: '2026-01-01', status: 'processing', processingError: null },
                { id: 'ready', title: 'Pronto', pageCount: 12, createdAt: '2026-01-01', status: 'ready', processingError: null },
                { id: 'failed', title: 'Falhou', pageCount: null, createdAt: '2026-01-01', status: 'failed', processingError: 'PDF sem texto.' },
              ]),
            upload: () => of({}),
            ask: () => of({ answer: '', insufficientContext: true, sources: [] }),
          },
        },
      ],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the library title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('LivroChat');
  });

  it('exibe os estados e permite selecionar somente livros prontos', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const checkboxes = Array.from(compiled.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));

    expect(compiled.textContent).toContain('uploaded');
    expect(compiled.textContent).toContain('processing');
    expect(compiled.textContent).toContain('ready');
    expect(compiled.textContent).toContain('failed');
    expect(checkboxes.map((checkbox) => checkbox.disabled)).toEqual([true, true, false, true]);
  });

  it('apresenta cada fonte devolvida pela API', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance['answer'].set({
      answer: 'RAG recupera contexto.',
      insufficientContext: false,
      sources: [
        {
          chunkId: 'chunk-1',
          bookId: 'ready',
          title: 'Pronto',
          pageStart: 2,
          pageEnd: 3,
          excerpt: 'RAG recupera contexto.',
        },
      ],
    });

    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.sources')?.textContent).toContain('Pronto');
    expect(compiled.querySelector('.sources')?.textContent).toContain('Páginas 2–3');
  });
});
