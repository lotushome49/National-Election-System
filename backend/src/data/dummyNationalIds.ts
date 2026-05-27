export const allowedNationalIds = [
  "ETH-100001",
  "ETH-100002",
  "ETH-100003",
  "ETH-100004",
  "ETH-100005",
];

export function isAllowedNationalId(nationalId: string): boolean {
  return allowedNationalIds.includes(nationalId.trim());
}
