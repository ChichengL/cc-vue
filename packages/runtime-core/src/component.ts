import { initProps } from "./componentProps";
import { initSlots } from "./componentSlots";
import { emit } from "./componentEmits";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { proxyRefs, shallowReadonly } from "@mini-vue/reactivity";

export function createComponentInstance(vnode, parent) {
  const instance = {
    type: vnode.type,
    vnode,
    parent,
    props: {},
    slots: {},
    attrs: {}, //用于存放attrs
    next: null, //需要更新的vnode用于更新component类型的组件
    provides: parent ? parent.provides : {}, //获取parent的provide作为当前组件的provide
    isMounted: false,
    ctx: {}, //用于存放context
    setupState: {}, //用于存放setup返回的状态
    emit: (instance, event, ...args) => {},
  };
  instance.ctx = {
    _: instance,
  };
  instance.emit = emit.bind(null, instance); //绑定emit方法,以便用户使用只需要给event和参数即可
  return instance;
}

export function setupComponent(instance) {
  //setupComponent方法用于初始化组件的props、slots、attrs、setupState、ctx、provides等属性
  const { props, children } = instance.vnode;
  initProps(instance, props);
  initSlots(instance, children); //初始化slots
  //component有两种，一种基于options，一种基于function，这里处理的是options
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance) {
  //代理ctx对象
  //我们再使用的时候需要使用instance.proxy对象
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
  const Component = instance.type; //{setup,render,template}
  //执行setup方法，获取setup返回的状态
  let setup;
  if(Component){
    setup = Component.setup;
  }
  
  if (setup) {
    //设置当前实例对象
    setCurrentInstance(instance);
    const setupContext = createSetupContext(instance);

    const setupResult =
      setup && setup(shallowReadonly(instance.props), setupContext);

    setCurrentInstance(null);
    //处理setupResult
    handleSetupResult(instance, setupResult);
  } else {
    finishComponentSetup(instance);
  }
}
function createSetupContext(instance){
    return {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: instance.emit,
        expose: () => {}//TODO实现expose函数逻辑
    }
}

function handleSetupResult(instance, setupResult) {
  //setup返回值不一样的话，会有不同的处理
  if (typeof setupResult === "function") {
    //返回的函数，会作为render函数
    instance.render = setupResult;
  } else if (typeof setupResult === "object") {
    instance.setupState = proxyRefs(setupResult);
  }
  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  //给instance设置render
  const Component = instance.type;
  if (Component) {
    if (!instance.render) {
        //如果complie有值 并且当前组件没有render，那么需要将template编译为render函数
        if (compile && !Component.render) {
          if (Component.template) {
            const template = Component.template;
            Component.render = compile(template);
          }
        }
        instance.render = Component.render;
      }
  }
}

let currentInstance = {};

export function getCurrentInstance(): any {
  return currentInstance;
}
export function setCurrentInstance(instance) {
  currentInstance = instance;
}

let compile;

export function registerRuntimeCompiler(_complie) {
  compile = _complie;
}
