// checkUser.ts
import { prisma } from "../configs/database";
async function main() {
  const user = await prisma.user.findFirst({ where: { username: "admin" } });
  console.log("User:", user);
}
main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
