import { Injectable } from '@nestjs/common';
import BadWords = require('bad-words');

const REPORT_AUTO_HIDE_THRESHOLD = 5;

@Injectable()
export class CommentModerationService {
  private readonly filter = new BadWords();

  containsProfanity(text: string): boolean {
    return this.filter.isProfane(text);
  }

  get reportThreshold(): number {
    return REPORT_AUTO_HIDE_THRESHOLD;
  }
}
