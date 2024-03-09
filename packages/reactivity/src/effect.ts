import { extend } from "@mini-vue/shared";
import { createDep } from "./dep";
let activeEffect = void 0;
let shouldTrack = false;
const targetMap = new WeakMap();

//用于收集依赖
export class ReactiveEffect {
  active = true;
  deps = []; //存储当前副作用所依赖的所有Dep对象
  public onStop?: () => void;
  constructor(public fn, public scheduler?) {
    console.log("创建ReactiveEffect对象");
  }
  run() {
    //run是可以控制是否执行后面的收集依赖的操作
    //执行fn但是不收集依赖
    if (!this.active) {
      return this.fn();
    }

    //执行fn并收集依赖
    shouldTrack = true;
    activeEffect = this as any;
    const result = this.fn();
    shouldTrack = false;
    activeEffect = undefined;
    return result;
  }
  stop() {
    if (this.active) {
      //第一次执行stop后active变为false
      cleanupEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}

function cleanupEffect(effect) {
  // 找到所有依赖这个 effect 的响应式对象
  // 从这些响应式对象里面把 effect 给删除掉
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
  effect.deps.length = 0;
}

export function effect(fn, options = {}) {
  const _effect = new ReactiveEffect(fn);// 创建ReactiveEffect对象
  //把用户传入的值合并到_effect上
  extend(_effect, options); //这里的options是用户传入的配置项，比如scheduler等
  _effect.run();

  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
  //可以让用户自行选择调用的时机
}

export function stop(runner: any) {
  runner.effect.stop();
}

export function track(target, type, key) {
  if (!isTracking()) {
    return; //如果不处于收集依赖的状态，则直接返回
  }
  console.log(`触发 track -> target: ${target} type:${type} key:${key}`);
  //先基于target 找到对应的dep
  let depsMap = targetMap.get(target);
  //取出key对应的dep，以对应key的依赖（即对key的访问与修改）
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap); //相当于把target和对应的dep建立映射关系
    //一个属性对应一个dep，一个dep对应多个effect
  }
  //先根据对象取出对应的 属性dep，再将属性dep中对应 对象属性的 dep取出进行依赖收集
  let dep = depsMap.get(key);
  if (!dep) {
    dep = createDep();
    depsMap.set(key, dep);
  }
  trackEffects(dep);
}

export function trackEffects(dep) {
  //dep用于放置所有的effect
  //   可以先查看是否存在依赖;
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect); //在取值的时候会有activeEffect
    (activeEffect as any).deps.push(dep); //该函数会找到对应的 Dep 对象并将其添加到当前活跃的 ReactiveEffect 的 deps 数组中。
    /**
     *当响应式对象的属性值发生变化时，会触发 trigger 函数，进而遍历所有依赖于这个变化属性的 Dep 对象，即在track中的dep对象。
     而每个 Dep 中又保存了一系列的 ReactiveEffect，这些 ReactiveEffect 就是从它们各自的 deps 属性中收集过来的。
     因此，当属性值改变时，会依次执行这些 ReactiveEffect 对象的 run 方法，从而更新视图或其他依赖于此数据的副作用函数的结果。
     */
  }
}
//判断是否处于收集依赖的状态
export function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}
export function trigger(target, type, key) {
  let deps: Array<any> = [];
  const depsMap = targetMap.get(target); //取出对象对应的dep
  if (!depsMap) return;

  //实现get
  const dep = depsMap.get(key); //取出该属性对应的dep
  deps.push(dep);
  const effects: Array<any> = [];
  deps.forEach((dep) => {
    effects.push(...dep); // 这里解构 dep 得到的是 dep 内部存储的 effect
  });
  // 这里的目的是只有一个 dep ，这个dep 里面包含所有的 effect
  // 这里的目前应该是为了 triggerEffects 这个函数的复用
  triggerEffects(createDep(effects));
}
export function triggerEffects(deps) {
  //触发所有的依赖
  for (let effect of deps) {
    if (effect.scheduler) {
      //用户传入的schduler，以便用户自行控制触发时机
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}
