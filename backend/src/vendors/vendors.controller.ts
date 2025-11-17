import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';

@ApiTags('vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  // TODO: Implement controller endpoints
}
