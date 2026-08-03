import { IsEmail, IsString, IsNumber, Min, Max, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 21 })
  @IsNumber()
  @Min(18, { message: 'You must be at least 18 years old to register' })
  @Max(120, { message: 'Please enter a valid age' })
  age: number;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: 'captcha_token_str', required: false })
  @IsOptional()
  @IsString()
  captchaToken?: string;

  @ApiProperty({ example: 'A5K8M', required: false })
  @IsOptional()
  @IsString()
  captchaInput?: string;
}
