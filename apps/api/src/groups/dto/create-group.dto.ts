import { Type } from 'class-transformer';
import { IsEmail, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  goal?: number;

  @IsOptional()
  @IsEmail()
  partnerEmail?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  initialAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  initialNote?: string;
}
