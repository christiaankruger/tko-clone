export const sample = <T>(arr: T[]): T => {
  const { floor, random } = Math;
  return arr[floor(random() * arr.length)];
};
