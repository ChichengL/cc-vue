import { ShapeFlags } from "@mini-vue/shared";

export { createVNode as createElementVNode };

export const Text = Symbol("Text");
export const Fragment = Symbol("Fragment");
export const createVNode = (type: any, props?: any, children?: any) => {
  const vnode = {
    type,
    props: props || {},
    children,
    el: null,
    key: props?.key,
    component: null, // 新增属性，表示该vnode是否是组件vnode
    shapeFlag: getShapeFlag(type),
  };
  //基于children的shapeFlag的判断
  if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN; //标识这个虚拟节点有多个子节点
  } else if (typeof children === "string") {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN; //标识这个虚拟节点有单个文本子节点
  }
  normalizeChildren(vnode, children); //对children进行规范化处理
  return vnode;
}

export function getShapeFlag(type: any) {
  return typeof type === "string"
    ? ShapeFlags.ELEMENT // 元素节点
    : ShapeFlags.STATEFUL_COMPONENT; // 组件节点
}

export function normalizeChildren(vnode: any, children: any) {
  if (typeof children === "object") {
    //标识出slot_children这个类型，现在只有element和component两种类型
    if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
      //如果是element节点，则将children肯定不是slot_children，直接返回
      return;
    } else {
      //如果是component节点，则将children肯定是slot_children，将children的类型设置为slot_children
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
    }
  }
}
export function createTextVNode(text: string) {
  return createVNode(Text, {}, text);
}
//标准化VNode，将其规范化为一个标准的VNode
export function normalizeVNode(child) {
  if (typeof child === "string" || typeof child === "number") {
    return createVNode(Text, null, String(child));
  }else{
    return child;
  }
}
