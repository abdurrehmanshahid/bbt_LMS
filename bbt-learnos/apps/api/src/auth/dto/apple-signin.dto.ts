import { IsString, IsOptional, MaxLength } from 'class-validator';

export class AppleSignInDto {
  @IsString()
  idToken!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;
}
