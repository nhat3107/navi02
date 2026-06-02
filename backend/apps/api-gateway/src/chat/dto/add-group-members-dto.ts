export class AddGroupMembersDto {
  /** User IDs to add to the group (must not already be members). */
  member_ids: string[];
}
