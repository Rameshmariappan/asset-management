import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';

@ApiTags('assignments')
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  // TODO: Implement controller endpoints
}
