import { roleRepository } from "./role.repository";

export const roleService = {
  async list() {
    return roleRepository.findAll();
  },
};
