export class CreateGroupDto {
  group_name: string;
  /** User IDs of other members (creator is taken from JWT; need at least two). */
  member_ids: string[];
}
