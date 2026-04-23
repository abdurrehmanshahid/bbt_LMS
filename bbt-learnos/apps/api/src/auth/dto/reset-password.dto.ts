import { IsString, IsUUID, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsUUID()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/, {
    message: 'Password must contain at least one uppercase letter, one number, and one special character',
  })
  password!: string;
}
