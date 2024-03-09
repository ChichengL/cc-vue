import { trackEffects, triggerEffects, isTracking, trigger } from "./effect";
import { createDep } from "./dep";
import { isObject, hasChanged } from "@mini-vue/shared";
import { reactive } from "./reactive";

export class RefImpl {
  private _rawValue: any;
  private _value: any;
  public dep: any;
  public readonly __v_isRef = true; // 标记为RefImpl类型
  constructor(value) {
    this._rawValue = value;
    this._value = convert(value); // 转换为响应式对象
    this.dep = createDep(); // 创建依赖
  }
  get value() {
    trackRefValue(this); //收集依赖
    return this._value;
  }
  set value(newValue) {
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue;
      this._value = convert(newValue); // 转换为响应式对象
      triggerRefValue(this); //触发依赖，通知视图更新
    }
  }
}
function convert(value) {
  return isObject(value) ? reactive(value) : value; //如果是对象，直接使用reactive包裹
}
export function ref(value) {
  return createRef(value);
}
function createRef(value) {
  const refImpl = new RefImpl(value);
  return refImpl;
}

export function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep); //意味着当前正在执行一个副作用函数，并且需要追踪其依赖。
    //ref 的 trackEffect 在收集依赖的时候建立依赖收集表，是因为 ref 的值变化会影响到依赖它的副作用函数，所以要在访问（收集依赖）时就建立这种关联关系
  }
}
export function triggerRefValue(ref) {
  triggerEffects(ref.dep); //触发依赖，通知视图更新
}

//辅助解构函数，比如在template中使用ref对象，自动结构为value
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, handler);
}

const handler = {
  get(target, key, receiver) {
    //如果是RefImpl类型，则返回value属性否则返回原值
    return unRef(Reflect.get(target, key, receiver));
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    if (isRef(oldValue) && !isRef(value)) {//如果oldValue是RefImpl类型，但是value不是，则将value转换为RefImpl类型
      return target[key].value = value;
    }else{
        return Reflect.set(target, key, value, receiver);
    }
  },
};

export function isRef(value){
    return value?.__v_isRef === true;
}
export function unRef(ref){
    return isRef(ref) ? ref.value : ref;
}
