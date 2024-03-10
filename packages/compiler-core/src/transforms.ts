import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelpers";

export function transform(root, options = {}) {
  //创建context

  const context = createTransformContext(root, options);

  //遍历node
  traverseNode(root, context);

  createRootCodegen(root, context);

  root.helpers.push(...context.helpers.keys());
}

function traverseNode(node: any, context) {
  const type: NodeTypes = node.type;
  //遍历调用所有的nodeTransforms
  // 把node给到transform
  const nodeTransforms = context.nodeTransforms;
  const exitFns: any = [];
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];
    const onExit = transform(node, context);
    if (onExit) {
      exitFns.push(onExit);
    }
  }

  switch (type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING);
      break;
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context);
      break;
    default:
      break;
  }

  let i = exitFns.length;
  while (i--) {
    exitFns[i]();
  }
}

function traverseChildren(parent: any, context: any) {
  //遍历子节点
  parent.children.forEach((child: any) => {
    traverseNode(child, context);
  });
}
function createTransformContext(root: any, options): any {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
    helpers: new Map(),
    helper(name) {
      //这里会收集调用的次数
      //收集次数视为了删除，当count为0时删除
      const count = context.helpers.get(name) || 0;
      context.helpers.set(name, count + 1);
    },
  };
  return context;
}

function createRootCodegen(root: any, context: any) {
  const { children } = root;
  //上面包含所有子节点

  //只支持一个根节点
  const child = children[0];
  //如果是element，需要将他的codegenNode赋值为root

  if (child.type === NodeTypes.ELEMENT && child.codegenNode) {
    const codegenNode = child.codegenNode;
    root.codegenNode = codegenNode;
  } else {
    root.codegenNode = child;
  }
}
