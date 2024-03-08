export * from "../src/shapeFlags";
export * from "../src/toDisplayString";

export const isObject = (val: any) => {
  return val !== null && typeof val === "object";
};
export const extend = Object.assign;

export const hasChanged = (value: any, oldValue: any) => {
  return !Object.is(value, oldValue);
};
