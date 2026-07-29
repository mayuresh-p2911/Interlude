import { IsString, MinLength, MaxLength, IsOptional, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class InviteMembersDto {
  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds: string[];
}

export class AddToQueueDto {
  @IsString()
  movieId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  poster?: string;
}
