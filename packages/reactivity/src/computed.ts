import { createDep } from "./dep";
import { trackRefValue, triggerRefValue } from "./ref";
import { ReactiveEffect } from "./effect";

export class ComputedRefImpl {
  private _value: any;
  private effect: ReactiveEffect;
  public dep: any;
  private _dirty: boolean;
  constructor(getter) {
    //计算属性需要传入一个函数，这个函数的返回值就是计算属性的值
    this.dep = createDep();
    this._dirty = true; //是否过期或未确认
    this.effect = new ReactiveEffect(getter, () => {
      //scheduler，当计算属性的值发生变化时，会调用这个函数
      if (this._dirty) return;
      this._dirty = true;
      triggerRefValue(this); //通知依赖这个计算属性的组件更新
    });
  }
  get value() {
    trackRefValue(this); //依赖收集
    if (this._dirty) {//如果计算属性的值未确认
      this._dirty = false; //表示计算属性的值已确认
      this._value = this.effect.run(); //得到计算属性的值
    }
    return this._value;
  }
}

export function computed(getter) {
    return new ComputedRefImpl(getter);
}
