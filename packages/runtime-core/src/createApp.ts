import { createVNode } from "./vnode";

export function createAppAPI(render) {
  return function createApp(rootComponent) {
    const app = {
      _component: rootComponent,//props和context在创建组件实例时绑定
      mounted(rootContainer) {
        const vnode = createVNode(rootComponent);
        render(vnode, rootContainer);
      },
    };
    return app;
  };
}
