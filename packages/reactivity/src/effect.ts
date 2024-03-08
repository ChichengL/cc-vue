import { extend } from "@mini-vue/shared";
import { createDep } from "./dep";
import { e } from "vitest/dist/index-ea17aa0c";
let activeEffect = void 0;
let shouldTrack = false;
const targetMap = new WeakMap();

//用于收集依赖
export class ReactiveEffect {
  active = true;
  deps = [];
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
  const _effect = new ReactiveEffect(fn);
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
    return;
  }
  console.log(`触发 track -> target: ${target} type:${type} key:${key}`);
  //先基于target 找到对应的dep
  let depsMap = targetMap.get(target);
  //取出key对应的dep，以对应key的依赖（即对key的访问与修改）
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
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
    dep.add(activeEffect);
    (activeEffect as any).deps.push(dep);
  }
}
//判断是否处于收集依赖的状态
export function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}
export function trigger(target, type, key) {
  let deps: Array<any> = [];
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  //实现get
  const dep = depsMap.get(key);
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
