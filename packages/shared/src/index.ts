export * from "../src/shapeFlags";
export * from "../src/toDisplayString";

export const isObject = (val: any) => {
  return val !== null && typeof val === "object";
};
export const extend = Object.assign;

export const hasChanged = (value: any, oldValue: any) => {
  return !Object.is(value, oldValue);
};
const camelizeRE = /-(\w)/g;

export const camelize = (str: string)=>{
    return str.replace(camelizeRE,(_,c)=>(c?c.toUpperCase():""))
}
// 1. 正则表达式 `/-(\w)/g` 匹配连字符和单词之间的分隔符，并捕获单词的第一个字符
// 2. 调用 `replace` 方法，将匹配到的所有分隔符替换为大写字母
const hyphenateRE = /\B([A-Z])/g;
export const hyphenate = (str: string)=> str.replace(hyphenateRE, '-$1').toLowerCase()
// 1. 正则表达式 `/\B([A-Z])/g` 匹配单词的第一个字母，并捕获单词的第一个字母
// 2. 调用 `replace` 方法，将匹配到的所有单词的第一个字母替换为连字符加小写字母

export const toHandlerKey = (str:string) => str? `on${caplitalize(str)}` : "";
export const caplitalize = (str:string) => str.charAt(0).toUpperCase() + str.slice(1);
// 将第一个字符串大写

export const hasOwn = (val: any, key: string) => Object.prototype.hasOwnProperty.call(val, key);

export const isOn = key => /^on[A-Z]/.test(key)
// 判断是否是以 `on` 开头的驼峰命名的字符串

export const isString = (val: any) => typeof val === "string";