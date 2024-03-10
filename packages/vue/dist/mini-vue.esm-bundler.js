var ShapeFlags;
(function (ShapeFlags) {
    ShapeFlags[ShapeFlags["ELEMENT"] = 1] = "ELEMENT";
    ShapeFlags[ShapeFlags["STATEFUL_COMPONENT"] = 4] = "STATEFUL_COMPONENT";
    ShapeFlags[ShapeFlags["TEXT_CHILDREN"] = 8] = "TEXT_CHILDREN";
    ShapeFlags[ShapeFlags["ARRAY_CHILDREN"] = 16] = "ARRAY_CHILDREN";
    ShapeFlags[ShapeFlags["SLOTS_CHILDREN"] = 32] = "SLOTS_CHILDREN";
})(ShapeFlags || (ShapeFlags = {}));

const toDisplayString = (val) => {
    return String(val);
};

const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const extend = Object.assign;
const hasChanged = (value, oldValue) => {
    return !Object.is(value, oldValue);
};
const camelizeRE = /-(\w)/g;
const camelize = (str) => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ""));
};
const hyphenateRE = /\B([A-Z])/g;
const hyphenate = (str) => str.replace(hyphenateRE, '-$1').toLowerCase();
const toHandlerKey = (str) => str ? `on${caplitalize(str)}` : "";
const caplitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
const isOn = key => /^on[A-Z]/.test(key);
const isString = (val) => typeof val === "string";

const Text = Symbol("Text");
const Fragment = Symbol("Fragment");
const createVNode = (type, props, children) => {
    const vnode = {
        type,
        props: props || {},
        children,
        el: null,
        key: props === null || props === void 0 ? void 0 : props.key,
        component: null,
        shapeFlag: getShapeFlag(type),
    };
    if (Array.isArray(children)) {
        vnode.shapeFlag |= 16;
    }
    else if (typeof children === "string") {
        vnode.shapeFlag |= 8;
    }
    normalizeChildren(vnode, children);
    return vnode;
};
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1
        : 4;
}
function normalizeChildren(vnode, children) {
    if (typeof children === "object") {
        if (vnode.shapeFlag & 1) {
            return;
        }
        else {
            vnode.shapeFlag |= 32;
        }
    }
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function normalizeVNode(child) {
    if (typeof child === "string" || typeof child === "number") {
        return createVNode(Text, null, String(child));
    }
    else {
        return child;
    }
}

function h(type, props = null, children = []) {
    return createVNode(type, props, children);
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        const app = {
            _component: rootComponent,
            mount(rootContainer) {
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
        return app;
    };
}

function initProps(instance, props) {
    instance.props = props;
}

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 32) {
        normalizeObjectSlots(children, (instance.slots = {}));
    }
}
const normalizeSlotValue = value => Array.isArray(value) ? value : [value];
const normalizeObjectSlots = (children, slots) => {
    for (const key in children) {
        const value = children[key];
        if (typeof value === 'function') {
            slots[key] = props => normalizeSlotValue(value(props));
        }
    }
};

function emit(instance, event, ...rawArgs) {
    const props = instance.props;
    let handler = props[toHandlerKey(camelize(event))];
    if (!handler) {
        handler = props[toHandlerKey(hyphenate(event))];
    }
    if (handler) {
        handler(...rawArgs);
    }
}

const publicPropertiesMap = {
    $el: i => i.vnode.el,
    $emit: i => i.emit,
    $slots: i => i.slots,
    $props: i => i.props,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (key[0] !== '$') {
            if (hasOwn(setupState, key)) {
                return setupState[key];
            }
            else if (hasOwn(props, key)) {
                return props[key];
            }
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
    set({ _: instance }, key, value) {
        const { setupState } = instance;
        if (hasOwn(setupState, key)) {
            setupState[key] = value;
        }
        return true;
    }
};

function createDep(effects) {
    return new Set(effects);
}

let activeEffect = void 0;
let shouldTrack = false;
const targetMap = new WeakMap();
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.fn = fn;
        this.scheduler = scheduler;
        this.active = true;
        this.deps = [];
        console.log("创建ReactiveEffect对象");
    }
    run() {
        if (!this.active) {
            return this.fn();
        }
        shouldTrack = true;
        activeEffect = this;
        const result = this.fn();
        shouldTrack = false;
        activeEffect = undefined;
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn);
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}
function stop(runner) {
    runner.effect.stop();
}
function track(target, type, key) {
    if (!isTracking()) {
        return;
    }
    console.log(`触发 track -> target: ${target} type:${type} key:${key}`);
    let depsMap = targetMap.get(target);
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
function trackEffects(dep) {
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
        activeEffect.deps.push(dep);
    }
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
function trigger(target, type, key) {
    let deps = [];
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    const dep = depsMap.get(key);
    deps.push(dep);
    const effects = [];
    deps.forEach((dep) => {
        effects.push(...dep);
    });
    triggerEffects(createDep(effects));
}
function triggerEffects(deps) {
    for (let effect of deps) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        const isExistInReactiveMap = () => key === "__v_raw" && receiver === reactiveMap.get(target);
        const isExistInReadonlyMap = () => key === "__v_raw" && receiver === readonlyMap.get(target);
        const isExistInShallowReadonlyMap = () => key === "__v_raw" && receiver === shallowReadonlyMap.get(target);
        if (key === "__v_isReactive") {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly") {
            return isReadonly;
        }
        else if (isExistInReactiveMap() ||
            isExistInReadonlyMap() ||
            isExistInShallowReadonlyMap()) {
            return target;
        }
        const res = Reflect.get(target, key, receiver);
        if (!isReadonly) {
            track(target, "get", key);
        }
        if (shallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value, receiver) {
        const res = Reflect.set(target, key, value, receiver);
        trigger(target, "set", key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
        return true;
    },
};
const shallowReadonlyHandlers = {
    get: shallowReadonlyGet,
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
        return true;
    },
};

const reactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
const shallowReadonlyMap = new WeakMap();
var ReactiveFlags;
(function (ReactiveFlags) {
    ReactiveFlags["IS_REACTIVE"] = "__v_isReactive";
    ReactiveFlags["IS_READONLY"] = "__v_isReadonly";
    ReactiveFlags["RAW"] = "__v_raw";
})(ReactiveFlags || (ReactiveFlags = {}));
function reactive(target) {
    return createReactiveObject(target, reactiveMap, mutableHandlers);
}
function readonly(target) {
    return createReactiveObject(target, readonlyMap, readonlyHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, shallowReadonlyMap, shallowReadonlyHandlers);
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}
function isReactive(value) {
    return !!(value && value["__v_isReactive"]);
}
function isReadonly(value) {
    return !!(value && value["__v_isReadonly"]);
}
function createReactiveObject(target, map, baseHandlers) {
    const existInProxy = map.get(target);
    if (existInProxy)
        return existInProxy;
    const proxy = new Proxy(target, baseHandlers);
    map.set(target, proxy);
    return proxy;
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = value;
        this._value = convert(value);
        this.dep = createDep();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerRefValue(this);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function ref(value) {
    return createRef(value);
}
function createRef(value) {
    const refImpl = new RefImpl(value);
    return refImpl;
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function triggerRefValue(ref) {
    triggerEffects(ref.dep);
}
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, handler);
}
const handler = {
    get(target, key, receiver) {
        return unRef(Reflect.get(target, key, receiver));
    },
    set(target, key, value, receiver) {
        const oldValue = target[key];
        if (isRef(oldValue) && !isRef(value)) {
            return target[key].value = value;
        }
        else {
            return Reflect.set(target, key, value, receiver);
        }
    },
};
function isRef(value) {
    return (value === null || value === void 0 ? void 0 : value.__v_isRef) === true;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}

class ComputedRefImpl {
    constructor(getter) {
        this.dep = createDep();
        this._dirty = true;
        this.effect = new ReactiveEffect(getter, () => {
            if (this._dirty)
                return;
            this._dirty = true;
            triggerRefValue(this);
        });
    }
    get value() {
        trackRefValue(this);
        if (this._dirty) {
            this._dirty = false;
            this._value = this.effect.run();
        }
        return this._value;
    }
}
function computed(getter) {
    return new ComputedRefImpl(getter);
}

function createComponentInstance(vnode, parent) {
    const instance = {
        type: vnode.type,
        vnode,
        parent,
        props: {},
        slots: {},
        attrs: {},
        next: null,
        provides: parent ? parent.provides : {},
        isMounted: false,
        ctx: {},
        setupState: {},
        emit: (instance, event, ...args) => { },
    };
    instance.ctx = {
        _: instance,
    };
    instance.emit = emit.bind(null, instance);
    return instance;
}
function setupComponent(instance) {
    const { props, children } = instance.vnode;
    initProps(instance, props);
    initSlots(instance, children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
    const Component = instance.type;
    let setup;
    if (Component) {
        setup = Component.setup;
    }
    if (setup) {
        setCurrentInstance(instance);
        const setupContext = createSetupContext(instance);
        const setupResult = setup && setup(shallowReadonly(instance.props), setupContext);
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
    else {
        finishComponentSetup(instance);
    }
}
function createSetupContext(instance) {
    return {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: instance.emit,
        expose: () => { }
    };
}
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === "function") {
        instance.render = setupResult;
    }
    else if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (Component) {
        if (!instance.render) {
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
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compile;
function registerRuntimeCompiler(_complie) {
    compile = _complie;
}

function inject(key, defaultValue) {
    var _a;
    const cur = getCurrentInstance();
    if (cur) {
        const provides = (_a = cur.parent) === null || _a === void 0 ? void 0 : _a.provides;
        if (key in provides) {
            return provides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
        }
        return defaultValue;
    }
}
function provide(key, value) {
    var _a;
    const cur = getCurrentInstance();
    if (cur) {
        let { provides } = cur;
        const parentProvides = (_a = cur.parent) === null || _a === void 0 ? void 0 : _a.provides;
        if (parentProvides === provides) {
            provides = cur.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}

function renderSlot(slots, name, props = {}) {
    const slot = slots[name];
    if (slot) {
        const slotContent = slot(props);
        return createVNode(Fragment, {}, slotContent);
    }
}

const queue = [];
const activePreFlushCbs = [];
const p = Promise.resolve();
let isFlushing = false;
function nextTick(cb) {
    return cb ? p.then(cb) : p;
}
function queueJob(job) {
    if (!queue.includes(job)) {
        queue.push(job);
        queueFlush();
    }
}
function queueFlush() {
    if (isFlushing)
        return;
    isFlushing = true;
    nextTick(flushJobs);
}
function queuePreFlushCb(cb) {
    queueCb(cb, activePreFlushCbs);
}
function queueCb(cb, activeQueue) {
    activeQueue.push(cb);
    queueFlush();
}
function flushJobs() {
    isFlushing = false;
    flushPreFlushCbs();
    let job;
    while ((job = queue.shift())) {
        if (job) {
            job();
        }
    }
}
function flushPreFlushCbs() {
    for (let i = 0; i < activePreFlushCbs.length; i++) {
        activePreFlushCbs[i]();
    }
}

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    if (prevProps === nextProps) {
        return false;
    }
    if (!prevProps) {
        return !!nextProps;
    }
    if (!nextProps) {
        return true;
    }
    return hasPropsChanged(prevProps, nextProps);
}
function hasPropsChanged(prevProps, nextProps) {
    const nextKeys = Object.keys(nextProps);
    for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i];
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

function createRenderer(options) {
    const { createElement: hostCreateElement, setElementText: hostSetElementText, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setText: hostSetText, createText: hostCreateText, } = options;
    const render = (vnode, container) => {
        console.log("调用 patch");
        patch(null, vnode, container);
    };
    function patch(n1, n2, container = null, anchor = null, parentComponent = null) {
        const { type, shapeFlag } = n2;
        switch (type) {
            case Text:
                processText(n1, n2, container);
                break;
            case Fragment:
                processFragment(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1) {
                    console.log("处理 element");
                    processElement(n1, n2, container, anchor, parentComponent);
                }
                else if (shapeFlag & 4) {
                    console.log("处理 component");
                    processComponent(n1, n2, container, parentComponent);
                }
        }
    }
    function processFragment(n1, n2, container) {
        if (!n1) {
            console.log("初始化 Fragment 类型的节点");
            mountChildren(n2.children, container);
        }
    }
    function processText(n1, n2, container) {
        console.log("处理 Text 节点");
        if (n1 === null) {
            console.log("初始化 Text 类型的节点");
            hostInsert((n2.el = hostCreateText(n2.children)), container);
        }
        else {
            const el = (n2.el = n1.el);
            if (n2.children !== n1.children) {
                console.log("更新 Text 类型的节点");
                hostSetText(el, n2.children);
            }
        }
    }
    function processElement(n1, n2, container, anchor, parentComponent) {
        if (!n1) {
            mountElement(n2, container, anchor);
        }
        else {
            updateElement(n1, n2, container, anchor, parentComponent);
        }
    }
    function updateElement(n1, n2, container, anchor, parentComponent) {
        const oldProps = (n1 && n1.props) || {};
        const newProps = n2.props || {};
        const el = (n2.el = n1.el);
        patchProps(el, oldProps, newProps);
        patchChildren(n1, n2, el, anchor, parentComponent);
    }
    function patchProps(el, oldProps, newProps) {
        for (const key in newProps) {
            const prevProp = oldProps[key];
            const nextProp = newProps[key];
            if (prevProp !== nextProp) {
                hostPatchProp(el, key, prevProp, nextProp);
            }
        }
        for (const key in oldProps) {
            const prevProp = oldProps[key];
            const nextProp = null;
            if (!(key in newProps)) {
                hostPatchProp(el, key, prevProp, nextProp);
            }
        }
    }
    function patchChildren(n1, n2, container, anchor, parentComponent) {
        const { shapeFlag: prevShapeFlag, children: c1 } = n1;
        const { shapeFlag, children: c2 } = n2;
        if (shapeFlag & 8) {
            if (c2 !== c1) {
                hostSetElementText(container, c2);
            }
        }
        else {
            if (prevShapeFlag & 8) {
                hostSetElementText(container, "");
                mountChildren(c2, container);
            }
            else {
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
        let i = 0;
        const l2 = c2.length;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        const isSameVNodeType = (n1, n2) => {
            return n1.type === n2.type && n1.key === n2.key;
        };
        while (i <= e1 && i <= e2) {
            const prevChild = c1[i];
            const nextChild = c2[i];
            if (!isSameVNodeType(prevChild, nextChild)) {
                break;
            }
            console.log("两个 child 相等，接下来对比这两个 child 节点(从左往右比对)");
            patch(prevChild, nextChild, container, parentAnchor, parentComponent);
            i++;
        }
        while (i <= e1 && i <= e2) {
            const prevChild = c1[e1];
            const nextChild = c2[e2];
            if (!isSameVNodeType(prevChild, nextChild)) {
                break;
            }
            patch(prevChild, nextChild, container, parentAnchor, parentComponent);
            e1--;
            e2--;
        }
        if (i > e1 && i <= e2) {
            const nextPos = e2 + 1;
            const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
            while (i <= e2) {
                patch(null, c2[i], container, anchor, parentComponent);
                i++;
            }
        }
        else if (i > e2 && i <= e1) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            let s1 = i;
            let s2 = i;
            const keyToNewIndexMap = new Map();
            let moved = false;
            let maxNewIndexSoFar = 0;
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            const toBePatched = e2 - s2 + 1;
            let patched = 0;
            const newIndexToOldIndexMap = new Array(toBePatched);
            for (let i = 0; i < toBePatched; i++)
                newIndexToOldIndexMap[i] = 0;
            for (i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                let newIndex;
                if (prevChild.key != null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (newIndex === undefined) {
                    hostRemove(prevChild.el);
                }
                else {
                    console.log("新老节点都存在");
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    patch(prevChild, c2[newIndex], container, null, parentComponent);
                    patched++;
                }
            }
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            let j = increasingNewIndexSequence.length - 1;
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = s2 + i;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, anchor, parentComponent);
                }
                else if (moved) {
                    if (j < 0 || increasingNewIndexSequence[j] !== i) {
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function mountElement(vnode, container, anchor) {
        const { shapeFlag, props } = vnode;
        const el = (vnode.el = hostCreateElement(vnode.type));
        if (shapeFlag & 8) {
            hostSetElementText(el, vnode.children);
        }
        else if (shapeFlag & 16) {
            mountChildren(vnode.children, el);
        }
        if (props) {
            for (const key in props) {
                const nextVal = props[key];
                hostPatchProp(el, key, null, nextVal);
            }
        }
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container) {
        children.forEach((VNodeChild) => {
            patch(null, VNodeChild, container);
        });
    }
    function processComponent(n1, n2, container, parentComponent) {
        if (!n1) {
            mountComponent(n2, container, parentComponent);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2, container) {
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            n2.component = n1.component;
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function mountComponent(initialVNode, container, parentComponent) {
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        function componentUpdateFn() {
            if (!instance.isMounted) {
                const proxyToUse = instance.proxy;
                const subTree = (instance.subTree = normalizeVNode(instance.render.call(proxyToUse, proxyToUse)));
                patch(null, subTree, container, null, instance);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const proxyToUse = instance.proxy;
                const nextTree = normalizeVNode(instance.render.call(proxyToUse, proxyToUse));
                const prevTree = instance.subTree;
                instance.subTree = nextTree;
                patch(prevTree, nextTree, prevTree.el, null, instance);
            }
        }
        instance.update = effect(componentUpdateFn, {
            scheduler: () => {
                queueJob(instance.update);
            },
        });
    }
    function updateComponentPreRender(instance, nextVNode) {
        nextVNode.component = instance;
        instance.vnode = nextVNode;
        instance.next = null;
        const { props } = nextVNode;
        console.log("更新组件的 props", props);
        instance.props = props;
        console.log("更新组件的 slots");
    }
    return {
        render,
        createApp: createAppAPI(render),
    };
}
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function watchEffect(effect) {
    return doWatch(effect);
}
function doWatch(source) {
    const job = () => {
        effect.run();
    };
    const scheduler = () => queuePreFlushCb(job);
    let cleanup;
    const onCleanup = (fn) => {
        cleanup = effect.onStop = () => {
            fn();
        };
    };
    const getter = () => {
        if (cleanup) {
            cleanup();
        }
        source(onCleanup);
    };
    const effect = new ReactiveEffect(getter, scheduler);
    effect.run();
    return () => {
        effect.stop();
    };
}

function createElement(type) {
    const el = document.createElement(type);
    return el;
}
function createText(text) {
    return document.createTextNode(text);
}
function setText(node, text) {
    node.nodeValue = text;
}
function setElementText(el, text) {
    el.textContent = text;
}
function patchProp(el, key, preValue, nextValue) {
    if (isOn(key)) {
        const invoKers = el._vei || (el._vei = {});
        const existingInvoker = invoKers[key];
        if (nextValue && existingInvoker) {
            existingInvoker.value = nextValue;
        }
        else {
            const eventName = key.slice(2).toLowerCase();
            if (nextValue) {
                const invoker = (invoKers[key] = nextValue);
                el.addEventListener(eventName, invoker);
            }
            else {
                el.removeEventListener(eventName, existingInvoker);
                invoKers[key] = undefined;
            }
        }
    }
    else {
        if (nextValue === null || nextValue === "") {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextValue);
        }
    }
}
function insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
let renderer;
function ensureRenderer() {
    return (renderer ||
        (renderer = createRenderer({
            createElement,
            createText,
            setText,
            setElementText,
            patchProp,
            insert,
            remove,
        })));
}
const createApp = (...args) => {
    return ensureRenderer().createApp(...args);
};

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    inject: inject,
    provide: provide,
    renderSlot: renderSlot,
    createTextVNode: createTextVNode,
    createElementVNode: createVNode,
    createRenderer: createRenderer,
    toDisplayString: toDisplayString,
    watchEffect: watchEffect,
    reactive: reactive,
    ref: ref,
    readonly: readonly,
    unRef: unRef,
    proxyRefs: proxyRefs,
    isReadonly: isReadonly,
    isReactive: isReactive,
    isProxy: isProxy,
    isRef: isRef,
    shallowReadonly: shallowReadonly,
    effect: effect,
    stop: stop,
    computed: computed,
    h: h,
    createAppAPI: createAppAPI
});

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
const helperNameMap = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_VNODE]: 'createElementVNode'
};

function generate(ast, options = {}) {
    const context = createCodeGenContext(ast, options);
    const { push, mode } = context;
    if (mode === 'module') {
        genModulePreamble(ast, context);
    }
    else {
        genFunctionPreamble(ast, context);
    }
    const functionName = "render";
    push(`function ${functionName}($signature) {`);
    push('return');
    genNode(ast.codegenNode, context);
    push('}');
    return {
        code: context.code
    };
}
function genModulePreamble(ast, context) {
    const { push, newline, runtimeModuleName } = context;
    if (ast.helpers.length) {
        const code = `import {${ast.helpers.map((s) => `${helperNameMap[s]} as _${helperNameMap[s]}`)
            .join(', ')}} from ${JSON.stringify(runtimeModuleName)}`;
        push(code);
    }
    newline();
    push('export');
}
function genFunctionPreamble(ast, context) {
    const { runtimeGlobalName, push, newline } = context;
    const VueBinging = runtimeGlobalName;
    const aliasHelper = s => `${helperNameMap[s]} : _${helperNameMap[s]}`;
    if (ast.helpers.length) {
        push(`
            const { ${ast.helpers.map(aliasHelper).join(', ')}} = ${VueBinging}
            `);
    }
    newline();
    push('return');
}
function genNode(node, context) {
    switch (node.type) {
        case 2:
            genInterpolation(node, context);
            break;
        case 3:
            genExpression(node, context);
            break;
        case 4:
            genElement(node, context);
            break;
        case 0:
            genText(node, context);
            break;
        case 5:
            genCompoundExpression(node, context);
            break;
    }
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(')');
}
function genExpression(node, context) {
    context.push(node.content);
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, props, children } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}`);
    genNodeList(genNullableArgs([tag, props, children]), context);
    push(')');
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(`${node}`);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(',');
        }
    }
}
function genNullableArgs(args) {
    let i = args.length;
    while (i--) {
        if (args[i] == null)
            break;
    }
    return args.slice(0, i + 1).map(arg => arg || "null");
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
function genCompoundExpression(node, context) {
    const { push } = context;
    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function createCodeGenContext(ast, { runtimeModuleName = 'vue', runtimeGlobalName = 'vue', mode = 'function' }) {
    const context = {
        code: '',
        mode,
        runtimeModuleName,
        runtimeGlobalName,
        helper(key) {
            return `${helperNameMap[key]}`;
        },
        push(code) {
            context.code += code;
        },
        newline() {
            context.code += '\n';
        }
    };
    return context;
}

var TagType;
(function (TagType) {
    TagType[TagType["Start"] = 0] = "Start";
    TagType[TagType["End"] = 1] = "End";
})(TagType || (TagType = {}));
function baseParse(content) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
function createParserContext(content) {
    return {
        source: content,
    };
}
function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (startsWith(s, "{{")) {
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            if (s[1] === "/") {
                if (/[a-z]/i.test(s[1])) {
                    parseTag(context, 1);
                    continue;
                }
            }
            else if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    const s = context.source;
    if (context.source.startsWith("<")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            if (startsWithEndTagOpen(s, ancestors[i].tag)) {
                return true;
            }
        }
    }
    return !context.source;
}
function parseElement(context, ancestors) {
    const element = parseTag(context, 0);
    ancestors.push(element);
    const children = parseChildren(context, ancestors);
    ancestors.pop();
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1);
    }
    else {
        throw new Error(`missing end tag for element <${element.tag}>`);
    }
    element.children = children;
    return element;
}
function startsWithEndTagOpen(source, tag) {
    return (startsWith(source, "</") &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase());
}
function parseTag(context, type) {
    const match = /^<\/?([a-z][^\r\n\t\f />]*)/i.exec(context.source);
    const tag = match[1];
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    if (type === 1)
        return;
    let tagType = 0;
    return {
        type: 4,
        tag,
        tagType,
    };
}
function parseInterpolation(context) {
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    advanceBy(context, 2);
    const rawContentLength = closeIndex - openDelimiter.length;
    const rawContent = context.source.slice(0, rawContentLength);
    const preTrimContent = parseTextData(context, rawContent.length);
    const content = preTrimContent.trim();
    advanceBy(context, closeDelimiter.length);
    return {
        type: 2,
        content: {
            type: 3,
            content,
        },
    };
}
function parseText(context) {
    const endTokens = ["<", "{{"];
    let endInex = context.source.length;
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endInex > index) {
            endInex = index;
        }
    }
    const content = parseTextData(context, endInex);
    return {
        type: 0,
        content,
    };
}
function parseTextData(context, length) {
    const rawText = context.source.slice(0, length);
    advanceBy(context, length);
    return rawText;
}
function advanceBy(context, numberOfCharacters) {
    context.source = context.source.slice(numberOfCharacters);
}
function startsWith(source, str) {
    return source.startsWith(str);
}
function createRoot(children) {
    return {
        type: 1,
        children,
        helpers: {}
    };
}

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers.push(...context.helpers.keys());
}
function traverseNode(node, context) {
    const type = node.type;
    const nodeTransforms = context.nodeTransforms;
    const exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit) {
            exitFns.push(onExit);
        }
    }
    switch (type) {
        case 2:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 1:
        case 4:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(parent, context) {
    parent.children.forEach((child) => {
        traverseNode(child, context);
    });
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(name) {
            const count = context.helpers.get(name) || 0;
            context.helpers.set(name, count + 1);
        },
    };
    return context;
}
function createRootCodegen(root, context) {
    const { children } = root;
    const child = children[0];
    if (child.type === 4 && child.codegenNode) {
        const codegenNode = child.codegenNode;
        root.codegenNode = codegenNode;
    }
    else {
        root.codegenNode = child;
    }
}

function transformExpression(node) {
    if (node.type === 2) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

var NodeTypes;
(function (NodeTypes) {
    NodeTypes[NodeTypes["TEXT"] = 0] = "TEXT";
    NodeTypes[NodeTypes["ROOT"] = 1] = "ROOT";
    NodeTypes[NodeTypes["INTERPOLATION"] = 2] = "INTERPOLATION";
    NodeTypes[NodeTypes["SIMPLE_EXPRESSION"] = 3] = "SIMPLE_EXPRESSION";
    NodeTypes[NodeTypes["ELEMENT"] = 4] = "ELEMENT";
    NodeTypes[NodeTypes["COMPOUND_EXPRESSION"] = 5] = "COMPOUND_EXPRESSION";
})(NodeTypes || (NodeTypes = {}));
var ElementTypes;
(function (ElementTypes) {
    ElementTypes[ElementTypes["ELEMENT"] = 0] = "ELEMENT";
})(ElementTypes || (ElementTypes = {}));
function createVNodeCall(context, tag, props, children) {
    if (context) {
        context.helper(CREATE_ELEMENT_VNODE);
    }
    return {
        type: 4,
        tag,
        props,
        children,
    };
}

function transformElement(node, context) {
    return () => {
        const vnodeTag = `${node.tag}`;
        const vnodeProps = null;
        let vnodeChildren = null;
        if (node.children.length > 0) {
            if (node.children.length === 1) {
                vnodeChildren = node.children[0];
            }
        }
        node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
    };
}

function isText(node) {
    return node.type === 0 || node.type === 2;
}

function transformText(node, context) {
    if (node.type === 4) {
        return () => {
            const children = node.children;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5,
                                    loc: child.loc,
                                    children: [child]
                                };
                            }
                            currentContainer.children.push(` + `, next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template, options) {
    const ast = baseParse(template);
    transform(ast, Object.assign(options, {
        nodeTransforms: [transformExpression, transformElement, transformText]
    }));
    return generate(ast);
}

function compileToFunction(template, options = {}) {
    const { code } = baseCompile(template, options);
    const render = new Function("Vue", code)(runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

export { computed, createApp, createAppAPI, createVNode as createElementVNode, createRenderer, createTextVNode, effect, getCurrentInstance, h, inject, isProxy, isReactive, isReadonly, isRef, provide, proxyRefs, reactive, readonly, ref, registerRuntimeCompiler, renderSlot, shallowReadonly, stop, toDisplayString, unRef, watchEffect };
//# sourceMappingURL=mini-vue.esm-bundler.js.map
