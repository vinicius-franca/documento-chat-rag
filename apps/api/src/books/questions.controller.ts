import { Body, Controller, Post } from '@nestjs/common';
import { QuestionAnswerService, type AskQuestionInput } from './question-answer.service.js';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly answers: QuestionAnswerService) {}

  @Post()
  async ask(@Body() input: AskQuestionInput) {
    return this.answers.answer(input);
  }
}
