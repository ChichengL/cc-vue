import { createVNode } from "./vnode";

export function h(
  type: any,
  props: any = null,
  children: string | Array<any> = []
) {
  return createVNode(type, props, children);
}
