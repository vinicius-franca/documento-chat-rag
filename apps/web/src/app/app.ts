import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { BookApi, type GroundedAnswer, type LibraryBook } from './book-api';

@Component({
  imports: [FormField],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly api = inject(BookApi);

  protected readonly books = signal<LibraryBook[]>([]);
  protected readonly selectedBookIds = signal<string[]>([]);
  protected readonly selectedFile = signal<File | undefined>(undefined);
  protected readonly loadingBooks = signal(false);
  protected readonly uploading = signal(false);
  protected readonly asking = signal(false);
  protected readonly error = signal('');
  protected readonly answer = signal<GroundedAnswer | undefined>(undefined);
  protected readonly readyBookCount = computed(
    () => this.books().filter((book) => book.status === 'ready').length,
  );
  protected readonly questionModel = signal({ question: '' });
  protected readonly questionForm = form(this.questionModel, (schema) => {
    required(schema.question, { message: 'Escreva uma pergunta antes de enviar.' });
  });

  ngOnInit(): void {
    void this.refreshBooks();
  }

  protected async refreshBooks(): Promise<void> {
    this.loadingBooks.set(true);
    this.error.set('');
    try {
      const books = await firstValueFrom(this.api.listBooks());
      this.books.set(books);
      this.selectedBookIds.update((ids) => ids.filter((id) => books.some((book) => book.id === id && book.status === 'ready')));
    } catch {
      this.error.set('Não foi possível carregar a biblioteca. Verifique se a API está em execução.');
    } finally {
      this.loadingBooks.set(false);
    }
  }

  protected selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.item(0) ?? undefined);
  }

  protected async upload(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      this.error.set('Escolha um PDF para enviar.');
      return;
    }

    this.uploading.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.api.upload(file));
      this.selectedFile.set(undefined);
      await this.refreshBooks();
    } catch {
      this.error.set('O upload falhou. Confirme que o arquivo é um PDF dentro do limite configurado.');
    } finally {
      this.uploading.set(false);
    }
  }

  protected toggleBook(book: LibraryBook): void {
    if (book.status !== 'ready') {
      return;
    }
    this.selectedBookIds.update((ids) =>
      ids.includes(book.id) ? ids.filter((id) => id !== book.id) : [...ids, book.id],
    );
  }

  protected isSelected(bookId: string): boolean {
    return this.selectedBookIds().includes(bookId);
  }

  protected ask(): void {
    submit(this.questionForm, async () => {
      this.asking.set(true);
      this.error.set('');
      try {
        const result = await firstValueFrom(
          this.api.ask(this.questionModel().question, this.selectedBookIds()),
        );
        this.answer.set(result);
      } catch {
        this.error.set('Não foi possível responder agora. Tente novamente.');
      } finally {
        this.asking.set(false);
      }
    });
  }

  protected pageLabel(book: LibraryBook): string {
    return book.pageCount === null ? 'Páginas em processamento' : `${book.pageCount} páginas`;
  }
}
