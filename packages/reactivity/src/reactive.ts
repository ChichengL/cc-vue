import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers";

export const reactiveMap = new WeakMap();
export const readonlyMap = new WeakMap();
export const shallowReadonlyMap = new WeakMap();

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  RAW = "__v_raw",
}

export function reactive(target) {
  return createReactiveObject(target, reactiveMap, mutableHandlers);
}
export function readonly(target) {
  return createReactiveObject(target, readonlyMap, mutableHandlers);
}

export function shallowReadonly(target) {
  return createReactiveObject(
    target,
    shallowReadonlyMap,
    shallowReadonlyHandlers
  );
}

export function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}

export function isReactive(value) {
    return!!(value && (value as any)[ReactiveFlags.IS_REACTIVE]);
}

export function isReadonly(value){
    return!!(value && (value as any)[ReactiveFlags.IS_READONLY]);
}

export function toRaw(value) {//取出原始值
    if(!value[ReactiveFlags.RAW]){
        return value;
    }
    return value[ReactiveFlags.RAW]
}

function createReactiveObject(target,map,baseHandlers){
    const existInProxy = map.get(target)
    if(existInProxy) return existInProxy;

    const proxy = new Proxy(target, baseHandlers);
    map.set(target, proxy);
    return proxy;
}