import { ShapeFlags } from "@mini-vue/shared";
import { createComponentInstance } from "./component";
import { queueJob } from "./scheduler";
import { effect } from "@mini-vue/reactivity";
import { setupComponent } from "./component";
import { Fragment, normalizeVNode, Text } from "./vnode";
import { shouldUpdateComponent } from "./componentRenderUtils";
import { createAppAPI } from "./createApp";

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setText: hostSetText,
    createText: hostCreateText,
  } = options;
  const render = (vnode, container) => {
    patch(null, vnode, container); // 初始渲染
  };
  function patch(
    n1,
    n2,
    container = null,
    anchor = null,
    parentComponent = null
  ) {
    //n1:旧vnode,n2:新vnode,container:渲染的容器,anchor:锚点,parentComponent:父组件实例
    //是根据新节点来进行判断
    const { type, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container);
        //还有comment，static(注释，静态节点为了优化性能)
        break;
      default:
        //都不是的情况基于ShapeFlags来判断
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent);
        }
    }
  }
  function processText(n1, n2, container) {
    //处理文本节点
    if (n1 == null) {
      // n1为空，说明是新增的节点
      hostInsert((n2.el = hostCreateText(n2.children as string)), container);
    } else {
      // 更新节点
      const el = (n2.el = n1.el); // 获取旧节点的el
      if (n2.children !== n1.children) {
        // 新旧节点的文本内容不同，更新el的文本内容
        hostSetText(el, n2.children as string);
      }
    }
  }
  function processFragment(n1: any, n2: any, container: any) {
    //处理Fragement节点，只需要处理children
    if (!n1) {
      // n1为空，初始化
      mountChildren(n2.children, container);
    }
  }
  function processElement(n1, n2, container, anchor, parentComponent) {
    if (!n1) {
      mountElement(n2, container, anchor);
    } else {
      updateElement(n1, n2, container, anchor, parentComponent);
    }
  }
  function processComponent(n1, n2, container, parentComponent) {
    if (!n1) {
      //初始化
      mountComponent(n2, container, parentComponent);
    } else {
      updateComponent(n1, n2, container);
    }
  }
  //处理Fragement节点的children
  function mountChildren(children, container) {
    children.forEach((child: any) => {
      patch(null, child, container); //递归处理子节点
    });
  }
  //挂载元素节点
  function mountElement(vnode, container, anchor) {
    const { shapeFlags, props } = vnode;

    //基于可拓展的渲染api
    const el = (vnode.el = hostCreateElement(vnode.type)); // 创建元素节点
    //支持单子组件和多子组件
    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      // 只有文本子节点
      /**
       * 类似于
       * render(){
       *          return h('div',{},'hello world')
       * }
       */
      hostSetElementText(el, vnode.children as string);
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
      /**
       * render(){
       *        return h('div',{},[h('h1',{},'title'),h('p',{},'content')])
       * }
       */
      mountChildren(vnode.children, el);
    }
  }
  //更新元素节点
  function updateElement(n1, n2, container, anchor, parentComponent) {
    const oldProps = (n1 && n1.props) || {};
    const newProps = n2.props || {};
    const el = (n2.el = n1.el); // 获取旧节点的el

    // 对比props
    patchProps(el, oldProps, newProps);
    // 对比children
    patchChildren(n1, n2, el, anchor, parentComponent);
  }
  function patchProps(el, oldProps, newProps) {
    // 对比props
    //1.新的有，旧的也有但是值不同，以newProps为准
    for (const key in newProps) {
      const pre = oldProps[key];
      const next = newProps[key];
      if (pre !== next) {
        hostPatchProp(el, key, pre, next);
      }
    }
    //2.新的没有有，旧的有
    for (const key in oldProps) {
      const pre = oldProps[key];
      if (!(key in newProps)) {
        hostPatchProp(el, key, pre, null);
      }
    }
  }
  function patchChildren(n1, n2, container, anchor, parentComponent) {
    const { shapeFlag: prevShapeFlag, children: c1 } = n1;
    const { shapeFlag, children: c2 } = n2;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (c2 !== c1) {
        hostSetElementText(container, c2 as string); //更新文本节点
      }
    } else {
      //如果之前是文本节点
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 之前是文本节点，现在不是，清空容器
        hostSetElementText(container, "");
        mountChildren(c2, container); //再把新的c2给mount生成element
      } else {
        //array diff array
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
        //特别针对有key属性的子节点集合，确保具有相同key值的节点保持一致的位置，同时处理新增、删除和顺序变化等情况。
      }
    }
  }
  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentAnchor,
    parentComponent
  ) {
    let i = 0;
    const l2 = c2.length;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;

    const isSameVnode = (n1, n2) => {
      return n1.type === n2.type && n1.key === n2.key;
    };
    while (i <= e1 && i <= e2) {
      //前前
      const prevChild = c1[i];
      const nextChild = c2[i];
      if (!isSameVnode(prevChild, nextChild)) {
        break;
        // 不同类型，直接break
      }
      patch(prevChild, nextChild, container, parentAnchor, parentComponent);
    }
    while (i <= e1 && i <= e2) {
      //后后
      const prevChild = c1[e1];
      const nextChild = c2[e2];
      if (!isSameVnode(prevChild, nextChild)) {
        break;
      }
      patch(prevChild, nextChild, container, parentAnchor, parentComponent);
      e1--;
      e2--;
    }
    if (i > e1 && i <= e2) {
      //新增
      const nextPos = e2 + 1; //因为要添加的位置是当前位置+1，也就是e2+1
      const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
      while (i <= e2) {
        patch(null, c2[i], container, anchor, parentComponent);
        i++;
      }
    } else if (i > e2 && i <= e1) {
      //删除
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      //中间部位顺序变动
      /**比如
       * a,b,[c,d,e],f,g
       * a,b,[d,e,c],f,g
       * 1. 找到相同的vnode，进行patch
       * 2. 找到不同的vnode，删除旧的，插入新的
       * 3. 找到旧的vnode，没有对应的vnode，删除
       * 4. 找到新的vnode，没有对应的vnode，插入
       */
      let s1 = i;
      let s2 = i;
      const keyToNewIndexMap = new Map();
      let moved = false;
      let maxNewIndexSoFar = 0;
      // 先把 key 和 newIndex 绑定好，方便后续基于 key 找到 newIndex
      // 时间复杂度是 O(1)
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }
      //需要处理的新节点数量
      const toBePatched = e2 - s2 + 1;
      let patched = 0;
      //初始化从新的index到旧的index的映射
      const newIndexToOldIndexMap = new Array(toBePatched);
      for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0; //初始化为0，后面处理时，如果发现是0，那么就说明新值在老的里面不存在

      // 遍历旧的vnode，找到对应的vnode，进行patch
      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        //如果老节点的数量大于新节点的数量，处理老节点直接删除
        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          continue;
        }
        let newIndex;
        if (prevChild.key !== null) {
          //通过key快速查找
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          //只能遍历来查找
          for (let j = s2; j <= e2; j++) {
            if (isSameVnode(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }

        //因为nextInex的值为0,（0也是 index），所以需要判断）
        if (newIndex === undefined) {
          hostRemove(prevChild.el); //当前节点在新节点中不存在，直接删除
        } else {
          //新老节点都存在

          newIndexToOldIndexMap[newIndex - s2] = i + 1; //i+1是因为i可能为0
          //新的 newIndex 如果一直是升序的话，那么就说明没有移动
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          patch(prevChild, c2[newIndex], container, null, parentComponent);
          patched++;
        }
      }
      //利用最长上升子序列来优化移动逻辑，因为元素是升序的，那么这些元素是不需要移动的，可以通过最长上升子序列获取到升序的列表
      //通过moved来进行优化，如果没有移动过的话，那么就不需要执行算法
      //getSequence返回的是newIndexToOldIndexMap的索引值
      //后面可以通过索引值来处理
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : [];
      let j = increasingNewIndexSequence.length - 1;
      //遍历新节点
      //需要找到老节点没有，而新节点有的=》创建节点
      //最后需要移动一下位置的,[c,d,e] ->[e,c,d]
      //这里循环是因为在insert的时候需要保证锚点是处理完的节点
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + i;
        const nextChild = c2[nextIndex];
        //锚点也就是当前节点索引+1
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;
        if (newIndexToOldIndexMap[i] === 0) {
          //新节点在老节点中不存在，创建节点
          patch(null, nextChild, container, anchor, parentComponent);
        } else if (moved) {
          //需要移动
          //1.j已经没有了，剩下的都需要移动
          //2.最长子序列里面的值和当前的值匹配不上，说明当前元素需要移动
          if (j < 0 || increasingNewIndexSequence[j] !== i) {
            //移动的话使用insert
            hostInsert(nextChild.el, container, anchor);
          } else {
            // 这里就是命中了最长子序列，不需要移动，但是需要更新j
            j--;
          }
        }
      }
    }
  }
  function updateComponent(n1, n2, container) {
    const instance = (n2.component = n1.component);
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2;
      instance.update(); //调用 update 再次更新调用 patch 逻辑
      //在update中调用的next变为了n2
    } else {
      n2.component = n1.component;
      n2.el = n1.el;
      instance.vnode = n2;
    }
  }
  function mountComponent(initialVNode, container, parentComponent) {
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent
    ));
    //调用 setupComponent 进行组件的初始化
    setupComponent(instance);
    //调用 mount 挂载组件
    setupRenderEffect(instance, initialVNode, container);
  }
  function setupRenderEffect(instance, initialVNode, container) {
    //应该传入ctx，也就是proxy，ctx可以选择暴露给用户的api
    // 源代码里面是调用的renderComponentRoot函数，这里直接调用render
    function componentUpdateFn() {
      if (!instance.isMounted) {
        //组件初始化会执行这里，这里进行调用render函数是为了在effect内调用render才能触发依赖收集
        //等到后面响应式的值变更后，会再次触发这个函数
        const proxyToUse = instance.proxy;
        const subTree = (instance.subTree = normalizeVNode(
          instance.render.call(proxyToUse, proxyToUse)
        ));
        //TODO:触发beforeMountHook
        //这里基于subTree再次调用patch
        // 基于render返回的vnode，再次渲染
        patch(null, subTree, container, null, instance);
        initialVNode.el = subTree.el; //把root elment复制给组件的vnode.el为后续调用$el时做准备
        instance.isMounted = true;
        //TODO:触发mountedHook
      } else {
        //组件更新会执行这里，这里进行调用render函数是为了在effect内调用render才能触发依赖收集
        const { next, vnode } = instance;
        //如果有next，则说明需要更新组件的数据
        //先更新组件的数据然后更新完成后在继续对比当前组件的子元素
        if (next) {
          next.el = vnode.el;
          updateComponentPreRender(instance, next);
        }
        const proxyToUse = instance.proxy;
        const nextTree = normalizeVNode(
          instance.render.call(proxyToUse, proxyToUse)
        );
        const prevTree = instance.subTree;
        //TODO:触发beforeUpdateHook
        //这里基于nextTree和prevTree再次调用patch
        // 基于render返回的vnode，再次渲染
        patch(prevTree, nextTree, container, null, instance);
        instance.subTree = nextTree;
        //TODO:触发updatedHook
      }
    }
    //在 vue3.2 版本里面是使用的 new ReactiveEffect
    // 至于为什么不直接用 effect ，是因为需要一个 scope  参数来收集所有的 effect
    // 而 effect 这个函数是对外的 api ，是不可以轻易改变参数的，所以会使用  new ReactiveEffect
    // 因为 ReactiveEffect 是内部对象，加一个参数是无所谓的
    // 后面如果要实现 scope 的逻辑的时候 需要改过来
    instance.update = effect(componentUpdateFn, {
      scheduler: () => {
        queueJob(instance.update);
      },
    });
  }
  function updateComponentPreRender(instance, nextVNode) {
    //更新nextVNode组件实例
    //现在instance.vnode是组件实例更新前的
    // 所以之前的props就是基于instance.vnode.props来获取
    nextVNode.component = instance;
    //TODO:后面更新props的时候需要对比
    instance.vnode = nextVNode;
    instance.next = null;

    const { props } = nextVNode;
    instance.props = props;
    //TODO:更新组件的slots
  }
  return {
    render,
    createApp: createAppAPI(render),
  };
}

function getSequence(arr): number[] {
  const p = arr.slice();
  const result = [0]; //因为索引的最小值就是0
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    //对于每个位置 i，检查当前元素 arr[i] 是否可以加入到已有的最长递增子序列中
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        //查找 result 中最后一个元素 j 所对应的值是否小于当前元素。
        //如果小于，说明当前元素可以直接加入到序列尾部，更新 p[i] 和 result
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          //二分查找，找到 arr[result[c]] 对应的索引 c
          u = c + 1;
        } else {
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
    //在遍历结束后，从后向前遍历 result 数组，同时利用数组 p 来获取每个位置的前驱节点，最终得到完整的最长递增子序列的索引顺序。

    result[u] = v;
    v = p[v];
  }
  return result;
}
