# 手写mini-vue3小记

这里是根据包来进行拆解的

## reactivity包

这是vue3实现响应式的核心部分，其重点有，reactivity，effect（副作用函数），ref，computed



### reactivity

这里只用关注reactive对象是如何创建的

对于reactive对象，有四种类型，普通reactive对象，readonlyreactive对象，shallowreactive对象，shallowReadonly对象

其最终都是调用了`createReactiveObject`方法，只不过通过传入的不同参数来确定创建什么对象。

下面函数的各种map是存储，对象——响应式对象的关系

```js
export function reactive(target) {
  return createReactiveObject(target, reactiveMap, mutableHandlers);
}

export function readonly(target) {
  return createReactiveObject(target, readonlyMap, readonlyHandlers);
}

export function shallowReadonly(target) {
  return createReactiveObject(
    target,
    shallowReadonlyMap,
    shallowReadonlyHandlers
  );
}
```

比如最终都是调用了createReactiveObject方法。

对于createReactiveObject方法，其实现很简单，先查看是否由存在已经代理的，如果没有再创建proxy代理对象

```js
function createReactiveObject(target, proxyMap, baseHandlers) {
  // 核心就是 proxy
  // 目的是可以侦听到用户 get 或者 set 的动作

  // 如果命中的话就直接返回就好了
  // 使用缓存做的优化点
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const proxy = new Proxy(target, baseHandlers);

  // 把创建好的 proxy 给存起来，
  proxyMap.set(target, proxy);
  return proxy;
}
```

当然这个包里面还实现了toRaw（得到原始对象）、isReactive等方法

```ts
export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  RAW = "__v_raw",
}
export function isReactive(value) {
  // 如果 value 是 proxy 的话
  // 会触发 get 操作，而在 createGetter 里面会判断
  // 如果 value 是普通对象的话
  // 那么会返回 undefined ，那么就需要转换成布尔值
  return !!value[ReactiveFlags.IS_REACTIVE];
}
export function toRaw(value) {
  // 如果 value 是 proxy 的话 ,那么直接返回就可以了
  // 因为会触发 createGetter 内的逻辑
  // 如果 value 是普通对象的话，
  // 我们就应该返回普通对象
  // 只要不是 proxy ，只要是得到了 undefined 的话，那么就一定是普通对象
  // TODO 这里和源码里面实现的不一样，不确定后面会不会有问题
  if (!value[ReactiveFlags.RAW]) {
    return value;
  }
```



### baseHandler

对于如何实现其内部的getter和setter可以参考baseHandlers中的

```ts
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    // readonly 的响应式对象不可以修改值
    console.warn(
      `Set operation on key "${String(key)}" failed: target is readonly.`,
      target
    );
    return true;
  },
};

export const mutableHandlers = {
  get,
  set,
};

export const shallowReadonlyHandlers = {
  get: shallowReadonlyGet,
  set(target, key) {
    // readonly 的响应式对象不可以修改值
    console.warn(
      `Set operation on key "${String(key)}" failed: target is readonly.`,
      target
    );
    return true;
  },
};
```

可以见到，其创建getter的核心在于`createGetter`并且有两个参数来控制是否shallow和readonly

创建setter的核心在`createSetter`

对于createGetter，因为我们需要得到的是一个get函数，因此返回的是一个get函数

```ts
//创建getter函数
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    //receiver是 对于操作的目标对象的引用
    //receiver 是否指向与 target 对应的 reactiveMap、readonlyMap 或 shallowReadonlyMap 中的原始对象
    const isExistInReactiveMap = () =>
      key === ReactiveFlags.RAW && receiver === reactiveMap.get(target);
    const isExistInReadonlyMap = () =>
      key === ReactiveFlags.RAW && receiver === readonlyMap.get(target);
    const isExistInShallowReadonlyMap = () =>
      key === ReactiveFlags.RAW && receiver === shallowReadonlyMap.get(target);
    if (key === ReactiveFlags.IS_REACTIVE) {
      //如果取得键名是是否为reactive的标志位，则返回是否可写
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (
      isExistInReactiveMap() ||
      isExistInReadonlyMap() ||
      isExistInShallowReadonlyMap()
    ) {
      //对象存储在reactiveMap、readonlyMap或shallowReadonlyMap中，则返回目标对象
      return target;
    }
    const res = Reflect.get(target, key, receiver);

    if (!isReadonly) {
      track(target, "get", key); //如果不是只读对象，进行依赖收集，并且将属性路径和对应的副作用关联起来
    }
    if (shallow) {
      return res; //不需要深层次递归响应化
    }
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res); //递归代理对象
    }
    return res;
  };
}

function createSetter() {
  return function set(target, key, value, receiver) {
    const res = Reflect.set(target, key, value, receiver);

    trigger(target, "set", key); //触发副作用
    return res;
  };
}
```

这里就是创建getter和setter的过程，是相对简单的过程。



这里最主要的是effect中的track（收集依赖），trigger（触发依赖）



接下来我们就一起走进effect.ts

### effect

这个文件是，进行依赖收集和副作用函数触发的。

在进行依赖收集之前要做一些辅助工作

```ts
let activeEffect = void 0;//当前活跃的ReactiveEffect对象
let shouldTrack = false;//是否应该收集依赖
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
```





核心部分：

```ts
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
```

收集依赖

```ts
track(target, "get", key);
```

这是上面调用track函数

```ts
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
```

这里要理清楚depsMap，dep的作用

depsMap相当于这个对象对应的dep，这个dep上存储着，对象的属性——dep

然后通过key，取出对象属性对应的dep，然后对这个dep进行依赖收集

触发副作用

```ts
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

```

取出对象属性对应的dep，因为dep中对应的是各个ReactiveEffect，然后将其放入到effects中，然后遍历它，取出所有的依赖进行一一触发



### ref

```ts
import { trackEffects, triggerEffects, isTracking, trigger } from "./effect";
import { createDep } from "./dep";
import { isObject, hasChanged } from "@mini-vue/shared";
import { reactive } from "./reactive";

export class RefImpl {//创建一个RefImpl对象
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

```

ref对象实际上是调用了reactive方法的，至于它为什么能实现响应式是因为`trackRefValue`，结合上面可知，收集到ref的依赖，然后更新后，就使用当前ref上的dep进行触发副作用函数



### computed

```ts
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

```

其使用，比如  `const fullName = computed(()=>'哈哈哈哈哈')`就是传入的getter，然后再ReactiveEffect中执行run方法，就执行了这个函数，然后返回这个值