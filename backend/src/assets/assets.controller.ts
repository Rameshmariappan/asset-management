import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  // TODO: Implement controller endpoints
}
