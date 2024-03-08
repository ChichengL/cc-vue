import {
  reactive,
  ReactiveFlags,
  reactiveMap,
  readonly,
  readonlyMap,
  shallowReadonlyMap,
} from "./reactive";
import { track, trigger } from "./effect";

import { isObject }from '@mini-vue/shared'

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)
//创建getter函数
function createGetter(isReadonly = false, shallow = false){
    return function get(target,key,receiver){//receiver是 对于操作的目标对象的引用
        //receiver 是否指向与 target 对应的 reactiveMap、readonlyMap 或 shallowReadonlyMap 中的原始对象
        const isExistInReactiveMap = ()=>
            key === ReactiveFlags.RAW && receiver === reactiveMap.get(target)
        const isExistInReadonlyMap = ()=>
            key === ReactiveFlags.RAW && receiver === readonlyMap.get(target)
        const isExistInShallowReadonlyMap = ()=>
            key === ReactiveFlags.RAW && receiver === shallowReadonlyMap.get(target)
        if(key === ReactiveFlags.IS_REACTIVE){
            return !isReadonly
        }else if(key === ReactiveFlags.IS_READONLY){
            return isReadonly
        }else if(
            isExistInReactiveMap() ||
            isExistInReadonlyMap() ||
            isExistInShallowReadonlyMap()
        ){
            return target
        }
        const res = Reflect.get(target ,key, receiver)

        if(!isReadonly){
            track(target,"get",key)//如果不是只读对象，进行依赖收集，并且将属性路径和对应的副作用关联起来
        }
        if(shallow){
            return res //不需要深层次递归响应化
        }
        if(isObject(res)){
            return isReadonly ? readonly(res) : reactive(res)
        }
        return res;
    }
}

function createSetter(){
    return function set(target,key,value,receiver){
        const res = Reflect.set(target,key,value,receiver)

        trigger(target,"set",key)
        return res;
    }
}

export const mutableHandlers = {
    get,set
}
export const readonlyHandlers = {
    get:readonlyGet,
    set(target,key){
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`,
        target
        );
        return true;
    }
}
export const shallowReadonlyHandlers = {
    get:shallowReadonlyGet,
    set(target,key){
        console.warn(
            `Set operation on key "${String(key)}" failed: target is readonly.`,
            target
          );
        return true;
    }
}